/* ============================================================
   星海霸权 · 帝国征途 — scrips.js
   完整优化版
   ============================================================ */

/* ============================================================
   1. 常量
   ============================================================ */
const SIZE_LABEL = { light:'轻', medium:'中', heavy:'重' };
const SIZE_MUL   = { light:0.7, medium:1.0, heavy:1.45 };
const SIZES = ['light', 'medium', 'heavy'];

const MAT_NAMES = ['', '陨铁', '星钢', '暗星钢', '虚空钢', '奇点钢', '超弦晶', '创世核'];
const MAT_COLORS = ['', '#a0ffc8', '#a0cfff', '#c0a0ff', '#ffb0e0', '#ffd75f', '#ff8b5f', '#ff4a4a'];

const HULLS = {
  1:{name:'T1 侦察艇', space:100, baseHp:80,   hullCost:0,    unlock:null, matCost:null},
  2:{name:'T2 护卫舰', space:130, baseHp:130,  hullCost:60,   unlock:{mat:1, cost:8}, matCost:{mat:1, n:1}},
  3:{name:'T3 驱逐舰', space:165, baseHp:210,  hullCost:160,  unlock:{mat:2, cost:10}, matCost:{mat:2, n:1}},
  4:{name:'T4 巡洋舰', space:205, baseHp:330,  hullCost:320,  unlock:{mat:3, cost:12}, matCost:{mat:3, n:2}},
  5:{name:'T5 战列舰', space:260, baseHp:520,  hullCost:600,  unlock:{mat:4, cost:15}, matCost:{mat:4, n:3}},
  6:{name:'T6 泰坦',   space:330, baseHp:820,  hullCost:1100, unlock:{mat:5, cost:20}, matCost:{mat:5, n:4}},
  7:{name:'T7 旗舰',   space:420, baseHp:1300, hullCost:2000, unlock:{mat:6, cost:30}, matCost:{mat:6, n:6}},
};

const PLANE_HULLS = {
  1:{name:'T1 战机', space:24, baseHp:20,  unlock:null, matCost:null},
  2:{name:'T2 战机', space:32, baseHp:42,  unlock:{mat:1, cost:5}, matCost:{mat:1, n:1}},
  3:{name:'T3 战机', space:42, baseHp:75,  unlock:{mat:2, cost:7}, matCost:{mat:2, n:1}},
  4:{name:'T4 战机', space:54, baseHp:125, unlock:{mat:3, cost:9}, matCost:{mat:3, n:1}},
  5:{name:'T5 战机', space:68, baseHp:195, unlock:{mat:4, cost:12}, matCost:{mat:4, n:2}},
  6:{name:'T6 战机', space:85, baseHp:290, unlock:{mat:5, cost:15}, matCost:{mat:5, n:3}},
  7:{name:'T7 战机', space:105, baseHp:430, unlock:{mat:6, cost:20}, matCost:{mat:6, n:4}},
};

const SHIP_CLASSES = {
  none:    {name:'通用',     icon:'◈', desc:'无加成', bonus:{}},
  escort:  {name:'护卫舰',   icon:'🛡', desc:'+15%闪避 +20%HP', bonus:{eva:0.15, hp:0.20}},
  vanguard:{name:'先锋舰',   icon:'⚡', desc:'+20%速度 +15%火力', bonus:{spd:0.20, dmg:0.15}},
  destroyer:{name:'驱逐舰',  icon:'⚔', desc:'+5%速度 +15%火力 +15%HP', bonus:{spd:0.05, dmg:0.15, hp:0.15}},
  cruiser: {name:'巡洋舰',   icon:'🚀', desc:'+15%速度 +15%火力 +5%HP', bonus:{spd:0.15, dmg:0.15, hp:0.05}},
  battleship:{name:'战列舰', icon:'💥', desc:'-10%速度 +30%火力 +15%HP',
            bonus:{spd:-0.10, dmg:0.30, hp:0.15}, req:{weapon:'midCharge'}},
  battlecruiser:{name:'战列巡洋舰', icon:'🔥', desc:'+5%速度 +25%火力 +15%HP +5%闪避',
            bonus:{spd:0.05, dmg:0.25, hp:0.15, eva:0.05}, req:{weapon:'midCharge'}},
  missile: {name:'导弹舰',   icon:'🎯', desc:'+15%速度 +50%导弹 +5%HP',
            bonus:{spd:0.15, missileDmg:0.50, hp:0.05}, req:{weapon:'missile'}},
  aa:      {name:'防空舰',   icon:'📡', desc:'+15%速度 +50%对空 +5%HP',
            bonus:{spd:0.15, aaDmg:0.50, hp:0.05}, req:{weapon:'aa'}},
  carrier: {name:'航母',     icon:'✈', desc:'+5 飞机位',
            bonus:{hangar:5}, req:{module:'catapult'}},
  command: {name:'指挥舰',   icon:'★', desc:'全队 +10%火力/闪避',
            bonus:{fleetDmg:0.10, fleetEva:0.10}},
  logistics:{name:'后勤舰',  icon:'🔧', desc:'+25%修复量',
            bonus:{repair:0.25}},
};

const WEAPON_TYPES = {
  rapid:   {name:'速射炮',   charge:0,   dmgMul:0.65, hit:'normal'},
  lightCharge:{name:'小型蓄力炮', charge:1.4, dmgMul:1.0,  hit:'normal'},
  midCharge:  {name:'中型蓄力炮', charge:2.1, dmgMul:1.4,  hit:'normal'},
  heavyCharge:{name:'重型蓄力炮', charge:2.8, dmgMul:2.0,  hit:'normal', slot:'main'},
  nova:       {name:'歼星炮',    charge:4.2, dmgMul:3.5,  hit:'normal', slot:'main', reqHull:3},
  missileShort:{name:'近程导弹',  charge:2.2, dmgMul:1.3,  hit:'always',  slot:'missile'},
  missileMid:  {name:'中程导弹',  charge:2.6, dmgMul:1.8,  hit:'always',  slot:'missile'},
  missileLong: {name:'远程导弹',  charge:3.0, dmgMul:2.4,  hit:'always',  slot:'missile'},
  missileNova: {name:'超测距导弹',charge:4.6, dmgMul:4.0,  hit:'always',  slot:'missile'},
  aaMissile:   {name:'AA导弹',   charge:1.6, dmgMul:0.9,  hit:'normal',  slot:'aa', aa:true},
  aaGun:       {name:'AA炮',     charge:0.6, dmgMul:0.6,  hit:'normal',  slot:'aa', aa:true},
};

const PLANE_WEAPONS = {
  rapid:  {name:'速射炮',  charge:0.8, dmgMul:0.55, cost:30},
  lightCharge:{name:'轻型蓄力炮', charge:1.8, dmgMul:0.9, cost:60},
  missileShort:{name:'近程导弹', charge:2.4, dmgMul:1.1, cost:80},
  missileMid:{name:'中程导弹', charge:2.8, dmgMul:1.4, cost:120},
  missileLong:{name:'远程导弹', charge:3.2, dmgMul:1.8, cost:180},
  missileNova:{name:'超测距导弹', charge:4.2, dmgMul:2.6, cost:280},
};

const PLANE_TYPES = {
  interceptor:{name:'截击机', icon:'✈', desc:'+20%速度 +15%对空', bonus:{spd:0.20, aaDmg:0.15}},
  bomber:     {name:'轰炸机', icon:'💣', desc:'+30%对舰伤害', bonus:{shipDmg:0.30}},
  multirole:  {name:'多用途', icon:'◈', desc:'无加成，平衡', bonus:{}},
  drone:      {name:'无人机', icon:'▲', desc:'+30%HP -20%速度', bonus:{hp:0.30, spd:-0.20}},
  stealth:    {name:'隐形机', icon:'👻', desc:'+25%闪避', bonus:{eva:0.25}},
};

const MOD_KEYS = ['main','sub','armor','engine','reactor','repair','missile','aa','catapult'];
const SLOT_LABEL = {
  main:'主炮', sub:'副炮', armor:'装甲', engine:'引擎',
  reactor:'储能', repair:'修复器', missile:'导弹位', aa:'防空位',
  catapult:'弹射装置',
};
const SLOT_ICON = {
  main:'🔴', sub:'🟡', armor:'🛡', engine:'🚀',
  reactor:'⚡', repair:'🔧', missile:'🎯', aa:'📡',
  catapult:'✈',
};

function mkWeapon(weaponKey, tier, size){
  const wt = WEAPON_TYPES[weaponKey];
  const base = 22 * Math.pow(tier, 1.55) * SIZE_MUL[size];
  return {
    key: weaponKey,
    name: `T${tier} ${SIZE_LABEL[size]}${wt.name}`,
    size: Math.round(8*tier*SIZE_MUL[size] * (wt.slot==='missile'?0.7:(wt.slot==='aa'?0.5:1))),
    dmg: Math.round(base * wt.dmgMul),
    charge: wt.charge,
    hit: wt.hit,
    aa: !!wt.aa,
    cost: Math.round(60*Math.pow(tier,1.7)*SIZE_MUL[size] * (wt.dmgMul)),
    slot: wt.slot || 'any',
    reqHull: wt.reqHull || 0,
  };
}
function mkArmor(tier, size){
  return { key:'armor', name:`T${tier} ${SIZE_LABEL[size]}装甲`,
    size: Math.round(6*tier*SIZE_MUL[size]),
    hp: Math.round(60*Math.pow(tier,1.5)*SIZE_MUL[size]),
    shd: Math.round(18*Math.pow(tier,1.5)*SIZE_MUL[size]),
    cost: Math.round(40*Math.pow(tier,1.7)*SIZE_MUL[size]) };
}
function mkEngine(tier, size){
  return { key:'engine', name:`T${tier} ${SIZE_LABEL[size]}引擎`,
    size: Math.round(6*tier*SIZE_MUL[size]),
    spd: Math.round(30*Math.pow(tier,1.35)*SIZE_MUL[size]),
    eva: Math.round(4*Math.pow(tier,1.2)*SIZE_MUL[size]),
    cost: Math.round(38*Math.pow(tier,1.7)*SIZE_MUL[size]) };
}
function mkReactor(tier, size){
  return { key:'reactor', name:`T${tier} ${SIZE_LABEL[size]}储能`,
    size: Math.round(4*tier*SIZE_MUL[size]),
    regen: Math.round(7*Math.pow(tier,1.5)*SIZE_MUL[size]),
    cost: Math.round(28*Math.pow(tier,1.7)*SIZE_MUL[size]) };
}
function mkRepair(tier, size){
  return { key:'repair', name:`T${tier} ${SIZE_LABEL[size]}修复器`,
    size: Math.round(15*tier*SIZE_MUL[size]),
    repairAmount: Math.round(10*Math.pow(tier,1.4)*SIZE_MUL[size]),
    repairCd: Math.max(3, 8 - tier*0.7),
    cost: Math.round(120*Math.pow(tier,1.8)*SIZE_MUL[size]) };
}
function mkCatapult(tier, size){
  return { key:'catapult',
    name: `T${tier} ${SIZE_LABEL[size]}弹射装置`,
    size: Math.round(20*tier*SIZE_MUL[size]),
    hangarSlots: Math.round(2 + tier * SIZE_MUL[size] * 2),
    cost: Math.round(180*Math.pow(tier,1.7)*SIZE_MUL[size]) };
}
function mkPlaneWeapon(key, tier){
  const w = PLANE_WEAPONS[key];
  const base = 10 * Math.pow(tier, 1.5);
  return { key, name: `T${tier} ${w.name}`, size: 3 + tier,
    dmg: Math.round(base * w.dmgMul), charge: w.charge,
    cost: Math.round(w.cost * Math.pow(tier, 1.6)),
    hit: key.startsWith('missile') ? 'always' : 'normal' };
}
function mkPlaneArmor(tier){
  return { key:'armor', name:`T${tier} 轻装甲`, size: 2 + tier,
    hp: Math.round(20 * Math.pow(tier, 1.4)),
    shd: Math.round(6 * Math.pow(tier, 1.4)),
    cost: Math.round(15 * Math.pow(tier, 1.6)) };
}
function mkPlaneEngine(tier){
  return { key:'engine', name:`T${tier} 引擎`, size: 2 + tier,
    spd: Math.round(38 * Math.pow(tier, 1.25)),
    eva: Math.round(5 * Math.pow(tier, 1.1)),
    cost: Math.round(12 * Math.pow(tier, 1.6)) };
}
function mkPlaneReactor(tier){
  return { key:'reactor', name:`T${tier} 储能`, size: 1 + Math.ceil(tier*0.5),
    regen: Math.round(4 * Math.pow(tier, 1.4)),
    cost: Math.round(10 * Math.pow(tier, 1.6)) };
}

const MODULES = {};
for(const slot of MOD_KEYS) MODULES[slot] = {};
for(let t=1;t<=7;t++){
  for(const s of SIZES){
    MODULES.main[t] = MODULES.main[t] || {};
    MODULES.main[t][s] = ['rapid','lightCharge','midCharge','heavyCharge','nova'].map(k=>mkWeapon(k,t,s));
    MODULES.sub[t] = MODULES.sub[t] || {};
    MODULES.sub[t][s] = ['rapid','lightCharge'].map(k=>mkWeapon(k,t,s));
    MODULES.missile[t] = MODULES.missile[t] || {};
    MODULES.missile[t][s] = ['missileShort','missileMid','missileLong','missileNova'].map(k=>mkWeapon(k,t,s));
    MODULES.aa[t] = MODULES.aa[t] || {};
    MODULES.aa[t][s] = ['aaMissile','aaGun'].map(k=>mkWeapon(k,t,s));
    MODULES.armor[t] = MODULES.armor[t] || {};
    MODULES.armor[t][s] = mkArmor(t,s);
    MODULES.engine[t] = MODULES.engine[t] || {};
    MODULES.engine[t][s] = mkEngine(t,s);
    MODULES.reactor[t] = MODULES.reactor[t] || {};
    MODULES.reactor[t][s] = mkReactor(t,s);
    MODULES.repair[t] = MODULES.repair[t] || {};
    MODULES.repair[t][s] = mkRepair(t,s);
    MODULES.catapult[t] = MODULES.catapult[t] || {};
    MODULES.catapult[t][s] = mkCatapult(t,s);
  }
}

const PLANE_MODULES = { weapon: {}, armor: {}, engine: {}, reactor: {} };
for(let t=1;t<=7;t++){
  PLANE_MODULES.weapon[t] = Object.keys(PLANE_WEAPONS).map(k => mkPlaneWeapon(k, t));
  PLANE_MODULES.armor[t] = mkPlaneArmor(t);
  PLANE_MODULES.engine[t] = mkPlaneEngine(t);
  PLANE_MODULES.reactor[t] = mkPlaneReactor(t);
}

const FACILITIES = {
  mine:  {name:'合金矿场',icon:'⛏',desc:'合金产出 +50%',base:{alloy:200,energy:120},growth:1.8},
  plant: {name:'能源工厂',icon:'🔋',desc:'能量产出 +50%',base:{alloy:150,energy:180},growth:1.8},
  dock:  {name:'造船厂',  icon:'🏗',desc:'建造速度 +40%',base:{alloy:300,energy:220},growth:1.9},
  turret:{name:'防御炮台',icon:'🎯',desc:'驻军火力 +40%',base:{alloy:220,energy:150},growth:1.85},
  lab:   {name:'材料精炼厂',icon:'🔬',desc:'特殊材料产出 +60%',base:{alloy:400,energy:280},growth:1.95},
  repair:{name:'修复港',  icon:'🛠',desc:'能量/HP回复加速',base:{alloy:350,energy:250},growth:1.9},
  radar: {name:'雷达站',  icon:'📡',desc:'视野 +350',base:{alloy:260,energy:180},growth:1.85},
  ciws:  {name:'近防炮',  icon:'⚙',desc:'自动攻击附近敌方舰队',base:{alloy:240,energy:160},growth:1.85},
};

const ENEMY_TYPES = {
  raider:    {name:'掠夺者',hp:200, shd:40, dmg:30,  eva:6,  spd:100},
  frigate:   {name:'护卫舰',hp:380, shd:90, dmg:60,  eva:10, spd:90},
  cruiser:   {name:'巡洋舰',hp:700, shd:200,dmg:120, eva:14, spd:76},
  battleship:{name:'战列舰',hp:1300,shd:380,dmg:225, eva:18, spd:60},
  titan:     {name:'泰坦',  hp:2400,shd:700,dmg:410, eva:22, spd:48},
};

const AI_NAMES = ['泽格帝国','泰伦联邦','克哈王朝','乌鲁教团','扎那克联盟','莱茵公国','安格鲁斯',
                  '铁翼氏族','黑日帝国','虚空教派','赤月汗国','起源教会'];
const AI_COLORS = ['#ff5a5a','#a855f7','#22c55e','#f59e0b','#ec4899','#06b6d4','#84cc16',
                   '#f97316','#8b5cf6','#14b8a6','#eab308','#ef4444'];
const PLAYER_COLOR = '#4ea8ff';
const NEUTRAL_COLOR = '#6a7088';
const COL_NAMES = ['前卫', '中列', '后列', '后备'];

/* ============================================================
   2. 全局状态
   ============================================================ */
const G = {
  time: 0,
  nationName: '泰拉联邦',
  planets: [],
  fleets: [],
  battles: [],
  buildQueue: [],
  designs: [],
  planeDesigns: [],
  planeDesign: {
    tier: 1, type: 'multirole', name: '新战机',
    weapons: { main: null },
    armor: null, engine: null, reactor: null,
  },
  hangar: {},
  nextPlaneId: 1,
  groups: [],
  logs: [],
  factions: {},
  selected: null,
  tab: 'region',
  playerHomeId: null,
  nextUid: 1,
  nextGroupId: 1,
  aiTimers: {},
  aiWaves: {},
  designMods: {
    main:null, sub:null, armor:null, engine:null,
    reactor:null, repair:null, missile:null, aa:null, catapult:null,
  },
  designHull: 1,
  designClass: 'none',
  designName: '新设计',
  hullUnlocked: {1:true,2:false,3:false,4:false,5:false,6:false,7:false},
  planeHullUnlocked: {1:true,2:false,3:false,4:false,5:false,6:false,7:false},
  materials: {1:0,2:0,3:0,4:0,5:0,6:0,7:0},
  lastSaveTime: Date.now(),
  paused: false,
};

let uiTimer = 0;
let pendingSave = 0;
let idleSaveTimer = 0;
let shipyardCurrent = null;
let attackSelect = null;
let lastTick = performance.now();
let visionTimer = 0;

/* ★ 性能优化：玩家星球缓存 */
let _playerPlanetsCache = null;
let _playerPlanetsVersion = 0;
let _playerPlanetsCacheVersion = -1;
let rightDirty = true;
let fullRenderCd = 0;

