import { v4 as uuidv4 } from 'uuid';
import {
  ANALYTICS_FLUSH_MS,
  APP_ID,
  BACKEND_BASE,
  HUB_BASE,
  PAYMENT_URL,
  LOGIN_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  POLL_INTERVAL_MS,
  RATE_LIMIT_BASE_MS,
  RATE_LIMIT_PRO_MS,
  PER_MINUTE_CAP,
  PER_MINUTE_CAP_PRO
} from './shared/config';
import { EFFECTS } from './shared/effects';
import { enqueueEvent, flushAnalytics } from './shared/analytics';
import { storage } from './shared/storage';
import type { Account, EffectId, EffectMessage, Friend, RateState } from './shared/types';

const state = {
  clientId: '' as string,
  account: undefined as Account | undefined,
  receiveEnabled: true,
  mutedUntil: 0,
  friends: [] as Friend[],
  blocks: [] as string[],
  pending: [] as Friend[],
  rateState: { perSenderTimestamps: {} } as RateState,
  inboxPoll: undefined as number | undefined,
  sessionStarted: false,
  oauthState: undefined as string | undefined
};

const init = async () => {
  const existing = await storage.getClientId();
  state.clientId = existing ?? uuidv4();
  if (!existing) await storage.setClientId(state.clientId);

  state.account = await storage.getAccount();
  state.receiveEnabled = await storage.getReceiveEnabled();
  state.mutedUntil = await storage.getMutedUntil();
  state.friends = await storage.getFriends();
  state.blocks = await storage.getBlocks();
  state.pending = await storage.getPending();
  state.rateState = await storage.getRateState();

  await enqueueEvent({ eventName: 'install', clientId: state.clientId, accountId: state.account?.accountId, email: state.account?.email });
  await flushAnalytics();
  startPollingInbox();
  chrome.alarms.create('analytics-flush', { periodInMinutes: ANALYTICS_FLUSH_MS / 60000 });
  chrome.alarms.create('inbox-poll', { periodInMinutes: POLL_INTERVAL_MS / 60000 });
};

chrome.runtime.onInstalled.addListener(() => {
  init();
});

chrome.runtime.onStartup.addListener(() => {
  init();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'analytics-flush') await flushAnalytics();
  if (alarm.name === 'inbox-poll') await pollInbox();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'get-state':
        sendResponse(await getUiState());
        break;
      case 'track-open':
        await enqueueEvent({ eventName: 'open', clientId: state.clientId, accountId: state.account?.accountId, email: state.account?.email });
        sendResponse({ ok: true });
        break;
      case 'toggle-receive':
        state.receiveEnabled = !!message.enabled;
        await storage.setReceiveEnabled(state.receiveEnabled);
        sendResponse({ ok: true, receiveEnabled: state.receiveEnabled });
        break;
      case 'mute':
        state.mutedUntil = Date.now() + (message.minutes ?? 60) * 60 * 1000;
        await storage.setMutedUntil(state.mutedUntil);
        sendResponse({ ok: true, mutedUntil: state.mutedUntil });
        break;
      case 'add-friend':
        sendResponse(await addFriend(message.friendId, message.label));
        break;
      case 'accept-friend':
        sendResponse(await acceptFriend(message.friendId));
        break;
      case 'block-friend':
        sendResponse(await blockFriend(message.friendId));
        break;
      case 'send-effect':
        sendResponse(await sendEffect(message.friendId, message.effectId as EffectId));
        break;
      case 'open-login':
        await launchSupabaseLogin(sendResponse);
        break;
      case 'open-paywall':
        await openPayment(message.context ?? 'popup');
        sendResponse({ ok: true });
        break;
      case 'patreon-result':
        await enqueueEvent({
          eventName: message.success ? 'connect_patreon_success' : 'connect_patreon_fail',
          clientId: state.clientId,
          accountId: state.account?.accountId,
          email: state.account?.email
        });
        sendResponse({ ok: true });
        break;
      case 'auth-callback':
        await handleAuthCallback(message);
        sendResponse({ ok: true });
        break;
      default:
        sendResponse({ ok: false, error: 'unknown message' });
    }
  })();
  return true;
});

const fetchSupabaseUser = async (accessToken: string) => {
  if (!SUPABASE_ANON_KEY) throw new Error('Supabase anon key missing');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY
    }
  });
  if (!res.ok) throw new Error('Failed to fetch user');
  return (await res.json()) as { id: string; email: string };
};

