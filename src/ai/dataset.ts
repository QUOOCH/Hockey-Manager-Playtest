import type { TrainingDecision } from './training';

export const ATTACK_FEATURE_NAMES = [
  'goalDistance',
  'centrality',
  'shootingLane',
  'shotProbability',
  'passAvailable',
  'passProbability',
  'passScore',
] as const;

export type AttackFeatureName = typeof ATTACK_FEATURE_NAMES[number];
export type AttackTrainingSample = {
  features: number[];
  action: 0 | 1 | 2;
  actionName: TrainingDecision['action'];
  reward: number;
  side: 0 | 1;
  t: number;
};

type ScoredDecision = TrainingDecision & {
  outcomeReward?: number;
};

function numeric(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Convert recorded situation -> action -> outcome records into a stable,
 * normalized feature matrix suitable for offline imitation/RL training.
 * Action encoding: 0=hold, 1=pass, 2=shoot.
 */
export function buildAttackTrainingDataset(
  decisions: ScoredDecision[]
): AttackTrainingSample[] {
  const samples: AttackTrainingSample[] = [];

  for (const decision of decisions) {
    const observation = decision.observation;
    const goalDistance = Math.max(0, Math.min(400, numeric(observation.goalDistance)));
    const centrality = Math.max(0, Math.min(1, numeric(observation.centrality)));
    const shotProbability = Math.max(0, Math.min(1, numeric(observation.shotProbability)));
    const passProbability = Math.max(0, Math.min(1, numeric(observation.passProbability)));
    const passScore = Math.max(-100, Math.min(200, numeric(observation.passScore)));

    const action = decision.action === 'hold' ? 0 : decision.action === 'pass' ? 1 : 2;
    samples.push({
      features: [
        goalDistance / 400,
        centrality,
        observation.shootingLane === true ? 1 : 0,
        shotProbability,
        observation.passAvailable === true ? 1 : 0,
        passProbability,
        (passScore + 100) / 300,
      ],
      action,
      actionName: decision.action,
      reward: Math.max(-2, Math.min(2, numeric(decision.outcomeReward))),
      side: decision.side,
      t: numeric(decision.t),
    });
  }

  return samples;
}
