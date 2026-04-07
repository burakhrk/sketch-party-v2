import { ANALYTICS_ENDPOINT, APP_ID, ANALYTICS_FLUSH_MS, SOURCE, STORAGE_KEYS } from './config';
import { storage } from './storage';
import type { AnalyticsEvent } from './types';

const withDefaults = (evt: Partial<AnalyticsEvent>): AnalyticsEvent => ({
  appId: APP_ID,
  source: SOURCE,
  eventName: evt.eventName ?? 'unknown',
  timestamp: evt.timestamp ?? Date.now(),
  clientId: evt.clientId,
  accountId: evt.accountId,
  email: evt.email,
  properties: evt.properties ?? {}
});

export const enqueueEvent = async (evt: Partial<AnalyticsEvent>) => {
  const queue = await storage.getAnalyticsQueue();
  queue.push(withDefaults(evt));
  await storage.setAnalyticsQueue(queue);
};

export const flushAnalytics = async () => {
  const queue = await storage.getAnalyticsQueue();
  if (!queue.length) return;
  try {
    const res = await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: APP_ID, events: queue })
    });
    if (res.ok) {
      await storage.setAnalyticsQueue([]);
    }
  } catch (err) {
    console.warn('[Sketch Party] analytics flush failed', err);
  }
};

export const scheduleAnalyticsAlarm = async () => {
  await chrome.alarms.create(STORAGE_KEYS.analyticsQueue, { periodInMinutes: ANALYTICS_FLUSH_MS / 60000 });
};