function getPlayerPlanets(){
  if(_playerPlanetsCacheVersion !== _playerPlanetsVersion){
    _playerPlanetsCache = G.planets.filter(p => p.owner === 'player');
    _playerPlanetsCacheVersion = _playerPlanetsVersion;
  }
  return _playerPlanetsCache;
}
function invalidatePlayerPlanets(){ _playerPlanetsVersion++; }
function markRightDirty(){
  rightDirty = true;
  if(fullRenderCd > 0.15) fullRenderCd = 0.15;
}

function uid(p){ return p + (G.nextUid++); }
function rand(a,b){ return a + Math.random()*(b-a); }
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
function hexA(hex, a){
  const n = parseInt(hex.slice(1),16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
function fmtTime(t){
  const m = Math.floor(t/60), s = Math.floor(t%60);
  return m + ':' + String(s).padStart(2,'0');
}

/* ============================================================
   3. 地图生成
   ============================================================ */
const MAP_SEED = 99090157;
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function generateMapData(seed){
  const rnd = mulberry32(seed);
  const N = 5000;
  const out = [];
  const GOLD = 2.39996323;
  for(let i=0;i<N;i++){
    const r = Math.sqrt((i+0.5)/N) * 2900;
    const theta = i * GOLD + rnd()*0.6;
    const rad = r + (rnd()-0.5)*90;
    const ang = theta + (rnd()-0.5)*0.18;
    const x = Math.round(rad*Math.cos(ang));
    const y = Math.round(rad*Math.sin(ang));
    const d = Math.hypot(x,y);
    let level;
    if(d < 350) level = 7;
    else if(d < 650) level = 6;
    else if(d < 1000) level = 5;
    else if(d < 1400) level = 4;
    else if(d < 1900) level = 3;
    else if(d < 2400) level = 2;
    else level = 1;
    out.push([x, y, level]);
  }
  return out;
}
function initPlanets(mapData){
  G.planets = [];
  const P = ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','φ','χ','ψ','ω'];
  for(let i=0;i<mapData.length;i++){
    const [x,y,level] = mapData[i];
    const nameIdx = i % 24;
    const sub = Math.floor(i / 24) + 1;
    G.planets.push({
      id: i, x, y, level, name: P[nameIdx] + sub,
      owner: null, garrison: [], facilities: [],
      battle: null, flash: 0, visibility: 0,
    });
  }
  invalidatePlayerPlanets();
}

/* ============================================================
   4. 派系
   ============================================================ */
function initFactions(numAI){
  G.factions = { player: { name: G.nationName, color: PLAYER_COLOR, isPlayer: true } };
  for(let i=0;i<numAI;i++){
    const key = 'ai' + (i+1);
    G.factions[key] = {
      name: AI_NAMES[i % AI_NAMES.length],
      color: AI_COLORS[i % AI_COLORS.length],
      isPlayer: false,
    };
    G.aiTimers[key] = 18 + i*3;
    G.aiWaves[key] = 0;
  }
}
function placeFactions(numAI){
  const outer = G.planets.filter(p => p.level === 1);
  const home = outer[Math.floor(Math.random() * outer.length)];
  home.owner = 'player';
  home.facilities = ['dock', 'repair'];
  G.playerHomeId = home.id;
  invalidatePlayerPlanets();

  const used = new Set([home.id]);
  const MIN_D = 130;
  for(let i=0;i<numAI;i++){
    const key = 'ai' + (i+1);
    let candidates = G.planets.filter(p => {
      if(used.has(p.id) || p.owner) return false;
      const d = Math.hypot(p.x - home.x, p.y - home.y);
      if(d < 250 || d > 2400) return false;
      for(const u of used){
        const up = G.planets[u];
        if(up && Math.hypot(p.x - up.x, p.y - up.y) < MIN_D) return false;
      }
      return true;
    });
    if(!candidates.length) candidates = G.planets.filter(p => !used.has(p.id) && !p.owner);
    if(!candidates.length) continue;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    used.add(pick.id);
    pick.owner = key;
    for(let k=0;k<2;k++){
      const s = createEnemyShip('raider', key);
      s.column = Math.floor(Math.random() * 3);
      pick.garrison.push(s);
    }
  }
  for(let k=0;k<2;k++) home.garrison.push(createPlayerShip('d0'));
}

/* ============================================================
   5. 舰船设计
   ============================================================ */
function designStats(mods, hullTier, shipClass){
  const hull = HULLS[hullTier] || HULLS[1];
  const cls = SHIP_CLASSES[shipClass || 'none'];
  const bonus = cls.bonus || {};

  let hp=hull.baseHp, shd=0, spd=18, eva=0, regen=0, size=0, cost=hull.hullCost;
  let mainWeapon=null, subWeapon=null, missileWeapon=null, aaWeapon=null;
  let repairAmount = 0, repairCd = 0;
  let hangarSlots = bonus.hangar || 0;

  for(const slot of MOD_KEYS){
    const sel = mods[slot];
    if(!sel || !sel.tier || !sel.obj) continue;
    const obj = sel.obj;
    size += obj.size; cost += obj.cost;

    if(slot === 'main') mainWeapon = obj;
    else if(slot === 'sub') subWeapon = obj;
    else if(slot === 'missile') missileWeapon = obj;
    else if(slot === 'aa') aaWeapon = obj;
    else if(slot === 'armor'){ hp += obj.hp||0; shd += obj.shd||0; }
    else if(slot === 'engine'){ spd += obj.spd||0; eva += obj.eva||0; }
    else if(slot === 'reactor'){ regen += obj.regen||0; }
    else if(slot === 'repair'){
      repairAmount += obj.repairAmount || 0;
      if(obj.repairCd && (!repairCd || obj.repairCd < repairCd)) repairCd = obj.repairCd;
    }
    else if(slot === 'catapult'){
      hangarSlots += obj.hangarSlots || 0;
    }
  }

  hp  = Math.round(hp  * (1 + (bonus.hp || 0)));
  spd = Math.round(spd * (1 + (bonus.spd || 0)));
  eva = Math.round(eva + (bonus.eva || 0) * 100);
  if(repairAmount) repairAmount = Math.round(repairAmount * (1 + (bonus.repair || 0)));

  const dmgBonus = 1 + (bonus.dmg || 0);
  const missileBonus = 1 + (bonus.missileDmg || 0);
  const aaBonus = 1 + (bonus.aaDmg || 0);

  const energyCost = Math.round(cost * 0.5);
  const totalDmg = (mainWeapon ? mainWeapon.dmg*dmgBonus : 0) +
                   (subWeapon  ? subWeapon.dmg*dmgBonus  : 0) +
                   (missileWeapon ? missileWeapon.dmg*missileBonus : 0);

  return {
    hp, shd, spd, eva, regen, size, cost, energyCost,
    space: hull.space, hullTier, hull, shipClass,
    mainWeapon, subWeapon, missileWeapon, aaWeapon,
    mainDmg: mainWeapon ? Math.round(mainWeapon.dmg * dmgBonus) : 0,
    subDmg:  subWeapon  ? Math.round(subWeapon.dmg  * dmgBonus) : 0,
    missileDmg: missileWeapon ? Math.round(missileWeapon.dmg * missileBonus) : 0,
    aaDmg: aaWeapon ? Math.round(aaWeapon.dmg * aaBonus) : 0,
    mainCharge: mainWeapon ? mainWeapon.charge : 0,
    subCharge:  subWeapon  ? subWeapon.charge  : 0,
    missileCharge: missileWeapon ? missileWeapon.charge : 0,
    aaCharge: aaWeapon ? aaWeapon.charge : 0,
    repairAmount, repairCd, hangarSlots, totalDmg,
    fleetDmg: bonus.fleetDmg || 0,
    fleetEva: bonus.fleetEva || 0,
    eff: 1,
  };
}

function createPlayerShip(designId){
  const d = G.designs.find(x=>x.id===designId);
  if(!d) return null;
  const st = designStats(d.mods, d.hullTier, d.shipClass);
  const n = G.nextUid++;
  return {
    uid:'s'+n, owner:'player', designId:d.id,
    name: d.name + '-' + String(n).padStart(3,'0'),
    tier: d.hullTier, shipClass: d.shipClass, groupId: null,
    column: 0, squadron: [],
    maxHp: st.hp, hp: st.hp, maxShd: st.shd, shd: st.shd,
    maxEnergy: 100 + (st.regen || 0) * 5,
    energy: 100 + (st.regen || 0) * 5,
    baseSpd: st.spd, eva: st.eva,
    mainDmg: st.mainDmg, mainCharge: st.mainCharge,
    subDmg: st.subDmg, subCharge: st.subCharge,
    missileDmg: st.missileDmg, missileCharge: st.missileCharge,
    aaDmg: st.aaDmg, aaCharge: st.aaCharge,
    totalDmg: st.totalDmg,
    repairAmount: st.repairAmount, repairCd: st.repairCd,
    hangarSlots: st.hangarSlots || 0,
    fleetDmg: st.fleetDmg, fleetEva: st.fleetEva,
    _rcd: 0,
    _chMain: 0, _chSub: 0, _chMissile: 0, _chAa: 0,
    isEnemy: false,
  };
}

function createEnemyShip(typeKey, owner){
  const t = ENEMY_TYPES[typeKey] || ENEMY_TYPES.raider;
  const n = G.nextUid++;
  const chargeMap = {raider:1.4, frigate:1.6, cruiser:1.8, battleship:2.2, titan:2.6};
  const dmg = t.dmg;
  return {
    uid:'e'+n, owner, name:t.name, column: 0, squadron: [],
    maxHp:t.hp, hp:t.hp, maxShd:t.shd, shd:t.shd,
    maxEnergy: 100, energy: 100,
    baseSpd:t.spd, eva:t.eva,
    mainDmg: Math.round(dmg * 0.7), mainCharge: chargeMap[typeKey] || 1.6,
    subDmg: Math.round(dmg * 0.3), subCharge: 0.8,
    missileDmg: 0, missileCharge: 0,
    aaDmg: 0, aaCharge: 0,
    totalDmg: dmg, repairAmount: 0, repairCd: 0,
    hangarSlots: 0, fleetDmg: 0, fleetEva: 0,
    _rcd: 0, _chMain: 0, _chSub: 0, _chMissile: 0, _chAa: 0,
    isEnemy:true,
  };
}

function findPlayerShipByUid(uid){
  for(const p of G.planets){
    const s = p.garrison.find(x=>x.uid===uid);
    if(s) return s;
  }
  return null;
}
function getAllPlayerShipsByGroup(gid){
  const out = [];
  for(const p of G.planets){
    for(const s of p.garrison){
      if(s.owner === 'player' && s.groupId === gid && s.hp > 0) out.push(s);
    }
  }
  return out;
}

/* ============================================================
   6. 飞机
   ============================================================ */
function planeStats(design){
  const planeHull = PLANE_HULLS[design.tier || 1] || PLANE_HULLS[1];
  const type = PLANE_TYPES[design.type] || PLANE_TYPES.multirole;
  const bonus = type.bonus || {};

  let hp = planeHull.baseHp, shd = 0, spd = 20, eva = 5, size = 0, cost = 0;
  const weapon = design.weapons?.main || null;
  const armor = design.armor;
  if(armor){ size += armor.size; cost += armor.cost; hp += armor.hp||0; shd += armor.shd||0; }
  const engine = design.engine;
  if(engine){ size += engine.size; cost += engine.cost; spd += engine.spd||0; eva += engine.eva||0; }
  const reactor = design.reactor;
  if(reactor){ size += reactor.size; cost += reactor.cost; }
  if(weapon){ size += weapon.size; cost += weapon.cost; }

  hp = Math.round(hp * (1 + (bonus.hp||0)));
  spd = Math.round(spd * (1 + (bonus.spd||0)));
  eva = Math.round(eva + (bonus.eva||0)*100);

  const dmg = weapon ? Math.round(weapon.dmg * (1 + (bonus.shipDmg||0))) : 0;
  const aaDmg = weapon ? Math.round(weapon.dmg * (1 + (bonus.aaDmg||0))) : 0;

  return {
    hp, shd, spd, eva, size, cost, weapon, dmg, aaDmg, type,
    space: planeHull.space, hull: planeHull,
  };
}

function createPlaneInstance(designId){
  const d = G.planeDesigns.find(x=>x.id===designId);
  if(!d) return null;
  const st = planeStats(d);
  const n = G.nextPlaneId++;
  return {
    uid: 'p'+n, designId: d.id,
    name: d.name + '-' + String(n).padStart(3,'0'),
    type: d.type, tier: d.tier || 1,
    maxHp: st.hp, hp: st.hp,
    maxShd: st.shd, shd: st.shd,
    dmg: st.dmg, aaDmg: st.aaDmg,
    charge: st.weapon ? st.weapon.charge : 1.5,
    hit: st.weapon ? st.weapon.hit : 'normal',
    spd: st.spd, eva: st.eva,
    row: 0, _ch: 0,
  };
}

/* ============================================================
   7. 相机 & 画布
   ============================================================ */
const CAM = { x:0, y:0, scale:0.35, minScale:0.06, maxScale:3 };
let VW=0, VH=0, dpr=1;
function screenToWorld(sx, sy){
  return { x:(sx - VW/2)/CAM.scale + CAM.x, y:(sy - VH/2)/CAM.scale + CAM.y };
}
function viewBounds(){
  const hw = VW/2/CAM.scale, hh = VH/2/CAM.scale;
  return { x1:CAM.x-hw, y1:CAM.y-hh, x2:CAM.x+hw, y2:CAM.y+hh };
}

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
let bgStars = [];

function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  canvas.width = VW*dpr; canvas.height = VH*dpr;
  canvas.style.width = VW+'px'; canvas.style.height = VH+'px';
  bgStars = [];
  const n = Math.floor(VW*VH/7000);
  for(let i=0;i<n;i++){
    bgStars.push({
      x: Math.random()*VW, y: Math.random()*VH,
      r: Math.random()*1.4+0.3, a: Math.random()*0.4+0.08,
      ph: Math.random()*Math.PI*2,
    });
  }
}
window.addEventListener('resize', resize);

function planetRadius(level){ return 3 + level * 1.2; }

function render(){
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle = '#04060e';
  ctx.fillRect(0,0,VW,VH);
  for(const s of bgStars){
    const tw = 0.65 + 0.35*Math.sin(G.time*1.4 + s.ph);
    ctx.fillStyle = `rgba(180,210,255,${s.a*tw})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
  }
  ctx.save();
  ctx.translate(VW/2, VH/2); ctx.scale(CAM.scale, CAM.scale);
  ctx.translate(-CAM.x, -CAM.y);
  const b = viewBounds();
  if(CAM.scale < 0.3){
    ctx.strokeStyle = 'rgba(80,120,200,.05)';
    ctx.lineWidth = 1/CAM.scale;
    for(let i=1;i<=6;i++){
      ctx.beginPath(); ctx.arc(0,0,i*500,0,6.2832); ctx.stroke();
    }
  }
  const visible = [];
  for(const p of G.planets){
    if(p.x < b.x1-20 || p.x > b.x2+20 || p.y < b.y1-20 || p.y > b.y2+20) continue;
    visible.push(p);
  }
  for(const f of G.fleets){
    const from = G.planets[f.fromRegionId], to = G.planets[f.toRegionId];
    if(!from || !to) continue;
    const c = G.factions[f.owner]?.color || '#fff';
    ctx.strokeStyle = hexA(c, 0.25);
    ctx.lineWidth = 1.2/CAM.scale;
    ctx.setLineDash([6,8]); ctx.lineDashOffset = -G.time*30;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.setLineDash([]);
  }
  for(const p of visible) drawPlanet(p);
  for(const f of G.fleets) drawFleet(f);
  ctx.restore();
}

function drawPlanet(p){
  const v = p.visibility || 0;
  if(v < 0.05){
    if(CAM.scale > 0.15){
      ctx.fillStyle = 'rgba(60,70,90,.5)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.8/CAM.scale, 0, 6.2832); ctx.fill();
    }
    return;
  }
  const faction = p.owner ? G.factions[p.owner] : null;
  const color = faction ? faction.color : NEUTRAL_COLOR;
  const r = planetRadius(p.level);
  const isSelected = G.selected === p.id;
  ctx.save();
  ctx.globalAlpha = Math.min(1, v * 1.15);
  if(isSelected){
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2/CAM.scale;
    ctx.setLineDash([5,5]); ctx.lineDashOffset = -G.time*40;
    ctx.beginPath(); ctx.arc(p.x, p.y, r + 5/CAM.scale, 0, 6.2832); ctx.stroke();
    ctx.setLineDash([]);
  }
  if(p.battle){
    const pulse = 1 + 0.15*Math.sin(G.time*8);
    ctx.strokeStyle = 'rgba(255,215,95,.9)';
    ctx.lineWidth = 2/CAM.scale;
    ctx.beginPath(); ctx.arc(p.x, p.y, (r + 8/CAM.scale)*pulse, 0, 6.2832); ctx.stroke();
  }
  if(CAM.scale > 0.5){
    const glow = p.flash > 0 ? 0.6 : (p.battle ? 0.5 : 0.35);
    const gr = r*3;
    const grad = ctx.createRadialGradient(p.x, p.y, r*0.5, p.x, p.y, gr);
    grad.addColorStop(0, hexA(color, glow));
    grad.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(p.x, p.y, gr, 0, 6.2832); ctx.fill();
  }
  const grad2 = ctx.createRadialGradient(p.x - r*0.35, p.y - r*0.35, r*0.08, p.x, p.y, r);
  grad2.addColorStop(0, '#ffffff');
  grad2.addColorStop(0.2, color);
  grad2.addColorStop(1, hexA(color, 0.3));
  ctx.fillStyle = grad2;
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = hexA(color, p.owner ? 0.85 : 0.5);
  ctx.lineWidth = 1.5/CAM.scale;
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.stroke();
  if(CAM.scale > 0.25 && p.level >= 5){
    ctx.strokeStyle = MAT_COLORS[p.level];
    ctx.lineWidth = 1.8/CAM.scale;
    ctx.beginPath(); ctx.arc(p.x, p.y, r + 2/CAM.scale, 0, 6.2832); ctx.stroke();
  }
  if(CAM.scale > 0.6){
    const radars = p.facilities.filter(f=>f==='radar').length;
    const ciws = p.facilities.filter(f=>f==='ciws').length;
    if(radars > 0){
      ctx.fillStyle = '#7fd3ff';
      ctx.font = `700 ${Math.round(9/CAM.scale)}px system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('📡' + (radars>1?radars:''), p.x - 8/CAM.scale, p.y - r - 2/CAM.scale);
    }
    if(ciws > 0){
      ctx.fillStyle = '#ff8b5f';
      ctx.font = `700 ${Math.round(9/CAM.scale)}px system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('⚙' + (ciws>1?ciws:''), p.x + 8/CAM.scale, p.y - r - 2/CAM.scale);
    }
  }
  if(CAM.scale > 0.8 && v > 0.6){
    ctx.font = `700 ${Math.round(11/CAM.scale)}px system-ui,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = `rgba(230,240,255,${v*0.9})`;
    ctx.fillText(p.name, p.x, p.y + r + 3/CAM.scale);
  }
  ctx.restore();
  if(v < 1){
    ctx.fillStyle = `rgba(6,8,16,${(1-v) * 0.85})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, r + 3/CAM.scale, 0, 6.2832); ctx.fill();
  }
}

function drawFleet(f){
  const to = G.planets[f.toRegionId];
  if(!to) return;
  const ang = Math.atan2(to.y - f.y, to.x - f.x);
  const color = G.factions[f.owner]?.color || '#fff';
  const count = f.ships.filter(s=>s.hp>0).length;
  if(!count) return;
  const size = 4 + Math.min(count, 15)*0.3;
  ctx.save();
  ctx.translate(f.x, f.y); ctx.rotate(ang);
  ctx.shadowColor = color; ctx.shadowBlur = 10/CAM.scale;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size*0.7, -size*0.65);
  ctx.lineTo(-size*0.32, 0);
  ctx.lineTo(-size*0.7, size*0.65);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ============================================================
   8. 舰队
   ============================================================ */
function launchFleet(owner, ships, fromId, toId, purpose){
  if(!ships.length) return null;
  const from = G.planets[fromId], to = G.planets[toId];
  if(!from || !to) return null;
  const spd = Math.min(...ships.map(s=>s.baseSpd));
  const d = dist(from, to);
  const duration = Math.max(1.2, d / spd * 1.5);
  const fleet = {
    id: uid('f'), owner, ships,
    fromRegionId: fromId, toRegionId: toId,
    x: from.x, y: from.y, progress: 0, duration,
    purpose: purpose || 'move',
  };
  G.fleets.push(fleet);
  return fleet;
}
function tickFleets(dt){
  for(let i=G.fleets.length-1;i>=0;i--){
    const f = G.fleets[i];
    f.progress += dt / f.duration;
    if(f.progress >= 1){
      const to = G.planets[f.toRegionId];
      f.x = to.x; f.y = to.y;
      G.fleets.splice(i,1);
      arriveFleet(f);
    } else {
      const from = G.planets[f.fromRegionId];
      const to = G.planets[f.toRegionId];
      f.x = from.x + (to.x - from.x) * f.progress;
      f.y = from.y + (to.y - from.y) * f.progress;
    }
  }
}
function arriveFleet(fleet){
  const target = G.planets[fleet.toRegionId];
  const alive = fleet.ships.filter(s=>s.hp>0);
  if(!alive.length) return;
  if(target.owner === fleet.owner){
    for(const s of alive) target.garrison.push(s);
    if(fleet.owner === 'player') addLog(`◉ ${alive.length} 艘舰船抵达 ${target.name}`, 'info');
    markDirty();
    markRightDirty();
    return;
  }
  const defenders = target.garrison.filter(s=>s.hp>0);
  if(!defenders.length){
    target.garrison = alive;
    target.owner = fleet.owner;
    onCapture(target, fleet.owner);
    return;
  }
  startBattle(target, fleet, alive);
}
function onCapture(region, owner){
  region.flash = 1.2;
  invalidatePlayerPlanets();
  if(owner === 'player') addLog(`★ 占领 ${region.name} (Lv${region.level})`, 'win');
  else if(region.owner === 'player') addLog(`✖ 失去 ${region.name}`, 'lose');
  markDirty();
  markRightDirty();
}

/* ============================================================
   9. 战斗
   ============================================================ */
const BATTLE_TICK = 0.1;
const BATTLE_MAX_TIME = 60;

function startBattle(region, attackerFleet, attackerShips){
  const defenders = region.garrison.filter(s=>s.hp>0);
  if(!defenders.length){
    region.garrison = attackerShips;
    region.owner = attackerFleet.owner;
    onCapture(region, attackerFleet.owner);
    return;
  }
  const defOwner = defenders[0].owner;
  for(const s of [...attackerShips, ...defenders]) initCombatState(s);

  const atkPlanes = [];
  for(const s of attackerShips){
    if(s.squadron && s.squadron.length){
      for(const p of s.squadron){
        const inst = {...p, owner: attackerFleet.owner, _carrierUid: s.uid, hp: p.hp, shd: p.shd, _ch: 0};
        atkPlanes.push(inst);
      }
    }
  }
  const defPlanes = [];
  for(const s of defenders){
    if(s.squadron && s.squadron.length){
      for(const p of s.squadron){
        const inst = {...p, owner: defOwner, _carrierUid: s.uid, hp: p.hp, shd: p.shd, _ch: 0};
        defPlanes.push(inst);
      }
    }
  }

  const battle = {
    id: uid('b'), regionId: region.id,
    attackerOwner: attackerFleet.owner, defenderOwner: defOwner,
    attacker: attackerShips, defender: defenders,
    atkPlanes, defPlanes,
    time: 0, tickTimer: 0, log: [], over: false, outcome: null,
    fromRegionId: attackerFleet.fromRegionId,
  };
  region.battle = battle;
  G.battles.push(battle);
  battle.log.push({r:0, text:`${G.factions[attackerFleet.owner]?.name} 进攻 ${region.name}`, type:'sys'});
  if(attackerFleet.owner === 'player') addLog(`⚔ 进攻 ${region.name}`, 'fight');
}

function initCombatState(s){
  s._chMain = 0; s._chSub = 0; s._chMissile = 0; s._chAa = 0; s._rcd = 0;
}

function tickBattles(dt){
  for(const b of G.battles){
    if(b.over) continue;
    b.tickTimer += dt;
    while(b.tickTimer >= BATTLE_TICK){
      b.tickTimer -= BATTLE_TICK;
      battleStep(b, BATTLE_TICK);
    }
  }
  for(let i=G.battles.length-1;i>=0;i--){
    const b = G.battles[i];
    if(b.over && b._endTime && Date.now() - b._endTime > 5000){
      G.battles.splice(i,1);
    }
  }
}

function battleStep(b, dt){
  b.time += dt;
  const atkAlive = b.attacker.filter(s=>s.hp>0);
  const defAlive = b.defender.filter(s=>s.hp>0);
  if(!atkAlive.length || !defAlive.length){ endBattle(b); return; }
  if(b.time >= BATTLE_MAX_TIME){ endBattle(b, 'timeout'); return; }

  const atkBonus = calcFleetBonus(atkAlive);
  const defBonus = calcFleetBonus(defAlive);

  tickAirCombat(b, dt);
  tickAAvsPlanes(b, dt);
  checkCarrierLoss(b);

  const atkDmg = collectSideDamage(atkAlive, defAlive, defBonus, dt);
  const defDmg = collectSideDamage(defAlive, atkAlive, atkBonus, dt);
  applySideDamage(defAlive, atkDmg, b, 'atk');
  applySideDamage(atkAlive, defDmg, b, 'def');

  tickRepair(b, dt);
  if(!b.attacker.some(s=>s.hp>0) || !b.defender.some(s=>s.hp>0)) endBattle(b);
}

function calcFleetBonus(ships){
  let dmg = 0, eva = 0;
  for(const s of ships){
    if(s.fleetDmg) dmg += s.fleetDmg;
    if(s.fleetEva) eva += s.fleetEva;
  }
  return { dmg: clamp(dmg, 0, 0.5), eva: clamp(eva, 0, 0.3) };
}

function tickAirCombat(b, dt){
  const atkP = b.atkPlanes.filter(p=>p.hp>0);
  const defP = b.defPlanes.filter(p=>p.hp>0);
  for(const p of atkP) planeFire(b, p, defP, atkP, b.defender);
  for(const p of defP) planeFire(b, p, atkP, defP, b.attacker);
}

function planeFire(b, plane, enemyPlanes, allyPlanes, enemyShips){
  if(plane.hp <= 0) return;
  plane._ch += BATTLE_TICK;
  if(plane._ch < plane.charge) return;
  plane._ch -= plane.charge;
  let targets = [];
  if(plane.row === 0){
    const frontRow = enemyPlanes.filter(p => p.hp > 0 && p.row === 0);
    if(frontRow.length) targets = frontRow;
    else {
      const backRow = enemyPlanes.filter(p => p.hp > 0 && p.row === 1);
      if(backRow.length) targets = backRow;
      else targets = enemyShips.filter(s => s.hp > 0);
    }
  } else {
    targets = enemyShips.filter(s => s.hp > 0);
    if(!targets.length) targets = enemyPlanes.filter(p => p.hp > 0);
  }
  if(!targets.length) return;
  const target = targets[Math.floor(Math.random() * targets.length)];
  let hit = true;
  if(plane.hit !== 'always'){
    const eva = (target.eva || 0) / 100;
    if(Math.random() < eva) hit = false;
  }
  if(!hit) return;
  let dmg = plane.dmg || 0;
  if(target._carrierUid) dmg = plane.aaDmg || plane.dmg || 0;
  applyDamage(target, dmg);
  if(target.hp <= 0){
    target.hp = 0;
    b.log.push({r: Math.floor(b.time*10)/10,
      text: `${plane.name} 击毁 ${target.name}`, type: plane.owner === b.attackerOwner ? 'atk' : 'def'});
  }
}

function applyDamage(target, dmg){
  let d = dmg;
  if(target.shd > 0){
    const abs = Math.min(target.shd, d);
    target.shd -= abs; d -= abs;
  }
  if(d > 0) target.hp -= d;
}

function tickAAvsPlanes(b, dt){
  const allShips = [...b.attacker, ...b.defender];
  for(const s of allShips){
    if(s.hp <= 0 || !s.aaDmg) continue;
    s._chAa += dt;
    if(s._chAa < (s.aaCharge || 1)) continue;
    s._chAa -= (s.aaCharge || 1);
    const isAtk = b.attacker.includes(s);
    const enemyPlanes = isAtk ? b.defPlanes.filter(p=>p.hp>0) : b.atkPlanes.filter(p=>p.hp>0);
    if(!enemyPlanes.length) continue;
    const target = enemyPlanes[Math.floor(Math.random() * enemyPlanes.length)];
    const evadeChance = clamp((target.eva||0)/100, 0, 0.5);
    if(Math.random() < evadeChance) continue;
    const killChance = clamp(s.aaDmg / (target.maxHp + 1), 0.15, 0.9);
    if(Math.random() < killChance){
      target.hp = 0;
      b.log.push({r: Math.floor(b.time*10)/10,
        text: `📡 ${s.name} 击落 ${target.name}`, type: isAtk ? 'atk' : 'def'});
    } else {
      applyDamage(target, s.aaDmg * 0.5);
    }
  }
}

function checkCarrierLoss(b){
  for(const s of [...b.attacker, ...b.defender]){
    if(s.hp > 0) continue;
    if(!s._carrierPlanes){
      const planes = s.owner === b.attackerOwner
        ? b.atkPlanes.filter(p => p._carrierUid === s.uid && p.hp > 0)
        : b.defPlanes.filter(p => p._carrierUid === s.uid && p.hp > 0);
      s._carrierPlanes = planes;
    }
    if(s._carrierPlanes && s._carrierPlanes.length){
      const isAtk = b.attacker.includes(s);
      const enemySide = isAtk ? b.defender : b.attacker;
      const enemyAlive = enemySide.filter(x=>x.hp>0);
      for(const p of s._carrierPlanes){
        if(p.hp <= 0) continue;
        p.hp = 0;
        if(!enemyAlive.length) break;
        const target = enemyAlive[Math.floor(Math.random() * enemyAlive.length)];
        if(Math.random() < 0.75){
          applyDamage(target, p.dmg * 2 || 20);
          b.log.push({r: Math.floor(b.time*10)/10,
            text: `💥 ${p.name} 自爆命中 ${target.name}`,
            type: isAtk ? 'atk' : 'def'});
        } else {
          b.log.push({r: Math.floor(b.time*10)/10,
            text: `💥 ${p.name} 自爆失误`,
            type: isAtk ? 'atk' : 'def'});
        }
      }
      s._carrierPlanes = [];
    }
  }
}

function collectSideDamage(attackers, targets, targetBonus, dt){
  const result = new Map();
  let frontCol = Infinity;
  for(const s of targets){
    if(s.hp <= 0) continue;
    if((s.column||0) < frontCol) frontCol = s.column||0;
  }
  if(frontCol === Infinity) return result;
  const frontTargets = targets.filter(s => s.hp > 0 && (s.column||0) === frontCol);
  if(!frontTargets.length) return result;

  const addDmg = (target, dmg)=>{
    if(!target || target.hp <= 0) return;
    result.set(target.uid, (result.get(target.uid)||0) + dmg);
  };

  for(const ship of attackers){
    if(ship.hp <= 0) continue;
    if(ship.mainDmg > 0){
      ship._chMain += dt;
      if(ship._chMain >= ship.mainCharge){
        ship._chMain -= ship.mainCharge;
        const target = frontTargets[Math.floor(Math.random()*frontTargets.length)];
        if(target && Math.random() < hitChance(ship, target, targetBonus)) addDmg(target, ship.mainDmg);
      }
    }
    if(ship.subDmg > 0){
      ship._chSub += dt;
      if(ship._chSub >= ship.subCharge){
        ship._chSub -= ship.subCharge;
        const target = frontTargets[Math.floor(Math.random()*frontTargets.length)];
        if(target && Math.random() < hitChance(ship, target, targetBonus)) addDmg(target, ship.subDmg);
      }
    }
    if(ship.missileDmg > 0){
      ship._chMissile += dt;
      if(ship._chMissile >= ship.missileCharge){
        ship._chMissile -= ship.missileCharge;
        const target = frontTargets[Math.floor(Math.random()*frontTargets.length)];
        if(target) addDmg(target, ship.missileDmg);
      }
    }
  }
  return result;
}

function hitChance(ship, target, targetBonus){
  const baseEva = (target.eva || 0) + (targetBonus?.eva || 0) * 100;
  const spdEva = Math.min(40, (target.baseSpd||0) * 0.1);
  const total = clamp(baseEva + spdEva, 0, 60);
  return clamp(1 - total/100, 0.4, 0.95);
}

function applySideDamage(targets, dmgMap, b, side){
  for(const [uid2, dmg0] of dmgMap){
    const t = targets.find(x=>x.uid===uid2);
    if(!t || t.hp<=0) continue;
    let dmg = dmg0;
    if(t.shd > 0){
      const abs = Math.min(t.shd, dmg);
      t.shd -= abs; dmg -= abs;
    }
    if(dmg > 0){
      t.hp -= dmg;
      if(t.hp <= 0){
        t.hp = 0;
        b.log.push({r: Math.floor(b.time*10)/10, text:`${t.name} 被击毁`, type: side==='atk'?'atk':'def'});
      }
    }
  }
}

function tickRepair(b, dt){
  const sides = [b.attacker, b.defender];
  for(const list of sides){
    for(const s of list){
      if(s.hp <= 0 || !s.repairAmount) continue;
      s._rcd -= dt;
      if(s._rcd > 0) continue;
      let target = null, worst = 1;
      for(const f of list){
        if(f.hp <= 0) continue;
        const pct = f.hp / f.maxHp;
        if(pct < worst && pct < 0.99){ worst = pct; target = f; }
      }
      if(!target) continue;
      const heal = Math.min(s.repairAmount, target.maxHp - target.hp);
      if(heal <= 0) continue;
      target.hp += heal;
      s._rcd = s.repairCd || 5;
    }
  }
}

function endBattle(b, reason){
  if(b.over) return;
  b.over = true;
  b._endTime = Date.now();
  const atkAlive = b.attacker.filter(s=>s.hp>0);
  const defAlive = b.defender.filter(s=>s.hp>0);
  const region = G.planets[b.regionId];

  if(reason === 'timeout') b.outcome = 'draw';
  else if(!atkAlive.length && !defAlive.length) b.outcome = 'mutual';
  else if(!atkAlive.length) b.outcome = 'defender';
  else if(!defAlive.length) b.outcome = 'attacker';

  for(const s of atkAlive){
    if(s.squadron){
      s.squadron = s.squadron.map(p => {
        const inst = b.atkPlanes.find(x => x.designId === p.designId && x._carrierUid === s.uid);
        if(inst) return { ...p, hp: inst.hp, shd: inst.shd, _ch: 0 };
        return p;
      }).filter(p => p.hp > 0);
    }
  }
  for(const s of defAlive){
    if(s.squadron){
      s.squadron = s.squadron.map(p => {
        const inst = b.defPlanes.find(x => x.designId === p.designId && x._carrierUid === s.uid);
        if(inst) return { ...p, hp: inst.hp, shd: inst.shd, _ch: 0 };
        return p;
      }).filter(p => p.hp > 0);
    }
  }

  for(const s of [...b.attacker, ...b.defender]){
    if(s.hp <= 0 && s.squadron && s.squadron.length){
      for(const p of s.squadron){
        G.hangar[p.designId] = (G.hangar[p.designId] || 0) + 1;
      }
      s.squadron = [];
    }
  }

  if(b.outcome === 'attacker'){
    region.garrison = atkAlive;
    region.owner = b.attackerOwner;
    onCapture(region, b.attackerOwner);
  } else if(b.outcome === 'defender' || b.outcome === 'draw'){
    region.garrison = defAlive;
    if(b.outcome === 'draw' && atkAlive.length){
      const from = G.planets[b.fromRegionId];
      if(from) for(const s of atkAlive) from.garrison.push(s);
    }
  } else if(b.outcome === 'mutual'){
    region.garrison = [];
    region.owner = null;
    region.flash = 1.2;
  }
  region.battle = null;
  b.cleanup = true;
  invalidatePlayerPlanets();
  markDirty();
  markRightDirty();
}

/* ============================================================
   10. 建造
   ============================================================ */
function hasMaterial(cost){
  if(!cost) return true;
  return (G.materials[cost.mat] || 0) >= cost.n;
}
function payMaterial(cost){
  if(!cost) return;
  G.materials[cost.mat] -= cost.n;
}
function startBuild(designId, regionId){
  const d = G.designs.find(x=>x.id===designId);
  if(!d) return false;
  const st = designStats(d.mods, d.hullTier, d.shipClass);
  if(st.size > st.space) return false;
  if(G.alloy < st.cost || G.energy < st.energyCost) return false;
  const hull = HULLS[d.hullTier];
  if(!hasMaterial(hull.matCost)) return false;
  G.alloy -= st.cost;
  G.energy -= st.energyCost;
  payMaterial(hull.matCost);
  G.buildQueue.push({
    id: uid('q'), designId: d.id, designName: d.name,
    regionId, progress: 0, duration: 8 + st.cost * 0.015,
  });
  addLog(`🏭 开始建造 ${d.name}`, 'info');
  markDirty();
  markRightDirty();
  return true;
}
function tickBuilds(dt){
  for(let i=G.buildQueue.length-1;i>=0;i--){
    const q = G.buildQueue[i];
    const region = G.planets[q.regionId];
    if(!region){ G.buildQueue.splice(i,1); continue; }
    const speedMul = 1 + (region.facilities.includes('dock') ? 0.4 : 0);
    q.progress += dt * speedMul / q.duration;
    if(q.progress >= 1){
      const ship = createPlayerShip(q.designId);
      if(ship) region.garrison.push(ship);
      G.buildQueue.splice(i,1);
      markRightDirty();
    }
  }
}

/* ============================================================
   11. 资源
   ============================================================ */
function regionOutput(region){
  const lvMul = 1 + 0.6 * (region.level - 1);
  let a = (4 + region.level * 2) * lvMul;
  let e = (3 + region.level * 1.5) * lvMul;
  if(region.facilities.includes('mine')) a *= 1.5;
  if(region.facilities.includes('plant')) e *= 1.5;
  return {alloy:a, energy:e};
}
function regionMatOutput(region){
  if(region.level < 3) return 0;
  const lvMul = 1 + 0.4 * (region.level - 1);
  let rate = Math.max(0.1, (region.level - 2) * 0.35) * lvMul;
  if(region.facilities.includes('lab')) rate *= 1.6;
  return rate;
}
function totalOutput(){
  let a=0, e=0;
  for(const p of getPlayerPlanets()){
    const o = regionOutput(p);
    a += o.alloy; e += o.energy;
  }
  return {alloy:a, energy:e};
}
function upgradeCost(region){
  const lv = region.level;
  return {
    alloy: Math.floor(200 * Math.pow(1.85, lv-1)),
    energy: Math.floor(140 * Math.pow(1.85, lv-1)),
  };
}
function upgradeRegion(id){
  const r = G.planets[id];
  if(!r || r.owner !== 'player') return false;
  if(r.level >= 7) return false;
  const c = upgradeCost(r);
  if(G.alloy < c.alloy || G.energy < c.energy) return false;
  G.alloy -= c.alloy; G.energy -= c.energy;
  r.level++;
  addLog(`⬆ ${r.name} 升级至 Lv.${r.level}`, 'info');
  markDirty();
  markRightDirty();
  return true;
}
function facilityCost(region, type){
  const def = FACILITIES[type];
  const count = region.facilities.filter(f=>f===type).length;
  return {
    alloy: Math.floor(def.base.alloy * Math.pow(def.growth, count)),
    energy: Math.floor(def.base.energy * Math.pow(def.growth, count)),
  };
}
function maxFacilitySlots(region){
  const n = region.level;
  let base = Math.max(1, Math.floor(1 + Math.pow(2, n/2 - 1)));
  if(region.id === G.playerHomeId) base = Math.max(base, region.facilities.length);
  return base;
}
function buildFacility(id, type){
  const r = G.planets[id];
  if(!r || r.owner !== 'player') return false;
  if(!FACILITIES[type]) return false;
  if(r.facilities.length >= maxFacilitySlots(r)) return false;
  const c = facilityCost(r, type);
  if(G.alloy < c.alloy || G.energy < c.energy) return false;
  G.alloy -= c.alloy; G.energy -= c.energy;
  r.facilities.push(type);
  addLog(`🏗 ${r.name} 建成 ${FACILITIES[type].name}`, 'info');
  markDirty();
  markRightDirty();
  return true;
}

/* ============================================================
   12. 解锁
   ============================================================ */
function unlockHull(tier){
  if(G.hullUnlocked[tier]) return {ok:false, reason:'已解锁'};
  const h = HULLS[tier];
  if(!h.unlock) return {ok:false, reason:'无法解锁'};
  const need = h.unlock.cost;
  const have = G.materials[h.unlock.mat] || 0;
  if(have < need) return {ok:false, reason:`需要 ${MAT_NAMES[h.unlock.mat]} × ${need}（拥有 ${have}）`};
  G.materials[h.unlock.mat] -= need;
  G.hullUnlocked[tier] = true;
  addLog(`✨ 解锁 ${h.name}`, 'win');
  markDirty();
  markRightDirty();
  return {ok:true};
}
function unlockPlaneHull(tier){
  if(G.planeHullUnlocked[tier]) return {ok:false, reason:'已解锁'};
  const h = PLANE_HULLS[tier];
  if(!h.unlock) return {ok:false, reason:'无法解锁'};
  const need = h.unlock.cost;
  const have = G.materials[h.unlock.mat] || 0;
  if(have < need) return {ok:false, reason:`需要 ${MAT_NAMES[h.unlock.mat]} × ${need}（拥有 ${have}）`};
  G.materials[h.unlock.mat] -= need;
  G.planeHullUnlocked[tier] = true;
  addLog(`✨ 解锁 ${h.name}`, 'win');
  markDirty();
  markRightDirty();
  return {ok:true};
}

/* ============================================================
   13. AI
   ============================================================ */
function tickAI(dt){
  for(const key in G.factions){
    if(key === 'player') continue;
    G.aiTimers[key] -= dt;
    if(G.aiTimers[key] > 0) continue;
    G.aiTimers[key] = Math.max(12, 30 - G.aiWaves[key] * 0.3);
    G.aiWaves[key]++;
    const myPlanets = G.planets.filter(p => p.owner === key);
    if(!myPlanets.length) continue;
    const target = myPlanets[Math.floor(Math.random()*myPlanets.length)];
    let type = 'raider';
    const w = G.aiWaves[key], r = Math.random();
    if(w >= 5 && r < 0.3) type = 'frigate';
    if(w >= 12 && r < 0.18) type = 'cruiser';
    if(w >= 22 && r < 0.1) type = 'battleship';
    if(w >= 35 && r < 0.05) type = 'titan';
    const ship = createEnemyShip(type, key);
    ship.column = Math.floor(Math.random() * 3);
    target.garrison.push(ship);

    if(Math.random() < 0.15){
      const sources = G.planets.filter(p => p.owner === key && p.garrison.filter(s=>s.hp>0).length >= 4);
      if(sources.length){
        const src = sources[Math.floor(Math.random()*sources.length)];
        const nearby = G.planets.filter(p => {
          if(p.owner === key) return false;
          return dist(p, src) < 1500;
        });
        if(nearby.length){
          const tgt = nearby[Math.floor(Math.random()*nearby.length)];
          const alive = src.garrison.filter(s=>s.hp>0);
          const reserve = Math.max(1, Math.ceil(alive.length * 0.4));
          const send = alive.slice(0, alive.length - reserve);
          if(send.length){
            src.garrison = src.garrison.filter(s => !send.includes(s));
            launchFleet(key, send, src.id, tgt.id, 'attack');
          }
        }
      }
    }
  }
}

/* ============================================================
   13b. 迷雾
   ============================================================ */
function updateVisibility(dt){
  for(const p of G.planets){
    if(p.visibility > 0) p.visibility = Math.max(0, p.visibility - dt * 0.03);
  }
  visionTimer -= dt;
  if(visionTimer > 0) return;
  visionTimer = 0.2;
  const sources = [];
  for(const p of getPlayerPlanets()){
    let range = 500;
    const radars = p.facilities.filter(f=>f==='radar').length;
    range += radars * 350;
    if(p.id === G.playerHomeId) range += 200;
    sources.push({x:p.x, y:p.y, r:range});
  }
  for(const f of G.fleets){
    if(f.owner !== 'player') continue;
    sources.push({x:f.x, y:f.y, r:320});
  }
  if(!sources.length) return;
  const b = viewBounds();
  const pad = 900;
  for(const p of G.planets){
    if(p.x < b.x1-pad || p.x > b.x2+pad || p.y < b.y1-pad || p.y > b.y2+pad) continue;
    if(p.visibility >= 1) continue;
    for(const s of sources){
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if(d < s.r){ p.visibility = 1; break; }
    }
  }
}

/* ============================================================
   13c. 近防炮
   ============================================================ */
function tickCIWS(dt){
  for(const p of getPlayerPlanets()){
    const ciwsCount = p.facilities.filter(f=>f==='ciws').length;
    if(ciwsCount === 0) continue;
    const range = 180 + ciwsCount * 120;
    const dps = 25 * ciwsCount;
    for(const f of G.fleets){
      if(f.owner === 'player') continue;
      const d = Math.hypot(f.x - p.x, f.y - p.y);
      if(d > range) continue;
      const ships = f.ships.filter(s=>s.hp>0);
      if(!ships.length) continue;
      let dmg = dps * dt;
      for(const s of ships){
        if(dmg <= 0) break;
        if(s.shd > 0){
          const abs = Math.min(s.shd, dmg);
          s.shd -= abs; dmg -= abs;
        }
        if(dmg > 0){
          const take = Math.min(s.hp, dmg);
          s.hp -= take; dmg -= take;
          if(s.hp <= 0) s.hp = 0;
        }
      }
    }
  }
}

/* ============================================================
   14. 更新
   ============================================================ */
function markDirty(){
  pendingSave = 5;
  markRightDirty();
}
function update(dt){
  G.time += dt;
  const out = totalOutput();
  G.alloy += out.alloy * dt;
  G.energy += out.energy * dt;
  for(const p of getPlayerPlanets()){
    const rate = regionMatOutput(p);
    if(rate > 0 && p.level >= 3){
      const tier = Math.min(p.level - 1, 7);
      if(tier >= 1) G.materials[tier] = (G.materials[tier] || 0) + rate * dt;
    }
  }
  for(const p of G.planets){
    const hasRepair = p.facilities.includes('repair');
    const isOwned = p.owner === 'player';
    for(const s of p.garrison){
      if(s.owner !== 'player') continue;
      const energyRate = (isOwned ? 0.10 : 0) + (hasRepair ? 0.10 : 0);
      if(energyRate > 0){
        s.energy = Math.min(s.maxEnergy, s.energy + s.maxEnergy * energyRate * dt);
      }
      if(s.hp >= s.maxHp && s.shd >= s.maxShd) continue;
      const hpRate = hasRepair ? 0.05 : 0.008;
      const shdRate = hasRepair ? 0.10 : 0.018;
      s.hp = Math.min(s.maxHp, s.hp + s.maxHp * hpRate * dt);
      s.shd = Math.min(s.maxShd, s.shd + s.maxShd * shdRate * dt);
    }
  }
  tickFleets(dt);
  tickBattles(dt);
  tickBuilds(dt);
  tickAI(dt);
  tickCIWS(dt);
  updateVisibility(dt);
  for(const p of G.planets){
    if(p.flash > 0) p.flash = Math.max(0, p.flash - dt*2);
  }
  uiTimer -= dt;
  if(uiTimer <= 0){
    uiTimer = 0.4;
    renderTop();
  }
  fullRenderCd -= dt;
  if(rightDirty && fullRenderCd <= 0 && !isEditingInput()){
    rightDirty = false;
    renderRight();
  }
  if(pendingSave > 0){
    pendingSave -= dt;
    if(pendingSave <= 0){ pendingSave = 0; saveToLocal(true); }
  }
  idleSaveTimer += dt;
  if(idleSaveTimer >= 120){ idleSaveTimer = 0; saveToLocal(true); }
}

/* ============================================================
   15. 主循环
   ============================================================ */
function doTick(){
  const now = performance.now();
  const elapsed = (now - lastTick) / 1000;
  lastTick = now;
  if(G.paused) return;
  if(elapsed <= 0) return;
  update(Math.min(elapsed, 3600));
}
setInterval(doTick, 100);
function frame(){ render(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', ()=>{
  if(!document.hidden) lastTick = performance.now();
});

/* ============================================================
   16. UI 渲染
   ============================================================ */
function isEditingInput(){
  const ae = document.activeElement;
  if(!ae) return false;
  if(ae.tagName !== 'INPUT' && ae.tagName !== 'TEXTAREA') return false;
  const rb = document.getElementById('rightBody');
  return rb && rb.contains(ae);
}

function renderTop(){
  document.getElementById('uiNation').textContent = G.nationName;
  document.getElementById('uiAlloy').textContent = Math.floor(G.alloy);
  document.getElementById('uiEnergy').textContent = Math.floor(G.energy);
  const playerList = getPlayerPlanets();
  document.getElementById('uiRegion').textContent = playerList.length + '/' + G.planets.length;
  const out = totalOutput();
  document.getElementById('uiAlloyRate').textContent = '+' + out.alloy.toFixed(1) + '/s';
  document.getElementById('uiEnergyRate').textContent = '+' + out.energy.toFixed(1) + '/s';
  const box = document.getElementById('uiMatsBox');
  let html = '<span class="i">⬢</span>';
  let has = false;
  for(let i=1;i<=7;i++){
    const v = Math.floor(G.materials[i] || 0);
    const hasRate = playerList.some(p => Math.min(p.level-1, 7) === i);
    if(v > 0 || hasRate){
      html += `<span class="matv" style="background:${hexA(MAT_COLORS[i], 0.2)};color:${MAT_COLORS[i]}">${v}</span>`;
      has = true;
    }
  }
  if(!has) html += '<span style="opacity:.4;font-size:11px;margin-left:4px">—</span>';
  box.innerHTML = html;
  document.getElementById('zoomLabel').textContent = CAM.scale.toFixed(2) + '×';
}

function renderRight(){
  document.querySelectorAll('.tab').forEach(t=>{
    t.classList.toggle('on', t.dataset.tab === G.tab);
  });
  const body = document.getElementById('rightBody');
  let html = '';
  if(attackSelect) html = viewAttackSelect();
  else if(G.tab === 'region') html = viewRegion();
  else if(G.tab === 'design') html = viewDesign();
  else if(G.tab === 'airforce') html = viewAirforce();
  else if(G.tab === 'shipyard') html = viewShipyard();
  else if(G.tab === 'fleet') html = viewFleet();
  else html = viewLog();
  if(body.dataset.sig !== html){
    body.innerHTML = html;
    body.dataset.sig = html;
  }
}

/* ---------- 星球视图 ---------- */
function viewRegion(){
  const p = G.selected !== null ? G.planets[G.selected] : null;
  if(!p) return '<div class="empt">点击地图上的星球查看详情</div>';
  const fac = p.owner ? G.factions[p.owner] : null;
  const color = fac ? fac.color : NEUTRAL_COLOR;
  const isPlayer = p.owner === 'player';
  const o = regionOutput(p);
  const mr = regionMatOutput(p);
  let facilityLine = '';
  if(p.facilities.length){
    const counts = {};
    for(const f of p.facilities) counts[f] = (counts[f]||0)+1;
    facilityLine = Object.keys(counts).map(k=>
      `${FACILITIES[k]?.icon}${FACILITIES[k]?.name}×${counts[k]}`
    ).join(' ');
  }

  let html = `<div class="panel">
    <div class="ptitle">
      <span class="pdot" style="background:${color};color:${color}"></span>
      <span class="pname">${p.name}</span>
      <span class="ptag">Lv.${p.level}</span>
    </div>
    <div class="line" style="color:${color};font-weight:700">${fac ? fac.name : '无主星球'}</div>
    <div class="line">◈ <b>+${o.alloy.toFixed(1)}/s</b> &nbsp; ⚡ <b>+${o.energy.toFixed(1)}/s</b></div>
    ${p.level >= 3 ? `<div class="line">⬢ <b style="color:${MAT_COLORS[p.level-1]}">${MAT_NAMES[p.level-1]}</b> +${mr.toFixed(2)}/s</div>` : ''}
    ${facilityLine ? `<div class="line">设施：${facilityLine}</div>` : ''}
  </div>`;

  if(p.battle){
    const b = p.battle;
    html += `<div class="panel" style="border-color:rgba(255,215,95,.5)">
      <h3>⚔ 交战中 <span class="sub">${b.time.toFixed(1)}s</span></h3>
      <div class="line">进攻：${G.factions[b.attackerOwner]?.name} · ${b.attacker.filter(s=>s.hp>0).length}/${b.attacker.length}</div>
      <div class="line">防御：${G.factions[b.defenderOwner]?.name} · ${b.defender.filter(s=>s.hp>0).length}/${b.defender.length}</div>
      <button class="btn wide gold" data-battleanim="${p.id}">🎬 查看战斗动画</button>
      <div class="logBox" style="max-height:140px;margin-top:8px">
        ${b.log.slice(-10).reverse().map(l=>`<div class="logLine ${l.type}"><span class="r">${l.r}</span>${l.text}</div>`).join('')}
      </div>
    </div>`;
  }

  const alive = p.garrison.filter(s=>s.hp>0);
  if(alive.length){
    html += `<div class="panel"><h3>驻军 <span class="sub">${alive.length} 艘</span></h3>`;
    for(const s of alive.slice(0, 20)) html += shipRowHTML(s);
    if(alive.length > 20) html += `<div class="line" style="text-align:center;opacity:.6">…还有 ${alive.length-20} 艘</div>`;
    html += `</div>`;
  }

  if(isPlayer){
    if(p.level < 7){
      const c = upgradeCost(p);
      const can = G.alloy >= c.alloy && G.energy >= c.energy;
      html += `<div class="panel"><h3>星球升级</h3>
        <button class="btn wide ${can?'green':''}" data-upgrade="${p.id}" ${can?'':'disabled'}>
          升级至 Lv.${p.level+1} &nbsp; ◈${c.alloy} ⚡${c.energy}
        </button></div>`;
    }
    const slots = maxFacilitySlots(p);
    html += `<div class="panel"><h3>设施 <span class="sub">${p.facilities.length}/${slots}</span></h3>`;
    if(p.facilities.length < slots){
      for(const key in FACILITIES){
        if(key === 'lab' && p.level < 3) continue;
        const f = FACILITIES[key];
        const c = facilityCost(p, key);
        const can = G.alloy >= c.alloy && G.energy >= c.energy;
        html += `<button class="btn wide" data-facility="${key}" data-region="${p.id}"
          ${can?'':'disabled'} style="margin-top:6px;text-align:left">
          ${f.icon} ${f.name} &nbsp; <span style="opacity:.7;font-size:10px">${f.desc}</span><br>
          <span style="font-size:10px;opacity:.6">◈${c.alloy} ⚡${c.energy}</span>
        </button>`;
      }
    } else html += `<div class="line">设施已满</div>`;
    html += `</div>`;
    if(p.facilities.includes('dock')){
      html += `<div class="panel"><h3>造船厂</h3>
        <button class="btn wide green" data-gotab="shipyard">🏗 前往造船页面</button></div>`;
    }
    const hasOthers = getPlayerPlanets().some(pp => pp.id !== p.id);
    if(hasOthers){
      html += `<div class="panel"><h3>调兵</h3>
        <button class="btn wide" data-attack="${p.id}">🚀 从其他星球派兵至此</button></div>`;
    }
  } else if(!p.battle){
    const hasPlayer = getPlayerPlanets().length > 0;
    if(hasPlayer){
      html += `<div class="panel"><h3>发起进攻</h3>
        <button class="btn wide red" data-attack="${p.id}">⚔ 派兵攻打此星球</button></div>`;
    }
  }
  const myQueue = G.buildQueue.filter(q => q.regionId === p.id);
  if(myQueue.length){
    html += `<div class="panel"><h3>建造队列</h3>`;
    for(const q of myQueue){
      const pct = Math.round(q.progress * 100);
      html += `<div class="bqRow">
        <span class="bqn">${q.designName}</span>
        <div class="bqBar"><i style="width:${pct}%"></i></div>
        <span class="num">${pct}%</span>
      </div>`;
    }
    html += `</div>`;
  }
  return html;
}

function shipRowHTML(s){
  const hpPct = s.hp / s.maxHp * 100;
  const hpCls = hpPct > 60 ? '' : (hpPct > 30 ? 'w' : 'c');
  const shdPct = s.maxShd > 0 ? s.shd / s.maxShd * 100 : 0;
  const tierTag = s.tier ? `<span style="font-size:9.5px;color:#8fa8d6;padding:1px 4px;border-radius:4px;background:rgba(120,160,255,.12);margin-right:4px">T${s.tier}</span>` : '';
  const cls = s.shipClass ? SHIP_CLASSES[s.shipClass] : null;
  const clsTag = cls && cls.icon ? `<span style="font-size:9px;margin-right:3px">${cls.icon}</span>` : '';
  const colTag = `<span style="font-size:9px;color:#7fd3ff;padding:1px 4px;border-radius:3px;background:rgba(120,200,255,.12);margin-right:4px">${COL_NAMES[s.column||0]}</span>`;
  return `<div class="srow">
    ${tierTag}${clsTag}${colTag}<span class="nm">${s.name}</span>
    <div class="bar hp ${hpCls}"><i style="width:${hpPct}%"></i></div>
    <div class="bar shd"><i style="width:${shdPct}%"></i></div>
    <span class="num">${Math.ceil(s.hp)}/${s.maxHp}</span>
  </div>`;
}

/* ---------- 设计视图 ---------- */
function viewDesign(){
  const hull = HULLS[G.designHull];
  const st = designStats(G.designMods, G.designHull, G.designClass);
  const over = st.size > st.space;
  const maxModTier = G.designHull + 1;
  let html = '';

  html += `<div class="panel"><h3>舰种 <span class="sub">${SHIP_CLASSES[G.designClass]?.name || '通用'}</span></h3>`;
  html += `<div class="classgrid">`;
  for(const key in SHIP_CLASSES){
    const c = SHIP_CLASSES[key];
    const on = G.designClass === key;
    const reqOk = checkClassReq(key, G.designMods, G.designHull);
    html += `<button class="classbtn ${on?'on':''}" data-class="${key}"
      ${reqOk.ok?'':'disabled'} title="${c.desc}">
      ${c.icon} ${c.name}<small>${c.desc}</small>
    </button>`;
  }
  html += `</div></div>`;

  html += `<div class="panel"><h3>船体 <span class="sub">空间 ${st.size}/${st.space}</span></h3>`;
  html += `<div class="hullgrid">`;
  for(let t=1;t<=7;t++){
    const unlocked = G.hullUnlocked[t];
    const on = G.designHull === t;
    const h = HULLS[t];
    html += `<button class="hullbtn ${on?'on':''}" data-hull="${t}"
      ${unlocked?'':'disabled'}>T${t}<br><span style="font-size:9px;opacity:.7">${h.baseHp}HP</span></button>`;
  }
  html += `</div>`;
  if(hull.matCost){
    const have = Math.floor(G.materials[hull.matCost.mat] || 0);
    const ok = have >= hull.matCost.n;
    html += `<div class="matneed ${ok?'ok':''}">
      建造消耗：${MAT_NAMES[hull.matCost.mat]} × ${hull.matCost.n}（拥有 ${have}）
    </div>`;
  }
  html += `</div>`;

  const locked = [];
  for(let t=2;t<=7;t++) if(!G.hullUnlocked[t]) locked.push(t);
  if(locked.length){
    html += `<div class="panel"><h3>解锁船体</h3>`;
    for(const t of locked){
      const h = HULLS[t];
      const u = h.unlock;
      const have = Math.floor(G.materials[u.mat]||0);
      const can = have >= u.cost;
      html += `<button class="btn wide ${can?'gold':''}" data-unlock="${t}"
        ${can?'':'disabled'} style="margin-top:6px;text-align:left">
        解锁 T${t} — 需要 ${MAT_NAMES[u.mat]} × ${u.cost}<br>
        <span style="font-size:10px;opacity:.6">拥有 ${have}</span>
      </button>`;
    }
    html += `</div>`;
  }

  html += `<div class="panel"><h3>配件 <span class="sub">最高 T${maxModTier}</span></h3>`;
  for(const slot of MOD_KEYS){
    const sel = G.designMods[slot];
    const cur = sel && sel.obj ? sel.obj : null;
    const isRequired = (slot === 'armor' || slot === 'engine');
    html += `<div class="modrow">
      <div class="modlabel">${SLOT_ICON[slot]} ${SLOT_LABEL[slot]}</div>
      <select class="modsel" data-mod="${slot}">
        <option value="">— ${isRequired?'必须选择':'无'} —</option>`;
    for(let t=1;t<=7;t++){
      const lockedT = t > maxModTier;
      html += `<optgroup label="T${t}${lockedT?' 🔒':''}">`;
      for(const s of SIZES){
        const list = getModuleList(slot, t, s, G.designHull);
        for(const m of list){
          const v = `${t}|${s}|${m.key || ''}`;
          const on = (cur && sel.tier===t && sel.size===s && cur.key === m.key) ? 'selected' : '';
          const reqOk = !m.reqHull || G.designHull >= m.reqHull;
          const disabled = lockedT || !reqOk;
          html += `<option value="${v}" ${on} ${disabled?'disabled':''}>${m.name}${!reqOk?' (需T'+m.reqHull+')':''}</option>`;
        }
      }
      html += `</optgroup>`;
    }
    html += `</select></div>`;
    if(cur){
      html += `<div class="modinfo">占 ${cur.size}`;
      if(cur.dmg) html += ` · 伤 ${cur.dmg}`;
      if(cur.charge) html += ` · 蓄 ${cur.charge}s`;
      if(cur.hit === 'always') html += ` · 💯必中`;
      if(cur.aa) html += ` · 防空`;
      if(cur.hp) html += ` · HP+${cur.hp}`;
      if(cur.shd) html += ` · 盾+${cur.shd}`;
      if(cur.spd) html += ` · 速+${cur.spd}`;
      if(cur.eva) html += ` · 闪+${cur.eva}%`;
      if(cur.regen) html += ` · 回 ${cur.regen}`;
      if(cur.repairAmount) html += ` · 🔧 ${cur.repairAmount}/${cur.repairCd}s`;
      if(cur.hangarSlots) html += ` · ✈+${cur.hangarSlots}`;
      html += ` · ◈${cur.cost}</div>`;
    }
  }
  html += `</div>`;

  html += `<div class="panel"><h3>属性预览</h3>
    <div class="sbar ${over?'over':''}"><i style="width:${Math.min(100,st.size/st.space*100)}%"></i></div>
    <div class="st"><span class="k">结构</span><span class="v">${Math.round(st.hp)}</span></div>
    <div class="st"><span class="k">护盾</span><span class="v">${Math.round(st.shd)}</span></div>
    <div class="st"><span class="k">火力</span><span class="v ${st.totalDmg>0?'g':'b'}">${Math.round(st.totalDmg)}/发</span></div>
    <div class="st"><span class="k">速度</span><span class="v">${st.spd}</span></div>
    <div class="st"><span class="k">闪避</span><span class="v">${st.eva}%</span></div>
    ${st.repairAmount ? `<div class="st"><span class="k">修复</span><span class="v g">+${st.repairAmount}/${st.repairCd}s</span></div>` : ''}
    ${st.hangarSlots ? `<div class="st"><span class="k">飞机位</span><span class="v">${st.hangarSlots}</span></div>` : ''}
    <div class="st"><span class="k">建造</span><span class="v">◈${st.cost} ⚡${st.energyCost}</span></div>
    ${hull.matCost ? `<div class="st"><span class="k">材料</span><span class="v ${hasMaterial(hull.matCost)?'g':'b'}">${MAT_NAMES[hull.matCost.mat]} × ${hull.matCost.n}</span></div>` : ''}
  </div>`;

  const reqCheck = checkClassReq(G.designClass, G.designMods, G.designHull);
  const canSave = !over && G.hullUnlocked[G.designHull] && reqCheck.ok;
  html += `<div class="panel"><h3>保存方案</h3>
    <input class="txt" id="designNameInput" placeholder="方案名称" value="${(G.designName||'').replace(/"/g,'&quot;')}">
    <button class="btn wide green" data-savedesign="1" ${canSave?'':'disabled'}>
      💾 保存方案
    </button>
    ${!reqCheck.ok ? `<div class="line" style="color:#ff8a8a;font-size:10px;margin-top:5px">${reqCheck.reason}</div>` : ''}
  </div>`;

  html += `<div class="panel"><h3>已有方案 <span class="sub">${G.designs.length}</span></h3>`;
  if(!G.designs.length){
    html += `<div class="empt">还没有任何方案</div>`;
  } else {
    for(const d of G.designs){
      const s = designStats(d.mods, d.hullTier, d.shipClass);
      const hull2 = HULLS[d.hullTier];
      const canMat = hasMaterial(hull2.matCost);
      const can = G.alloy >= s.cost && G.energy >= s.energyCost && canMat && s.size <= s.space;
      const cls = SHIP_CLASSES[d.shipClass || 'none'];
      html += `<div class="drow">
        <div class="dname">${cls.icon} <span style="color:#ffd75f">T${d.hullTier}</span> ${d.name}</div>
        <div class="dstat">${cls.name} · HP ${Math.round(s.hp)} · 火力 ${Math.round(s.totalDmg)} · 闪 ${s.eva}%</div>
        <div class="dstat">◈${s.cost} ⚡${s.energyCost}${hull2.matCost?` · ${MAT_NAMES[hull2.matCost.mat]}×${hull2.matCost.n}`:''}</div>
        <div class="dbtns">
          <button class="btn sm" data-builddesign="${d.id}" ${can?'':'disabled'}>建造</button>
          <button class="btn sm red" data-deldesign="${d.id}">删除</button>
        </div>
      </div>`;
    }
  }
  html += `</div>`;
  return html;
}

function getModuleList(slot, tier, size, hullTier){
  if(slot === 'main'){
    const allowed = ['rapid','lightCharge','midCharge','heavyCharge','nova'].filter(k=>{
      const req = WEAPON_TYPES[k].reqHull || 0;
      return hullTier >= req;
    });
    return MODULES.main[tier][size].filter(m => allowed.includes(m.key));
  }
  if(slot === 'sub'){
    const list = ['rapid','lightCharge'];
    if(hullTier >= 5) list.push('midCharge');
    return MODULES.sub[tier][size].filter(m => list.includes(m.key));
  }
  if(slot === 'missile') return MODULES.missile[tier][size];
  if(slot === 'aa') return MODULES.aa[tier][size];
  const m = MODULES[slot]?.[tier]?.[size];
  return m ? [m] : [];
}

function checkClassReq(classKey, mods, hullTier){
  const cls = SHIP_CLASSES[classKey];
  if(!cls || !cls.req) return {ok:true};
  if(cls.req.weapon === 'missile'){
    if(!mods.missile || !mods.missile.obj) return {ok:false, reason:'导弹舰必须装配导弹'};
  }
  if(cls.req.weapon === 'aa'){
    if(!mods.aa || !mods.aa.obj) return {ok:false, reason:'防空舰必须装配防空武器'};
  }
  if(cls.req.weapon === 'midCharge'){
    const main = mods.main && mods.main.obj;
    const sub = mods.sub && mods.sub.obj;
    const hasMid = (main && ['midCharge','heavyCharge','nova'].includes(main.key)) ||
                    (sub && sub.key === 'midCharge');
    if(!hasMid) return {ok:false, reason:`${cls.name}需要中型蓄力炮或更高级武器`};
  }
  if(cls.req.module === 'catapult'){
    if(!mods.catapult || !mods.catapult.obj) return {ok:false, reason:'航母必须装配弹射装置'};
  }
  return {ok:true};
}

/* ---------- 空军视图 ---------- */
function viewAirforce(){
  let html = '';
  html += `<div class="panel"><h3>机库仓库 <span class="sub">全局共享</span></h3>`;
  const entries = Object.entries(G.hangar).filter(([k,v])=>v>0);
  if(!entries.length){
    html += `<div class="empt" style="padding:6px 0">仓库为空</div>`;
  } else {
    for(const [designId, count] of entries){
      const d = G.planeDesigns.find(x=>x.id===designId);
      if(!d) continue;
      const st = planeStats(d);
      const type = PLANE_TYPES[d.type];
      html += `<div class="line">${type.icon} T${d.tier||1} <b>${d.name}</b> × ${count} · ◈${st.cost}</div>`;
    }
  }
  html += `</div>`;

  const pd = G.planeDesign;
  const planeHull = PLANE_HULLS[pd.tier || 1];
  const st = planeStats(pd);
  const over = st.size > planeHull.space;

  html += `<div class="panel"><h3>飞机等级 <span class="sub">${planeHull.name} · 空间 ${st.size}/${planeHull.space}</span></h3>`;
  html += `<div class="hullgrid">`;
  for(let t=1;t<=7;t++){
    const unlocked = G.planeHullUnlocked[t];
    const on = (pd.tier||1) === t;
    const h = PLANE_HULLS[t];
    html += `<button class="hullbtn ${on?'on':''}" data-planetier="${t}"
      ${unlocked?'':'disabled'}>T${t}<br><span style="font-size:9px;opacity:.7">${h.baseHp}HP</span></button>`;
  }
  html += `</div>`;
  if(planeHull.matCost){
    const have = Math.floor(G.materials[planeHull.matCost.mat] || 0);
    const ok = have >= planeHull.matCost.n;
    html += `<div class="matneed ${ok?'ok':''}">
      生产消耗：${MAT_NAMES[planeHull.matCost.mat]} × ${planeHull.matCost.n}（拥有 ${have}）
    </div>`;
  }
  html += `</div>`;

  const lockedHulls = [];
  for(let t=2;t<=7;t++) if(!G.planeHullUnlocked[t]) lockedHulls.push(t);
  if(lockedHulls.length){
    html += `<div class="panel"><h3>解锁飞机等级</h3>`;
    for(const t of lockedHulls){
      const h = PLANE_HULLS[t];
      const u = h.unlock;
      const have = Math.floor(G.materials[u.mat]||0);
      const can = have >= u.cost;
      html += `<button class="btn wide ${can?'gold':''}" data-unlockplane="${t}"
        ${can?'':'disabled'} style="margin-top:6px;text-align:left">
        解锁 ${h.name} — 需要 ${MAT_NAMES[u.mat]} × ${u.cost}<br>
        <span style="font-size:10px;opacity:.6">拥有 ${have}</span>
      </button>`;
    }
    html += `</div>`;
  }

  html += `<div class="panel"><h3>机种</h3>`;
  html += `<div class="classgrid">`;
  for(const key in PLANE_TYPES){
    const t = PLANE_TYPES[key];
    const on = pd.type === key;
    html += `<button class="classbtn ${on?'on':''}" data-planetype="${key}">
      ${t.icon} ${t.name}<small>${t.desc}</small>
    </button>`;
  }
  html += `</div></div>`;

  const planeTier = pd.tier || 1;
  html += `<div class="panel"><h3>配件配置 <span class="sub">最高 T${planeTier}</span></h3>`;

  html += `<div class="modrow"><div class="modlabel">🔴 武器</div>
    <select class="modsel" data-planemod="weapon">
      <option value="">— 无 —</option>`;
  for(let t=1;t<=planeTier;t++){
    const list = PLANE_MODULES.weapon[t];
    html += `<optgroup label="T${t}">`;
    for(const m of list){
      const on = pd.weapons.main && pd.weapons.main.key===m.key && pd.weapons.main.tier===t;
      html += `<option value="w:${t}|${m.key}" ${on?'selected':''}>${m.name} · 伤 ${m.dmg} · 蓄 ${m.charge}s</option>`;
    }
    html += `</optgroup>`;
  }
  html += `</select></div>`;

  html += `<div class="modrow"><div class="modlabel">🛡 装甲</div>
    <select class="modsel" data-planemod="armor">
      <option value="">— 无 —</option>`;
  for(let t=1;t<=planeTier;t++){
    const m = PLANE_MODULES.armor[t];
    const on = pd.armor && pd.armor.tier===t;
    html += `<option value="a:${t}" ${on?'selected':''}>${m.name} · HP+${m.hp}</option>`;
  }
  html += `</select></div>`;

  html += `<div class="modrow"><div class="modlabel">🚀 引擎</div>
    <select class="modsel" data-planemod="engine">
      <option value="">— 无 —</option>`;
  for(let t=1;t<=planeTier;t++){
    const m = PLANE_MODULES.engine[t];
    const on = pd.engine && pd.engine.tier===t;
    html += `<option value="e:${t}" ${on?'selected':''}>${m.name} · 速+${m.spd} 闪+${m.eva}%</option>`;
  }
  html += `</select></div>`;

  html += `<div class="modrow"><div class="modlabel">⚡ 储能</div>
    <select class="modsel" data-planemod="reactor">
      <option value="">— 无 —</option>`;
  for(let t=1;t<=planeTier;t++){
    const m = PLANE_MODULES.reactor[t];
    const on = pd.reactor && pd.reactor.tier===t;
    html += `<option value="r:${t}" ${on?'selected':''}>${m.name} · 回+${m.regen}</option>`;
  }
  html += `</select></div></div>`;

  html += `<div class="panel"><h3>属性预览</h3>
    <div class="st"><span class="k">HP</span><span class="v">${st.hp}</span></div>
    <div class="st"><span class="k">护盾</span><span class="v">${st.shd}</span></div>
    <div class="st"><span class="k">对舰火力</span><span class="v ${st.dmg>0?'g':'b'}">${st.dmg}/发</span></div>
    <div class="st"><span class="k">对空火力</span><span class="v">${st.aaDmg}/发</span></div>
    <div class="st"><span class="k">速度</span><span class="v">${st.spd}</span></div>
    <div class="st"><span class="k">闪避</span><span class="v">${st.eva}%</span></div>
    <div class="st"><span class="k">造价</span><span class="v">◈${st.cost}</span></div>
    ${planeHull.matCost ? `<div class="st"><span class="k">材料</span><span class="v ${hasMaterial(planeHull.matCost)?'g':'b'}">${MAT_NAMES[planeHull.matCost.mat]} × ${planeHull.matCost.n}</span></div>` : ''}
  </div>`;

  html += `<div class="panel"><h3>保存 / 生产</h3>
    <input class="txt" id="planeNameInput" placeholder="机种名称" value="${(pd.name||'').replace(/"/g,'&quot;')}">
    <button class="btn wide green" data-saveplane="1" ${over?'disabled':''}>💾 保存设计</button>
    <button class="btn wide gold" data-produceplane="1" ${over||!st.weapon?'disabled':''}>
      🏭 生产 1 架（◈${st.cost}${planeHull.matCost?` + ${MAT_NAMES[planeHull.matCost.mat]}×${planeHull.matCost.n}`:''}）
    </button>
  </div>`;

  html += `<div class="panel"><h3>已保存设计 <span class="sub">${G.planeDesigns.length}</span></h3>`;
  if(!G.planeDesigns.length){
    html += `<div class="empt">还没有飞机设计</div>`;
  } else {
    for(const d of G.planeDesigns){
      const s = planeStats(d);
      const type = PLANE_TYPES[d.type];
      const hull = PLANE_HULLS[d.tier||1];
      const canMat = hasMaterial(hull.matCost);
      const can = G.alloy >= s.cost && canMat;
      const stock = G.hangar[d.id] || 0;
      html += `<div class="drow">
        <div class="dname">${type.icon} <span style="color:#ffd75f">T${d.tier||1}</span> ${d.name} <span style="color:#8fa8d6">· 库存 ${stock}</span></div>
        <div class="dstat">HP ${s.hp} · 对舰 ${s.dmg} · 对空 ${s.aaDmg} · 速 ${s.spd}</div>
        <div class="dstat">◈${s.cost}${hull.matCost?` · ${MAT_NAMES[hull.matCost.mat]}×${hull.matCost.n}`:''}</div>
        <div class="dbtns">
          <button class="btn sm" data-produce="${d.id}" ${can?'':'disabled'}>生产</button>
          <button class="btn sm red" data-delplane="${d.id}">删除</button>
        </div>
      </div>`;
    }
  }
  html += `</div>`;
  return html;
}

/* ---------- 造船视图 ---------- */
function viewShipyard(){
  const yards = G.planets.filter(p =>
    p.owner === 'player' && p.facilities.includes('dock'));
  if(!yards.length){
    return `<div class="panel"><h3>🏗 造船厂</h3>
      <div class="line">你还没有建造任何造船厂</div></div>`;
  }
  if(shipyardCurrent == null || !yards.find(y => y.id === shipyardCurrent)){
    shipyardCurrent = yards[0].id;
  }
  const cur = G.planets[shipyardCurrent];
  let html = '';
  html += `<div class="panel"><h3>选择造船厂 <span class="sub">${yards.length} 座</span></h3>`;
  html += `<div class="yardgrid">`;
  for(const y of yards){
    const on = y.id === shipyardCurrent;
    const qCount = G.buildQueue.filter(q => q.regionId === y.id).length;
    html += `<button class="yardbtn ${on?'on':''}" data-yard="${y.id}">
      ${y.name}<br><span style="font-size:9px;opacity:.7">Lv${y.level} · 队列 ${qCount}</span>
    </button>`;
  }
  html += `</div></div>`;

  const hasRepair = cur.facilities.includes('repair');
  html += `<div class="panel">
    <div class="ptitle">
      <span class="pdot" style="background:${G.factions.player.color};color:${G.factions.player.color}"></span>
      <span class="pname">${cur.name}</span>
      <span class="ptag">Lv.${cur.level}</span>
    </div>
    <div class="line">🏗 造船厂 · 建造速度 +40%</div>
    ${hasRepair ? `<div class="line" style="color:#8bffa0">🛠 修复港运转中</div>` : ''}
  </div>`;

  const myQueue = G.buildQueue.filter(q => q.regionId === cur.id);
  if(myQueue.length){
    html += `<div class="panel"><h3>建造队列 <span class="sub">${myQueue.length} 项</span></h3>`;
    for(const q of myQueue){
      const pct = Math.round(q.progress * 100);
      html += `<div class="bqRow">
        <span class="bqn">${q.designName}</span>
        <div class="bqBar"><i style="width:${pct}%"></i></div>
        <span class="num">${pct}%</span>
      </div>`;
    }
    html += `</div>`;
  }

  html += `<div class="panel"><h3>可用设计方案 <span class="sub">${G.designs.length}</span></h3>`;
  if(!G.designs.length){
    html += `<div class="empt">还没有设计</div>`;
  } else {
    for(const d of G.designs){
      const s = designStats(d.mods, d.hullTier, d.shipClass);
      const hull = HULLS[d.hullTier];
      const canMat = hasMaterial(hull.matCost);
      const can = G.alloy >= s.cost && G.energy >= s.energyCost && canMat && s.size <= s.space;
      const cls = SHIP_CLASSES[d.shipClass || 'none'];
      html += `<div class="drow">
        <div class="dname">${cls.icon} <span style="color:#ffd75f">T${d.hullTier}</span> ${d.name}</div>
        <div class="dstat">${cls.name} · HP ${Math.round(s.hp)} · 火力 ${Math.round(s.totalDmg)}</div>
        <div class="dstat">◈${s.cost} ⚡${s.energyCost}${hull.matCost?` · ${MAT_NAMES[hull.matCost.mat]}×${hull.matCost.n}`:''}</div>
        <div class="dbtns">
          <button class="btn sm" data-buildyard="${d.id}" ${can?'':'disabled'} style="flex:1">🔨 建造</button>
          <button class="btn sm red" data-deldesign="${d.id}">删除</button>
        </div>
      </div>`;
    }
  }
  html += `</div>`;
  return html;
}

/* ---------- 舰队视图 ---------- */
function viewFleet(){
  let html = '';
  html += `<div class="panel"><h3>舰队编组 <span class="sub">${G.groups.length}</span></h3>`;
  if(!G.groups.length){
    html += `<div class="empt" style="padding:8px 0">还没有编组，先创建一个</div>`;
  } else {
    for(const g of G.groups){
      const ships = getAllPlayerShipsByGroup(g.id);
      html += `<div class="groupRow">
        <span class="gname">${g.name}</span>
        <span class="gcount">${ships.length} 艘</span>
        <button class="gedit" data-renamegroup="${g.id}">改名</button>
        <button class="gedit gdel" data-delgroup="${g.id}">×</button>
      </div>`;
    }
  }
  html += `<button class="btn wide green" data-newgroup="1">➕ 新建编组</button></div>`;

  const myFleets = G.fleets.filter(f => f.owner === 'player');
  if(myFleets.length){
    html += `<div class="panel"><h3>航行中 <span class="sub">${myFleets.length}</span></h3>`;
    for(const f of myFleets){
      const to = G.planets[f.toRegionId];
      html += `<div class="line">→ ${to.name} · ${f.ships.filter(s=>s.hp>0).length}艘 · ${Math.round(f.progress*100)}%</div>`;
    }
    html += `</div>`;
  }

  const withShips = G.planets.filter(p =>
    p.owner === 'player' && p.garrison.some(s=>s.owner==='player' && s.hp>0));
  if(withShips.length){
    for(const p of withShips){
      const mine = p.garrison.filter(s=>s.owner==='player' && s.hp>0);
      html += `<div class="panel"><h3>${p.name} <span class="sub">Lv${p.level} · ${mine.length} 艘</span></h3>`;
      const byCol = [[],[],[],[]];
      for(const s of mine){
        const c = clamp(s.column || 0, 0, 3);
        byCol[c].push(s);
      }
      html += `<div class="formation">`;
      for(let c = 0; c < 4; c++){
        html += `<div class="fcol" data-fcol="${c}">
          <div class="fcol-title">${COL_NAMES[c]}</div>`;
        if(byCol[c].length === 0){
          html += `<div class="fempty">空</div>`;
        } else {
          for(const s of byCol[c]){
            const hpPct = s.hp/s.maxHp*100;
            const hpCls = hpPct>60?'':(hpPct>30?'w':'c');
            const cls = SHIP_CLASSES[s.shipClass || 'none'];
            html += `<div class="fship" draggable="true" data-drag-ship="${s.uid}">
              <div class="fship-name">${cls.icon} T${s.tier} ${s.name.split('-')[0]}</div>
              <div class="bar hp ${hpCls}" style="width:100%"><i style="width:${hpPct}%"></i></div>
            </div>`;
          }
        }
        html += `</div>`;
      }
      html += `</div>`;

      if(G.groups.length){
        html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">`;
        for(const g of G.groups){
          html += `<button class="btn sm" data-assignall="${g.id}|${p.id}">${g.name} 全部</button>`;
        }
        html += `<button class="btn sm red" data-clearassign="${p.id}">取消编组</button></div>`;
      }

      html += `<div style="margin-top:8px">`;
      for(const s of mine) html += shipRowWithGroup(s);
      html += `</div></div>`;
    }
  }
  if(!withShips.length && !myFleets.length){
    html += '<div class="empt">你还没有任何舰船</div>';
  }
  return html;
}

