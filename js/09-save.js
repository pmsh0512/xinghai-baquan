/* =========================================================
   09-save.js — 本地与云存档
   ========================================================= */

const SAVE_KEY = 'xinghai_v8';
const SAVE_VERSION = 8;

function getSaveData(){
  const changed = [];
  for(const p of G.planets){ 
    if(p.owner || p.garrison.length || p.facilities.length || p.level !== 1 || (p.visibility||0) > 0.01){ 
      changed.push({ id:p.id, level:p.level, owner:p.owner, garrison:p.garrison, facilities:p.facilities, visibility:p.visibility||0 }); 
    } 
  }
  return { 
    version: SAVE_VERSION, timestamp: Date.now(), seed: MAP_SEED, 
    nationName: G.nationName, time: G.time, alloy: G.alloy, energy: G.energy, 
    materials: G.materials, hullUnlocked: G.hullUnlocked, planeHullUnlocked: G.planeHullUnlocked, 
    designs: G.designs, planeDesigns: G.planeDesigns, planeDesign: G.planeDesign, 
    hangar: G.hangar, nextPlaneId: G.nextPlaneId, groups: G.groups, 
    nextGroupId: G.nextGroupId, nextUid: G.nextUid, logs: G.logs.slice(0,30), 
    playerHomeId: G.playerHomeId, factions: G.factions, aiTimers: G.aiTimers, aiWaves: G.aiWaves, 
    buildQueue: G.buildQueue, changedPlanets: changed, fleets: G.fleets, 
    designMods: G.designMods, designHull: G.designHull, designClass: G.designClass, designName: G.designName, 
    shipyardCurrent: shipyardCurrent, commanders: G.commanders,
    zones: G.zones || [] 
  };
}

function migrateLegacyOwners(data){
  // 旧存档用字符串 'player' 作为势力键与 owner，统一迁移到当前客户端的 MY_ID
  if(data.factions && data.factions.player){ data.factions[MY_ID]=data.factions.player; delete data.factions.player; }
  const fix=o=>{ if(o && o.owner==='player') o.owner=MY_ID; };
  if(Array.isArray(data.changedPlanets)) for(const c of data.changedPlanets){ fix(c); if(Array.isArray(c.garrison)) for(const s of c.garrison) fix(s); }
  if(Array.isArray(data.fleets)) for(const f of data.fleets){ fix(f); if(Array.isArray(f.ships)) for(const s of f.ships) fix(s); }
}

function applySaveData(data){
  migrateLegacyOwners(data);
  G.nationName = data.nationName || '泰拉联邦'; 
  G.time = data.time || 0; G.alloy = data.alloy || 0; G.energy = data.energy || 0;
  G.materials = data.materials || {1:0,2:0,3:0,4:0,5:0,6:0,7:0}; 
  for(let i=1;i<=7;i++) if(G.materials[i] == null) G.materials[i] = 0;
  G.hullUnlocked = data.hullUnlocked || {1:true,2:false,3:false,4:false,5:false,6:false,7:false}; 
  G.planeHullUnlocked = data.planeHullUnlocked || {1:true,2:false,3:false,4:false,5:false,6:false,7:false};
  G.designs = data.designs || []; 
  G.planeDesigns = data.planeDesigns || []; 
  for(const pd of G.planeDesigns) if(pd.tier === undefined) pd.tier = 1;
  G.planeDesign = data.planeDesign || G.planeDesign; 
  if(G.planeDesign.tier === undefined) G.planeDesign.tier = 1;
  G.hangar = data.hangar || {}; G.nextPlaneId = data.nextPlaneId || 1; 
  G.groups = data.groups || []; G.nextGroupId = data.nextGroupId || 1; G.nextUid = data.nextUid || 1; G.logs = data.logs || [];
  G.playerHomeId = data.playerHomeId; G.factions = data.factions || {};
  for(const key in G.factions){ if(isHuman(key)) continue; if(!G.factions[key].designs) G.factions[key].designs = makeAIDesignPool(); }
  G.aiTimers = data.aiTimers || {}; G.aiWaves = data.aiWaves || {}; G.buildQueue = data.buildQueue || []; G.designMods = data.designMods || G.designMods;
  G.designHull = data.designHull || 1; G.designClass = data.designClass || 'none'; G.designName = data.designName || '新设计'; 
  shipyardCurrent = data.shipyardCurrent || null;
  G.commanders = data.commanders || [];
  G.zones = (data.zones || []).map(z => ({ ...z, owner: z.owner || 'p1' })); // ★ 旧存档战区归属 p1
  
  if (G.commanders.length === 0) {
    G.commanders.push(generateCommander());
    G.commanders.push(generateCommander());
  }

  initPlanets(generateMapData(data.seed || MAP_SEED));
  if(Array.isArray(data.changedPlanets)){ 
    for(const c of data.changedPlanets){ 
      const p = G.planets[c.id]; if(!p) continue; 
      p.level = c.level || 1; p.owner = c.owner || null; p.garrison = c.garrison || []; p.facilities = c.facilities || []; p.visibility = (typeof c.visibility === 'number') ? c.visibility : 0; 
    } 
  }
  for(const p of G.planets){ 
    for(const s of p.garrison){ 
      if(s.column === undefined) s.column = 0; if(s.baseSpd === undefined) s.baseSpd = s.spd || 50; 
      if(s.maxEnergy === undefined){ s.maxEnergy = 100; s.energy = 100; } if(!s.squadron) s.squadron = []; 
    } 
  }
  if(G.playerHomeId != null){ 
    const home = G.planets[G.playerHomeId]; 
    if(home){ if(!home.facilities.includes('dock')) home.facilities.push('dock'); if(!home.facilities.includes('repair')) home.facilities.push('repair'); } 
  }
  G.fleets = []; 
  if(Array.isArray(data.fleets)){ 
    for(const f of data.fleets){ 
      if(!G.planets[f.fromRegionId] || !G.planets[f.toRegionId]) continue; 
      for(const s of f.ships){ if(s.column === undefined) s.column = 0; } G.fleets.push(f); 
    } 
  }
  G.battles = []; invalidatePlayerPlanets(); applyOfflineProgress(data.timestamp);
}

