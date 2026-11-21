import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = process.env.GAME_URL || 'https://quooch.github.io/Hockey-Manager-Playtest/';
const MATCHES = Math.max(1, Math.min(60, Number(process.env.MATCHES || 3)));
const BATCH_STEPS = Math.max(2, Math.min(480, Number(process.env.BATCH_STEPS || 120)));
const WORKER_ENDPOINT = 'https://little-morning-b296.bratskiymax0.workers.dev/telemetry/matches';

function makeSeedTeam() {
  const skaters = Array.from({ length: 20 }, (_, i) => ({
    id: 'batch-p' + (i + 1), name: ['Александр','Максим','Даниил','Артём','Илья'][i % 5] + ' ' + ['Ледов','Северный','Ветров','Орлов'][Math.floor(i / 5)],
    rarity: 'RARE', isGoalie: false,
    speed: 68 + (i * 7) % 17, agility: 67 + (i * 5) % 19,
    strength: 66 + (i * 3) % 20, stamina: 72 + (i * 11) % 16, reaction: 0
  }));
  const goalies = [0, 1].map(i => ({
    id: 'batch-g' + (i + 1), name: i ? 'Резервный Страж' : 'Алексей Страж',
    rarity: 'EPIC', isGoalie: true, speed: 0,
    agility: 76 + i * 3, strength: 74 + i * 2, stamina: 82, reaction: 80 + i * 4
  }));
  return {
    name: 'PUCK IT! Batch Lab', allCards: [...skaters, ...goalies],
    lines: Array.from({ length: 4 }, (_, line) => ({
      center: skaters[line * 5], leftWing: skaters[line * 5 + 1],
      rightWing: skaters[line * 5 + 2], defense1: skaters[line * 5 + 3],
      defense2: skaters[line * 5 + 4]
    })),
    goalie1: goalies[0], goalie2: goalies[1],
    club: { displayName: 'PUCK IT! LAB', logo: '🏒', primaryColor: '#246BCE', secondaryColor: '#FFFFFF', homeJersey: 'Домашняя', awayJersey: 'Гостевая' },
    equipment: {}, ownedEquipmentIds: [],
    stadium: { name: 'Batch Arena', capacityLevel: 1, lightingLevel: 1, scoreboardLevel: 1, lockerRoomLevel: 1, iceLevel: 1, vipLevel: 1, coins: 1000 },
    economy: { dollars: 5000, goldPucks: 25, matchesPlayed: 0, homeMatches: 0, totalEarned: 0 },
    rosterVersion: 3
  };
}

const seedTeam = makeSeedTeam();
const hero = { role: 'C', name: 'Batch Captain', level: 1, xp: 0, skillPoints: 5, stats: { speed: 72, agility: 76, strength: 62, stamina: 70, reaction: 42 }, gear: [], trophies: [] };
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(30000);
await page.addInitScript(({ team, hero }) => {
  localStorage.setItem('hockey-manager-web-save-v2', JSON.stringify(team));
  localStorage.setItem('hockey-puckit-hero-v1', JSON.stringify(hero));
  localStorage.setItem('puckit-sound-enabled', '0');
}, { team: seedTeam, hero });

const results = [];
const batchStarted = Date.now();
try {
  for (let index = 0; index < MATCHES; index++) {
    if (index === 0) {
      const url = new URL(BASE_URL);
      url.searchParams.set('batch', '1');
      url.searchParams.set('batchSteps', String(BATCH_STEPS));
      url.searchParams.set('batchRun', String(Date.now()));
      await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
      await page.locator('[data-screen="match"]').first().click();
    } else {
      await page.locator('[data-action="new-match"]').click();
    }
    await page.locator('[data-action="start-match"]').waitFor();
    await page.locator('[data-action="start-match"]').click();
    await page.locator('#match-live-clock').waitFor();

    const started = Date.now();
    const telemetryPromise = page.waitForResponse(response =>
      response.url() === WORKER_ENDPOINT && response.request().method() === 'POST',
      { timeout: 60000 }
    );
    try {
      await page.locator('[data-action="new-match"]').waitFor({ state: 'visible', timeout: 90000 });
    } catch (error) {
      const diagnostics = await page.evaluate(() => ({
        url: location.href,
        clock: document.querySelector('#match-live-clock')?.textContent?.trim() || null,
        finalButton: document.querySelector('[data-action="new-match"]')?.textContent?.trim() || null,
        fastForwardLabel: document.querySelector('[data-action="fast-forward-match"]')?.textContent?.trim() || null,
        queueLength: (() => { try { return JSON.parse(localStorage.getItem('puckit-match-log-queue-v1') || '[]').length; } catch { return -1; } })(),
        visibleText: document.body.innerText.slice(-1800)
      }));
      await page.screenshot({ path: 'batch-failure.png', fullPage: true });
      console.error('MATCH_DIAGNOSTICS ' + JSON.stringify(diagnostics));
      throw error;
    }
    const telemetry = await telemetryPromise;
    if (!telemetry.ok()) throw new Error('Telemetry POST failed: HTTP ' + telemetry.status());
    const posted = telemetry.request().postDataJSON();
    const training = posted?.training || posted?.trainingEpisode || {};
    const row = {
      index: index + 1,
      matchId: posted?.id || null,
      score: posted?.match?.score || (
        (await page.locator('#home-live-score').textContent()) + ':' +
        (await page.locator('#away-live-score').textContent())
      ),
      wallSeconds: Number(((Date.now() - started) / 1000).toFixed(3)),
      telemetryStatus: telemetry.status(),
      frameCount: training.frameCount ?? null,
      eventCount: training.eventCount ?? null,
      decisionCount: training.decisionCount ?? null,
      attackSampleCount: training.attackSampleCount ?? null
    };
    results.push(row);
    console.log(JSON.stringify(row));
  }
} finally {
  await browser.close();
}

const totalSeconds = Number(((Date.now() - batchStarted) / 1000).toFixed(3));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  gameUrl: BASE_URL,
  requestedMatches: MATCHES,
  completedMatches: results.length,
  batchSteps: BATCH_STEPS,
  totalWallSeconds: totalSeconds,
  matchesPerMinute: Number((results.length / Math.max(totalSeconds, 0.001) * 60).toFixed(2)),
  results
};
fs.writeFileSync('batch-results.json', JSON.stringify(report, null, 2) + '\\n');
console.log('BATCH_REPORT ' + JSON.stringify(report));
if (results.length !== MATCHES) process.exitCode = 1;