function shipRowWithGroup(s){
  const hpPct = s.hp / s.maxHp * 100;
  const hpCls = hpPct > 60 ? '' : (hpPct > 30 ? 'w' : 'c');
  const shdPct = s.maxShd > 0 ? s.shd / s.maxShd * 100 : 0;
  const tierTag = s.tier ? `<span style="font-size:9.5px;color:#8fa8d6;padding:1px 4px;border-radius:4px;background:rgba(120,160,255,.12);margin-right:4px">T${s.tier}</span>` : '';
  let options = '<option value="">未编组</option>';
  for(const g of G.groups){
    const sel = s.groupId === g.id ? 'selected' : '';
    options += `<option value="${g.id}" ${sel}>${g.name}</option>`;
  }
  let html = `<div class="srow">
    ${tierTag}<span class="nm">${s.name}</span>
    <div class="bar hp ${hpCls}"><i style="width:${hpPct}%"></i></div>
    <div class="bar shd"><i style="width:${shdPct}%"></i></div>
    <select class="grpSel" data-shipgroup="${s.uid}">${options}</select>
  </div>`;
  if(s.hangarSlots > 0){
    const deployed = (s.squadron||[]).length;
    html += `<div style="padding:4px 0 6px 24px;font-size:10px;color:#8fa8d6">
      ✈ 飞机位 ${deployed}/${s.hangarSlots}
      <button class="btn sm" data-deploy="${s.uid}" style="margin-left:6px">部署</button>
      ${deployed>0?`<button class="btn sm red" data-recall="${s.uid}" style="margin-left:4px">召回</button>`:''}
    </div>`;
  }
  return html;
}

