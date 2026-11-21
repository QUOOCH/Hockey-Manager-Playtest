import { buildAttackTrainingDataset } from './dataset';

export type TrainingSide = 'home' | 'away';
export type TrainingPlayerFrame = readonly [number, number, number, number, number, number, number, number, number];
export type TrainingFrame = {
  t: number;
  puck: readonly [number, number, number, number];
  possession: 0 | 1;
  carrier: number;
  phase: string;
  score: readonly [number, number];
  players: TrainingPlayerFrame[];
};
export type TrainingEvent = {
  t: number;
  kind: string;
  side: -1 | 0 | 1;
  reward: number;
  data?: Record<string, number | string | boolean>;
};
export type TrainingDecision = {
  t: number;
  side: 0 | 1;
  action: 'shoot' | 'pass' | 'hold';
  reason: string;
  observation: Record<string, number | string | boolean>;
};

type ScoredDecision = TrainingDecision & {
  outcomeReward: number;
  outcomeEvents: number;
  outcomeHorizon: number;
};

/**
 * Attribute each result to only the closest preceding decision that could have
 * caused it. This prevents one goal/pass result from rewarding several nearby
 * decisions or leaking defensive events into the attacking policy.
 */
export function scoreTrainingDecisions(
  decisions: TrainingDecision[],
  events: TrainingEvent[]
): ScoredDecision[] {
  const scored = decisions.map((decision) => ({
    ...decision,
    outcomeReward: 0,
    outcomeEvents: 0,
    outcomeHorizon: decision.action === 'shoot' ? 3 : decision.action === 'pass' ? 2 : 1.5,
  }));

  for (const event of events) {
    let action: TrainingDecision['action'] | null = null;
    let horizon = 0;
    if (event.kind === 'shot-resolution') {
      action = 'shoot';
      horizon = 3;
    } else if (event.kind === 'pass-complete' || event.kind === 'pass-interception') {
      action = 'pass';
      horizon = 2;
    } else if (event.kind === 'turnover') {
      action = 'hold';
      horizon = 1.5;
    }
    if (!action || event.side < 0 || event.reward === 0) continue;

    let bestIndex = -1;
    let bestElapsed = Infinity;
    for (let i = 0; i < scored.length; i++) {
      const decision = scored[i];
      const elapsed = event.t - decision.t;
      if (decision.side !== event.side || decision.action !== action || elapsed <= 0 || elapsed > horizon) continue;
      if (elapsed < bestElapsed) {
        bestElapsed = elapsed;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) continue;

    const decision = scored[bestIndex];
    decision.outcomeReward += event.reward * Math.pow(0.9, bestElapsed);
    decision.outcomeEvents += 1;
  }

  return scored.map((decision) => ({
    ...decision,
    outcomeReward: Number(decision.outcomeReward.toFixed(4)),
  }));
}

export type TrainingEpisode = {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  frameInterval: number;
  frames: TrainingFrame[];
  events: TrainingEvent[];
  decisions: TrainingDecision[];
  lastFrameAt: number;
};

const EVENT_REWARDS: Record<string, number> = {
  'pass-complete': 0.08,
  'pass-interception': -0.12,
  turnover: -0.1,
};

export function createTrainingEpisode(id: string, createdAt = new Date().toISOString()): TrainingEpisode {
  return { schemaVersion: 1, id, createdAt, frameInterval: 0.5, frames: [], events: [], decisions: [], lastFrameAt: -1 };
}

export function recordTrainingFrame(episode: TrainingEpisode | null, frame: TrainingFrame): void {
  if (!episode || frame.t - episode.lastFrameAt < episode.frameInterval - 0.02) return;
  episode.frames.push(frame);
  episode.lastFrameAt = frame.t;
  if (episode.frames.length > 900) episode.frames.shift();
}

export function recordTrainingDecision(
  episode: TrainingEpisode | null,
  decision: TrainingDecision
): void {
  if (!episode) return;
  episode.decisions.push(decision);
  if (episode.decisions.length > 500) episode.decisions.shift();
}

export function recordTrainingEvent(episode: TrainingEpisode | null, t: number, kind: string, rawData?: unknown): void {
  if (!episode) return;
  const data = rawData && typeof rawData === 'object' ? rawData as Record<string, unknown> : {};
  const rawSide = data.side ?? data.shotSide ?? data.defendingSide ?? data.owner;
  let side: -1 | 0 | 1 = rawSide === 'home' ? 0 : rawSide === 'away' ? 1 : -1;
  let reward = EVENT_REWARDS[kind] ?? 0;

  // A pass interception is a negative outcome for the attacking passer, not
  // a positive outcome for the defending team that made the interception.
  if (kind === 'pass-interception') {
    const defending = data.to;
    side = defending === 'home' ? 1 : defending === 'away' ? 0 : -1;
  }
  if (kind === 'turnover') {
    const losingSide = data.from;
    side = losingSide === 'home' ? 0 : losingSide === 'away' ? 1 : side;
  }

  if (kind === 'shot-resolution') {
    side = data.side === 'home' ? 0 : data.side === 'away' ? 1 : -1;
    if (data.goal === true) reward = 1;
    else if (data.blocked === true) reward = -0.035;
    else if (data.onTarget === false) reward = -0.06;
    else if (data.saved === true) reward = -0.025;
    else if (data.goalieDeflection === true) reward = 0.005;
    else reward = 0.02;
  }

  // Goalie saves are defensive outcomes; this dataset currently trains the
  // attacking decision policy, so do not award them to the shooter.
  if (kind === 'goalie-save' || kind === 'goalie-deflection') reward = 0;

  const compact: Record<string, number | string | boolean> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') compact[key] = value;
  }
  episode.events.push({ t: Number(t.toFixed(2)), kind, side, reward, data: Object.keys(compact).length ? compact : undefined });
  if (episode.events.length > 400) episode.events.shift();
}

export function finalizeTrainingEpisode(
  episode: TrainingEpisode | null,
  result: { home: string; away: string; score: string; duration: number }
): Record<string, unknown> | undefined {
  if (!episode) return undefined;
  const scoredDecisions = scoreTrainingDecisions(episode.decisions, episode.events);
  const attackDataset = buildAttackTrainingDataset(scoredDecisions);
  return {
    schemaVersion: episode.schemaVersion,
    id: episode.id,
    createdAt: episode.createdAt,
    frameInterval: episode.frameInterval,
    teams: { home: result.home, away: result.away },
    result: { score: result.score, duration: Number(result.duration.toFixed(2)) },
    frameCount: episode.frames.length,
    eventCount: episode.events.length,
    decisionCount: episode.decisions.length,
    attackSampleCount: attackDataset.length,
    attackDataset,
    decisions: scoredDecisions,
    frames: episode.frames,
    events: episode.events,
  };
}
