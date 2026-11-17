/* =========================================================
   01-state.js — 基础状态与常量
   ========================================================= */
/* ========== M0: 多玩家基础 ========== */
const HUMAN_IDS = ['p1','p2','p3','p4','p5','p6'];
const HUMAN_COLORS = ['#4ea8ff','#ff5a5a','#22c55e','#f59e0b','#ec4899','#06b6d4'];
let MY_ID = HUMAN_IDS[0];                 // 当前客户端控制的势力；单机固定 p1，联机时由主机分配 slot
function isHuman(owner){ return !!owner && HUMAN_IDS.indexOf(owner) >= 0; }
function isMe(owner){ return owner === MY_ID; }

/* ========== M0: 可播种随机源 ========== */
let _rngState = 0;
function seedRng(s){ _rngState = (s >>> 0) || 0x9E3779B9; }
// 单机默认用会话相关种子（行为等价于原来的真随机），联机时由服务器下发 matchSeed 覆盖
seedRng((Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0);
function rng(){
  _rngState |= 0;
  _rngState = (_rngState + 0x6D2B79F5) | 0;
  let t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
let supabaseClient = null;
try {
  if (window.supabase) {
    const SUPABASE_URL = 'https://dvjilomwakbeztnzznwk.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Gud0RH8vtofJiFeA1PqaHw_JyGGMwGH';
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase 初始化成功');
  }
} catch (e) {
  console.error('❌ Supabase 初始化失败:', e);
}

async function withRetry(requestFn, maxRetries = 6) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const result = await requestFn();
      if (result && result.error) {
        const err = result.error;
        if (err.status === 400 || err.status === 401 || err.status === 403 || err.code === 'invalid_credentials') return result;
        const errMsg = String(err).toUpperCase();
        if (errMsg.includes('ERR_SSL_PROTOCOL_ERROR') || errMsg.includes('FAILED TO FETCH')) {
           throw new Error('网络阻断 (SSL/网络异常)，请尝试切换网络');
        }
        if (err.status >= 500 || err.status === 0) throw err;
        return result;
      }
      return result;
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      const waitTime = attempt * 1500;
      console.warn(`网络请求失败，${waitTime}ms 后重试 (${attempt}/${maxRetries})...`, err);
      if (typeof toast === 'function') toast(`🌐 网络波动，正在重试 (${attempt}/${maxRetries})...`, 1200);
      await new Promise(res => setTimeout(res, waitTime));
    }
  }
}

const USERNAME_SUFFIX = '@local.app';
function usernameToEmail(username) {
  const safe = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return safe + USERNAME_SUFFIX;
}

const SIZE_LABEL = { light:'轻', medium:'中', heavy:'重' };
const SIZE_MUL   = { light:0.7, medium:1.0, heavy:1.45 };
const SIZES = ['light', 'medium', 'heavy'];
const MAT_NAMES = ['', '陨铁', '星钢', '暗星钢', '虚空钢', '奇点钢', '超弦晶', '创世核'];
const MAT_COLORS = ['', '#a0ffc8', '#a0cfff', '#c0a0ff', '#ffb0e0', '#ffd75f', '#ff8b5f', '#ff4a4a'];

const HULLS = {
  1:{name:'T1 侦察艇', space:100, baseHp:80, hullCost:0, unlock:null, matCost:null},
  2:{name:'T2 护卫舰', space:130, baseHp:130, hullCost:60, unlock:{mat:1, cost:8}, matCost:{mat:1, n:1}},
  3:{name:'T3 驱逐舰', space:165, baseHp:210, hullCost:160, unlock:{mat:2, cost:10}, matCost:{mat:2, n:1}},
  4:{name:'T4 巡洋舰', space:205, baseHp:330, hullCost:320, unlock:{mat:3, cost:12}, matCost:{mat:3, n:2}},
  5:{name:'T5 战列舰', space:260, baseHp:520, hullCost:600, unlock:{mat:4, cost:15}, matCost:{mat:4, n:3}},
  6:{name:'T6 泰坦',   space:330, baseHp:820, hullCost:1100,unlock:{mat:5, cost:20}, matCost:{mat:5, n:4}},
  7:{name:'T7 旗舰',   space:420, baseHp:1300,hullCost:2000,unlock:{mat:6, cost:30}, matCost:{mat:6, n:6}},
};
const PLANE_HULLS = {
  1:{name:'T1 战机', space:24, baseHp:20, unlock:null, matCost:null},
  2:{name:'T2 战机', space:32, baseHp:42, unlock:{mat:1, cost:5}, matCost:{mat:1, n:1}},
  3:{name:'T3 战机', space:42, baseHp:75, unlock:{mat:2, cost:7}, matCost:{mat:2, n:1}},
  4:{name:'T4 战机', space:54, baseHp:125,unlock:{mat:3, cost:9}, matCost:{mat:3, n:1}},
  5:{name:'T5 战机', space:68, baseHp:195,unlock:{mat:4, cost:12},matCost:{mat:4, n:2}},
  6:{name:'T6 战机', space:85, baseHp:290,unlock:{mat:5, cost:15},matCost:{mat:5, n:3}},
  7:{name:'T7 战机', space:105,baseHp:430,unlock:{mat:6, cost:20},matCost:{mat:6, n:4}},
};

