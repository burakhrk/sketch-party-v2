import { useEffect, useState } from 'react';
import type { EffectDefinition } from '../shared/effects';
import type { Account, Friend } from '../shared/types';

export type UiState = {
  clientId: string;
  account?: Account;
  receiveEnabled: boolean;
  mutedUntil: number;
  friends: Friend[];
  pending: Friend[];
  blocks: string[];
  rateLimitMs: number;
  effects: EffectDefinition[];
};

export const useExtensionState = () => {
  const [state, setState] = useState<UiState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    chrome.runtime.sendMessage({ type: 'get-state' }, (res) => {
      setState(res);
      setLoading(false);
    });
  };

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'track-open' }, () => {});
    refresh();
    const listener = (msg: any) => {
      if (msg?.type === 'account-updated') {
        refresh();
      } else if (msg?.type === 'auth-debug') {
        console.log('[Auth Debug]', msg);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  return { state, loading, refresh };
};
