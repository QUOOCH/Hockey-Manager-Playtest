export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type PlayerCard = {
  id: string; name: string; rarity: Rarity; isGoalie: boolean;
  speed: number; agility: number; strength: number; stamina: number; reaction: number;
};
export type RosterLine = {
  center: PlayerCard | null; leftWing: PlayerCard | null; rightWing: PlayerCard | null;
  defense1: PlayerCard | null; defense2: PlayerCard | null;
};
export type EquipmentItem = {
  id: string; name: string; slot: string; rarity: Rarity;
  speedBonus: number; agilityBonus: number; strengthBonus: number;
  staminaBonus: number; reactionBonus: number; dollarPrice: number; goldPuckPrice: number;
};
export type ClubEconomy = {
  dollars: number; goldPucks: number; matchesPlayed: number; homeMatches: number; totalEarned: number;
};
export type Team = {
  name: string; allCards: PlayerCard[]; lines: RosterLine[];
  goalie1: PlayerCard | null; goalie2: PlayerCard | null;
  club: { displayName: string; logo: string; primaryColor: string; secondaryColor: string; homeJersey: string; awayJersey: string };
  equipment: Record<string, EquipmentItem[]>; ownedEquipmentIds: string[];
  stadium: { name: string; capacityLevel: number; lightingLevel: number; scoreboardLevel: number; lockerRoomLevel: number; iceLevel: number; vipLevel: number; coins: number };
  economy: ClubEconomy; rosterVersion?: number;
};
export type MatchDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type ShotResult = {
  isGoal: boolean; attackerName: string; scorerName: string | null;
  goalieName: string; attackerIndex: number; goalieSaved: boolean; isShot: boolean; shotX?: number; shotY?: number; blocked?: boolean; blockerIndex?: number;
};
export type MatchEvent = { period: number; shift: number; side: 'home' | 'away'; result: ShotResult; score: string; message: string };
export type MatchState = {
  period: number; shift: number; homeScore: number; awayScore: number;
  homeGoalie1Stamina: number; homeGoalie2Stamina: number;
  awayGoalie1Stamina: number; awayGoalie2Stamina: number;
  homeGoalie1Max: number; homeGoalie2Max: number;
  awayGoalie1Max: number; awayGoalie2Max: number;
  homeUseGoalie2: boolean; awayUseGoalie2: boolean;
  finished: boolean; log: string[]; events: MatchEvent[];
};

