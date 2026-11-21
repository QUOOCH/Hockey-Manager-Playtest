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
  goal: 1,
  'goal-event': 1,
  'pass-complete': 0.055,
  'pass-interception': -0.09,
  turnover: -0.1,
  'shot-decision': 0.012,
  'shot-resolution': 0.018,
  'goalie-save': 0.12,
  'save-event': 0.12,
  'block-event': 0.08,
  'deflection-event': 0.035,
  'missed-shot': -0.045,
  'blocked-shot': 0.025,
  'faceoff': 0.015,
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
  const side: -1 | 0 | 1 = rawSide === 'home' ? 0 : rawSide === 'away' ? 1 : -1;
  const reward = EVENT_REWARDS[kind] ?? 0;
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
    decisions: episode.decisions,
    frames: episode.frames,
    events: episode.events,
  };
}
