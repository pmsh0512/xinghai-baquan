/* =========================================================
   13-main.js — 主循环、更新与启动
   ========================================================= */

// ★ 将核心 UI 控制函数直接定义在这里，防止依赖其他文件报错
function showMenuScreen(screenId) {
  document.querySelectorAll('.menu-box').forEach(el => el.style.display = 'none');
  const target = document.getElementById(screenId);
  if (target) target.style.display = 'block';
}

async function refreshSaveList() {
  const container = document.getElementById('saveListContainer');
  if (!container) return;
  container.innerHTML = '<div style="color:#7e8fae; padding:20px; text-align:center;">加载中...</div>';
  
  try {
    let allSaves = [];
    try {
      if (typeof getLocalSaves === 'function') {
        const localSaves = getLocalSaves();
        if (Array.isArray(localSaves)) allSaves = allSaves.concat(localSaves);
      }
    } catch (e) { console.warn('读取本地存档出错', e); }
    
    if (G.playerUser && !G.isGuest) {
      try {
        if (typeof fetchCloudSaves === 'function') {
          const cloudPromise = fetchCloudSaves();
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
          const cloudSaves = await Promise.race([cloudPromise, timeoutPromise]);
          if (Array.isArray(cloudSaves)) allSaves = allSaves.concat(cloudSaves);
        }
      } catch (e) { console.warn('读取云存档超时或失败', e); }
    }
    
    if (!allSaves.length) {
      container.innerHTML = '<div style="color:#7e8fae; padding:40px; text-align:center;">暂无存档，请新建</div>';
      return;
    }
    
    allSaves.sort((a, b) => (new Date(b.updated_at).getTime() || 0) - (new Date(a.updated_at).getTime() || 0));
    
    let html = '';
    for (const save of allSaves) {
      const isCloud = save.id !== 'local_save';
      const typeTag = isCloud ? '<span style="color:#8bffa0; font-size:12px;">[云]</span>' : '<span style="color:#a8cdfa; font-size:12px;">[本地]</span>';
      let dateStr = '未知时间';
      if (save.updated_at) { try { dateStr = new Date(save.updated_at).toLocaleString(); } catch(e){} }
      
      html += `<div class="save-item">
        <div class="save-item-info">
          <div class="s-name">${typeTag} ${save.name || '未命名存档'}</div>
          <div class="s-time">${dateStr}</div>
        </div>
        <div class="save-item-actions">
          <button class="btn-sm btn-primary" onclick="loadSave('${save.id}', ${isCloud})">读取</button>
          <button class="btn-sm btn-danger" onclick="deleteSave('${save.id}', ${isCloud})">删除</button>
        </div>
      </div>`;
    }
    container.innerHTML = html;
  } catch (err) {
    console.error('刷新存档列表致命错误:', err);
    container.innerHTML = '<div style="color:#ff8a8a; padding:20px; text-align:center;">加载失败</div>';
  }
}

window.loadSave = async (id, isCloud) => {
  if (isCloud) { if (!await loadCloudSave(id)) return; } else { if (!loadFromLocal()) return; }
  enterGame();
};

window.deleteSave = async (id, isCloud) => {
  if (!confirm('确认删除该存档？不可恢复！')) return;
  if (isCloud) await deleteCloudSave(id); else clearLocalSave();
  refreshSaveList();
};

function enterGame() {
  G.isPlaying = true;
  G.paused = false;
  if (typeof updateSpeedUI === 'function') updateSpeedUI();
  document.getElementById('appMenu').style.display = 'none';
  document.getElementById('gameUI').style.display = 'block';
  document.getElementById('rightBody').dataset.sig = '';
  renderTop(); renderRight();
  const home = G.planets[G.playerHomeId];
  if (home) { CAM.x = home.x; CAM.y = home.y; CAM.scale = 1.2; }
  lastTick = performance.now();
  toast('🏛 进入帝国');
}

/* =========================================================
   主循环
   ========================================================= */

function update(dt){
  G.time += dt;
  const out = totalOutput();
  G.alloy += out.alloy * dt;
  G.energy += out.energy * dt;
  
  for(const p of getPlayerPlanets()){
    const rate = regionMatOutput(p);
    if(rate > 0 && p.level >= 3){ const tier = Math.min(p.level - 1, 7); if(tier >= 1) G.materials[tier] = (G.materials[tier] || 0) + rate * dt; }
  }
  
  for(const p of G.planets){
    const hasRepair = p.facilities.includes('repair'), isOwned = isMe(p.owner);
    for(const s of p.garrison){
      if(!isMe(s.owner)) continue;
      const energyRate = (isOwned ? 0.10 : 0) + (hasRepair ? 0.10 : 0);
      if(energyRate > 0){ s.energy = Math.min(s.maxEnergy, s.energy + s.maxEnergy * energyRate * dt); }
      if(s.hp >= s.maxHp && s.shd >= s.maxShd) continue;
      const hpRate = hasRepair ? 0.05 : 0.008, shdRate = hasRepair ? 0.10 : 0.018;
      s.hp = Math.min(s.maxHp, s.hp + s.maxHp * hpRate * dt);
      s.shd = Math.min(s.maxShd, s.shd + s.maxShd * shdRate * dt);
    }
  }
  
  tickFleets(dt);
  tickBattles(dt);
  tickBuilds(dt);
  
  const bqModal = document.getElementById('buildQueueModal');
  if (bqModal) {
    const myQueue = getMyBuildQueue();
    const rowCount = bqModal.querySelectorAll('table tr').length - 1; 
    if (myQueue.length !== rowCount && (myQueue.length > 0 || rowCount > 0)) {
      renderBuildQueueModal();
    } else {
      for (const q of myQueue) {
        const bar = bqModal.querySelector(`.bq-progress-bar[data-qid="${q.id}"]`);
        const text = bqModal.querySelector(`.bq-pct-text[data-qid="${q.id}"]`);
        if (bar) {
          const pct = Math.round(q.progress * 100);
          bar.style.width = pct + '%';
          if (text) text.textContent = pct + '%';
        }
      }
    }
  }

  // 联机客户端不跑模拟（也不会走到这里），AI/近防炮/迷雾都由主机推进
  if (NET.role !== 'client') {
    tickAI(dt);
    tickCIWS(dt);
    updateVisibility(dt);
  }
  
  for(const p of G.planets){ if(p.flash > 0) p.flash = Math.max(0, p.flash - dt*2); }
  
  uiTimer -= dt;
  if(uiTimer <= 0){ uiTimer = 0.4; renderTop(); }
  
  fullRenderCd -= dt;
  const hasActive = G.buildQueue.length > 0 || G.battles.length > 0 || G.fleets.length > 0;
  if(hasActive && fullRenderCd <= 0) markRightDirty();
  
  if(rightDirty && fullRenderCd <= 0 && !isEditingInput()){
    rightDirty = false;
    renderRight();
    fullRenderCd = 0.15; 
  }
  
  if(pendingSave > 0){
    pendingSave -= dt;
    if(pendingSave <= 0){ pendingSave = 0; saveToLocal(true); }
  }
  idleSaveTimer += dt;
  if(idleSaveTimer >= 120){ idleSaveTimer = 0; saveToLocal(true); }
}