/* ---------- 日志 ---------- */
function viewLog(){
  if(!G.logs.length) return '<div class="empt">暂无日志</div>';
  let html = `<div class="panel"><h3>战报</h3><div class="logBox" style="max-height:none">`;
  for(const l of G.logs){
    const color = l.type === 'win' ? '#8bffa0' : l.type === 'lose' ? '#ff8a8a' :
                  l.type === 'fight' ? '#ffd75f' : '#8fa8d6';
    html += `<div class="logLine" style="color:${color}"><span class="r">${fmtTime(l.t)}</span>${l.text}</div>`;
  }
  html += `</div></div>`;
  return html;
}

/* ---------- 攻击选择 ---------- */
function openAttackSelect(targetId, preselectGroup){
  const target = G.planets[targetId];
  if(!target) return;
  const groups = [];
  for(const p of G.planets){
    if(p.id === targetId) continue;
    const mine = p.garrison.filter(s=>s.owner==='player' && s.hp>0);
    if(mine.length) groups.push({planet:p, ships:mine});
  }
  if(!groups.length){ toast('没有可用的舰船'); return; }
  attackSelect = { targetId, selected: new Set() };
  if(preselectGroup){
    const gs = getAllPlayerShipsByGroup(preselectGroup);
    for(const s of gs) attackSelect.selected.add(s.uid);
  }
  document.getElementById('rightBody').dataset.sig = '';
  renderRight();
}