const SHIP_CLASSES = {
  none:    {name:'通用', icon:'◈', desc:'均衡加成 +5%', bonus:{dmg:0.05, hp:0.05, eva:0.05}},
  escort:  {name:'护卫舰', icon:'🛡', desc:'+15%闪避 +20%HP', bonus:{eva:0.15, hp:0.20}},
  vanguard:{name:'先锋舰', icon:'⚡', desc:'+20%速度 +15%火力', bonus:{spd:0.20, dmg:0.15}},
  destroyer:{name:'驱逐舰', icon:'⚔', desc:'+5%速度 +15%火力 +15%HP', bonus:{spd:0.05, dmg:0.15, hp:0.15}},
  cruiser: {name:'巡洋舰', icon:'🚀', desc:'+15%速度 +15%火力 +5%HP', bonus:{spd:0.15, dmg:0.15, hp:0.05}},
  battleship:{name:'战列舰', icon:'💥', desc:'-10%速度 +30%火力 +15%HP', bonus:{spd:-0.10, dmg:0.30, hp:0.15}, req:{weapon:'midCharge'}},
  battlecruiser:{name:'战列巡洋舰', icon:'🔥', desc:'+5%速度 +25%火力 +15%HP +5%闪避', bonus:{spd:0.05, dmg:0.25, hp:0.15, eva:0.05}, req:{weapon:'midCharge'}},
  missile: {name:'导弹舰', icon:'🎯', desc:'+15%速度 +50%导弹 +5%HP', bonus:{spd:0.15, missileDmg:0.50, hp:0.05}, req:{weapon:'missile'}},
  aa:      {name:'防空舰', icon:'📡', desc:'+15%速度 +50%对空 +5%HP', bonus:{spd:0.15, aaDmg:0.50, hp:0.05}, req:{weapon:'aa'}},
  carrier: {name:'航母', icon:'✈', desc:'+5 飞机位', bonus:{hangar:5}, req:{module:'catapult'}},
  command: {name:'指挥舰', icon:'★', desc:'全队 +10%火力/闪避', bonus:{fleetDmg:0.10, fleetEva:0.10}},
  logistics:{name:'后勤舰', icon:'🔧', desc:'+25%修复量', bonus:{repair:0.25}},
};

const WEAPON_TYPES = {
  rapid:   {name:'速射炮', charge:0, dmgMul:0.65, hit:'normal'},
  lightCharge:{name:'小型蓄力炮', charge:1.4, dmgMul:1.0, hit:'normal'},
  midCharge:  {name:'中型蓄力炮', charge:2.1, dmgMul:1.4, hit:'normal'},
  heavyCharge:{name:'重型蓄力炮', charge:2.8, dmgMul:2.0, hit:'normal', slot:'main'},
  nova:       {name:'歼星炮', charge:4.2, dmgMul:3.5, hit:'normal', slot:'main', reqHull:3},
  missileShort:{name:'近程导弹', charge:2.2, dmgMul:1.3, hit:'always', slot:'missile'},
  missileMid:  {name:'中程导弹', charge:2.6, dmgMul:1.8, hit:'always', slot:'missile'},
  missileLong: {name:'远程导弹', charge:3.0, dmgMul:2.4, hit:'always', slot:'missile'},
  missileNova: {name:'超测距导弹', charge:4.6, dmgMul:4.0, hit:'always', slot:'missile'},
  aaMissile:   {name:'AA导弹', charge:1.6, dmgMul:0.9, hit:'normal', slot:'aa', aa:true},
  aaGun:       {name:'AA炮', charge:0.6, dmgMul:0.6, hit:'normal', slot:'aa', aa:true},
};
const PLANE_WEAPONS = {
  rapid: {name:'速射炮', charge:0.8, dmgMul:0.55, cost:30},
  lightCharge:{name:'轻型蓄力炮', charge:1.8, dmgMul:0.9, cost:60},
  missileShort:{name:'近程导弹', charge:2.4, dmgMul:1.1, cost:80},
  missileMid:{name:'中程导弹', charge:2.8, dmgMul:1.4, cost:120},
  missileLong:{name:'远程导弹', charge:3.2, dmgMul:1.8, cost:180},
  missileNova:{name:'超测距导弹', charge:4.2, dmgMul:2.6, cost:280},
};
const PLANE_TYPES = {
  interceptor:{name:'截击机', icon:'✈', desc:'+20%速度 +15%对空', bonus:{spd:0.20, aaDmg:0.15}},
  bomber:     {name:'轰炸机', icon:'💣', desc:'+30%对舰伤害', bonus:{shipDmg:0.30}},
  multirole:  {name:'多用途', icon:'◈', desc:'均衡加成 +5%', bonus:{dmg:0.05, hp:0.05, eva:0.05}},
  drone:      {name:'无人机', icon:'▲', desc:'+30%HP +20%速度', bonus:{hp:0.30, spd:0.20}},
  stealth:    {name:'隐形机', icon:'👻', desc:'+25%闪避', bonus:{eva:0.25}},
};

