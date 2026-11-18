import './style.css';

type Player = { name: string; speed: number; agility: number; strength: number; stamina: number; reaction: number; goalie?: boolean };
type Side = { name: string; short: string; color: string; players: Player[]; goalie: Player };
type ShiftResult = { goal: boolean; scorer: string; goalie: string; shot: boolean };

const names = ['Волков','Морозов','Соколов','Кузнецов','Орлов','Белов','Фёдоров','Зайцев','Громов','Лебедев','Титов','Крылов'];
const makePlayer = (i: number, goalie = false): Player => ({
  name: names[i % names.length],
  speed: 48 + Math.floor(Math.random() * 43),
  agility: 48 + Math.floor(Math.random() * 43),
  strength: 48 + Math.floor(Math.random() * 43),
  stamina: 48 + Math.floor(Math.random() * 43),
  reaction: goalie ? 55 + Math.floor(Math.random() * 40) : 0,
  goalie
});
const home: Side = { name: 'СЕВЕРНЫЕ ВОЛКИ', short: 'ВОЛКИ', color: '#35b9ff', players: Array.from({length:5},(_,i)=>makePlayer(i)), goalie: makePlayer(7,true) };
const away: Side = { name: 'ЛЕДЯНЫЕ ЯСТРЕБЫ', short: 'ЯСТРЕБЫ', color: '#ffb547', players: Array.from({length:5},(_,i)=>makePlayer(i+5)), goalie: makePlayer(10,true) };

let period = 1, shift = 0, homeScore = 0, awayScore = 0, finished = false, busy = false;
let log: string[] = ['Матч готов. Нажми «Следующая смена», чтобы начать.'];
let lastEvent = 'МАТЧ НАЧИНАЕТСЯ';
let homeFatigue = 1, awayFatigue = 1;
let timer: number | undefined;