function viewAttackSelect(){
  if(!attackSelect) return '';
  const target = G.planets[attackSelect.targetId];
  if(!target){ attackSelect = null; return '<div class="empt">目标已不存在</div>'; }
  const sel = attackSelect.selected;

  let html = `<div class="panel">
    <h3>派遣至 ${target.name} <span class="sub">已选 ${sel.size}</span></h3>
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px">
      <button class="btn sm" data-selectall="1">全选</button>
      <button class="btn sm" data-selectnone="1">清空</button>`;
  for(const g of G.groups){
    const gs = getAllPlayerShipsByGroup(g.id);
    if(gs.length) html += `<button class="btn sm" data-selectgroup="${g.id}">${g.name} · ${gs.length}</button>`;
  }
  html += `</div></div>`;

  for(const p of G.planets){
    if(p.id === target.id) continue;
    const mine = p.garrison.filter(s=>s.owner==='player' && s.hp>0);
    if(!mine.length) continue;
    html += `<div class="panel"><h3>${p.name} <span class="sub">${mine.length}艘</span></h3>`;
    for(const s of mine){
      const checked = sel.has(s.uid);
      const hpPct = s.hp/s.maxHp*100;
      const hpCls = hpPct>60?'':(hpPct>30?'w':'c');
      html += `<label class="srow" style="cursor:pointer">
        <input type="checkbox" data-seluid="${s.uid}" ${checked?'checked':''}
          style="accent-color:#4ea8ff;width:14px;height:14px">
        <span class="nm">T${s.tier} ${s.name}</span>
        <div class="bar hp ${hpCls}"><i style="width:${hpPct}%"></i></div>
        <span class="num">${Math.ceil(s.hp)}</span>
      </label>`;
    }
    html += `</div>`;
  }

  html += `<div class="panel">
    <button class="btn wide red" data-confirmattack="1" ${sel.size?'':'disabled'}>
      ⚔ 出击（${sel.size}艘）
    </button>
    <button class="btn wide" data-cancelattack="1">取消</button>
  </div>`;
  return html;
}