const MOD_KEYS = ['main','sub','armor','engine','reactor','repair','missile','aa','catapult'];
const SLOT_LABEL = { main:'主炮', sub:'副炮', armor:'装甲', engine:'引擎', reactor:'储能', repair:'修复器', missile:'导弹位', aa:'防空位', catapult:'弹射装置' };
const SLOT_ICON = { main:'🔴', sub:'🟡', armor:'🛡', engine:'🚀', reactor:'⚡', repair:'🔧', missile:'🎯', aa:'📡', catapult:'✈' };

function mkWeapon(weaponKey, tier, size) { const wt = WEAPON_TYPES[weaponKey]; const base = 22 * Math.pow(tier, 1.55) * SIZE_MUL[size]; return { key:weaponKey, name:`T${tier} ${SIZE_LABEL[size]}${wt.name}`, size:Math.round(8*tier*SIZE_MUL[size]*(wt.slot==='missile'?0.7:(wt.slot==='aa'?0.5:1))), dmg:Math.round(base*wt.dmgMul), charge:wt.charge, hit:wt.hit, aa:!!wt.aa, cost:Math.round(60*Math.pow(tier,1.7)*SIZE_MUL[size]*(wt.dmgMul)), slot:wt.slot||'any', reqHull:wt.reqHull||0 }; }
function mkArmor(tier, size) { return { key:'armor', name:`T${tier} ${SIZE_LABEL[size]}装甲`, size:Math.round(6*tier*SIZE_MUL[size]), hp:Math.round(60*Math.pow(tier,1.5)*SIZE_MUL[size]), shd:Math.round(18*Math.pow(tier,1.5)*SIZE_MUL[size]), cost:Math.round(40*Math.pow(tier,1.7)*SIZE_MUL[size]) }; }
function mkEngine(tier, size) { return { key:'engine', name:`T${tier} ${SIZE_LABEL[size]}引擎`, size:Math.round(6*tier*SIZE_MUL[size]), spd:Math.round(30*Math.pow(tier,1.35)*SIZE_MUL[size]), eva:Math.round(4*Math.pow(tier,1.2)*SIZE_MUL[size]), cost:Math.round(38*Math.pow(tier,1.7)*SIZE_MUL[size]) }; }
function mkReactor(tier, size) { return { key:'reactor', name:`T${tier} ${SIZE_LABEL[size]}储能`, size:Math.round(4*tier*SIZE_MUL[size]), regen:Math.round(7*Math.pow(tier,1.5)*SIZE_MUL[size]), cost:Math.round(28*Math.pow(tier,1.7)*SIZE_MUL[size]) }; }
function mkRepair(tier, size) { return { key:'repair', name:`T${tier} ${SIZE_LABEL[size]}修复器`, size:Math.round(15*tier*SIZE_MUL[size]), repairAmount:Math.round(10*Math.pow(tier,1.4)*SIZE_MUL[size]), repairCd:Math.max(3,8-tier*0.7), cost:Math.round(120*Math.pow(tier,1.8)*SIZE_MUL[size]) }; }
function mkCatapult(tier, size) { return { key:'catapult', name:`T${tier} ${SIZE_LABEL[size]}弹射装置`, size:Math.round(20*tier*SIZE_MUL[size]), hangarSlots:Math.round(2+tier*SIZE_MUL[size]*2), cost:Math.round(180*Math.pow(tier,1.7)*SIZE_MUL[size]) }; }
function mkPlaneWeapon(key, tier) { const w=PLANE_WEAPONS[key]; const base=10*Math.pow(tier,1.5); return { key, name:`T${tier} ${w.name}`, size:3+tier, dmg:Math.round(base*w.dmgMul), charge:w.charge, cost:Math.round(w.cost*Math.pow(tier,1.6)), hit:key.startsWith('missile')?'always':'normal' }; }
function mkPlaneArmor(tier) { return { key:'armor', name:`T${tier} 轻装甲`, size:2+tier, hp:Math.round(20*Math.pow(tier,1.4)), shd:Math.round(6*Math.pow(tier,1.4)), cost:Math.round(15*Math.pow(tier,1.6)) }; }
function mkPlaneEngine(tier) { return { key:'engine', name:`T${tier} 引擎`, size:2+tier, spd:Math.round(38*Math.pow(tier,1.25)), eva:Math.round(5*Math.pow(tier,1.1)), cost:Math.round(12*Math.pow(tier,1.6)) }; }
function mkPlaneReactor(tier) { return { key:'reactor', name:`T${tier} 储能`, size:1+Math.ceil(tier*0.5), regen:Math.round(4*Math.pow(tier,1.4)), cost:Math.round(10*Math.pow(tier,1.6)) }; }