const launchSupabaseLogin = async (respond: (res: any) => void) => {
  const redirect = chrome.identity.getRedirectURL();
  const oauthState = crypto.randomUUID();
  state.oauthState = oauthState;
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
    redirect
  )}&response_type=token&scope=openid%20email%20profile&state=${encodeURIComponent(
    oauthState
  )}&data=${encodeURIComponent(JSON.stringify({ app_id: 'sketch-party' }))}`;

  chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
    if (chrome.runtime.lastError) {
      respond({ ok: false, error: chrome.runtime.lastError.message });
      return;
    }
    if (!responseUrl) {
      respond({ ok: false, error: 'No response URL' });
      return;
    }
    // Supabase implicit flow returns tokens in hash fragment
    const hash = responseUrl.split('#')[1] || '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const email = params.get('email') || undefined;
    const returnedState = params.get('state');
    if (state.oauthState && returnedState !== state.oauthState) {
      respond({ ok: false, error: 'OAuth state mismatch' });
      return;
    }
    state.oauthState = undefined;
    try {
      if (!accessToken) throw new Error('Missing access token');
      const user = await fetchSupabaseUser(accessToken);
      state.account = { accountId: user.id, email: email || user.email, plan: 'free', accessToken };
      await storage.setAccount(state.account);
      await enqueueEvent({ eventName: 'login', clientId: state.clientId, accountId: user.id, email: user.email });
      // Notify any open popup to refresh immediately
      chrome.runtime.sendMessage({ type: 'account-updated', account: state.account });
      respond({ ok: true, account: state.account });
    } catch (err: any) {
      respond({ ok: false, error: err?.message || 'Login failed' });
    }
  });
};

const getUiState = async () => ({
  clientId: state.clientId,
  account: state.account,
  receiveEnabled: state.receiveEnabled,
  mutedUntil: state.mutedUntil,
  friends: state.friends,
  pending: state.pending,
  blocks: state.blocks,
  rateLimitMs: state.account?.plan === 'pro' ? RATE_LIMIT_PRO_MS : RATE_LIMIT_BASE_MS,
  effects: EFFECTS
});

const addFriend = async (friendId: string, label?: string) => {
  if (!state.account?.accountId) return { ok: false, error: 'Please sign in with Google first.' };
  if (!friendId) return { ok: false, error: 'missing friend id' };
  const exists = state.friends.find((f) => f.id === friendId) || state.pending.find((f) => f.id === friendId);
  if (exists) return { ok: true, status: exists.status };
  const pending: Friend = { id: friendId, label: label || friendId, status: 'pending' };
  state.pending.push(pending);
  await storage.setPending(state.pending);
  await enqueueEvent({ eventName: 'friend_request_sent', clientId: state.clientId, accountId: state.account?.accountId, properties: { target: friendId } });
  return { ok: true, status: 'pending' };
};

const acceptFriend = async (friendId: string) => {
  if (!state.account?.accountId) return { ok: false, error: 'Please sign in with Google first.' };
  const pending = state.pending.find((f) => f.id === friendId);
  if (pending) {
    pending.status = 'accepted';
    state.friends.push(pending);
    state.pending = state.pending.filter((f) => f.id !== friendId);
    await storage.setFriends(state.friends);
    await storage.setPending(state.pending);
  } else if (!state.friends.find((f) => f.id === friendId)) {
    state.friends.push({ id: friendId, label: friendId, status: 'accepted' });
    await storage.setFriends(state.friends);
  }
  await enqueueEvent({ eventName: 'friend_accept', clientId: state.clientId, accountId: state.account?.accountId, properties: { friendId } });
  return { ok: true };
};

const blockFriend = async (friendId: string) => {
  state.blocks = Array.from(new Set([...state.blocks, friendId]));
  state.friends = state.friends.filter((f) => f.id !== friendId);
  state.pending = state.pending.filter((f) => f.id !== friendId);
  await storage.setBlocks(state.blocks);
  await storage.setFriends(state.friends);
  await storage.setPending(state.pending);
  await enqueueEvent({ eventName: 'block_user', clientId: state.clientId, accountId: state.account?.accountId, properties: { target: friendId } });
  return { ok: true };
};

const checkRateLimit = (targetId: string) => {
  const now = Date.now();
  const rateMs = state.account?.plan === 'pro' ? RATE_LIMIT_PRO_MS : RATE_LIMIT_BASE_MS;
  const cap = state.account?.plan === 'pro' ? PER_MINUTE_CAP_PRO : PER_MINUTE_CAP;

  const rs = state.rateState.perSenderTimestamps[targetId] ?? [];
  const recent = rs.filter((t) => now - t < 60_000);
  if (recent.length >= cap) return { ok: false, error: 'Too many effects per minute.' };
  if (recent.length && now - recent[recent.length - 1] < rateMs) return { ok: false, error: 'Slow down a bit.' };
  recent.push(now);
  state.rateState.perSenderTimestamps[targetId] = recent;
  storage.setRateState(state.rateState);
  return { ok: true };
};

const sendEffect = async (friendId: string, effectId: EffectId) => {
  if (!state.account?.accountId) return { ok: false, error: 'Please sign in with Google first.' };
  if (!state.receiveEnabled) return { ok: false, error: 'Receiving is off.' };
  if (Date.now() < state.mutedUntil) return { ok: false, error: 'Muted.' };
  if (state.blocks.includes(friendId)) return { ok: false, error: 'Blocked.' };
  const friend = state.friends.find((f) => f.id === friendId && f.status === 'accepted');
  if (!friend) return { ok: false, error: 'Not friends yet.' };
  const rate = checkRateLimit(friendId);
  if (!rate.ok) return rate;

  if (!state.sessionStarted) {
    state.sessionStarted = true;
    await enqueueEvent({ eventName: 'create_session', clientId: state.clientId, accountId: state.account?.accountId, email: state.account?.email });
  }

  const payload: EffectMessage = {
    id: effectId,
    from: state.clientId,
    to: friendId,
    sentAt: Date.now()
  };

  const delivered = await deliverEffect(payload);
  await enqueueEvent({
    eventName: 'send_effect',
    clientId: state.clientId,
    accountId: state.account?.accountId,
    email: state.account?.email,
    properties: { effectId, to: friendId, delivered }
  });
  return { ok: delivered, delivered };
};

const deliverEffect = async (payload: EffectMessage) => {
  // try backend
  try {
    const res = await fetch(`${BACKEND_BASE}/api/sketch-party/effects/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, appId: APP_ID })
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('deliverEffect failed, fallback to local loopback', err);
  }
  // fallback: loopback to self for demo
  await chrome.tabs.query({}).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'effects:deliver', payload });
    }
  });
  return true;
};