/* ============================================================
   17. 事件
   ============================================================ */
document.getElementById('tabs').addEventListener('click', ev=>{
  const t = ev.target.closest('.tab');
  if(!t) return;
  G.tab = t.dataset.tab;
  attackSelect = null;
  document.getElementById('rightBody').dataset.sig = '';
  renderRight();
});

document.getElementById('rightBody').addEventListener('click', ev=>{
  const t = ev.target;

  const clsBtn = t.closest('[data-class]');
  if(clsBtn && !clsBtn.disabled){
    G.designClass = clsBtn.dataset.class;
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }

  const ptBtn = t.closest('[data-planetier]');
  if(ptBtn && !ptBtn.disabled){
    const newTier = +ptBtn.dataset.planetier;
    G.planeDesign.tier = newTier;
    const w = G.planeDesign.weapons.main;
    if(w && w.tier > newTier) G.planeDesign.weapons.main = null;
    if(G.planeDesign.armor && G.planeDesign.armor.tier > newTier) G.planeDesign.armor = null;
    if(G.planeDesign.engine && G.planeDesign.engine.tier > newTier) G.planeDesign.engine = null;
    if(G.planeDesign.reactor && G.planeDesign.reactor.tier > newTier) G.planeDesign.reactor = null;
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }

  const ptBtn2 = t.closest('[data-planetype]');
  if(ptBtn2){
    G.planeDesign.type = ptBtn2.dataset.planetype;
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }

  if(t.dataset.unlockplane){
    const r = unlockPlaneHull(+t.dataset.unlockplane);
    if(!r.ok) toast(r.reason);
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }

  if(t.dataset.battleanim){ openBattleAnim(+t.dataset.battleanim); return; }

  if(t.dataset.yard){
    shipyardCurrent = +t.dataset.yard;
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }
  if(t.dataset.buildyard){
    if(shipyardCurrent == null){ toast('请先选择造船厂'); return; }
    if(startBuild(t.dataset.buildyard, shipyardCurrent)){
      document.getElementById('rightBody').dataset.sig='';
      renderRight();
    } else toast('资源/材料不足或超空间');
    return;
  }
  if(t.dataset.gotab){
    G.tab = t.dataset.gotab;
    attackSelect = null;
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }

  if(t.dataset.newgroup){
    const name = prompt('新建编组名称', G.nationName + '第' + (G.groups.length+1) + '舰队');
    if(name !== null){
      const gid = 'g' + (G.nextGroupId++);
      G.groups.push({id:gid, name:(name||'').slice(0,16) || ('编组'+G.groups.length)});
      document.getElementById('rightBody').dataset.sig = '';
      renderRight();
      markDirty();
    }
    return;
  }
  if(t.dataset.renamegroup){
    const g = G.groups.find(x=>x.id===t.dataset.renamegroup);
    if(g){
      const name = prompt('重命名', g.name);
      if(name !== null){ g.name = (name||'').slice(0,16); document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); }
    }
    return;
  }
  if(t.dataset.delgroup){
    if(!confirm('删除编组？')) return;
    const gid = t.dataset.delgroup;
    for(const p of G.planets) for(const s of p.garrison) if(s.groupId===gid) s.groupId=null;
    for(const f of G.fleets) for(const s of f.ships) if(s.groupId===gid) s.groupId=null;
    G.groups = G.groups.filter(g=>g.id!==gid);
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    markDirty();
    return;
  }
  if(t.dataset.assignall){
    const [gid, pid] = t.dataset.assignall.split('|');
    const p = G.planets[+pid];
    if(p){
      for(const s of p.garrison) if(s.owner === 'player' && s.hp > 0) s.groupId = gid;
      document.getElementById('rightBody').dataset.sig = '';
      renderRight();
      markDirty();
    }
    return;
  }
  if(t.dataset.clearassign){
    const p = G.planets[+t.dataset.clearassign];
    if(p){
      for(const s of p.garrison) if(s.owner === 'player') s.groupId = null;
      document.getElementById('rightBody').dataset.sig = '';
      renderRight();
      markDirty();
    }
    return;
  }

  if(t.dataset.saveplane){
    const inp = document.getElementById('planeNameInput');
    const name = (inp && inp.value.trim()) || '新战机';
    const st = planeStats(G.planeDesign);
    const planeHull = PLANE_HULLS[G.planeDesign.tier || 1];
    if(st.size > planeHull.space){ toast('超出机舱空间'); return; }
    if(!G.planeDesign.weapons.main){ toast('必须装配武器'); return; }
    G.planeDesigns.push({
      id: 'pd' + Date.now() + Math.random().toString(36).slice(2,5),
      name, type: G.planeDesign.type, tier: G.planeDesign.tier || 1,
      weapons: JSON.parse(JSON.stringify(G.planeDesign.weapons)),
      armor: G.planeDesign.armor ? {...G.planeDesign.armor} : null,
      engine: G.planeDesign.engine ? {...G.planeDesign.engine} : null,
      reactor: G.planeDesign.reactor ? {...G.planeDesign.reactor} : null,
    });
    addLog(`💾 保存飞机设计「T${G.planeDesign.tier||1} ${name}」`, 'info');
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    markDirty();
    return;
  }
  if(t.dataset.produceplane){
    const st = planeStats(G.planeDesign);
    const planeHull = PLANE_HULLS[G.planeDesign.tier || 1];
    if(st.size > planeHull.space){ toast('超出机舱空间'); return; }
    if(!G.planeDesign.weapons.main){ toast('必须装配武器'); return; }
    if(G.alloy < st.cost){ toast('合金不足'); return; }
    if(!hasMaterial(planeHull.matCost)){ toast('材料不足'); return; }
    let d = G.planeDesigns.find(x=>
      x.name === G.planeDesign.name && x.type === G.planeDesign.type && x.tier === (G.planeDesign.tier||1));
    if(!d){
      d = {
        id: 'pd' + Date.now() + Math.random().toString(36).slice(2,5),
        name: (G.planeDesign.name||'新战机'), type: G.planeDesign.type,
        tier: G.planeDesign.tier || 1,
        weapons: JSON.parse(JSON.stringify(G.planeDesign.weapons)),
        armor: G.planeDesign.armor ? {...G.planeDesign.armor} : null,
        engine: G.planeDesign.engine ? {...G.planeDesign.engine} : null,
        reactor: G.planeDesign.reactor ? {...G.planeDesign.reactor} : null,
      };
      G.planeDesigns.push(d);
    }
    G.alloy -= st.cost;
    payMaterial(planeHull.matCost);
    G.hangar[d.id] = (G.hangar[d.id] || 0) + 1;
    addLog(`🏭 生产 1 架 T${d.tier} ${d.name}`, 'info');
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    markDirty();
    return;
  }
  const prodBtn = t.closest('[data-produce]');
  if(prodBtn){
    const d = G.planeDesigns.find(x=>x.id === prodBtn.dataset.produce);
    if(!d) return;
    const st = planeStats(d);
    const hull = PLANE_HULLS[d.tier||1];
    if(G.alloy < st.cost){ toast('合金不足'); return; }
    if(!hasMaterial(hull.matCost)){ toast('材料不足'); return; }
    G.alloy -= st.cost;
    payMaterial(hull.matCost);
    G.hangar[d.id] = (G.hangar[d.id] || 0) + 1;
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    markDirty();
    return;
  }
  if(t.dataset.delplane){
    const id = t.dataset.delplane;
    delete G.hangar[id];
    G.planeDesigns = G.planeDesigns.filter(x=>x.id !== id);
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    markDirty();
    return;
  }

  if(t.dataset.deploy){
    const ship = findPlayerShipByUid(t.dataset.deploy);
    if(!ship) return;
    const available = Object.entries(G.hangar).filter(([k,v])=>v>0);
    if(!available.length){ toast('仓库没有可用飞机'); return; }
    const deployed = (ship.squadron||[]).length;
    const slotsLeft = ship.hangarSlots - deployed;
    if(slotsLeft <= 0){ toast('飞机位已满'); return; }
    let msg = `部署飞机（空位 ${slotsLeft}）：\n`;
    available.forEach(([id, cnt], i)=>{
      const d = G.planeDesigns.find(x=>x.id===id);
      if(d) msg += `${i+1}. T${d.tier||1} ${d.name} ×${cnt}\n`;
    });
    const ans = prompt(msg, '1');
    const idx = parseInt(ans,10) - 1;
    if(isNaN(idx) || idx < 0 || idx >= available.length) return;
    const [designId] = available[idx];
    const plane = createPlaneInstance(designId);
    if(!plane) return;
    plane.row = 0;
    ship.squadron = ship.squadron || [];
    ship.squadron.push(plane);
    G.hangar[designId]--;
    if(G.hangar[designId] <= 0) delete G.hangar[designId];
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    markDirty();
    return;
  }
  if(t.dataset.recall){
    const ship = findPlayerShipByUid(t.dataset.recall);
    if(!ship || !ship.squadron) return;
    for(const plane of ship.squadron){
      G.hangar[plane.designId] = (G.hangar[plane.designId]||0) + 1;
    }
    ship.squadron = [];
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    markDirty();
    return;
  }

  const hb = t.closest('[data-hull]');
  if(hb && !hb.disabled){
    const newHull = +hb.dataset.hull;
    G.designHull = newHull;
    const cap = newHull + 1;
    for(const slot of MOD_KEYS){
      const sel = G.designMods[slot];
      if(sel && sel.tier > cap) G.designMods[slot] = null;
    }
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }

  if(t.dataset.unlock){
    const r = unlockHull(+t.dataset.unlock);
    if(!r.ok) toast(r.reason);
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }

  if(t.dataset.savedesign){
    const inp = document.getElementById('designNameInput');
    const name = (inp && inp.value.trim()) || '未命名方案';
    const st = designStats(G.designMods, G.designHull, G.designClass);
    if(st.size > st.space){ toast('超出船体空间'); return; }
    if(st.totalDmg <= 0 && st.hangarSlots <= 0){ toast('这艘船没有任何武器或飞机位'); return; }
    const req = checkClassReq(G.designClass, G.designMods, G.designHull);
    if(!req.ok){ toast(req.reason); return; }
    G.designs.push({
      id: 'd' + Date.now() + Math.random().toString(36).slice(2,6),
      name, hullTier: G.designHull, shipClass: G.designClass,
      mods: JSON.parse(JSON.stringify(G.designMods)),
    });
    addLog(`💾 保存方案「${SHIP_CLASSES[G.designClass].name} T${G.designHull} ${name}」`, 'info');
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    markDirty();
    return;
  }

  const bd = t.closest('[data-builddesign]');
  if(bd){
    if(startBuild(bd.dataset.builddesign, G.playerHomeId)){
      document.getElementById('rightBody').dataset.sig='';
      renderRight();
    } else toast('资源/材料不足或超空间');
    return;
  }

  if(t.dataset.deldesign){
    G.designs = G.designs.filter(d=>d.id !== t.dataset.deldesign);
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    markDirty();
    return;
  }

  if(t.dataset.upgrade){
    if(upgradeRegion(+t.dataset.upgrade)){
      document.getElementById('rightBody').dataset.sig='';
      renderRight();
    }
    return;
  }

  const fb = t.closest('[data-facility]');
  if(fb){
    if(buildFacility(+fb.dataset.region, fb.dataset.facility)){
      document.getElementById('rightBody').dataset.sig='';
      renderRight();
    } else toast('资源不足或已达上限');
    return;
  }

  if(t.dataset.attack){ openAttackSelect(+t.dataset.attack); return; }

  if(t.dataset.selectall){
    if(!attackSelect) return;
    for(const p of G.planets){
      if(p.id === attackSelect.targetId) continue;
      for(const s of p.garrison) if(s.owner==='player' && s.hp>0) attackSelect.selected.add(s.uid);
    }
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }
  if(t.dataset.selectnone){
    if(!attackSelect) return;
    attackSelect.selected.clear();
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }
  if(t.dataset.selectgroup){
    if(!attackSelect) return;
    const gs = getAllPlayerShipsByGroup(t.dataset.selectgroup);
    const allSel = gs.every(s => attackSelect.selected.has(s.uid));
    if(allSel) for(const s of gs) attackSelect.selected.delete(s.uid);
    else for(const s of gs) attackSelect.selected.add(s.uid);
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }
  if(t.dataset.cancelattack){
    attackSelect = null;
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }
  if(t.dataset.confirmattack){
    if(!attackSelect) return;
    const targetId = attackSelect.targetId;
    const sel = [...attackSelect.selected];
    if(!sel.length) return;
    const byRegion = {};
    for(const p of G.planets){
      for(const s of p.garrison){
        if(sel.includes(s.uid) && s.hp > 0){
          (byRegion[p.id] = byRegion[p.id] || []).push(s);
        }
      }
    }
    for(const fromId in byRegion){
      const ships = byRegion[fromId];
      const from = G.planets[+fromId];
      from.garrison = from.garrison.filter(s => !ships.includes(s));
      launchFleet('player', ships, +fromId, targetId, 'attack');
    }
    addLog(`🚀 派遣 ${sel.size} 艘前往 ${G.planets[targetId].name}`, 'info');
    attackSelect = null;
    G.tab = 'region';
    G.selected = targetId;
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    markDirty();
    return;
  }
});

