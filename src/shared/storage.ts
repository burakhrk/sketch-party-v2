import { STORAGE_KEYS } from './config';
import type { Account, Friend, RateState } from './types';

const get = async <T>(key: string, fallback: T): Promise<T> => {
  const res = await chrome.storage.local.get(key);
  return (res?.[key] as T) ?? fallback;
};

const set = async <T>(key: string, value: T) => {
  await chrome.storage.local.set({ [key]: value });
};

export const storage = {
  getClientId: () => get<string | undefined>(STORAGE_KEYS.clientId, undefined),
  setClientId: (id: string) => set(STORAGE_KEYS.clientId, id),
  getAccount: () => get<Account | undefined>(STORAGE_KEYS.account, undefined),
  setAccount: (account: Account | undefined) => set(STORAGE_KEYS.account, account),
  getFriends: () => get<Friend[]>(STORAGE_KEYS.friends, []),
  setFriends: (friends: Friend[]) => set(STORAGE_KEYS.friends, friends),
  getBlocks: () => get<string[]>(STORAGE_KEYS.blocks, []),
  setBlocks: (blocks: string[]) => set(STORAGE_KEYS.blocks, blocks),
  getPending: () => get<Friend[]>(STORAGE_KEYS.pending, []),
  setPending: (pending: Friend[]) => set(STORAGE_KEYS.pending, pending),
  getReceiveEnabled: () => get<boolean>(STORAGE_KEYS.receiveEnabled, true),
  setReceiveEnabled: (enabled: boolean) => set(STORAGE_KEYS.receiveEnabled, enabled),
  getMutedUntil: () => get<number>(STORAGE_KEYS.mutedUntil, 0),
  setMutedUntil: (until: number) => set(STORAGE_KEYS.mutedUntil, until),
  getAnalyticsQueue: () => get(STORAGE_KEYS.analyticsQueue, [] as any[]),
  setAnalyticsQueue: (queue: any[]) => set(STORAGE_KEYS.analyticsQueue, queue),
  getRateState: () => get<RateState>(STORAGE_KEYS.rateState, { perSenderTimestamps: {} }),
  setRateState: (state: RateState) => set(STORAGE_KEYS.rateState, state)
};
