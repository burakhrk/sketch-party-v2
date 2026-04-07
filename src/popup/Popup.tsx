import React, { useMemo, useState } from 'react';
import { EFFECTS } from '../shared/effects';
import type { EffectId } from '../shared/types';
import { useExtensionState } from './hooks';
import './popup.css';

const Popup: React.FC = () => {
  const { state, loading, refresh } = useExtensionState();
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [selectedEffect, setSelectedEffect] = useState<EffectId>('confetti');
  const [addFriendValue, setAddFriendValue] = useState('');
  const [status, setStatus] = useState<string>('');

  const acceptedFriends = useMemo(() => state?.friends?.filter((f) => f.status === 'accepted') ?? [], [state]);
  const pendingFriends = useMemo(() => state?.pending ?? [], [state]);
  const receiveLabel = state?.receiveEnabled ? 'Receiving On' : 'Receiving Off';

  const toggleReceive = (enabled: boolean) => {
    chrome.runtime.sendMessage({ type: 'toggle-receive', enabled }, refresh);
  };

  const mute = (minutes: number) => {
    chrome.runtime.sendMessage({ type: 'mute', minutes }, refresh);
  };

  const addFriend = () => {
    if (!addFriendValue.trim()) return;
    chrome.runtime.sendMessage({ type: 'add-friend', friendId: addFriendValue.trim() }, (res) => {
      setStatus(res?.error || 'Request sent');
      setAddFriendValue('');
      refresh();
    });
  };

  const acceptFriend = (id: string) => {
    chrome.runtime.sendMessage({ type: 'accept-friend', friendId: id }, refresh);
  };

  const blockFriend = (id: string) => {
    chrome.runtime.sendMessage({ type: 'block-friend', friendId: id }, refresh);
  };

  const sendEffect = () => {
    if (!selectedFriend) {
      setStatus('Pick a friend first');
      return;
    }
    chrome.runtime.sendMessage({ type: 'send-effect', friendId: selectedFriend, effectId: selectedEffect }, (res) => {
      setStatus(res?.error || (res?.delivered ? 'Sent!' : 'Queued'));
    });
  };

  const openPaywall = () => chrome.runtime.sendMessage({ type: 'open-paywall', context: 'popup' });
  const openLogin = () => chrome.runtime.sendMessage({ type: 'open-login' });

  if (loading || !state) {
    return (
      <div className="popup-shell">
        <div className="badge">Sketch Party</div>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const receivingOff = !state.receiveEnabled || Date.now() < state.mutedUntil;
  const isPro = state.account?.plan === 'pro';

  return (
    <div className="popup-shell">
      <div className="top-row">
        <div>
          <div className="badge">Sketch Party</div>
          <p className="muted tiny">Client: {state.clientId.slice(0, 6)} · {isPro ? 'Pro' : 'Free'}</p>
        </div>
        <button className={`pill-btn ${state.receiveEnabled ? 'on' : 'off'}`} onClick={() => toggleReceive(!state.receiveEnabled)}>
          {receiveLabel}
        </button>
      </div>

      {Date.now() < state.mutedUntil ? (
        <div className="callout warning">Muted for {Math.round((state.mutedUntil - Date.now()) / 60000)} min</div>
      ) : null}

      <section className="card">
        <div className="card-head">
          <h2>Send an effect</h2>
          <span className="muted tiny">Rate ~{Math.round(state.rateLimitMs / 1000)}s • per-minute cap applies</span>
        </div>
        <div className="chips-row">
          <span className="chip">{receiveLabel}</span>
          <span className="chip outline">{acceptedFriends.length} friends</span>
          <span className="chip outline">{isPro ? 'Pro tier' : 'Free tier'}</span>
        </div>
        <label className="field">
          <span>Friend</span>
          <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)}>
            <option value="">Pick a friend</option>
            {acceptedFriends.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label || f.id}
              </option>
            ))}
          </select>
        </label>
        <div className="effect-grid">
          {EFFECTS.map((fx) => (
            <button
              key={fx.id}
              className={`effect-tile ${selectedEffect === fx.id ? 'active' : ''} ${fx.pro ? 'pro' : ''}`}
              onClick={() => setSelectedEffect(fx.id)}
              disabled={fx.pro && !isPro}
              title={fx.description}
            >
              <span className="label">{fx.label}</span>
              {fx.pro && <span className="pill">Pro</span>}
            </button>
          ))}
        </div>
        <button className="button-cta" onClick={sendEffect} disabled={receivingOff}>
          Send effect
        </button>
        {receivingOff && <p className="muted tiny">Turn receiving on to send.</p>}
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
          />
          <button className="secondary" onClick={addFriend}>
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
      </section>

      <section className="card slim">
        <div className="card-head">
          <h4>Controls</h4>
        </div>
        <div className="controls-grid">
          <button className="secondary" onClick={() => mute(60)}>Mute 1h</button>
          <button className="secondary" onClick={openLogin}>Login</button>
          <button className="secondary" onClick={openPaywall}>Connect Patreon</button>
        </div>
      </section>

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
        <button className="button-cta" onClick={openPaywall}>Connect Patreon</button>
        <p className="muted tiny">You’ll be routed to the hub payment page; Google login then Patreon connect.</p>
      </section>

      {status ? <p className="status">{status}</p> : null}
    </div>
  );
};

export default Popup;