const firstNames = ['Иван','Пётр','Сергей','Алексей','Дмитрий','Андрей','Николай','Максим','Артём','Кирилл','Роман','Егор'];
const lastNames = ['Иванов','Петров','Сидоров','Смирнов','Кузнецов','Попов','Волков','Соколов','Морозов','Лебедев','Козлов','Новиков'];
let nextId = 1;
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(items: T[]): T => items[random(0, items.length - 1)];
const rarityRoll = (): Rarity => { const n = random(1,100); return n <= 50 ? 'COMMON' : n <= 80 ? 'RARE' : n <= 95 ? 'EPIC' : 'LEGENDARY'; };
const statRange = (r: Rarity): [number,number] => r === 'COMMON' ? [40,65] : r === 'RARE' ? [60,75] : r === 'EPIC' ? [70,85] : [80,95];
const randomStat = (r: Rarity) => { const [a,b] = statRange(r); return random(a,b); };
const randomName = () => `${pick(firstNames)} ${pick(lastNames)}`;
export const createPlayer = (rarity: Rarity = rarityRoll()): PlayerCard => ({
  id: `p${nextId++}`, name: randomName(), rarity, isGoalie: false,
  speed: randomStat(rarity), agility: randomStat(rarity), strength: randomStat(rarity), stamina: randomStat(rarity), reaction: 0
});
export const createGoalie = (rarity: Rarity = rarityRoll()): PlayerCard => ({
  id: `g${nextId++}`, name: randomName(), rarity, isGoalie: true,
  speed: 0, agility: randomStat(rarity), strength: randomStat(rarity), stamina: randomStat(rarity), reaction: randomStat(rarity)
});
const emptyLine = (): RosterLine => ({center:null,leftWing:null,rightWing:null,defense1:null,defense2:null});
export function createTeam(name = 'Моя команда'): Team {
  return {
    name, allCards: [...Array.from({length:18},()=>createPlayer()),createGoalie(),createGoalie()],
    lines: Array.from({length:4},emptyLine), goalie1:null, goalie2:null,
    club:{displayName:'Моя команда',logo:'🏒',primaryColor:'#246BCE',secondaryColor:'#FFFFFF',homeJersey:'Домашняя',awayJersey:'Гостевая'},
    equipment:{}, ownedEquipmentIds:[],
    stadium:{name:'Ледовая арена',capacityLevel:1,lightingLevel:1,scoreboardLevel:1,lockerRoomLevel:1,iceLevel:1,vipLevel:1,coins:1000},
    economy:{dollars:5000,goldPucks:25,matchesPlayed:0,homeMatches:0,totalEarned:0}, rosterVersion:2
  };
}
export const cardPower = (p: PlayerCard) => p.isGoalie ? (p.reaction+p.agility+p.strength+p.stamina)/4 : (p.speed+p.agility+p.strength+p.stamina)/4;
export function teamPower(t: Team): number {
  const cards = t.lines.flatMap(l=>[l.center,l.leftWing,l.rightWing,l.defense1,l.defense2].filter((x):x is PlayerCard=>!!x));
  cards.push(...[t.goalie1,t.goalie2].filter((x):x is PlayerCard=>!!x));
  return cards.length ? cards.reduce((s,p)=>s+cardPower(p),0)/cards.length : 70;
}
const rarityPriority = (r: Rarity) => ({COMMON:1,RARE:2,EPIC:3,LEGENDARY:4}[r]);
export function autoFillRoster(team: Team): Team {
  const fields = team.allCards.filter(p=>!p.isGoalie).sort((a,b)=>(rarityPriority(b.rarity)*1000+b.speed+b.agility+b.strength+b.stamina)-(rarityPriority(a.rarity)*1000+a.speed+a.agility+a.strength+a.stamina));
  const goalies = team.allCards.filter(p=>p.isGoalie).sort((a,b)=>(rarityPriority(b.rarity)*1000+b.reaction+b.agility+b.strength+b.stamina)-(rarityPriority(a.rarity)*1000+a.reaction+a.agility+a.strength+a.stamina));
  const lines = Array.from({length:4},(_,i)=>({center:fields[i*3]??null,leftWing:fields[i*3+1]??null,rightWing:fields[i*3+2]??null,defense1:i<3?fields[12+i*2]??null:null,defense2:i<3?fields[13+i*2]??null:null}));
  return {...team,rosterVersion:2,lines,goalie1:goalies[0]??null,goalie2:goalies[1]??null};
}
export function applyEquipment(team: Team): Team {
  const adjust = (p: PlayerCard | null): PlayerCard | null => {
    if(!p) return null;
    const gear=team.equipment[p.id]??[];
    const sum=(k:'speedBonus'|'agilityBonus'|'strengthBonus'|'staminaBonus'|'reactionBonus')=>gear.reduce((s,x)=>s+x[k],0);
    return {...p,speed:Math.min(99,Math.max(1,p.speed+sum('speedBonus'))),agility:Math.min(99,Math.max(1,p.agility+sum('agilityBonus'))),strength:Math.min(99,Math.max(1,p.strength+sum('strengthBonus'))),stamina:Math.min(99,Math.max(1,p.stamina+sum('staminaBonus'))),reaction:Math.min(99,Math.max(1,p.reaction+sum('reactionBonus')))};
  };
  return {...team,allCards:team.allCards.map(p=>adjust(p)!),lines:team.lines.map(l=>({center:adjust(l.center),leftWing:adjust(l.leftWing),rightWing:adjust(l.rightWing),defense1:adjust(l.defense1),defense2:adjust(l.defense2)})),goalie1:adjust(team.goalie1),goalie2:adjust(team.goalie2)};
}
export function generateAiTeam(name: string, targetPower: number, statBonus: number): Team {
  const target=Math.min(95,Math.max(20,targetPower+statBonus));
  const scale=(p:PlayerCard):PlayerCard=>{
    const factor=target/Math.max(1,cardPower(p));
    return {...p,speed:p.isGoalie?0:Math.min(99,Math.max(20,Math.trunc(p.speed*factor))),agility:Math.min(99,Math.max(20,Math.trunc(p.agility*factor))),strength:Math.min(99,Math.max(20,Math.trunc(p.strength*factor))),stamina:Math.min(99,Math.max(20,Math.trunc(p.stamina*factor))),reaction:p.isGoalie?Math.min(99,Math.max(20,Math.trunc(p.reaction*factor))):0};
  };
  const fields=Array.from({length:18},()=>scale(createPlayer()));
  const goalies=Array.from({length:2},()=>scale(createGoalie()));
  return {...createTeam(name),allCards:[...fields,...goalies],lines:Array.from({length:4},(_,idx)=>({center:fields[idx*3],leftWing:fields[idx*3+1],rightWing:fields[idx*3+2],defense1:idx<3?fields[12+idx*2]:null,defense2:idx<3?fields[13+idx*2]:null})),rosterVersion:2,goalie1:goalies[0],goalie2:goalies[1]};
}
export const fatigueFactor = (stamina:number) => .5+.5*stamina;
type Line = {center:PlayerCard;leftWing:PlayerCard;rightWing:PlayerCard;defense1:PlayerCard;defense2:PlayerCard};
const attackValue=(p:PlayerCard)=>p.speed+p.agility+p.strength*.7+p.stamina*.5;
const defenseValue=(p:PlayerCard)=>p.strength+p.agility*.8+p.stamina*.7+p.speed*.5;
export function lineAttack(l:Line,s=1){return (attackValue(l.center)*1.2+attackValue(l.leftWing)+attackValue(l.rightWing)+attackValue(l.defense1)*.6+attackValue(l.defense2)*.6)*fatigueFactor(s);}
export function lineDefense(l:Line,s=1){return (defenseValue(l.center)*.6+defenseValue(l.leftWing)*.8+defenseValue(l.rightWing)*.8+defenseValue(l.defense1)*1.2+defenseValue(l.defense2)*1.2)*fatigueFactor(s);}
export function goaliePower(g:PlayerCard,s=1){return (g.reaction*1.5+g.agility+g.strength*.5+g.stamina*.7)*fatigueFactor(s);}
export function resolveShift(attacker:Line,defender:Line,goalie:PlayerCard,attackerStamina=1,defenderStamina=1,goalieStamina=1):ShotResult{
  const attack=lineAttack(attacker,attackerStamina), defense=lineDefense(defender,defenderStamina), gp=goaliePower(goalie,goalieStamina);
  const shotChance=Math.max(.15,Math.min(.85,attack/(attack+defense*.7)));
  const goalChance=Math.max(.02,Math.min(.28,attack/(attack+gp*2.2)));
  const rnd=.85+Math.random()*.3;
  const isShot=Math.random()<shotChance;
  const isGoal=isShot&&Math.random()<(goalChance*rnd);
  const attackerIndex=Math.random()<.5?0:Math.random()<.5?1:2;
  const shooter=[attacker.center,attacker.leftWing,attacker.rightWing][attackerIndex];
  return {isGoal,attackerName:shooter.name,scorerName:isGoal?shooter.name:null,goalieName:goalie.name,attackerIndex,goalieSaved:!isGoal,isShot};
}
export function createMatchState(home:Team,away:Team):MatchState{
  const max=(g:PlayerCard|null)=>Math.min(1,Math.max(.1,(g?.stamina??100)/100));
  return {period:1,shift:1,homeScore:0,awayScore:0,homeGoalie1Max:max(home.goalie1),homeGoalie2Max:max(home.goalie2),awayGoalie1Max:max(away.goalie1),awayGoalie2Max:max(away.goalie2),homeGoalie1Stamina:max(home.goalie1),homeGoalie2Stamina:max(home.goalie2),awayGoalie1Stamina:max(away.goalie1),awayGoalie2Stamina:max(away.goalie2),homeUseGoalie2:false,awayUseGoalie2:false,finished:false,log:[],events:[]};
}
export function playMatchShift(home:Team,away:Team,state:MatchState):MatchState{
  if(state.finished) return state;
  const hLines=home.lines.filter((l):l is {center:PlayerCard;leftWing:PlayerCard;rightWing:PlayerCard;defense1:PlayerCard;defense2:PlayerCard}=>!!(l.center&&l.leftWing&&l.rightWing&&l.defense1&&l.defense2));
  const aLines=away.lines.filter((l):l is {center:PlayerCard;leftWing:PlayerCard;rightWing:PlayerCard;defense1:PlayerCard;defense2:PlayerCard}=>!!(l.center&&l.leftWing&&l.rightWing&&l.defense1&&l.defense2));
  if(!hLines.length||!aLines.length||!home.goalie1||!away.goalie1) throw new Error('Для матча нужно заполнить хотя бы одно звено и первого вратаря.');
  let s={...state,log:[...state.log],events:[...state.events]};
  const active=(side:'home'|'away')=>{
    const use=side==='home'?s.homeUseGoalie2:s.awayUseGoalie2;
    const second=side==='home'?home.goalie2:away.goalie2;
    return use&&second?second:(side==='home'?home.goalie1!:away.goalie1!);
  };
  const homeLine=hLines[(state.shift-1)%hLines.length],awayLine=aLines[(state.shift-1)%aLines.length];
  // Android MatchScreen invokes the no-fatigue playShift overload: probabilities use full strength.
  const homeResult=resolveShift(homeLine,awayLine,active('away'));
  const awayResult=resolveShift(awayLine,homeLine,active('home'));
  const add=(side:'home'|'away',result:ShotResult)=>{
    if(result.isGoal){if(side==='home')s.homeScore++;else s.awayScore++;}
    const scoring=side==='home'?home.name:away.name;
    const msg=result.isGoal?`П${s.period} С${s.shift}: ${result.scorerName} — ГОЛ! (${s.homeScore}:${s.awayScore})`:
      result.isShot?`П${s.period} С${s.shift}: ${result.attackerName} — сейв (${result.goalieName})`:
      `П${s.period} С${s.shift}: ${scoring} — атака остановлена`;
    s.log.push(msg);s.events.push({period:s.period,shift:s.shift,side,result,score:`${s.homeScore}:${s.awayScore}`,message:msg});
  };
  if(Math.random()<.5){add('home',homeResult);add('away',awayResult);}else{add('away',awayResult);add('home',homeResult);}
  const drain=(value:number,max:number)=>Math.max(0,value-.1*max);
  s.homeGoalie1Stamina= s.homeUseGoalie2?s.homeGoalie1Stamina:s.homeGoalie1Stamina;
  if(s.homeUseGoalie2)s.homeGoalie2Stamina=drain(s.homeGoalie2Stamina,s.homeGoalie2Max);else s.homeGoalie1Stamina=drain(s.homeGoalie1Stamina,s.homeGoalie1Max);
  if(s.awayUseGoalie2)s.awayGoalie2Stamina=drain(s.awayGoalie2Stamina,s.awayGoalie2Max);else s.awayGoalie1Stamina=drain(s.awayGoalie1Stamina,s.awayGoalie1Max);
  const pct=(v:number,m:number)=>m>0?v/m:1;
  if(home.goalie2&&!s.homeUseGoalie2&&(pct(s.homeGoalie1Stamina,s.homeGoalie1Max)<=.5||(s.period===2&&s.shift===3&&pct(s.homeGoalie1Stamina,s.homeGoalie1Max)<.7)))s.homeUseGoalie2=true;
  if(away.goalie2&&!s.awayUseGoalie2&&(pct(s.awayGoalie1Stamina,s.awayGoalie1Max)<=.5||(s.period===2&&s.shift===3&&pct(s.awayGoalie1Stamina,s.awayGoalie1Max)<.7)))s.awayUseGoalie2=true;
  if(s.homeUseGoalie2&&pct(s.homeGoalie2Stamina,s.homeGoalie2Max)<=.5&&pct(s.homeGoalie1Stamina,s.homeGoalie1Max)>.6)s.homeUseGoalie2=false;
  if(s.awayUseGoalie2&&pct(s.awayGoalie2Stamina,s.awayGoalie2Max)<=.5&&pct(s.awayGoalie1Stamina,s.awayGoalie1Max)>.6)s.awayUseGoalie2=false;
  if(s.shift===5&&s.period<3){
    s.homeGoalie1Stamina=Math.min(s.homeGoalie1Max,s.homeGoalie1Stamina+.1*s.homeGoalie1Max);
    s.homeGoalie2Stamina=Math.min(s.homeGoalie2Max,s.homeGoalie2Stamina+.1*s.homeGoalie2Max);
    s.awayGoalie1Stamina=Math.min(s.awayGoalie1Max,s.awayGoalie1Stamina+.1*s.awayGoalie1Max);
    s.awayGoalie2Stamina=Math.min(s.awayGoalie2Max,s.awayGoalie2Stamina+.1*s.awayGoalie2Max);
  }
  if(s.shift<5)s.shift++;else if(s.period<3){s.period++;s.shift=1;}else{s.finished=true;}
  return s;
}
export function awardHomeMatch(team:Team,won:boolean):Team{
  const income=100+team.stadium.capacityLevel*35+team.stadium.vipLevel*50+team.stadium.lightingLevel*15+(won?75:25);
  return {...team,economy:{...team.economy,dollars:team.economy.dollars+income,matchesPlayed:team.economy.matchesPlayed+1,homeMatches:team.economy.homeMatches+1,totalEarned:team.economy.totalEarned+income}};
}
export const equipmentCatalog=(slots:string[]):EquipmentItem[]=>slots.flatMap(slot=>[
  {id:`${slot}_c`,name:'Базовая',slot,rarity:'COMMON',speedBonus:0,agilityBonus:0,strengthBonus:0,staminaBonus:0,reactionBonus:0,dollarPrice:0,goldPuckPrice:0},
  {id:`${slot}_r`,name:'Усиленная',slot,rarity:'RARE',speedBonus:2,agilityBonus:2,strengthBonus:2,staminaBonus:2,reactionBonus:2,dollarPrice:650,goldPuckPrice:0},
  {id:`${slot}_e`,name:'Профессиональная',slot,rarity:'EPIC',speedBonus:4,agilityBonus:4,strengthBonus:4,staminaBonus:4,reactionBonus:4,dollarPrice:1800,goldPuckPrice:0},
  {id:`${slot}_l`,name:'Эксклюзивная',slot,rarity:'LEGENDARY',speedBonus:6,agilityBonus:6,strengthBonus:6,staminaBonus:6,reactionBonus:6,dollarPrice:0,goldPuckPrice:8}
]);
