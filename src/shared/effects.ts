import type { EffectId } from './types';

export type EffectDefinition = {
  id: EffectId;
  label: string;
  description: string;
  pro?: boolean;
};

export const EFFECTS: EffectDefinition[] = [
  { id: 'confetti', label: 'Confetti', description: 'Classic celebration burst' },
  { id: 'burst', label: 'Fireworks', description: 'Quick firework arc', pro: true },
  { id: 'pulse', label: 'Pulse', description: 'Soft glow pulse' }
];
