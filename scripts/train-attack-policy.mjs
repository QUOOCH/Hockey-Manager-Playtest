#!/usr/bin/env node
import fs from 'node:fs';

const INPUT = process.argv[2] || 'latest-matches.json';
const OUTPUT = process.argv[3] || 'attack-policy-candidate.json';
const REPORT = process.argv[4] || 'training-report.json';
const FEATURE_COUNT = 7;
const ACTIONS = ['hold', 'pass', 'shoot'];
const MIN_MATCHES = 5;
const MIN_SAMPLES = 300;
const MIN_SCORED = 30;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const softmax = (scores) => {
  const peak = Math.max(...scores);
  const values = scores.map((value) => Math.exp(clamp(value - peak, -30, 30)));
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  return values.map((value) => value / total);
};

function extractMatches(root) {
  const rows = Array.isArray(root) ? root : Array.isArray(root?.matches) ? root.matches : [];
  const matches = [];
  for (const row of rows) {
    const payload = row?.payload ?? row;
    const training = payload?.training ?? payload?.trainingEpisode ?? payload?.training_episode;
    const samples = training?.attackDataset ?? training?.attack_dataset;
    if (!Array.isArray(samples) || !samples.length) continue;
    const id = String(row?.id ?? payload?.id ?? training?.id ?? matches.length);
    const clean = samples.filter((sample) =>
      Array.isArray(sample?.features) &&
      sample.features.length === FEATURE_COUNT &&
      sample.features.every((value) => Number.isFinite(value)) &&
      Number.isInteger(sample.action) && sample.action >= 0 && sample.action < ACTIONS.length &&
      Number.isFinite(sample.reward)
    ).map((sample) => ({
      features: sample.features.map((value) => clamp(value, -2, 2)),
      action: sample.action,
      reward: clamp(sample.reward, -2, 2),
    }));
    const decisions = Array.isArray(training?.decisions) ? training.decisions : [];
    if (clean.length) matches.push({ id, createdAt: String(row?.createdAt ?? row?.created_at ?? payload?.createdAt ?? ''), samples: clean, decisions });
  }
  return matches;
}

function train(samples, epochs = 650) {
  const weights = Array.from({ length: ACTIONS.length }, () => Array(FEATURE_COUNT + 1).fill(0));
  const learningRate = 0.055;
  const l2 = 0.0015;
  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradients = weights.map(() => Array(FEATURE_COUNT + 1).fill(0));
    let totalWeight = 0;
    for (const sample of samples) {
      const x = [1, ...sample.features];
      const probabilities = softmax(weights.map((row) => row.reduce((sum, value, i) => sum + value * x[i], 0)));
      // Reward-weighted imitation over the expanded persistent match archive: reinforce useful decisions and reduce the
      // influence of neutral or unsuccessful actions without reversing labels.
      const sampleWeight = sample.reward > 0
        ? 1 + Math.min(2, sample.reward * 3)
        : sample.reward < 0
          ? Math.max(0.15, 1 + sample.reward * 3)
          : 0.45;
      totalWeight += sampleWeight;
      for (let action = 0; action < ACTIONS.length; action++) {
        const error = (probabilities[action] - (sample.action === action ? 1 : 0)) * sampleWeight;
        for (let feature = 0; feature < x.length; feature++) {
          gradients[action][feature] += error * x[feature];
        }
      }
    }
    const scale = 1 / Math.max(1, totalWeight);
    for (let action = 0; action < ACTIONS.length; action++) {
      for (let feature = 0; feature < weights[action].length; feature++) {
        const penalty = feature === 0 ? 0 : l2 * weights[action][feature];
        weights[action][feature] -= learningRate * (gradients[action][feature] * scale + penalty);
      }
    }
  }
  return weights.map((row) => row.map((value) => Number(value.toFixed(7))));
}

function evaluate(samples, weights) {
  if (!samples.length) return { samples: 0, accuracy: null, logLoss: null, baselineAccuracy: null };
  let correct = 0;
  let loss = 0;
  const counts = [0, 0, 0];
  for (const sample of samples) {
    counts[sample.action]++;
    const x = [1, ...sample.features];
    const probabilities = softmax(weights.map((row) => row.reduce((sum, value, i) => sum + value * x[i], 0)));
    const predicted = probabilities.indexOf(Math.max(...probabilities));
    if (predicted === sample.action) correct++;
    loss -= Math.log(Math.max(1e-9, probabilities[sample.action]));
  }
  const majority = Math.max(...counts);
  return {
    samples: samples.length,
    accuracy: Number((correct / samples.length).toFixed(4)),
    logLoss: Number((loss / samples.length).toFixed(4)),
    baselineAccuracy: Number((majority / samples.length).toFixed(4)),
    classCounts: { hold: counts[0], pass: counts[1], shoot: counts[2] },
  };
}

let root;
try {
  root = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
} catch (error) {
  console.error('Cannot read training input:', error.message);
  process.exit(1);
}