const MODULES = {};
for(const slot of MOD_KEYS) MODULES[slot] = {};
for(let t=1;t<=7;t++){
  for(const s of SIZES){
    MODULES.main[t] = MODULES.main[t] || {}; MODULES.main[t][s] = ['rapid','lightCharge','midCharge','heavyCharge','nova'].map(k=>mkWeapon(k,t,s));
    MODULES.sub[t] = MODULES.sub[t] || {}; MODULES.sub[t][s] = ['rapid','lightCharge'].map(k=>mkWeapon(k,t,s));
    MODULES.missile[t] = MODULES.missile[t] || {}; MODULES.missile[t][s] = ['missileShort','missileMid','missileLong','missileNova'].map(k=>mkWeapon(k,t,s));
    MODULES.aa[t] = MODULES.aa[t] || {}; MODULES.aa[t][s] = ['aaMissile','aaGun'].map(k=>mkWeapon(k,t,s));
    MODULES.armor[t] = MODULES.armor[t] || {}; MODULES.armor[t][s] = mkArmor(t,s);
    MODULES.engine[t] = MODULES.engine[t] || {}; MODULES.engine[t][s] = mkEngine(t,s);
    MODULES.reactor[t] = MODULES.reactor[t] || {}; MODULES.reactor[t][s] = mkReactor(t,s);
    MODULES.repair[t] = MODULES.repair[t] || {}; MODULES.repair[t][s] = mkRepair(t,s);
    MODULES.catapult[t] = MODULES.catapult[t] || {}; MODULES.catapult[t][s] = mkCatapult(t,s);
  }
}
const PLANE_MODULES = { weapon: {}, armor: {}, engine: {}, reactor: {} };
for(let t=1;t<=7;t++){
  PLANE_MODULES.weapon[t] = Object.keys(PLANE_WEAPONS).map(k => mkPlaneWeapon(k, t));
  PLANE_MODULES.armor[t] = mkPlaneArmor(t); PLANE_MODULES.engine[t] = mkPlaneEngine(t); PLANE_MODULES.reactor[t] = mkPlaneReactor(t);
}

const FACILITIES = {
  mine:{name:'合金矿场',icon:'⛏',desc:'合金产出 +50%',base:{alloy:200,energy:120},growth:1.8},
  plant:{name:'能源工厂',icon:'🔋',desc:'能量产出 +50%',base:{alloy:150,energy:180},growth:1.8},
  dock:{name:'造船厂',icon:'🏗',desc:'建造速度 +40%',base:{alloy:300,energy:220},growth:1.9},
  turret:{name:'防御炮台',icon:'🎯',desc:'驻军火力 +40%',base:{alloy:220,energy:150},growth:1.85},
  lab:{name:'材料精炼厂',icon:'🔬',desc:'特殊材料产出 +60%',base:{alloy:400,energy:280},growth:1.95},
  repair:{name:'修复港',icon:'🛠',desc:'能量/HP回复加速',base:{alloy:350,energy:250},growth:1.9},
  radar:{name:'雷达站',icon:'📡',desc:'视野 +350',base:{alloy:260,energy:180},growth:1.85},
  ciws:{name:'近防炮',icon:'⚙',desc:'自动攻击附近敌方舰队',base:{alloy:240,energy:160},growth:1.85},
};

