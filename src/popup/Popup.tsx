import React, { useEffect, useMemo, useState } from 'react';
import { EFFECTS } from '../shared/effects';
import type { EffectId } from '../shared/types';
import { useExtensionState } from './hooks';
import './popup.css';

const Popup: React.FC = () => {
  const { state, loading, refresh } = useExtensionState();
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [selectedEffect, setSelectedEffect] = useState<EffectId>('confetti');
  const [addFriendValue, setAddFriendValue] = useState('');
  const [toast, setToast] = useState<{ text: string; tone?: 'info' | 'success' | 'error' } | null>(null);

  const acceptedFriends = useMemo(() => state?.friends?.filter((f) => f.status === 'accepted') ?? [], [state]);
  const pendingFriends = useMemo(() => state?.pending ?? [], [state]);
  const receiveLabel = state?.receiveEnabled ? 'Receiving On' : 'Receiving Off';
  const isLoggedIn = !!state?.account?.accountId;
  const isPro = state?.account?.plan === 'pro';
  const showPro = isLoggedIn; // show upgrade only after sign-in
  const availableEffects = useMemo(
    () => EFFECTS.filter((fx) => (fx.pro ? showPro : true)),
    [showPro]
  );
  const journeyStage = !isLoggedIn ? 'signin' : acceptedFriends.length === 0 ? 'add-friend' : 'send';

  const toggleReceive = (enabled: boolean) => {
    chrome.runtime.sendMessage({ type: 'toggle-receive', enabled }, refresh);
  };

  const mute = (minutes: number) => {
    chrome.runtime.sendMessage({ type: 'mute', minutes }, refresh);
  };

  const addFriend = () => {
    if (!addFriendValue.trim()) return;
    chrome.runtime.sendMessage({ type: 'add-friend', friendId: addFriendValue.trim() }, (res) => {
      setToast(res?.error ? { text: res.error, tone: 'error' } : { text: 'Friend request sent', tone: 'success' });
      setAddFriendValue('');
      refresh();
    });
  };

  const acceptFriend = (id: string) => {
    chrome.runtime.sendMessage({ type: 'accept-friend', friendId: id }, (res) => {
      setToast(res?.error ? { text: res.error, tone: 'error' } : { text: 'Friend added', tone: 'success' });
      refresh();
    });
  };

  const blockFriend = (id: string) => {
    chrome.runtime.sendMessage({ type: 'block-friend', friendId: id }, (res) => {
      setToast(res?.error ? { text: res.error, tone: 'error' } : { text: 'Blocked', tone: 'success' });
      refresh();
    });
  };

  const sendEffect = () => {
    if (!selectedFriend) {
      setToast({ text: 'Pick a friend first', tone: 'error' });
      return;
    }
    chrome.runtime.sendMessage({ type: 'send-effect', friendId: selectedFriend, effectId: selectedEffect }, (res) => {
      setToast(
        res?.error
          ? { text: res.error, tone: 'error' }
          : { text: res?.delivered ? 'Animation sent' : 'Queued', tone: 'success' }
      );
    });
  };

  const previewEffect = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId !== undefined) {
        chrome.tabs.sendMessage(
          tabId,
          {
            type: 'effects:deliver',
            payload: { id: selectedEffect, from: 'preview', to: 'preview', sentAt: Date.now() }
          },
          (resp) => {
            if (chrome.runtime.lastError || !resp?.ok) {
              setToast({ text: 'Open a normal webpage and try preview again.', tone: 'error' });
            } else {
              setToast({ text: 'Preview sent to this tab', tone: 'info' });
            }
          }
        );
      }
    });
  };

  const openPaywall = () => chrome.runtime.sendMessage({ type: 'open-paywall', context: 'popup' });
  const openLogin = () => chrome.runtime.sendMessage({ type: 'open-login' }, (res) => {
    if (res?.error) setToast({ text: `Login failed: ${res.error}`, tone: 'error' });
  });

  useEffect(() => {
    const handler = (msg: any) => {
      if (msg?.type === 'account-updated') {
        setToast({ text: 'Signed in!', tone: 'success' });
      } else if (msg?.type === 'auth-debug') {
        setToast({ text: msg.message || 'Auth debug', tone: 'info' });
        console.log('[Auth Debug]', msg);
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  if (loading || !state) {
    return (
      <div className="popup-shell">
        <div className="badge">Sketch Party</div>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const receivingOff = !state.receiveEnabled || Date.now() < state.mutedUntil;

  return (
    <div className="popup-shell">
      <div className="top-row">
        <div>
          <div className="badge">Sketch Party</div>
          <p className="muted tiny">Client: {state.clientId.slice(0, 6)} · {isLoggedIn ? 'Signed in' : 'Not signed in'}</p>
        </div>
        <label className="switch">
          <input type="checkbox" checked={state.receiveEnabled} onChange={(e) => toggleReceive(e.target.checked)} />
          <span className="slider" />
          <span className="switch-label">{receiveLabel}</span>
        </label>
      </div>

      {Date.now() < state.mutedUntil ? (
        <div className="callout warning">Muted for {Math.round((state.mutedUntil - Date.now()) / 60000)} min</div>
      ) : null}

      {!isLoggedIn && (
        <section className="card hero">
          <h2>Send party effects</h2>
          <p className="muted">Blast confetti, bursts, and pulses to friends’ screens—only when they allow it.</p>
          <div className="demo-grid">
            <div className="demo-card">🎉 Confetti on pages</div>
            <div className="demo-card">🛟 Receive toggle & mute</div>
            <div className="demo-card">🧑‍🤝‍🧑 Friend-only sending</div>
          </div>
          <button className="button-cta google" onClick={openLogin}>
            <span className="google-g">G</span>
            <span>Sign in with Google</span>
          </button>
          <div className="steps">
            <div className="step">1. Sign in with Google</div>
            <div className="step">2. Add a friend code</div>
            <div className="step">3. Tap Preview, then Send</div>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Send an effect</h2>
          <span className="muted tiny">Rate ~{Math.round(state.rateLimitMs / 1000)}s • per-minute cap applies</span>
        </div>
        <div className="chips-row">
          <span className="chip">{receiveLabel}</span>
          <span className="chip outline">{acceptedFriends.length} friends</span>
          {showPro && <span className="chip outline">{isPro ? 'Pro tier' : 'Free tier'}</span>}
        </div>
        <label className="field">
          <span>Friend</span>
          <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)} disabled={!isLoggedIn}>
            <option value="">Pick a friend</option>
            {acceptedFriends.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label || f.id}
              </option>
            ))}
          </select>
        </label>
        <div className="effect-grid">
          {availableEffects.map((fx) => (
            <button
              key={fx.id}
              className={`effect-tile ${selectedEffect === fx.id ? 'active' : ''} ${fx.pro ? 'pro' : ''}`}
              onClick={() => setSelectedEffect(fx.id)}
              disabled={!isLoggedIn || (fx.pro && !isPro)}
              title={fx.description}
            >
              <span className="label">{fx.label}</span>
              {fx.pro && <span className="pill">Pro</span>}
            </button>
          ))}
        </div>
        <button className="button-cta" onClick={sendEffect} disabled={receivingOff || !isLoggedIn}>
          Send effect
        </button>
        <button className="secondary preview" onClick={previewEffect}>
          Preview on this tab
        </button>
        {receivingOff && <p className="muted tiny">Turn receiving on to send.</p>}
        {!isLoggedIn && <p className="muted tiny">Sign in with Google to start sending.</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Friends</h3>
          <span className="muted tiny">{acceptedFriends.length} connected</span>
        </div>
        <div className="friend-row">
          <input
            value={addFriendValue}
            onChange={(e) => setAddFriendValue(e.target.value)}
            placeholder="Friend code or account id"
            disabled={!isLoggedIn}
          />
          <button className={`secondary ${journeyStage === 'add-friend' ? 'pulse' : ''}`} onClick={addFriend} disabled={!isLoggedIn}>
            Add
          </button>
        </div>
        {pendingFriends.length ? (
          <div className="pending">
            {pendingFriends.map((p) => (
              <div key={p.id} className="pending-row">
                <span>{p.label || p.id}</span>
                <div className="pending-actions">
                  <button onClick={() => acceptFriend(p.id)}>Accept</button>
                  <button onClick={() => blockFriend(p.id)}>Block</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {!pendingFriends.length && !acceptedFriends.length ? <p className="muted tiny">No friends yet.</p> : null}
        {!acceptedFriends.length && isLoggedIn && (
          <div className="callout accent">
            Add a friend to unlock more effects. Share your friend code or ask them for theirs. Try preview to see how it looks.
          </div>
        )}
      </section>

      <section className="card slim">
        <div className="card-head">
          <h4>Controls</h4>
        </div>
        <div className="controls-grid">
          <button className="secondary" onClick={() => mute(60)}>Mute 1h</button>
          <button className="secondary" onClick={openLogin}>Sign in with Google</button>
          {showPro && <button className="secondary" onClick={openPaywall}>Go Pro</button>}
        </div>
      </section>

      {showPro && (
        <section className="card pro-card">
          <div className="card-head">
            <h3>Pro unlocks</h3>
            <span className="pill small">Patreon</span>
          </div>
          <ul className="perk-list">
            <li>Higher send rate & burst cap</li>
            <li>Extra effects (fireworks, future drops)</li>
            <li>Priority delivery to friends</li>
            <li>Group send (up to 3) — coming soon</li>
          </ul>
          <button className="button-cta" onClick={openPaywall}>Go Pro</button>
          <p className="muted tiny">You’ll be routed to the payment page; Google login first, then link Patreon.</p>
        </section>
      )}

      {toast ? <div className={`toast ${toast.tone ?? 'info'}`}>{toast.text}</div> : null}
    </div>
  );
};

export default Popup;
