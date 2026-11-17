/* =========================================================
   host-sim.js — 主机侧：快照 / 命令接收 / 出生点 / 开局
   ========================================================= */

/* ---------- 快照序列化 ---------- */
function hostSerPlanet(p){
  // 客户端会用自身视野重算迷雾，不发 visibility（同时避免迷雾变化导致增量快照反复重发）
  return [
    p.id, p.owner || '', p.level,
    p.facilities.slice(),
    p.garrison.filter(s => s.hp > 0).map(s => ({
      uid: s.uid, owner: s.owner, name: s.name, tier: s.tier, shipClass: s.shipClass,
      hp: s.hp, maxHp: s.maxHp, shd: s.shd, maxShd: s.maxShd,
      column: s.column || 0, groupId: s.groupId || null, baseSpd: s.baseSpd || 0, commanderId: s.commanderId || null,
      mainDmg: s.mainDmg||0, subDmg: s.subDmg||0, missileDmg: s.missileDmg||0, aaDmg: s.aaDmg||0,
    })),
  ];
}
function hostSerFleet(f){
  return {
    id: f.id, owner: f.owner, from: f.fromRegionId, to: f.toRegionId,
    fromRegionId: f.fromRegionId, toRegionId: f.toRegionId,
    progress: f.progress, duration: f.duration, purpose: f.purpose,
    task: f.task ? { type: f.task.type, zoneId: f.task.zoneId } : null,
    ships: f.ships.filter(s => s.hp > 0).map(s => ({ uid: s.uid, name: s.name, hp: s.hp, maxHp: s.maxHp, shd: s.shd, maxShd: s.maxShd })),
  };
}
function hostSerBattle(b){
  return {
    id: b.id, regionId: b.regionId, time: b.time,
    attackerOwner: b.attackerOwner, defenderOwner: b.defenderOwner,
    atkAlive: b.attacker.filter(s=>s.hp>0).length, atkTotal: b.attacker.length,
    defAlive: b.defender.filter(s=>s.hp>0).length, defTotal: b.defender.length,
    log: b.log.slice(-20),
  };
}

function hostSerZones(){
  return (G.zones || []).map(z => ({
    id: z.id, owner: z.owner || 'p1', name: z.name,
    x1: z.x1, y1: z.y1, x2: z.x2, y2: z.y2, targets: z.targets || [],
  }));
}
function hostSerResources(){
  const resources = {};
  for (const id of HUMAN_IDS) resources[id] = {
    alloy: Math.floor(G.alloy), energy: Math.floor(G.energy), materials: { ...G.materials }
  };
  return resources;
}
function hostSerMeta(){
  return {
    designs: G.designs, planeDesigns: G.planeDesigns,
    hullUnlocked: G.hullUnlocked, planeHullUnlocked: G.planeHullUnlocked,
    commanders: G.commanders, factions: G.factions,
    playerHomes: G.playerHomes, nationName: G.nationName,
  };
}

function hostBuildSnapshot(){
  // 只发有意义变化的星球（owner/garrison/facilities 有其一）
  const planets = [];
  for (const p of G.planets){
    if (p.owner || p.garrison.length || p.facilities.length || p.level !== 1) planets.push(hostSerPlanet(p));
  }
  return {
    time: G.time, paused: G.paused, speed: G.gameSpeed, nationName: G.nationName,
    resources: hostSerResources(),
    planets, fleets: G.fleets.map(hostSerFleet),
    designs: G.designs, planeDesigns: G.planeDesigns,
    hullUnlocked: G.hullUnlocked, planeHullUnlocked: G.planeHullUnlocked,
    commanders: G.commanders,
    factions: G.factions, playerHomes: G.playerHomes,
    logs: G.logs.slice(0, 20), buildQueue: G.buildQueue,
    zones: hostSerZones(),
    battles: G.battles.filter(b => !b.over).map(hostSerBattle),
  };
}

/* ---------- 增量快照：只发变化项，周期性全量关键帧兜底 ---------- */
let _hostSnapCache = null;
function hostResetSnapCache(){
  _hostSnapCache = {
    planets: new Map(), fleets: new Map(),
    battles: '', logs: '', buildQueue: '', zones: '', meta: '', res: '',
  };
}

