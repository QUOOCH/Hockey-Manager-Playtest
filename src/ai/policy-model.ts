import type { AttackAction, AttackObservation } from './decision';

const FEATURE_NAMES = [
  'goalDistance',
  'centrality',
  'shootingLane',
  'shotProbability',
  'passAvailable',
  'passProbability',
  'passScore',
] as const;
const ACTIONS: AttackAction[] = ['hold', 'pass', 'shoot'];

type AttackPolicyModel = {
  schemaVersion: 1;
  model: 'linear-softmax-v1';
  featureNames: string[];
  actions: string[];
  weights: number[][];
};

export type AttackPolicySuggestion = {
  action: AttackAction;
  confidence: number;
  probabilities: Record<AttackAction, number>;
};

let activeModel: AttackPolicyModel | null = null;
let loading: Promise<boolean> | null = null;

function isValidModel(value: unknown): value is AttackPolicyModel {
  if (!value || typeof value !== 'object') return false;
  const model = value as Partial<AttackPolicyModel>;
  return model.schemaVersion === 1 &&
    model.model === 'linear-softmax-v1' &&
    Array.isArray(model.featureNames) &&
    model.featureNames.length === FEATURE_NAMES.length &&
    model.featureNames.every((name, index) => name === FEATURE_NAMES[index]) &&
    Array.isArray(model.actions) &&
    model.actions.length === ACTIONS.length &&
    model.actions.every((action, index) => action === ACTIONS[index]) &&
    Array.isArray(model.weights) &&
    model.weights.length === ACTIONS.length &&
    model.weights.every((row) => Array.isArray(row) && row.length === FEATURE_NAMES.length + 1 &&
      row.every((weight) => typeof weight === 'number' && Number.isFinite(weight)));
}

/**
 * Load an offline-trained candidate from the static game bundle.
 * Missing/invalid files are intentionally ignored so the hand-authored policy
 * remains the safe fallback until a candidate is reviewed and published.
 */
export function loadAttackPolicyModel(): Promise<boolean> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const url = new URL('./ai/attack-policy.json', document.baseURI);
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return false;
      const candidate: unknown = await response.json();
      if (!isValidModel(candidate)) return false;
      activeModel = candidate;
      return true;
    } catch {
      return false;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

function softmax(scores: number[]): number[] {
  const peak = Math.max(...scores);
  const values = scores.map((score) => Math.exp(Math.max(-30, Math.min(30, score - peak))));
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  return values.map((value) => value / total);
}

/**
 * Shadow-only inference: returns a suggestion for diagnostics but never
 * changes the live match decision. Promotion to active control is a separate,
 * explicit step after held-out evaluation.
 */
export function getAttackPolicySuggestion(observation: AttackObservation & { passScore?: number }): AttackPolicySuggestion | null {
  if (!activeModel) return null;
  const features = [
    Math.max(0, Math.min(400, observation.goalDistance)) / 400,
    Math.max(0, Math.min(1, observation.centrality)),
    observation.shootingLane ? 1 : 0,
    Math.max(0, Math.min(1, observation.shotProbability)),
    observation.passAvailable ? 1 : 0,
    Math.max(0, Math.min(1, observation.passProbability)),
    (Math.max(-100, Math.min(200, observation.passScore ?? 0)) + 100) / 300,
  ];
  const vector = [1, ...features];
  const probabilities = softmax(activeModel.weights.map((row) =>
    row.reduce((sum, weight, index) => sum + weight * vector[index], 0)
  ));
  const best = probabilities.indexOf(Math.max(...probabilities));
  return {
    action: ACTIONS[best],
    confidence: Number(probabilities[best].toFixed(4)),
    probabilities: {
      hold: Number(probabilities[0].toFixed(4)),
      pass: Number(probabilities[1].toFixed(4)),
      shoot: Number(probabilities[2].toFixed(4)),
    },
  };
}