function doTick(){
  const now = performance.now(), elapsed = (now - lastTick) / 1000;
  lastTick = now;

  // 联机客户端：只做视图插值与 UI 刷新，不跑任何模拟（暂停时也要跑，保证插值收敛）
  if (NET.role === 'client'){
    if (elapsed > 0) clientTickView(Math.min(elapsed, 0.5));
    return;
  }

  if(G.paused || elapsed <= 0) return;
  const scaledElapsed = Math.min(elapsed * G.gameSpeed, 3600);
  update(scaledElapsed);

  // 主机：按真实时间 5Hz 广播快照
  if (NET.role === 'host') hostTickBroadcast(elapsed);
}
setInterval(doTick, 100);

function renderLoop(){ 
  render(); 
  requestAnimationFrame(renderLoop); 
}
requestAnimationFrame(renderLoop);

document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) lastTick = performance.now(); });

function newGame(){
  try {
    if (typeof NET !== 'undefined' && NET.role !== 'solo'){ toast('请先退出联机房间再新建存档'); return; }
    G.time = 0; G.alloy = 2000; G.energy = 1200;
    G.matchSeed = 0; G.spawns = {}; G.playerHomes = {};
    G.materials = {1:0,2:0,3:0,4:0,5:0,6:0,7:0};
    G.hullUnlocked = {1:true,2:false,3:false,4:false,5:false,6:false,7:false};
    G.planeHullUnlocked = {1:true,2:false,3:false,4:false,5:false,6:false,7:false};
    G.fleets = []; G.battles = []; G.buildQueue = []; G.zones = []; 
    G.designs = [{
      id: 'd0', name: '标准护卫舰', hullTier: 1, shipClass: 'escort',
      mods: { main:{tier:1, size:'medium', obj: mkWeapon('lightCharge',1,'medium')}, sub:{tier:1, size:'medium', obj: mkWeapon('rapid',1,'medium')}, armor:{tier:1, size:'medium', obj: mkArmor(1,'medium')}, engine:{tier:1, size:'medium', obj: mkEngine(1,'medium')}, reactor:{tier:1, size:'medium', obj: mkReactor(1,'medium')}, repair:null, missile:null, aa:null, catapult:null }
    }];
    G.planeDesigns = [];
    G.planeDesign = { tier: 1, type: 'multirole', name: '新战机', weapons: { main: null }, armor: null, engine: null, reactor: null };
    G.hangar = {}; G.nextPlaneId = 1; G.groups = []; G.nextUid = 1; G.nextGroupId = 1; G.logs = [];
    G.selected = null; G.tab = 'region';
    G.designMods = { main:{tier:1, size:'medium', obj: mkWeapon('lightCharge',1,'medium')}, sub:{tier:1, size:'medium', obj: mkWeapon('rapid',1,'medium')}, armor:{tier:1, size:'medium', obj: mkArmor(1,'medium')}, engine:{tier:1, size:'medium', obj: mkEngine(1,'medium')}, reactor:{tier:1, size:'medium', obj: mkReactor(1,'medium')}, repair:null, missile:null, aa:null, catapult:null };
    G.designHull = 1; G.designClass = 'escort'; G.designName = '新设计';
    G.activeSaveId = null; 
    attackSelect = null; shipyardCurrent = null; pendingSave = 0; idleSaveTimer = 0; rightDirty = true; fullRenderCd = 0;
    G.commanders = [generateCommander(), generateCommander()];

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
    renderTop(); renderRight(); saveToLocal(true);
  } catch (e) {
    console.error("newGame 严重错误:", e);
    alert("初始化游戏出错: " + e.message);
  }
}

function initApp() {
  resize();

  document.getElementById('gameUI').style.display = 'none';
  document.getElementById('appMenu').style.display = 'flex';
  showMenuScreen('menuLogin');
  G.playerUser = null;
  G.isGuest = true;

  try {
    const saved = localStorage.getItem('xh_username');
    if (saved) {
      document.getElementById('authUsername').value = saved;
      if (typeof applyUsername === 'function') applyUsername(saved);
    }
  } catch (e) {}

  lastTick = performance.now();
}

initApp();