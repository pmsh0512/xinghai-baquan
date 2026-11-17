/* =========================================================
   net-client.js — 客户端：快照应用 / 插值 / 权限锁定
   ========================================================= */

function clientApplyPlanetRow(byId, row){
  const [id, owner, level, facilities, garrison, vis] = row;
  let p = byId.get(id);
  if (!p){ p = { id, x:0, y:0, level, name:'', owner:null, garrison:[], facilities:[], battle:null, flash:0, visibility:0 }; byId.set(id, p); }
  p.owner = owner || null;
  p.level = level;
  p.facilities = facilities;
  p.garrison = garrison;
  // 迷雾由客户端按自己的星球/舰队本地计算，忽略快照里的主机视角 visibility
}

// 主机战斗快照只有存活数，补一个客户端视图可用的占位结构
function clientBattleView(b){
  const mk = (n, alive, prefix) => Array.from({ length: n }, (_, i) => ({
    uid: prefix + i, name: '战舰-' + String(i + 1).padStart(3, '0'), column: 0,
    hp: i < alive ? 1 : 0, maxHp: 1, shd: 0, maxShd: 0, mainCharge: 0, _chMain: 0,
  }));
  return {
    id: b.id, regionId: b.regionId, time: b.time,
    attackerOwner: b.attackerOwner, defenderOwner: b.defenderOwner,
    attacker: mk(b.atkTotal || 0, b.atkAlive || 0, 'ca'),
    defender: mk(b.defTotal || 0, b.defAlive || 0, 'cd'),
    log: b.log || [], over: false,
  };
}

function clientApplyFull(snap, resetPlanets){
  if (!snap) return;
  G.time = snap.time; G.paused = snap.paused; G.gameSpeed = snap.speed;
  G.factions = snap.factions || {};
  G.nationName = (G.factions[NET.myPlayerId] && G.factions[NET.myPlayerId].name) || snap.nationName;
  G.playerHomes = snap.playerHomes || {};
  G.playerHomeId = G.playerHomes[NET.myPlayerId] || null;
  G.designs = snap.designs || [];
  G.planeDesigns = snap.planeDesigns || [];
  if (snap.hullUnlocked) G.hullUnlocked = snap.hullUnlocked;
  if (snap.planeHullUnlocked) G.planeHullUnlocked = snap.planeHullUnlocked;
  if (snap.commanders) G.commanders = snap.commanders;
  G.logs = snap.logs || [];
  G.buildQueue = (snap.buildQueue || []).filter(q => !q.owner || q.owner === NET.myPlayerId);
  G.zones = (snap.zones || []).filter(z => !z.owner || z.owner === NET.myPlayerId);
  G.matchSeed = snap.matchSeed != null ? snap.matchSeed : G.matchSeed;

  const mine = snap.resources && snap.resources[NET.myPlayerId];
  if (mine){ G.alloy = mine.alloy; G.energy = mine.energy; G.materials = { ...mine.materials }; }

  // 星球：用 MAP_SEED 生成一次静态坐标；开局时强制重建，避免上一局归属残留
  if (resetPlanets || !G.planets || !G.planets.length){
    initPlanets(generateMapData(MAP_SEED));
  }
  const byId = new Map(G.planets.map(p => [p.id, p]));
  for (const row of snap.planets) clientApplyPlanetRow(byId, row);

  // 舰队：保留本地已有对象的 _dispProg，并补齐渲染/UI 需要的字段
  const oldMap = new Map(G.fleets.map(f => [f.id, f]));
  G.fleets = snap.fleets.map(f => {
    const old = oldMap.get(f.id);
    return {
      ...f,
      fromRegionId: f.fromRegionId != null ? f.fromRegionId : f.from,
      toRegionId: f.toRegionId != null ? f.toRegionId : f.to,
      _dispProg: old && old._dispProg !== undefined ? old._dispProg : f.progress,
    };
  });

  // 战斗：附加到星球上，同时供战斗动画浮层使用
  G.battles = (snap.battles || []).map(clientBattleView);
  for (const p of G.planets) p.battle = null;
  for (const b of G.battles){
    const r = G.planets[b.regionId];
    if (r) r.battle = b;
  }

  if (G.selected == null) G.selected = G.playerHomeId;
  invalidatePlayerPlanets();
  markRightDirty();
}