document.getElementById('rightBody').addEventListener('change', ev=>{
  const sel = ev.target;

  if(sel.type === 'checkbox' && sel.dataset.seluid){
    if(!attackSelect) return;
    if(sel.checked) attackSelect.selected.add(sel.dataset.seluid);
    else attackSelect.selected.delete(sel.dataset.seluid);
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }

  if(sel.dataset && sel.dataset.planemod){
    const kind = sel.dataset.planemod;
    const v = sel.value;
    if(!v){
      if(kind === 'weapon') G.planeDesign.weapons.main = null;
      else G.planeDesign[kind] = null;
    } else {
      const [prefix, rest] = v.split(':');
      const parts = rest.split('|');
      const t = +parts[0];
      if(kind === 'weapon'){
        const key = parts[1];
        const m = mkPlaneWeapon(key, t); m.tier = t;
        G.planeDesign.weapons.main = m;
      } else if(kind === 'armor'){
        const m = mkPlaneArmor(t); m.tier = t;
        G.planeDesign.armor = m;
      } else if(kind === 'engine'){
        const m = mkPlaneEngine(t); m.tier = t;
        G.planeDesign.engine = m;
      } else if(kind === 'reactor'){
        const m = mkPlaneReactor(t); m.tier = t;
        G.planeDesign.reactor = m;
      }
    }
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }

  if(sel.dataset && sel.dataset.mod){
    const slot = sel.dataset.mod;
    const v = sel.value;
    if(!v) G.designMods[slot] = null;
    else {
      const [tt, ss, key] = v.split('|');
      const tier = +tt;
      const list = getModuleList(slot, tier, ss, G.designHull);
      const obj = list.find(m => (m.key||'') === key) || list[0];
      if(obj) G.designMods[slot] = { tier, size: ss, obj };
    }
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    return;
  }

  if(sel.dataset && sel.dataset.shipgroup){
    const ship = findPlayerShipByUid(sel.dataset.shipgroup);
    if(ship) ship.groupId = sel.value || null;
    document.getElementById('rightBody').dataset.sig='';
    renderRight();
    markDirty();
    return;
  }
});

document.getElementById('rightBody').addEventListener('input', ev=>{
  if(ev.target.id === 'designNameInput') G.designName = ev.target.value;
  if(ev.target.id === 'planeNameInput') G.planeDesign.name = ev.target.value;
});

document.getElementById('rightBody').addEventListener('focusout', ()=>{
  setTimeout(()=>{
    const ae = document.activeElement;
    if(!ae || (ae.tagName !== 'INPUT' && ae.tagName !== 'TEXTAREA')){
      document.getElementById('rightBody').dataset.sig = '';
      renderRight();
    }
  }, 100);
});

document.getElementById('rightBody').addEventListener('dragstart', ev=>{
  const card = ev.target.closest('[data-drag-ship]');
  if(!card) return;
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', card.dataset.dragShip);
  card.classList.add('dragging');
});
document.getElementById('rightBody').addEventListener('dragend', ev=>{
  const card = ev.target.closest('[data-drag-ship]');
  if(card) card.classList.remove('dragging');
  document.querySelectorAll('.fcol.dragover').forEach(c => c.classList.remove('dragover'));
});
document.getElementById('rightBody').addEventListener('dragover', ev=>{
  const col = ev.target.closest('[data-fcol]');
  if(!col) return;
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.fcol.dragover').forEach(c => c.classList.remove('dragover'));
  col.classList.add('dragover');
});
document.getElementById('rightBody').addEventListener('dragleave', ev=>{
  const col = ev.target.closest('[data-fcol]');
  if(col) col.classList.remove('dragover');
});
document.getElementById('rightBody').addEventListener('drop', ev=>{
  const col = ev.target.closest('[data-fcol]');
  if(!col) return;
  ev.preventDefault();
  col.classList.remove('dragover');
  const uid = ev.dataTransfer.getData('text/plain');
  const ship = findPlayerShipByUid(uid);
  if(!ship) return;
  const newCol = +col.dataset.fcol;
  if(ship.column !== newCol){
    ship.column = newCol;
    document.getElementById('rightBody').dataset.sig = '';
    renderRight();
    markDirty();
  }
});

let isDragging = false, dragStartX = 0, dragStartY = 0, dragCamX = 0, dragCamY = 0;
let hasDragged = false;
canvas.addEventListener('pointerdown', ev=>{
  isDragging = true; hasDragged = false;
  dragStartX = ev.clientX; dragStartY = ev.clientY;
  dragCamX = CAM.x; dragCamY = CAM.y;
  canvas.setPointerCapture(ev.pointerId);
});
canvas.addEventListener('pointermove', ev=>{
  if(!isDragging) return;
  const dx = ev.clientX - dragStartX, dy = ev.clientY - dragStartY;
  if(Math.abs(dx) + Math.abs(dy) > 4) hasDragged = true;
  CAM.x = dragCamX - dx / CAM.scale;
  CAM.y = dragCamY - dy / CAM.scale;
});
canvas.addEventListener('pointerup', ev=>{
  if(!isDragging) return;
  isDragging = false;
  if(hasDragged) return;
  const w = screenToWorld(ev.clientX, ev.clientY);
  let best = null, bestD = Infinity;
  const b = viewBounds();
  for(const p of G.planets){
    if(p.x < b.x1-20 || p.x > b.x2+20 || p.y < b.y1-20 || p.y > b.y2+20) continue;
    if((p.visibility||0) < 0.15) continue;
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    if(d < bestD){ bestD = d; best = p; }
  }
  const threshold = 30 / CAM.scale;
  if(best && bestD < threshold){
    G.selected = best.id;
    G.tab = 'region';
    attackSelect = null;
    document.getElementById('rightBody').dataset.sig = '';
    renderRight();
  }
});
canvas.addEventListener('wheel', ev=>{
  ev.preventDefault();
  const wx0 = screenToWorld(ev.clientX, ev.clientY);
  const factor = ev.deltaY > 0 ? 0.85 : 1.18;
  CAM.scale = clamp(CAM.scale * factor, CAM.minScale, CAM.maxScale);
  const wx1 = screenToWorld(ev.clientX, ev.clientY);
  CAM.x += wx0.x - wx1.x;
  CAM.y += wx0.y - wx1.y;
  markDirty();
}, { passive: false });
document.getElementById('btnZoomIn').addEventListener('click', ()=>{
  CAM.scale = clamp(CAM.scale * 1.3, CAM.minScale, CAM.maxScale);
});
document.getElementById('btnZoomOut').addEventListener('click', ()=>{
  CAM.scale = clamp(CAM.scale / 1.3, CAM.minScale, CAM.maxScale);
});
document.getElementById('btnCenter').addEventListener('click', ()=>{
  const home = G.planets[G.playerHomeId];
  if(home){ CAM.x = home.x; CAM.y = home.y; CAM.scale = 1; }
});

/* ============================================================
   18. 日志
   ============================================================ */
function addLog(text, type){
  G.logs.unshift({t:G.time, text, type:type||''});
  if(G.logs.length > 60) G.logs.pop();
}

/* ============================================================
   19. 存档
   ============================================================ */
const SAVE_KEY = 'xinghai_v6';
const SAVE_VERSION = 6;

function getSaveData(){
  const changed = [];
  for(const p of G.planets){
    if(p.owner || p.garrison.length || p.facilities.length || p.level !== 1 || (p.visibility||0) > 0.01){
      changed.push({
        id: p.id, level: p.level, owner: p.owner,
        garrison: p.garrison, facilities: p.facilities,
        visibility: p.visibility || 0,
      });
    }
  }
  return {
    version: SAVE_VERSION, timestamp: Date.now(), seed: MAP_SEED,
    nationName: G.nationName, time: G.time,
    alloy: G.alloy, energy: G.energy,
    materials: G.materials, hullUnlocked: G.hullUnlocked,
    planeHullUnlocked: G.planeHullUnlocked,
    designs: G.designs, planeDesigns: G.planeDesigns,
    planeDesign: G.planeDesign, hangar: G.hangar,
    nextPlaneId: G.nextPlaneId,
    groups: G.groups, nextGroupId: G.nextGroupId, nextUid: G.nextUid,
    logs: G.logs.slice(0, 30),
    playerHomeId: G.playerHomeId, factions: G.factions,
    aiTimers: G.aiTimers, aiWaves: G.aiWaves,
    buildQueue: G.buildQueue, changedPlanets: changed,
    fleets: G.fleets,
    designMods: G.designMods, designHull: G.designHull,
    designClass: G.designClass, designName: G.designName,
    shipyardCurrent: shipyardCurrent,
  };
}