const AI_NAMES = ['泽格帝国','泰伦联邦','克哈王朝','乌鲁教团','扎那克联盟','莱茵公国','安格鲁斯','铁翼氏族','黑日帝国','虚空教派','赤月汗国','起源教会'];
const AI_COLORS = ['#ff5a5a','#a855f7','#22c55e','#f59e0b','#ec4899','#06b6d4','#84cc16','#f97316','#8b5cf6','#14b8a6','#eab308','#ef4444'];
const PLAYER_COLOR = '#4ea8ff'; const NEUTRAL_COLOR = '#6a7088'; const COL_NAMES = ['前卫', '中列', '后列', '后备'];
const MAP_SEED = 99090157;

const FLEET_TASKS = {
  focus_attack: { name: '集中突击', desc: '直奔目标，攻下后原地驻扎' },
  balanced_attack: { name: '均衡推进', desc: '攻下后自动寻找最近敌星继续推进' },
  fixed_defend: { name: '定点防守', desc: '抵达目标后驻扎防守' }
};

const G = {
  time: 0, nationName: '泰拉联邦', playerName: '玩家1', planets: [], fleets: [], battles: [], buildQueue: [], designs: [], planeDesigns: [],
  planeDesign: { tier:1, type:'multirole', name:'新战机', weapons:{main:null}, armor:null, engine:null, reactor:null },
  hangar: {}, nextPlaneId: 1, groups: [], logs: [], factions: {}, selected: null, tab: 'region', playerHomeId: null,
  matchSeed: 0, spawns: {}, playerHomes: {},
  nextUid: 1, nextGroupId: 1, aiTimers: {}, aiWaves: {}, 
  designMods: {main:null,sub:null,armor:null,engine:null,reactor:null,repair:null,missile:null,aa:null,catapult:null},
  designHull: 1, designClass: 'none', designName: '新设计', 
  hullUnlocked: {1:true,2:false,3:false,4:false,5:false,6:false,7:false},
  planeHullUnlocked: {1:true,2:false,3:false,4:false,5:false,6:false,7:false}, 
  materials: {1:0,2:0,3:0,4:0,5:0,6:0,7:0}, 
  lastSaveTime: Date.now(), paused: true, gameSpeed: 1,
  
  zones: [],            // 存储划定的作战区域
  isDrawingZone: false, // 当前是否处于划线模式
  drawingZone: null,    // 正在拖拽的划线数据
  maxSweepRoutes: 3,    // 最大分兵路线
  
  commanders: [], 
  selectedFleetId: null,
  activeSaveId: null,
  playerUser: null,
  isGuest: false,
  isPlaying: false,
// 在 G 的定义中加入这两行
  editingDesignId: null,
  editingPlaneDesignId: null,
};

let uiTimer=0, pendingSave=0, idleSaveTimer=0, shipyardCurrent=null, attackSelect=null, lastTick=performance.now(), visionTimer=0;
let _playerPlanetsCache=null, _playerPlanetsVersion=0, _playerPlanetsCacheVersion=-1, rightDirty=true, fullRenderCd=0, userInteracting=false;

function uid(p){ return p + (G.nextUid++); }
function rand(a,b){ return a + rng()*(b-a); }
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
function hexA(hex, a){ const n=parseInt(hex.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
function fmtTime(t){ const m=Math.floor(t/60), s=Math.floor(t%60); return m+':'+String(s).padStart(2,'0'); }
function getPlayerPlanets(){
  if(_playerPlanetsCacheVersion!==_playerPlanetsVersion){
    _playerPlanetsCache = G.planets.filter(p => isMe(p.owner));
    _playerPlanetsCacheVersion = _playerPlanetsVersion;
  }
  return _playerPlanetsCache;
}
function invalidatePlayerPlanets(){ _playerPlanetsVersion++; }
function markRightDirty(){ rightDirty=true; if(fullRenderCd>0.6) fullRenderCd=0.6; }
function markDirty(){ pendingSave=5; markRightDirty(); }
function addLog(text, type){ G.logs.unshift({t:G.time, text, type:type||''}); if(G.logs.length>60) G.logs.pop(); }
function toast(msg, dur){ dur=dur||1800; const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.classList.add('fade'),dur-300); setTimeout(()=>el.remove(),dur); }

function generateCommander() {
  return {
    id: uid('c'),
    name: '指挥官-' + Math.floor(rng()*9000+1000),
    level: 1,
    atkBonus: Math.floor(rng() * 3) + 1,
    defBonus: Math.floor(rng() * 3) + 1,
  };
}