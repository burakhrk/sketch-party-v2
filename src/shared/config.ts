export const APP_ID = 'sketch-party';
export const SOURCE = 'chrome-extension';

export const HUB_BASE = 'https://extensions-hub-sites.vercel.app';
export const PAYMENT_PATH = '/sketch-party/payment';
export const PAYMENT_URL = `${HUB_BASE}${PAYMENT_PATH}`;
export const LOGIN_URL = `${HUB_BASE}/sketch-party/login`;
export const SUPABASE_URL = 'https://lpgdopfqvertiwcmyokh.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
// OAuth redirect must be https://<extension_id>.chromiumapp.org/ (chrome.identity.getRedirectURL())
export const BACKEND_BASE = 'https://harika-extensions-backend.notetaker-app-burak.workers.dev';
export const ANALYTICS_ENDPOINT = `${BACKEND_BASE}/api/analytics/events/batch`;

export const POLL_INTERVAL_MS = 15_000;
export const ANALYTICS_FLUSH_MS = 60_000;
export const RATE_LIMIT_BASE_MS = 10_000;
export const RATE_LIMIT_PRO_MS = 4_000;
export const PER_MINUTE_CAP = 6;
export const PER_MINUTE_CAP_PRO = 15;

export const STORAGE_KEYS = {
  clientId: 'sp:clientId',
  account: 'sp:account',
  friends: 'sp:friends',
  blocks: 'sp:blocks',
  pending: 'sp:pending',
  receiveEnabled: 'sp:receiveEnabled',
  mutedUntil: 'sp:mutedUntil',
  analyticsQueue: 'sp:analyticsQueue',
  rateState: 'sp:rateState'
} as const;