function hostBuildDelta(){
  if (!_hostSnapCache) hostResetSnapCache();
  const c = _hostSnapCache;
  const d = { time: G.time, paused: G.paused, speed: G.gameSpeed };

  const planets = [];
  for (const p of G.planets){
    const relevant = !!(p.owner || p.garrison.length || p.facilities.length || p.level !== 1);
    if (!relevant && !c.planets.has(p.id)) continue;   // 从未同步过的普通星球不用发
    const row = hostSerPlanet(p), sig = JSON.stringify(row);
    if (c.planets.get(p.id) !== sig){
      if (relevant) c.planets.set(p.id, sig);
      else c.planets.delete(p.id);                     // 星球被清空归属时也要下发一次
      planets.push(row);
    }
  }
  if (planets.length) d.planets = planets;

  const fleets = [], fleetIds = new Set();
  for (const f of G.fleets){
    fleetIds.add(f.id);
    const o = hostSerFleet(f), sig = JSON.stringify(o);
    if (c.fleets.get(f.id) !== sig){ c.fleets.set(f.id, sig); fleets.push(o); }
  }
  if (fleets.length) d.fleets = fleets;
  const fleetsDel = [];
  for (const id of c.fleets.keys()) if (!fleetIds.has(id)){ fleetsDel.push(id); c.fleets.delete(id); }
  if (fleetsDel.length) d.fleetsDel = fleetsDel;

  const battles = G.battles.filter(b => !b.over).map(hostSerBattle);
  const battlesSig = JSON.stringify(battles);
  if (battlesSig !== c.battles){ c.battles = battlesSig; d.battles = battles; }

  const logs = G.logs.slice(0, 20);
  const logsSig = JSON.stringify(logs);
  if (logsSig !== c.logs){ c.logs = logsSig; d.logs = logs; }

  const buildQueue = G.buildQueue.map(q => ({
    id: q.id, owner: q.owner || 'p1', designId: q.designId, designName: q.designName,
    regionId: q.regionId, duration: q.duration,
    progress: Math.round((q.progress || 0) * 100) / 100,
  }));
  const bqSig = JSON.stringify(buildQueue);
  if (bqSig !== c.buildQueue){ c.buildQueue = bqSig; d.buildQueue = buildQueue; }

  const zones = hostSerZones(), zonesSig = JSON.stringify(zones);
  if (zonesSig !== c.zones){ c.zones = zonesSig; d.zones = zones; }

  const resources = hostSerResources(), resSig = JSON.stringify(resources);
  if (resSig !== c.res){ c.res = resSig; d.resources = resources; }

  const meta = hostSerMeta(), metaSig = JSON.stringify(meta);
  if (metaSig !== c.meta){ c.meta = metaSig; d.meta = meta; }

  return d;
}

let _lastBcAt = 0, _keyframeCd = 0;
const HOST_BC_INTERVAL = 0.2;
const HOST_KEYFRAME_INTERVAL = 12;
function hostTickBroadcast(dt){
  if (NET.role !== 'host') return;
  _lastBcAt += dt;
  _keyframeCd += dt;
  if (_lastBcAt < HOST_BC_INTERVAL) return;
  _lastBcAt = 0;
  if (_keyframeCd >= HOST_KEYFRAME_INTERVAL){
    _keyframeCd = 0;
    hostBuildDelta();                       // 顺带把差异缓存对齐，避免关键帧后重复发送
    netBroadcast({ t: 'snap', snap: hostBuildSnapshot() });
    return;
  }
  netBroadcast({ t: 'delta', d: hostBuildDelta() });
}

/* ---------- 开局默认数据（主机从菜单直接开房时可能还没有存档） ---------- */
function hostEnsureDefaults(){
  if (!G.designs.some(d => d.id === 'd0')){
    G.designs = [{
      id: 'd0', name: '标准护卫舰', hullTier: 1, shipClass: 'escort',
      mods: { main:{tier:1, size:'medium', obj: mkWeapon('lightCharge',1,'medium')}, sub:{tier:1, size:'medium', obj: mkWeapon('rapid',1,'medium')}, armor:{tier:1, size:'medium', obj: mkArmor(1,'medium')}, engine:{tier:1, size:'medium', obj: mkEngine(1,'medium')}, reactor:{tier:1, size:'medium', obj: mkReactor(1,'medium')}, repair:null, missile:null, aa:null, catapult:null }
    }];
  }
  if (!G.commanders.length) G.commanders = [generateCommander(), generateCommander()];
  G.planeDesigns = G.planeDesigns || [];
  G.hangar = G.hangar || {};
  G.groups = [];
  G.zones = [];
  G.materials = {1:0,2:0,3:0,4:0,5:0,6:0,7:0};
  G.hullUnlocked = {1:true,2:false,3:false,4:false,5:false,6:false,7:false};
  G.planeHullUnlocked = {1:true,2:false,3:false,4:false,5:false,6:false,7:false};
  G.nextUid = 1; G.nextPlaneId = 1; G.nextGroupId = 1;
  G.selectedFleetId = null; G.isDrawingZone = false; G.drawingZone = null;
  G.playerHomes = {};
}