/* 增量快照：只合并变化项 */
function clientMergeFleets(list){
  const byId = new Map(G.fleets.map(f => [f.id, f]));
  for (const nf of list){
    const old = byId.get(nf.id);
    const f = {
      ...nf,
      fromRegionId: nf.fromRegionId != null ? nf.fromRegionId : nf.from,
      toRegionId: nf.toRegionId != null ? nf.toRegionId : nf.to,
      _dispProg: old && old._dispProg !== undefined ? old._dispProg : nf.progress,
    };
    if (old) Object.assign(old, f);
    else G.fleets.push(f);
  }
}

function clientApplyDelta(d){
  if (!d) return;
  if (d.time != null) G.time = d.time;
  if (typeof d.paused === 'boolean') G.paused = d.paused;
  if (d.speed != null) G.gameSpeed = d.speed;

  if (d.meta){
    const m = d.meta;
    if (m.designs) G.designs = m.designs;
    if (m.planeDesigns) G.planeDesigns = m.planeDesigns;
    if (m.hullUnlocked) G.hullUnlocked = m.hullUnlocked;
    if (m.planeHullUnlocked) G.planeHullUnlocked = m.planeHullUnlocked;
    if (m.commanders) G.commanders = m.commanders;
    if (m.factions){
      G.factions = m.factions;
      G.nationName = (G.factions[NET.myPlayerId] && G.factions[NET.myPlayerId].name) || G.nationName;
    }
    if (m.playerHomes){
      G.playerHomes = m.playerHomes;
      G.playerHomeId = G.playerHomes[NET.myPlayerId] || G.playerHomeId;
    }
    if (m.nationName) G.nationName = m.nationName;
  }

  if (d.resources && d.resources[NET.myPlayerId]){
    const r = d.resources[NET.myPlayerId];
    G.alloy = r.alloy; G.energy = r.energy; G.materials = { ...r.materials };
  }

  if (d.planets && d.planets.length){
    const byId = new Map(G.planets.map(p => [p.id, p]));
    for (const row of d.planets) clientApplyPlanetRow(byId, row);
  }

  if (d.fleets && d.fleets.length) clientMergeFleets(d.fleets);
  if (d.fleetsDel && d.fleetsDel.length){
    const gone = new Set(d.fleetsDel);
    G.fleets = G.fleets.filter(f => !gone.has(f.id));
  }

  if (d.battles){
    G.battles = d.battles.map(clientBattleView);
    for (const p of G.planets) p.battle = null;
    for (const b of G.battles){
      const r = G.planets[b.regionId];
      if (r) r.battle = b;
    }
  }

  if (d.logs) G.logs = d.logs;
  if (d.buildQueue) G.buildQueue = d.buildQueue.filter(q => !q.owner || q.owner === NET.myPlayerId);
  if (d.zones) G.zones = d.zones.filter(z => !z.owner || z.owner === NET.myPlayerId);

  invalidatePlayerPlanets();
  markRightDirty();
}

let _clientUiTimer = 0, _clientRightCd = 0;
function clientTickView(dt){
  if (!G.paused) G.time += dt * (G.gameSpeed || 1);

  // 舰队插值
  for (const f of G.fleets){
    if (f._dispProg === undefined) f._dispProg = f.progress;
    f._dispProg += (f.progress - f._dispProg) * Math.min(1, dt * 8);
    const from = G.planets[f.fromRegionId != null ? f.fromRegionId : f.from];
    const to = G.planets[f.toRegionId != null ? f.toRegionId : f.to];
    if (from && to){
      f.x = from.x + (to.x - from.x) * f._dispProg;
      f.y = from.y + (to.y - from.y) * f._dispProg;
    }
  }
  // 星球闪烁衰减
  for (const p of G.planets) if (p.flash > 0) p.flash = Math.max(0, p.flash - dt);

  // 迷雾：用客户端自己的星球与舰队作为视野源
  updateVisibility(dt);
  for (const b of G.battles){ const bp = G.planets[b.regionId]; if (bp) bp.visibility = 1; }

  _clientUiTimer -= dt;
  if (_clientUiTimer <= 0){ _clientUiTimer = 0.4; renderTop(); }
  _clientRightCd -= dt;
  if (rightDirty && _clientRightCd <= 0 && !isEditingInput()){
    rightDirty = false;
    renderRight();
    _clientRightCd = 0.2;
  }
}