const archivedMatchCount = Array.isArray(root?.matches) ? root.matches.length : Array.isArray(root) ? root.length : 0;
const matches = extractMatches(root);
const matchesWithoutTraining = Math.max(0, archivedMatchCount - matches.length);
const allSamples = matches.flatMap((match) => match.samples);
const scoredSamples = allSamples.filter((sample) => Math.abs(sample.reward) > 0.0001);
const sortedMatches = [...matches].sort((a, b) => {
  const ta = Date.parse(a.createdAt) || 0;
  const tb = Date.parse(b.createdAt) || 0;
  return ta - tb || a.id.localeCompare(b.id);
});
const splitAt = Math.max(1, Math.floor(sortedMatches.length * 0.8));
const trainingMatches = sortedMatches.slice(0, splitAt);
const validationMatches = sortedMatches.slice(splitAt);
const trainingSamples = trainingMatches.flatMap((match) => match.samples);
const validationSamples = validationMatches.flatMap((match) => match.samples);
const classCounts = [0, 0, 0];
for (const sample of allSamples) classCounts[sample.action]++;

const shadowRows = matches.flatMap((match) => match.decisions
  .filter((decision) => ACTIONS.includes(decision?.action) &&
    ACTIONS.includes(decision?.modelSuggestion?.action) &&
    Number.isFinite(decision?.outcomeReward))
  .map((decision) => ({
    baselineAction: decision.action,
    modelAction: decision.modelSuggestion.action,
    confidence: Number.isFinite(decision.modelSuggestion.confidence) ? decision.modelSuggestion.confidence : null,
    baselineOutcomeReward: decision.outcomeReward,
  })));
const shadowAgreement = shadowRows.filter((row) => row.baselineAction === row.modelAction);
const shadowDisagreement = shadowRows.filter((row) => row.baselineAction !== row.modelAction);
const shadowActionCounts = { hold: 0, pass: 0, shoot: 0 };
for (const row of shadowRows) shadowActionCounts[row.modelAction]++;
const average = (rows, key) => rows.length
  ? Number((rows.reduce((sum, row) => sum + row[key], 0) / rows.length).toFixed(4))
  : null;
const shadowAnalysis = {
  decisionsWithSuggestion: shadowRows.length,
  agreementRate: shadowRows.length ? Number((shadowAgreement.length / shadowRows.length).toFixed(4)) : null,
  modelActionCounts: shadowActionCounts,
  averageConfidence: average(shadowRows.filter((row) => row.confidence !== null), 'confidence'),
  baselineRewardWhenModelAgreed: average(shadowAgreement, 'baselineOutcomeReward'),
  baselineRewardWhenModelDisagreed: average(shadowDisagreement, 'baselineOutcomeReward'),
  interpretation: 'Outcome rewards belong to the action actually executed by the baseline AI; disagreement rows are descriptive only and do not measure the unplayed model action.'
};

const report = {
  status: 'insufficient-data',
  generatedAt: new Date().toISOString(),
  archivedMatchCount,
  sourceMatches: matches.length,
  matchesWithoutTraining,
  sampleCount: allSamples.length,
  scoredSampleCount: scoredSamples.length,
  actionCounts: { hold: classCounts[0], pass: classCounts[1], shoot: classCounts[2] },
  thresholds: { minMatches: MIN_MATCHES, minSamples: MIN_SAMPLES, minScoredSamples: MIN_SCORED },
  shadowAnalysis,
  validation: null,
  reason: '',
};

if (matches.length < MIN_MATCHES || allSamples.length < MIN_SAMPLES || scoredSamples.length < MIN_SCORED) {
  report.reason = 'Waiting for more matches recorded with the structured attack-training episode.';
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  fs.rmSync(OUTPUT, { force: true });
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (!validationSamples.length || new Set(validationSamples.map((sample) => sample.action)).size < 2) {
  report.reason = 'Not enough action diversity in the held-out match set.';
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  fs.rmSync(OUTPUT, { force: true });
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const weights = train(trainingSamples);
const validation = evaluate(validationSamples, weights);
const training = evaluate(trainingSamples, weights);
report.status = 'candidate-trained';
report.reason = 'Candidate trained and evaluated on held-out matches; it is not deployed to gameplay.';
report.training = training;
report.validation = validation;
report.model = 'linear-softmax-v1';
report.featureCount = FEATURE_COUNT;
fs.writeFileSync(OUTPUT, JSON.stringify({
  schemaVersion: 1,
  model: 'linear-softmax-v1',
  trainedAt: report.generatedAt,
  featureNames: ['goalDistance', 'centrality', 'shootingLane', 'shotProbability', 'passAvailable', 'passProbability', 'passScore'],
  actions: ACTIONS,
  weights,
  trainingMatches: trainingMatches.map((match) => match.id),
  validationMatches: validationMatches.map((match) => match.id),
  metrics: { training, validation },
}, null, 2) + '\n');
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
