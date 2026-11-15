/* =========================================================
   08-fleets.js — 舰队移动、战术与抵达
   ========================================================= */

/* =========================================================
   08-fleets.js — 舰队移动、战术与抵达
   ========================================================= */

function launchFleet(owner, ships, fromId, toId, purpose = 'move', task = null){
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
    purpose: purpose, task: task 
  };
  
  if (owner === 'player' && !ships.some(s => s.commanderId)) {
    const availableCommander = G.commanders.find(c => 
      !G.fleets.some(f => f.ships.some(s => s.commanderId === c.id)) && 
      !G.planets.some(p => p.garrison.some(s => s.commanderId === c.id))
    );
    if (availableCommander) {
      availableCommander.level = Math.min(20, availableCommander.level + 1);
      availableCommander.atkBonus = Math.min(20, availableCommander.atkBonus + 1);
      availableCommander.defBonus = Math.min(20, availableCommander.defBonus + 1);
      for (const s of ships) s.commanderId = availableCommander.id;
    }
  }
  
  G.fleets.push(fleet); 
  return fleet;
}

function recallFleet(fleetId) {
  const idx = G.fleets.findIndex(f => f.id === fleetId);
  if (idx === -1) return;
  const fleet = G.fleets[idx];
  fleet.task = null;
  fleet.toRegionId = fleet.fromRegionId; 
  fleet.progress = 1 - fleet.progress;
  G.selectedFleetId = null;
  markDirty();
}

function tickFleets(dt){
  for(let i = G.fleets.length - 1; i >= 0; i--){ 
    const f = G.fleets[i]; 
    f.progress += dt / f.duration;
    
    if(f.progress >= 1){ 
      const to = G.planets[f.toRegionId]; 
      if (!to) { G.fleets.splice(i,1); continue; }
      f.x = to.x; f.y = to.y; 
      G.fleets.splice(i,1); 
      arriveFleet(f); 
    }
    else { 
      const from = G.planets[f.fromRegionId], to = G.planets[f.toRegionId]; 
      if(!from || !to) { G.fleets.splice(i,1); continue; }
      f.x = from.x + (to.x - from.x) * f.progress; 
      f.y = from.y + (to.y - from.y) * f.progress; 
    }
  }
}

function arriveFleet(fleet){
  const target = G.planets[fleet.toRegionId];
  const alive = fleet.ships.filter(s => s.hp > 0); 
  if(!alive.length) return;
  
  if(target.owner === fleet.owner){ 
    if (fleet.task?.type === 'zone_sweep' && fleet.owner === 'player') {
       smartSplitAndAttack(target, alive, fleet.task.zoneId);
    } else {
       for(const s of alive) target.garrison.push(s); 
       if(fleet.owner === 'player') addLog(`◉ ${alive.length} 艘舰船抵达 ${target.name}`, 'info'); 
    }
    markDirty(); 
    return; 
  }
  
  const defenders = target.garrison.filter(s => s.hp > 0);
  if(!defenders.length){ 
    target.owner = fleet.owner; 
    onCapture(target, fleet.owner); 
    
    if (fleet.task?.type === 'zone_sweep' && fleet.owner === 'player') {
       target.garrison = []; // 清空后立刻推进
       smartSplitAndAttack(target, alive, fleet.task.zoneId);
    } else {
       target.garrison = alive; 
    }
    return; 
  }
  
  startBattle(target, fleet, alive);
}

// 评估单艘战舰战力
function getShipPower(s) {
  if (!s || s.hp <= 0) return 0;
  return s.hp + (s.mainDmg + s.subDmg + s.missileDmg) * 5;
}

// 评估驻军整体战力
function getGarrisonPower(garrison) {
  let p = 0;
  for (let s of garrison) p += getShipPower(s);
  return p;
}

// 智能战力分兵算法
function smartSplitAndAttack(fromP, ships, zoneId) {
  if (!ships || ships.length === 0) return;
  const zone = G.zones.find(z => z.id === zoneId);
  if (!zone) {
    for(const s of ships) fromP.garrison.push(s);
    return;
  }
  
  const minX = Math.min(zone.x1, zone.x2), maxX = Math.max(zone.x1, zone.x2);
  const minY = Math.min(zone.y1, zone.y2), maxY = Math.max(zone.y1, zone.y2);
  const pad = 20 / CAM.scale;
  
  let targets = [];
  for (const p of G.planets) {
    if (p.owner === 'player') continue;
    if (p.x >= minX - pad && p.x <= maxX + pad && p.y >= minY - pad && p.y <= maxY + pad) targets.push(p);
  }
  
  if (targets.length === 0) {
    toast(`🎯 ${zone.name} 扫荡完毕`);
    addLog(`🎯 ${zone.name} 扫荡完毕`, 'win');
    for(const s of ships) fromP.garrison.push(s);
    return;
  }
  
  targets.sort((a,b) => Math.hypot(a.x - fromP.x, a.y - fromP.y) - Math.hypot(b.x - fromP.x, b.y - fromP.y));
  
  // ★ 限制最大分兵路线，且不能超过剩余兵力
  const maxRoutes = Math.min(G.maxSweepRoutes || 3, targets.length, ships.length);
  targets = targets.slice(0, maxRoutes);
  
  let totalTargetPower = 0;
  for (const t of targets) {
    t._tempPower = getGarrisonPower(t.garrison) + (t.level * 100);
    totalTargetPower += t._tempPower;
  }
  
  let remainingShips = [...ships];
  
  for (let i = 0; i < targets.length; i++) {
    if (remainingShips.length === 0) break;
    
    const t = targets[i];
    let count = 0;
    
    if (i === targets.length - 1) {
      count = remainingShips.length; 
    } else {
      let ratio = t._tempPower / totalTargetPower;
      // 保证至少 1 艘，且留足给后续目标的兵力
      count = Math.max(1, Math.floor(ships.length * ratio));
      count = Math.min(count, remainingShips.length - (targets.length - 1 - i));
    }
    
    const squad = remainingShips.splice(0, count);
    if (squad.length > 0) {
      launchFleet('player', squad, fromP.id, t.id, 'attack', { type: 'zone_sweep', zoneId: zoneId });
    }
  }
  
  if (targets.length > 1) addLog(`🚀 舰队在 ${fromP.name} 自动分兵 ${targets.length} 路推进`, 'info');
}