function clientFocusHome(){
  const home = G.planets[G.playerHomeId];
  if (home){ CAM.x = home.x; CAM.y = home.y; CAM.scale = 1.2; }
}

function clientEnterGame(){
  G.isPlaying = true;
  document.getElementById('gameUI').style.display = 'block';
  document.getElementById('appMenu').style.display = 'none';
  document.getElementById('rightBody').dataset.sig = '';
  renderTop(); renderRight(); updateSpeedUI();
  if (typeof netUiRefresh === 'function') netUiRefresh();
}

let _clientHandlersInstalled = false;
function clientInstallHandlers(){
  if (_clientHandlersInstalled) return;
  _clientHandlersInstalled = true;

  netOn('welcome', (m) => {
    if (NET.role !== 'client' || m.to !== NET.myPlayerId) return;
    NET.roster = m.roster || [];
    NET.names = m.names || NET.names;
    G.matchSeed = m.matchSeed;
    G.spawns = m.spawns;
    G.factions = m.factions || {};
    // 欢迎阶段只同步大厅信息，快照等房主开局（start）再应用
    netEmit('_joined', {});
    toast('🔗 已进入房间，等待房主开始');
  });

  netOn('lobby', (m) => {
    if (NET.role !== 'client') return;
    NET.roster = m.roster || [];
    NET.names = m.names || NET.names;
    if (typeof netUiRefresh === 'function') netUiRefresh();
  });

  netOn('start', (m) => {
    if (NET.role !== 'client') return;
    NET.roster = m.roster || [];
    G.matchSeed = m.matchSeed;
    G.spawns = m.spawns;
    G.factions = m.factions || {};
    clientApplyFull(m.snap, true);
    G.selected = G.playerHomeId;
    clientEnterGame();
    clientFocusHome();
    netEmit('_started', {});
    toast('🎮 游戏开始');
  });

  netOn('delta', (m) => {
    if (NET.role !== 'client') return;
    clientApplyDelta(m.d);
  });

  netOn('snap', (m) => {
    if (NET.role !== 'client') return;
    clientApplyFull(m.snap);
  });

  netOn('lobby_ping', () => {
    if (NET.role !== 'client' || G.isPlaying) return;
    netSend({ t:'hello', name: '玩家' + NET.myPlayerId.slice(1) });
  });

  netOn('ack', (m) => {
    if (NET.role !== 'client' || (m.to && m.to !== NET.myPlayerId)) return;
    if (!m.ok) toast('⚠ ' + (m.reason || '操作失败'), 1200);
  });

  netOn('control', (m) => {
    if (NET.role !== 'client') return;
    if (typeof m.paused === 'boolean') G.paused = m.paused;
    if (m.speed != null) G.gameSpeed = m.speed;
    updateSpeedUI();
  });

  netOn('deny', (m) => {
    if (NET.role !== 'client' || (m.to && m.to !== NET.myPlayerId)) return;
    toast('❌ ' + (m.reason || '被拒绝'));
    netClose();
    if (typeof netUiRefresh === 'function') netUiRefresh();
  });

  netOn('hostLeft', () => {
    if (NET.role !== 'client') return;
    toast('⚠ 房主已离开房间');
    netClose();
    if (typeof netUiRefresh === 'function') netUiRefresh();
  });
}