function applySaveData(data){
  G.nationName = data.nationName || '泰拉联邦';
  G.time = data.time || 0;
  G.alloy = data.alloy || 0;
  G.energy = data.energy || 0;
  G.materials = data.materials || {1:0,2:0,3:0,4:0,5:0,6:0,7:0};
  for(let i=1;i<=7;i++) if(G.materials[i]==null) G.materials[i]=0;
  G.hullUnlocked = data.hullUnlocked || {1:true,2:false,3:false,4:false,5:false,6:false,7:false};
  G.planeHullUnlocked = data.planeHullUnlocked || {1:true,2:false,3:false,4:false,5:false,6:false,7:false};
  G.designs = data.designs || [];
  G.planeDesigns = data.planeDesigns || [];
  for(const pd of G.planeDesigns){
    if(pd.tier === undefined) pd.tier = 1;
  }
  G.planeDesign = data.planeDesign || G.planeDesign;
  if(G.planeDesign.tier === undefined) G.planeDesign.tier = 1;
  G.hangar = data.hangar || {};
  G.nextPlaneId = data.nextPlaneId || 1;
  G.groups = data.groups || [];
  G.nextGroupId = data.nextGroupId || 1;
  G.nextUid = data.nextUid || 1;
  G.logs = data.logs || [];
  G.playerHomeId = data.playerHomeId;
  G.factions = data.factions || {};
  G.aiTimers = data.aiTimers || {};
  G.aiWaves = data.aiWaves || {};
  G.buildQueue = data.buildQueue || [];
  G.designMods = data.designMods || G.designMods;
  G.designHull = data.designHull || 1;
  G.designClass = data.designClass || 'none';
  G.designName = data.designName || '新设计';
  shipyardCurrent = data.shipyardCurrent || null;

  const mapData = generateMapData(data.seed || MAP_SEED);
  initPlanets(mapData);

  if(Array.isArray(data.changedPlanets)){
    for(const c of data.changedPlanets){
      const p = G.planets[c.id];
      if(!p) continue;
      p.level = c.level || 1;
      p.owner = c.owner || null;
      p.garrison = c.garrison || [];
      p.facilities = c.facilities || [];
      p.visibility = (typeof c.visibility === 'number') ? c.visibility : 0;
    }
  }

  for(const p of G.planets){
    for(const s of p.garrison){
      if(s.column === undefined) s.column = 0;
      if(s.baseSpd === undefined) s.baseSpd = s.spd || 50;
      if(s.maxEnergy === undefined){ s.maxEnergy = 100; s.energy = 100; }
      if(!s.squadron) s.squadron = [];
    }
  }

  if(G.playerHomeId != null){
    const home = G.planets[G.playerHomeId];
    if(home){
      if(!home.facilities.includes('dock')) home.facilities.push('dock');
      if(!home.facilities.includes('repair')) home.facilities.push('repair');
    }
  }

  G.fleets = [];
  if(Array.isArray(data.fleets)){
    for(const f of data.fleets){
      if(!G.planets[f.fromRegionId] || !G.planets[f.toRegionId]) continue;
      for(const s of f.ships){
        if(s.column === undefined) s.column = 0;
      }
      G.fleets.push(f);
    }
  }
  G.battles = [];
  invalidatePlayerPlanets();

  applyOfflineProgress(data.timestamp);
}

function applyOfflineProgress(saveTime){
  if(!saveTime) return;
  const elapsed = (Date.now() - saveTime) / 1000;
  if(elapsed < 30 || elapsed > 86400 * 3) return;
  const simTime = Math.min(elapsed, 8 * 3600);
  const out = totalOutput();
  G.alloy += out.alloy * simTime;
  G.energy += out.energy * simTime;
  for(const p of G.planets){
    if(p.owner !== 'player' || p.level < 3) continue;
    const rate = regionMatOutput(p);
    if(rate > 0){
      const tier = Math.min(p.level - 1, 7);
      G.materials[tier] = (G.materials[tier] || 0) + rate * simTime;
    }
  }
  for(const p of G.planets){
    const hasRepair = p.facilities.includes('repair');
    for(const s of p.garrison){
      if(s.owner !== 'player') continue;
      if(hasRepair){ s.hp = s.maxHp; s.shd = s.maxShd; }
      s.energy = s.maxEnergy;
    }
  }
  for(const q of G.buildQueue) q.progress = Math.min(1, q.progress + simTime / q.duration);
  const h = Math.floor(simTime/3600);
  const m = Math.floor((simTime%3600)/60);
  addLog(`🌙 离线 ${h}h${m}m，产出已结算`, 'info');
}

function saveToLocal(silent){
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(getSaveData()));
    G.lastSaveTime = Date.now();
    if(!silent) toast('💾 已保存');
  } catch(e) { console.warn('保存失败', e); }
}
function loadFromLocal(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    if(data.version !== SAVE_VERSION) return false;
    applySaveData(data);
    return true;
  } catch(e) { console.warn('读档失败', e); return false; }
}
function hasLocalSave(){
  try { return !!localStorage.getItem(SAVE_KEY); } catch(e){ return false; }
}
function clearLocalSave(){
  try { localStorage.removeItem(SAVE_KEY); } catch(e){}
}
function toast(msg, dur){
  dur = dur || 1800;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.classList.add('fade'), dur - 300);
  setTimeout(()=>el.remove(), dur);
}

/* ============================================================
   20. 战斗动画浮层
   ============================================================ */
let battleAnimId = null;
let battleAnimTimer = null;
let battleAnimPrevHp = {};

function openBattleAnim(planetId){
  const p = G.planets[planetId];
  if(!p || !p.battle){ toast('此星球没有战斗'); return; }
  battleAnimId = p.battle.id;
  battleAnimPrevHp = {};
  buildBattleOverlay();
  updateBattleOverlay();
  if(battleAnimTimer) clearInterval(battleAnimTimer);
  battleAnimTimer = setInterval(updateBattleOverlay, 150);
}
function closeBattleAnim(){
  battleAnimId = null;
  if(battleAnimTimer){ clearInterval(battleAnimTimer); battleAnimTimer = null; }
  const el = document.getElementById('battleOverlay');
  if(el) el.classList.remove('show');
}
function buildBattleOverlay(){
  let el = document.getElementById('battleOverlay');
  if(el) el.remove();
  el = document.createElement('div');
  el.id = 'battleOverlay';
  el.className = 'battle-overlay show';
  el.innerHTML = `<div class="battle-modal">
    <div class="battle-title">
      <span id="battleTitleText">⚔ 战斗</span>
      <button class="battle-close-x" id="battleCloseBtn">×</button>
    </div>
    <div class="air-zone" id="battleAirZone"></div>
    <div class="battle-arena">
      <div class="battle-side">
        <div class="side-label" id="atkLabel"></div>
        <div class="formation-view" id="atkFormation">${formationSkeletonHTML('atk')}</div>
      </div>
      <div class="battle-vs">VS</div>
      <div class="battle-side">
        <div class="side-label" id="defLabel"></div>
        <div class="formation-view" id="defFormation">${formationSkeletonHTML('def')}</div>
      </div>
    </div>
    <div class="battle-log-small" id="battleLogSmall"></div>
  </div>`;
  document.body.appendChild(el);
  document.getElementById('battleCloseBtn').addEventListener('click', closeBattleAnim);
}
function formationSkeletonHTML(side){
  let html = '<div class="battle-cols">';
  const visualOrder = (side === 'atk') ? [3,2,1,0] : [0,1,2,3];
  for(const c of visualOrder){
    html += `<div class="battle-col" id="${side}_col_${c}">
      <div class="battle-col-title">${COL_NAMES[c]}</div>
      <div class="battle-col-ships" id="${side}_ships_${c}"></div>
    </div>`;
  }
  html += '</div>';
  return html;
}
function updateBattleOverlay(){
  const el = document.getElementById('battleOverlay');
  if(!el || !el.classList.contains('show')) return;
  const b = G.battles.find(x => x.id === battleAnimId);
  const titleEl = document.getElementById('battleTitleText');
  if(!b){
    if(titleEl) titleEl.textContent = '⚔ 战斗已结束';
    return;
  }
  const region = G.planets[b.regionId];
  if(b.over){
    const resultText = b.outcome === 'attacker' ? '✅ 进攻方胜利 · 星球易主' :
                       b.outcome === 'defender' ? '🛡 防御方胜利 · 星球守住' :
                       b.outcome === 'mutual' ? '💥 两败俱伤' : '⏱ 超时结束';
    if(titleEl) titleEl.textContent = `⚔ ${region.name} · ${resultText}`;
    el.querySelector('.battle-vs')?.classList.add('ended');
  } else {
    if(titleEl) titleEl.textContent = `⚔ ${region.name} · ${b.time.toFixed(1)}s`;
  }
  const atkAlive = b.attacker.filter(s=>s.hp>0).length;
  const defAlive = b.defender.filter(s=>s.hp>0).length;
  const atkLbl = document.getElementById('atkLabel');
  atkLbl.textContent = `${b.over?'✓':'⚔'} 进攻 · ${G.factions[b.attackerOwner]?.name || '?'} · ${atkAlive}/${b.attacker.length}`;
  atkLbl.style.color = G.factions[b.attackerOwner]?.color || '#fff';
  const defLbl = document.getElementById('defLabel');
  defLbl.textContent = `${b.over?'✓':'🛡'} 防御 · ${G.factions[b.defenderOwner]?.name || '?'} · ${defAlive}/${b.defender.length}`;
  defLbl.style.color = G.factions[b.defenderOwner]?.color || '#fff';
  updateAirZone(b);
  updateFormationSide('atk', b.attacker);
  updateFormationSide('def', b.defender);
  const logEl = document.getElementById('battleLogSmall');
  logEl.innerHTML = b.log.slice(-6).reverse().map(l=>
    `<div class="logLine ${l.type}"><span class="r">${l.r}</span>${l.text}</div>`
  ).join('');
}
function updateAirZone(b){
  const zone = document.getElementById('battleAirZone');
  if(!zone) return;
  const atkP = b.atkPlanes || [];
  const defP = b.defPlanes || [];
  if(!atkP.length && !defP.length){ zone.innerHTML = ''; return; }
  const renderSide = (planes, color) => {
    const front = planes.filter(p=>p.row===0);
    const back = planes.filter(p=>p.row===1);
    const renderRow = (arr, label) => {
      if(!arr.length) return '';
      return `<div class="air-row-label">${label}</div>
        <div class="air-row">${arr.map(p=>{
          const dead = p.hp <= 0;
          return `<span class="plane-token ${dead?'dead':''}" title="${p.name}">${dead?'✕':'✈'} T${p.tier||1}${p.name.slice(-3)}</span>`;
        }).join('')}</div>`;
    };
    return `<div class="air-side">
      <div class="air-side-label" style="color:${color}">✈ 空军 ${planes.filter(p=>p.hp>0).length}/${planes.length}</div>
      ${renderRow(front, '前排（空战）')}
      ${renderRow(back, '后排（对舰）')}
    </div>`;
  };
  zone.innerHTML = renderSide(atkP, G.factions[b.attackerOwner]?.color || '#fff') +
                   renderSide(defP, G.factions[b.defenderOwner]?.color || '#fff');
}
function updateFormationSide(side, ships){
  const byCol = [[],[],[],[]];
  for(const s of ships){
    const c = clamp(s.column || 0, 0, 3);
    byCol[c].push(s);
  }
  let frontCol = -1;
  for(let c = 0; c < 4; c++){
    if(byCol[c].some(s => s.hp > 0)){ frontCol = c; break; }
  }
  for(let c = 0; c < 4; c++){
    const colEl = document.getElementById(`${side}_col_${c}`);
    if(!colEl) continue;
    colEl.classList.toggle('front', c === frontCol);
    const shipsEl = document.getElementById(`${side}_ships_${c}`);
    if(!shipsEl) continue;
    const existing = shipsEl.querySelectorAll('.battle-ship');
    const sameLen = existing.length === byCol[c].length;
    const sameOrder = sameLen && Array.from(existing).every((n,i)=>
      n.dataset.uid === byCol[c][i].uid);
    if(sameOrder){
      for(let i = 0; i < byCol[c].length; i++) updateShipCard(existing[i], byCol[c][i]);
    } else {
      shipsEl.innerHTML = byCol[c].map(shipCardHTML).join('');
    }
  }
}
function shipCardHTML(s){
  const hpPct = Math.max(0, s.hp / s.maxHp * 100);
  const shdPct = s.maxShd > 0 ? Math.max(0, s.shd / s.maxShd * 100) : 0;
  const dead = s.hp <= 0;
  const hpCls = hpPct > 60 ? '' : (hpPct > 30 ? 'w' : 'c');
  const shortName = s.name.replace(/-\d+$/, '').slice(0, 8);
  const charge = s.mainCharge > 0 ? clamp(s._chMain / s.mainCharge, 0, 1) : 0;
  const full = charge >= 1 ? 'full' : '';
  return `<div class="battle-ship ${dead ? 'dead' : ''}" data-uid="${s.uid}">
    <div class="battle-ship-name">${shortName}</div>
    <div class="bar hp ${hpCls}" style="width:100%"><i style="width:${hpPct}%"></i></div>
    <div class="bar shd" style="width:100%"><i style="width:${shdPct}%"></i></div>
    <div class="charge-bar ${full}"><i style="width:${charge*100}%"></i></div>
    <div class="battle-ship-hp">${dead ? '已击毁' : Math.ceil(s.hp) + '/' + s.maxHp}</div>
  </div>`;
}
function updateShipCard(cardEl, s){
  if(!cardEl || !s) return;
  const hpPct = Math.max(0, s.hp / s.maxHp * 100);
  const shdPct = s.maxShd > 0 ? Math.max(0, s.shd / s.maxShd * 100) : 0;
  const dead = s.hp <= 0;
  const hpCls = hpPct > 60 ? '' : (hpPct > 30 ? 'w' : 'c');
  const hpBar = cardEl.querySelector('.bar.hp');
  if(hpBar){
    hpBar.className = 'bar hp ' + hpCls;
    const inner = hpBar.querySelector('i');
    if(inner) inner.style.width = hpPct + '%';
  }
  const shdBar = cardEl.querySelector('.bar.shd');
  if(shdBar){
    const inner = shdBar.querySelector('i');
    if(inner) inner.style.width = shdPct + '%';
  }
  const chargeBar = cardEl.querySelector('.charge-bar');
  if(chargeBar){
    const charge = s.mainCharge > 0 ? clamp(s._chMain / s.mainCharge, 0, 1) : 0;
    const inner = chargeBar.querySelector('i');
    if(inner) inner.style.width = charge * 100 + '%';
    chargeBar.classList.toggle('full', charge >= 1);
  }
  const hpText = cardEl.querySelector('.battle-ship-hp');
  if(hpText) hpText.textContent = dead ? '已击毁' : Math.ceil(s.hp) + '/' + s.maxHp;
  cardEl.classList.toggle('dead', dead);
  const prev = battleAnimPrevHp[s.uid];
  if(prev !== undefined && s.hp < prev && s.hp > 0){
    cardEl.classList.remove('hit');
    void cardEl.offsetWidth;
    cardEl.classList.add('hit');
    setTimeout(()=>{
      const c = document.querySelector(`.battle-ship[data-uid="${s.uid}"]`);
      if(c) c.classList.remove('hit');
    }, 380);
  }
  battleAnimPrevHp[s.uid] = s.hp;
}
document.addEventListener('keydown', ev=>{
  if(ev.key === 'Escape' && battleAnimId !== null) closeBattleAnim();
});

/* ============================================================
   21. 新游戏
   ============================================================ */
function newGame(){
  G.time = 0;
  G.alloy = 2000; G.energy = 1200;
  G.materials = {1:0,2:0,3:0,4:0,5:0,6:0,7:0};
  G.hullUnlocked = {1:true,2:false,3:false,4:false,5:false,6:false,7:false};
  G.planeHullUnlocked = {1:true,2:false,3:false,4:false,5:false,6:false,7:false};
  G.fleets = [];
  G.battles = [];
  G.buildQueue = [];
  G.designs = [{
    id: 'd0', name: '标准护卫舰', hullTier: 1, shipClass: 'escort',
    mods: {
      main:{tier:1, size:'medium', obj: mkWeapon('lightCharge',1,'medium')},
      sub:{tier:1, size:'medium', obj: mkWeapon('rapid',1,'medium')},
      armor:{tier:1, size:'medium', obj: mkArmor(1,'medium')},
      engine:{tier:1, size:'medium', obj: mkEngine(1,'medium')},
      reactor:{tier:1, size:'medium', obj: mkReactor(1,'medium')},
      repair:null, missile:null, aa:null, catapult:null,
    },
  }];
  G.planeDesigns = [];
  G.planeDesign = {
    tier: 1, type: 'multirole', name: '新战机',
    weapons: { main: null },
    armor: null, engine: null, reactor: null,
  };
  G.hangar = {};
  G.nextPlaneId = 1;
  G.groups = [];
  G.nextUid = 1;
  G.nextGroupId = 1;
  G.logs = [];
  G.selected = null;
  G.tab = 'region';
  G.designMods = {
    main:{tier:1, size:'medium', obj: mkWeapon('lightCharge',1,'medium')},
    sub:{tier:1, size:'medium', obj: mkWeapon('rapid',1,'medium')},
    armor:{tier:1, size:'medium', obj: mkArmor(1,'medium')},
    engine:{tier:1, size:'medium', obj: mkEngine(1,'medium')},
    reactor:{tier:1, size:'medium', obj: mkReactor(1,'medium')},
    repair:null, missile:null, aa:null, catapult:null,
  };
  G.designHull = 1;
  G.designClass = 'escort';
  G.designName = '新设计';
  attackSelect = null;
  shipyardCurrent = null;
  pendingSave = 0;
  idleSaveTimer = 0;
  rightDirty = true;
  fullRenderCd = 0;

  const mapData = generateMapData(MAP_SEED);
  initPlanets(mapData);

  const numAI = 8 + Math.floor(Math.random() * 4);
  initFactions(numAI);
  placeFactions(numAI);

  G.selected = G.playerHomeId;
  const home = G.planets[G.playerHomeId];
  CAM.x = home.x; CAM.y = home.y; CAM.scale = 1.2;

  addLog(`🏛 ${G.nationName} 建国，共 ${numAI} 个敌对势力`, 'info');
  document.getElementById('rightBody').dataset.sig = '';
  renderTop();
  renderRight();
  saveToLocal(true);
}

/* ============================================================
   22. 启动
   ============================================================ */
resize();
document.getElementById('nameOverlay').classList.remove('show');

let booted = false;
if(hasLocalSave()){
  try {
    if(loadFromLocal()){
      booted = true;
      document.getElementById('rightBody').dataset.sig = '';
      renderTop();
      renderRight();
      const home = G.planets[G.playerHomeId];
      if(home){ CAM.x = home.x; CAM.y = home.y; CAM.scale = 1.2; }
    }
  } catch(e){ console.warn(e); }
}

if(!booted){
  document.getElementById('nameOverlay').classList.add('show');
}

document.getElementById('btnNewSave').addEventListener('click', ()=>{
  if(!confirm('新建存档会清除当前进度，是否继续？')) return;
  clearLocalSave();
  G.fleets = [];
  G.battles = [];
  G.selected = null;
  G.tab = 'region';
  attackSelect = null;
  shipyardCurrent = null;
  pendingSave = 0;
  idleSaveTimer = 0;
  lastTick = performance.now();
  G.paused = true;
  const overlay = document.getElementById('nameOverlay');
  const input = document.getElementById('nameInput');
  input.value = G.nationName || '泰拉联邦';
  overlay.classList.add('show');
  setTimeout(()=>{ input.focus(); input.select(); }, 150);
});

document.getElementById('nameConfirm').addEventListener('click', ()=>{
  const v = (document.getElementById('nameInput').value || '').trim() || '泰拉联邦';
  G.nationName = v.slice(0,12);
  document.getElementById('nameOverlay').classList.remove('show');
  newGame();
  G.paused = false;
  lastTick = performance.now();
  toast('🏛 ' + G.nationName + ' 建立');
});

document.getElementById('nameInput').addEventListener('keydown', ev=>{
  if(ev.key === 'Enter') document.getElementById('nameConfirm').click();
});

lastTick = performance.now();