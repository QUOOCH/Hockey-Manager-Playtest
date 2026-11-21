export type AttackAction = 'shoot' | 'pass' | 'hold';

export type AttackObservation = {
  goalDistance: number;
  centrality: number;
  shootingLane: boolean;
  shotProbability: number;
  shotRoll: number;
  passAvailable: boolean;
  passProbability: number;
  passRoll: number;
  fallbackShotRoll: number;
  passScore?: number;
};

export type AttackDecision = {
  action: AttackAction;
  reason: 'primary-shot' | 'pass' | 'fallback-shot' | 'keep-possession';
};

/**
 * Policy boundary between the live match engine and the attacking AI.
 * The engine supplies a compact observation; this function returns intent only.
 * Movement, puck physics and animation remain owned by the match engine.
 */
export function decideAttackAction(observation: AttackObservation): AttackDecision {
  if (observation.shootingLane && observation.shotRoll < observation.shotProbability) {
    return { action: 'shoot', reason: 'primary-shot' };
  }

  if (observation.passAvailable && observation.passRoll < observation.passProbability) {
    return { action: 'pass', reason: 'pass' };
  }

  if (observation.goalDistance < 300 && observation.fallbackShotRoll < 0.30) {
    return { action: 'shoot', reason: 'fallback-shot' };
  }

  return { action: 'hold', reason: 'keep-possession' };
}
