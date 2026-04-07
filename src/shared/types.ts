export type Account = {
  accountId?: string;
  email?: string;
  plan?: 'free' | 'pro';
};

export type Friend = {
  id: string; // friend code or account id
  label: string;
  status: 'accepted' | 'pending';
  isPro?: boolean;
};

export type EffectId = 'confetti' | 'burst' | 'pulse';

export type EffectMessage = {
  id: EffectId;
  from: string;
  to: string;
  sentAt: number;
  metadata?: Record<string, unknown>;
};

export type AnalyticsEvent = {
  appId: string;
  source: string;
  eventName: string;
  timestamp: number;
  clientId?: string;
  accountId?: string;
  email?: string;
  properties?: Record<string, unknown>;
};

export type RateState = {
  perSenderTimestamps: Record<string, number[]>; // sender id -> epoch ms list (recent minute)
  lastSendMs?: number;
};
