import './tamagotchi.css';

type Gear='Шлем'|'Джерси'|'Перчатки'|'Клюшка'|'Коньки';
const gear:Gear[]=['Шлем','Джерси','Перчатки','Клюшка','Коньки'];
let active:Gear='Джерси';
let level=7, xp=64, power=82;
const app=document.querySelector<HTMLDivElement>('#app')!;
const icon:Record<Gear,string>={Шлем:'⛑️',Джерси:'🥋',Перчатки:'🧤',Клюшка:'🏒',Коньки:'⛸️'};
function render(){
app.innerHTML=`
<div class="game-shell">
<header class="topbar">
 <div class="club"><div class="crest">💧</div><div><b>PUCK IT!</b><small>ICE BREAKERS · КЛУБ</small></div></div>
 <div class="level"><span>УР. ${level}</span><div class="xp"><i style="width:${xp}%"></i></div></div>
 <div class="wallet"><span>🟢 12 450</span><span>🟡 320</span></div>
</header>
<main>
 <section class="player-zone">
  <div class="zone-head"><span class="eyebrow">ТВОЙ ИГРОК</span><span class="online">● НА ЛЬДУ</span></div>
  <div class="ambient ambient-a"></div><div class="ambient ambient-b"></div>
  <div class="ice-ring"></div>
  <div class="player-wrap" id="player"><img src="/player-customization/puckit-player-front.webp" alt="Мультяшный хоккеист PUCK IT" class="player-art"/><svg class="player-stick" viewBox="0 0 360 150" aria-hidden="true"><defs><linearGradient id="stick-metal" x1="0" x2="1"><stop stop-color="#f8fbff"/><stop offset=".48" stop-color="#46556c"/><stop offset="1" stop-color="#dce6f1"/></linearGradient></defs><path d="M38 76 L287 105 Q309 107 322 87 L345 47" fill="none" stroke="#10172d" stroke-width="15" stroke-linecap="round"/><path d="M38 71 L287 100 Q309 102 322 82 L345 42" fill="none" stroke="url(#stick-metal)" stroke-width="8" stroke-linecap="round"/><path d="M319 86 L345 42" fill="none" stroke="#f6f8ff" stroke-width="12" stroke-linecap="round"/><path d="M325 78 L340 51" fill="none" stroke="#a8b8cb" stroke-width="2"/></svg><div class="player-sticker">★</div></div>
  <div class="player-meta"><div><h1>ICE GUARDIAN</h1><p>ЦЕНТРАЛЬНЫЙ · № 07</p></div><div class="rating"><strong>${power}</strong><small>РЕЙТИНГ</small></div></div>
  <div class="stats"><div><span>СКОРОСТЬ</span><b>84</b><i><em style="width:84%"></em></i></div><div><span>СИЛА</span><b>76</b><i><em style="width:76%"></em></i></div><div><span>ЛОВКОСТЬ</span><b>91</b><i><em style="width:91%"></em></i></div></div>
 </section>
 <section class="wardrobe">
  <div class="section-title"><div><span class="eyebrow">ПЕРСОНАЛИЗАЦИЯ</span><h2>Экипировка</h2></div><button class="text-btn" id="all-gear">Весь гардероб ↗</button></div>
  <div class="gear-row">${gear.map(g=>`<button class="gear ${g===active?'selected':''}" data-gear="${g}"><span>${icon[g]}</span><small>${g}</small><i></i></button>`).join('')}</div>
  <div class="gear-note" id="gear-note"><span>✨</span><div><b>${active} · Эпический</b><small>Экипировка меняет стиль и усиливает игрока</small></div><button id="equip">УЛУЧШИТЬ</button></div>
 </section>
 <section class="progress-card"><div><span class="eyebrow">ПУТЬ ИГРОКА</span><h2>Следующий уровень ближе</h2><p>Ещё 36 XP до уровня 8</p></div><div class="progress-orb">7<small>LVL</small></div></section>
</main>
<nav class="bottom-nav"><button class="nav-active"><span>🏠</span>Главная</button><button><span>🧍</span>Игрок</button><button><span>🎒</span>Коллекция</button><button><span>🏆</span>Лига</button><button><span>🏟️</span>Клуб</button></nav>
</div>`;
app.querySelectorAll<HTMLButtonElement>('[data-gear]').forEach(btn=>btn.addEventListener('click',()=>{active=btn.dataset.gear as Gear;const p=document.querySelector('#player')!;p.classList.remove('equip-pop');void (p as HTMLElement).offsetWidth;p.classList.add('equip-pop');render();}));
document.querySelector('#equip')?.addEventListener('click',()=>{power=Math.min(99,power+1);xp=Math.max(0,xp-4);render();requestAnimationFrame(()=>document.querySelector('#player')?.classList.add('equip-pop'));});
document.querySelector('#all-gear')?.addEventListener('click',()=>{const note=document.querySelector('#gear-note');if(note)note.classList.toggle('expanded');});
}
render();
