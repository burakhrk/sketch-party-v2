import confetti from 'canvas-confetti';
import type { EffectMessage } from '../shared/types';

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'effects:deliver') {
    const payload = message.payload as EffectMessage;
    runEffect(payload);
  }
});

const runEffect = (payload: EffectMessage) => {
  switch (payload.id) {
    case 'confetti':
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      break;
    case 'burst':
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 }
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 }
      });
      break;
    case 'pulse':
      pulseOverlay();
      break;
    default:
      confetti();
  }
};

const pulseOverlay = () => {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.inset = '0';
  el.style.pointerEvents = 'none';
  el.style.background = 'radial-gradient(circle, rgba(120,119,198,0.25) 0%, rgba(12,10,27,0) 60%)';
  el.style.animation = 'sp-pulse 1.2s ease-out';
  el.style.zIndex = '2147483647';
  const style = document.createElement('style');
  style.textContent = `
    @keyframes sp-pulse {
      from { opacity: 0.8; transform: scale(0.9); }
      to { opacity: 0; transform: scale(1.3); }
    }
  `;
  document.documentElement.appendChild(style);
  document.documentElement.appendChild(el);
  setTimeout(() => {
    el.remove();
    style.remove();
  }, 1300);
};