const pollInbox = async () => {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/sketch-party/effects/inbox?clientId=${encodeURIComponent(state.clientId)}&appId=${APP_ID}`);
    if (!res.ok) return;
    const data = (await res.json()) as { items?: EffectMessage[] };
    const items = data.items || [];
    for (const msg of items) {
      await handleIncomingEffect(msg);
    }
  } catch (err) {
    // silent
  }
};

const handleIncomingEffect = async (msg: EffectMessage) => {
  if (!state.receiveEnabled) return;
  if (Date.now() < state.mutedUntil) return;
  if (state.blocks.includes(msg.from)) return;
  const payload = msg;
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'effects:deliver', payload });
  }
  await enqueueEvent({
    eventName: 'receive_effect',
    clientId: state.clientId,
    accountId: state.account?.accountId,
    properties: { from: msg.from, effectId: msg.id }
  });
};

const startPollingInbox = () => {
  if (state.inboxPoll) clearInterval(state.inboxPoll);
  state.inboxPoll = setInterval(pollInbox, POLL_INTERVAL_MS) as any;
};

const openPayment = async (context: string) => {
  const search = new URLSearchParams({
    source: 'chrome-extension',
    appId: APP_ID,
    clientId: state.clientId,
    accountId: state.account?.accountId || '',
    email: state.account?.email || '',
    context
  });
  const url = `${PAYMENT_URL}?${search.toString()}`;
  await enqueueEvent({ eventName: 'open_paywall', clientId: state.clientId, accountId: state.account?.accountId, email: state.account?.email, properties: { context } });
  await chrome.tabs.create({ url });
  await enqueueEvent({ eventName: 'open_checkout', clientId: state.clientId, accountId: state.account?.accountId, email: state.account?.email, properties: { context } });
};

const handleAuthCallback = async (data: { accountId?: string; email?: string; plan?: 'free' | 'pro' }) => {
  state.account = { accountId: data.accountId, email: data.email, plan: data.plan || 'free' };
  await storage.setAccount(state.account);
  await enqueueEvent({ eventName: 'login', clientId: state.clientId, accountId: data.accountId, email: data.email });
};