/* ---------- 出生点：固定候选池 + matchSeed 抽取 ---------- */
// 半径 2400~2800 的 10 个外圈点（环形均匀分布，最小间距 > 1500）
const SPAWN_CANDIDATES = [
  { x: 2600, y: 0 }, { x: 2103, y: 1535 }, { x: 803, y: 2473 }, { x: -803, y: 2473 },
  { x: -2103, y: 1535 }, { x: -2600, y: 0 }, { x: -2103, y: -1535 }, { x: -803, y: -2473 },
  { x: 803, y: -2473 }, { x: 2103, y: -1535 },
];

function pickSpawnCandidates(){
  return SPAWN_CANDIDATES.map(c => {
    let best = null, bestD = Infinity;
    for (const p of G.planets){
      if (p.level !== 1) continue;
      if (p.owner) continue;
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }).filter(Boolean);
}

function assignSpawns(matchSeed, ids){
  const rnd = mulberry32(matchSeed);
  const cands = pickSpawnCandidates();
  if (cands.length < ids.length) { console.warn('候选点不足', cands.length, ids.length); }
  // Fisher-Yates 洗牌
  for (let i = cands.length - 1; i > 0; i--){
    const j = Math.floor(rnd() * (i + 1));
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }
  const spawns = {};
  ids.forEach((id, i) => { spawns[id] = cands[i] ? cands[i].id : null; });
  return spawns;
}

/* ---------- 多人版 faction / 落点 ---------- */
function initFactionsMulti(numAI, humanIds){
  G.factions = {};
  G.aiTimers = {}; G.aiWaves = {};
  humanIds.forEach((id, i) => {
    G.factions[id] = {
      name: (NET.names && NET.names[id]) || (i === 0 ? G.nationName : ('玩家' + (i + 1))),
      color: HUMAN_COLORS[HUMAN_IDS.indexOf(id)] || PLAYER_COLOR,
      isPlayer: true,
    };
  });
  for (let i = 0; i < numAI; i++){
    const key = 'ai' + (i + 1);
    G.factions[key] = {
      name: AI_NAMES[i % AI_NAMES.length], color: AI_COLORS[i % AI_COLORS.length],
      isPlayer: false, designs: makeAIDesignPool(),
    };
    G.aiTimers[key] = 18 + i * 3; G.aiWaves[key] = 0;
  }
}

function placeFactionsMulti(spawns){
  G.playerHomes = {};
  for (const id in spawns){
    const pid = spawns[id];
    if (pid == null) continue;
    const p = G.planets[pid];
    if (!p) continue;
    p.owner = id;
    if (isHuman(id)){
      p.facilities = ['dock', 'repair'];
      p.garrison = [];
      for (let k = 0; k < 2; k++) p.garrison.push(createPlayerShip('d0', null, id));
      G.playerHomes[id] = p.id;
    } else {
      p.garrison = [];
      const pool = G.factions[id].designs || makeAIDesignPool();
      for (let k = 0; k < 2; k++) p.garrison.push(createEnemyShipFromDesign(pool[0], id));
    }
  }
  G.playerHomeId = G.playerHomes[MY_ID] || null;
  invalidatePlayerPlanets();
}

/* ---------- 开局 ---------- */
function hostStartMatch(){
  if (NET.role !== 'host' || G.isPlaying) return;
  const roster = NET.roster.slice();
  if (!roster.length) return;

  hostEnsureDefaults();

  G.matchSeed = (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;
  seedRng(G.matchSeed);

  // 建势力：N 人 + 1 AI
  initFactionsMulti(1, roster);

  // 重置地图 + 分配出生点
  initPlanets(generateMapData(MAP_SEED));
  const allIds = roster.concat(['ai1']);
  G.spawns = assignSpawns(G.matchSeed, allIds);
  placeFactionsMulti(G.spawns);

  G.time = 0; G.isPlaying = true; G.paused = false;
  G.alloy = 200; G.energy = 150;
  G.buildQueue = []; G.fleets = []; G.battles = []; G.logs = [];

  G.selected = G.playerHomeId;
  const home = G.planets[G.playerHomeId];
  if (home){ CAM.x = home.x; CAM.y = home.y; CAM.scale = 1.2; }

  addLog(`🎮 多人开局：${roster.join(' + ')} vs AI`, 'win');

  document.getElementById('appMenu').style.display = 'none';
  document.getElementById('gameUI').style.display = 'block';
  document.getElementById('rightBody').dataset.sig = '';
  renderTop(); renderRight(); updateSpeedUI();

  // 广播开局 + 全量
  hostResetSnapCache();
  hostBuildDelta();   // 先对齐差异缓存，避免关键帧后立刻重发全量星球
  netBroadcast({
    t: 'start', matchSeed: G.matchSeed, roster, spawns: G.spawns,
    factions: G.factions, snap: hostBuildSnapshot(),
  });
  // 大厅标记房间已开局
  netSend({ t: 'roomMeta', name: NET.roomName, started: true });
  // 大厅通知宿主关闭面板
  netEmit('_started', {});
}

/* ---------- 命令 / 入座 / 控制 ---------- */
let _hostHandlersInstalled = false;
function hostInstallHandlers(){
  if (_hostHandlersInstalled) return;
  _hostHandlersInstalled = true;

  netOn('cmd', (m) => {
    if (NET.role !== 'host') return;
    const from = m._sender;
    if (!from || NET.roster.indexOf(from) < 0) { netBroadcast({ t:'ack', seq:m.seq, to:from, ok:false, reason:'未入座' }); return; }
    let ok = false;
    try { ok = executeCommand(m.cmd, from); } catch(e){ console.error('[host] cmd', e); }
    netBroadcast({ t:'ack', seq:m.seq, to:from, ok:!!ok });
  });

  netOn('hello', (m) => {
    if (NET.role !== 'host') return;
    const pid = m._sender;
    if (!isHuman(pid)) return;
    if (G.isPlaying) { netBroadcast({ t:'deny', to:pid, reason:'游戏已开始' }); return; }
    if (NET.roster.indexOf(pid) < 0){
      if (NET.roster.length >= HUMAN_IDS.length) { netBroadcast({ t:'deny', to:pid, reason:'房间已满' }); return; }
      NET.roster.push(pid);
      NET.names[pid] = m.name || ('玩家' + NET.roster.length);
      G.factions[pid] = {
        name: NET.names[pid],
        color: HUMAN_COLORS[HUMAN_IDS.indexOf(pid)],
        isPlayer: true,
      };
      addLog(`👥 ${NET.names[pid]} 入座`, 'info');
    }
    netBroadcast({ t:'welcome', to:pid, roster: NET.roster, names: NET.names, factions: G.factions,
      matchSeed: G.matchSeed, spawns: G.spawns });
    netBroadcast({ t:'lobby', roster: NET.roster, names: NET.names });
    netEmit('_roster', {});
  });

  netOn('leave', (m) => {
    if (NET.role !== 'host') return;
    const i = NET.roster.indexOf(m._sender);
    if (i >= 0){ NET.roster.splice(i, 1); delete NET.names[m._sender]; addLog(`👋 ${m._sender} 离开`, 'info'); }
    netBroadcast({ t:'lobby', roster: NET.roster, names: NET.names });
    netEmit('_roster', {});
  });

  netOn('control', (m) => {
    if (NET.role !== 'host') return;
    if (m._sender !== 'p1') return;         // 只有房主
    if (typeof m.paused === 'boolean') G.paused = m.paused;
    if (m.speed != null) G.gameSpeed = Math.max(1, Math.min(4, m.speed | 0));
    netBroadcast({ t:'control', paused: G.paused, speed: G.gameSpeed });
    if (typeof updateSpeedUI === 'function') updateSpeedUI();
  });

  netOn('start', (m) => {
    if (NET.role !== 'host') return;
    if (m._sender !== 'p1') return;
    hostStartMatch();
  });
}