function applyOfflineProgress(saveTime){
  if(!saveTime) return; 
  const elapsed = (Date.now() - saveTime) / 1000; 
  if(elapsed < 30 || elapsed > 86400 * 3) return; 
  const simTime = Math.min(elapsed, 8 * 3600);
  
  if (typeof totalOutput === 'function' && typeof regionMatOutput === 'function') {
    const out = totalOutput(); 
    G.alloy += out.alloy * simTime; 
    G.energy += out.energy * simTime;
    for(const p of G.planets){ 
      if(!isMe(p.owner) || p.level < 3) continue; 
      const rate = regionMatOutput(p); 
      if(rate > 0){ 
        const tier = Math.min(p.level - 1, 7); 
        G.materials[tier] = (G.materials[tier] || 0) + rate * simTime; 
      } 
    }
  }
  
  for(const p of G.planets){ 
    const hasRepair = p.facilities.includes('repair'); 
    for(const s of p.garrison){ 
      if(!isMe(s.owner)) continue; 
      if(hasRepair){ s.hp = s.maxHp; s.shd = s.maxShd; } 
      s.energy = s.maxEnergy; 
    } 
  }
  for(const q of G.buildQueue) q.progress = Math.min(1, q.progress + simTime / q.duration);
  
  const h = Math.floor(simTime/3600), m = Math.floor((simTime%3600)/60); 
  addLog(`🌙 离线 ${h}h${m}m，产出已结算`, 'info');
}

function saveToLocal(silent){ 
  try { 
    localStorage.setItem(SAVE_KEY, JSON.stringify(getSaveData())); 
    G.lastSaveTime = Date.now(); 
    if(!silent) toast('💾 已保存到本地'); 
  } catch(e) { 
    console.warn('本地保存失败', e); 
    if(e.name === 'QuotaExceededError' || e.code === 22) {
      if(typeof toast === 'function' && !silent) toast('❌ 存档空间已满，清理部分旧数据...', 2000);
      try {
        const cleanData = getSaveData();
        if (cleanData.fleets) cleanData.fleets = cleanData.fleets.filter(f => isMe(f.owner));
        localStorage.setItem(SAVE_KEY, JSON.stringify(cleanData));
      } catch(err) {
        try { localStorage.removeItem(SAVE_KEY); } catch(_) {}
      }
    }
  } 
}

function loadFromLocal(){ 
  try { 
    const raw = localStorage.getItem(SAVE_KEY); if(!raw) return false; 
    const data = JSON.parse(raw); if(data.version !== SAVE_VERSION) return false; 
    applySaveData(data); return true; 
  } catch(e) { console.warn('本地读档失败', e); return false; } 
}

function hasLocalSave(){ try { return !!localStorage.getItem(SAVE_KEY); } catch(e){ return false; } }
function clearLocalSave(){ try { localStorage.removeItem(SAVE_KEY); } catch(e){} }
function getLocalSaves() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return [{ id: 'local_save', name: data.nationName || '本地存档', updated_at: data.timestamp || Date.now(), data: data }];
  } catch (e) { return []; }
}

async function uploadCloudSave(name) {
  if (!supabaseClient || !G.playerUser) return false;
  try {
    const data = getSaveData();
    const saveId = G.activeSaveId || crypto.randomUUID();
    const { error } = await withRetry(() => supabaseClient.from('saves').upsert({ id: saveId, user_id: G.playerUser.id, name: name || '云存档', data: data, updated_at: new Date() }));
    if (error) throw error;
    G.activeSaveId = saveId;
    toast('☁️ 已同步到云端');
    return true;
  } catch(e) { console.warn(e); toast('❌ 云存档失败，请检查网络'); return false; }
}

async function fetchCloudSaves() {
  if (!supabaseClient || !G.playerUser) return [];
  try {
    const { data, error } = await withRetry(() => supabaseClient.from('saves').select('id, name, updated_at, data').eq('user_id', G.playerUser.id).order('updated_at', { ascending: false }));
    if (error) throw error;
    return data || [];
  } catch (e) { console.error('获取存档列表失败', e); return []; }
}

async function loadCloudSave(id) {
  if (!supabaseClient || !G.playerUser) return false;
  try {
    const { data, error } = await withRetry(() => supabaseClient.from('saves').select('data').eq('id', id).single());
    if (error) throw error;
    applySaveData(data.data);
    G.activeSaveId = id;
    saveToLocal(true);
    return true;
  } catch (e) { console.error(e); toast('❌ 读取云存档失败'); return false; }
}

async function deleteCloudSave(id) {
  if (!supabaseClient || !G.playerUser) return false;
  try {
    await withRetry(() => supabaseClient.from('saves').delete().eq('id', id));
    if (G.activeSaveId === id) G.activeSaveId = null;
    return true;
  } catch (e) { console.error(e); toast('❌ 删除云存档失败'); return false; }
}