const attackPower = (p: Player[]) => p.reduce((s,x,i)=>s + (x.speed + x.agility + x.strength*.7 + x.stamina*.5) * (i===0?1.2:i<3?1:.6),0);
const defensePower = (p: Player[]) => p.reduce((s,x,i)=>s + (x.strength + x.agility*.8 + x.stamina*.7 + x.speed*.5) * (i===0?.6:i<3?.8:1.2),0);
function resolve(att: Side, def: Side, attFatigue: number, defFatigue: number): ShiftResult {
  const a = attackPower(att.players) * (.5 + .5 * attFatigue);
  const d = defensePower(def.players) * (.5 + .5 * defFatigue);
  const g = (def.goalie.reaction*1.5 + def.goalie.agility + def.goalie.strength*.5 + def.goalie.stamina*.7);
  const shot = Math.random() < Math.max(.15,Math.min(.85,a/(a+d*.7)));
  const goal = shot && Math.random() < Math.max(.05,Math.min(.45,a/(a+g*1.4))*(.85+Math.random()*.3));
  return { goal, shot, scorer: att.players[Math.floor(Math.random()*3)].name, goalie: def.goalie.name };
}
function addLog(s: string) { log = [s, ...log].slice(0, 7); }
function render() {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <main class="shell">
      <header class="top"><div class="brand"><div class="crest">🏒</div><div><div class="eyebrow">HOCKEY MANAGER</div><h1>Тестовый матч</h1></div></div><span class="live">${finished?'МАТЧ ЗАВЕРШЁН':busy?'ИДЁТ ИГРА':'ГОТОВ К ИГРЕ'}</span></header>
      <section class="scoreboard">
        <div class="team home"><span class="team-mark">🐺</span><span class="team-name">${home.name}</span><b>${homeScore}</b></div>
        <div class="center-score"><span>СЧЁТ</span><strong>:</strong><small>${finished?'ФИНАЛ':period+' ПЕРИОД · '+(shift+1)+' СМЕНА'}</small></div>
        <div class="team away"><b>${awayScore}</b><span class="team-name">${away.name}</span><span class="team-mark">🦅</span></div>
      </section>
      <section class="rink-wrap"><div class="rink-head"><span>ЛЕДОВАЯ АРЕНА</span><span>3 × 5 СМЕН</span></div>
        <div class="rink" id="rink"><div class="redline"></div><div class="blueline left"></div><div class="blueline right"></div><div class="circle c1"></div><div class="circle c2"></div><div class="goal leftgoal"></div><div class="goal rightgoal"></div>
          <div class="players home-p">${home.players.map((p,i)=>`<span class="skater" style="left:${18+(i%3)*9}%;top:${22+Math.floor(i/3)*48}%">${i+1}</span>`).join('')}</div>
          <div class="players away-p">${away.players.map((p,i)=>`<span class="skater" style="right:${18+(i%3)*9}%;top:${22+Math.floor(i/3)*48}%">${i+1}</span>`).join('')}</div>
          <span class="goalie home-g">ВР</span><span class="goalie away-g">ВР</span><span class="puck" id="puck">●</span>
          <div class="rink-message" id="rink-message">${lastEvent}</div>
        </div>
      </section>
      <section class="below">
        <div class="panel controls"><div class="panel-title">УПРАВЛЕНИЕ МАТЧЕМ</div><p>${finished?'Матч окончен. Можно сыграть ещё раз.':'Смена за сменой — следи за ходом игры.'}</p>
          <button class="primary" id="next" ${busy||finished?'disabled':''}>${finished?'Матч завершён':'Следующая смена'} <span>→</span></button>
          <button class="secondary" id="auto" ${busy||finished?'disabled':''}>▶ Автопроигрывание</button>
          <button class="secondary" id="restart">↻ Новый матч</button>
          <div class="progress"><div style="width:${((period-1)*5+shift)/15*100}%"></div></div><small>ПРОГРЕСС МАТЧА · ${Math.min(15,(period-1)*5+shift)} / 15</small>
        </div>
        <div class="panel"><div class="panel-title">ХОД МАТЧА <span class="dot"></span></div><div class="events">${log.map((x,i)=>`<div class="event ${i===0?'latest':''}"><i></i><span>${x}</span></div>`).join('')}</div></div>
      </section>
      <footer>WEB PLAYTEST · ПРОТОТИП ДЛЯ ПРОВЕРКИ НА IPHONE</footer>
    </main>`;
  document.querySelector('#next')?.addEventListener('click', playShift);
  document.querySelector('#auto')?.addEventListener('click', autoPlay);
  document.querySelector('#restart')?.addEventListener('click', reset);
}
function animatePuck(homeAttack: boolean) {
  const puck = document.querySelector<HTMLElement>('#puck');
  if (!puck) return;
  puck.style.left = homeAttack ? '76%' : '24%';
  puck.style.top = '50%';
  puck.classList.add('moving');
}
function playShift() {
  if (busy || finished) return;
  busy = true; render();
  const homeAttack = resolve(home, away, homeFatigue, awayFatigue);
  const awayAttack = resolve(away, home, awayFatigue, homeFatigue);
  animatePuck(true);
  window.setTimeout(() => {
    if (homeAttack.goal) { homeScore++; lastEvent = 'ГООООЛ!'; addLog('ГОЛ! '+homeAttack.scorer+' — '+home.short+' ('+homeScore+':'+awayScore+')'); }
    else { lastEvent = homeAttack.shot ? 'СЕЙВ ВРАТАРЯ' : 'БРОСОК НЕ СОСТОЯЛСЯ'; addLog(homeAttack.shot ? 'Сейв '+homeAttack.goalie+' после атаки '+home.short : home.short+': атака остановлена'); }
    animatePuck(false);
    window.setTimeout(() => {
      if (awayAttack.goal) { awayScore++; lastEvent = 'ГОЛ ГОСТЕЙ'; addLog('ГОЛ! '+awayAttack.scorer+' — '+away.short+' ('+homeScore+':'+awayScore+')'); }
      else { lastEvent = 'СЕЙВ'; addLog(awayAttack.shot ? 'Сейв вратаря '+home.short : away.short+': атака остановлена'); }
      homeFatigue = Math.max(0,homeFatigue-.08); awayFatigue = Math.max(0,awayFatigue-.08);
      shift++;
      if (shift >= 5) { period++; shift=0; homeFatigue=Math.min(1,homeFatigue+.12); awayFatigue=Math.min(1,awayFatigue+.12); }
      if (period > 3) { finished=true; lastEvent=homeScore>awayScore?'ПОБЕДА!':homeScore<awayScore?'ПОРАЖЕНИЕ':'НИЧЬЯ'; addLog('ФИНАЛЬНЫЙ СЧЁТ '+homeScore+':'+awayScore+' · '+lastEvent); }
      busy=false; render();
    }, 950);
  }, 950);
}
function autoPlay() {
  if (busy || finished) return;
  const run = () => { if (finished) { if(timer) window.clearInterval(timer); return; } if(!busy) playShift(); };
  run();
  timer = window.setInterval(run, 2200);
}
function reset() {
  if(timer) window.clearInterval(timer);
  period=1; shift=0; homeScore=0; awayScore=0; finished=false; busy=false; homeFatigue=1; awayFatigue=1; log=['Матч готов. Нажми «Следующая смена», чтобы начать.']; lastEvent='МАТЧ НАЧИНАЕТСЯ'; render();
}
render();
