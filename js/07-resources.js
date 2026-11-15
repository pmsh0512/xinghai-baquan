/* =========================================================
   07-resources.js — 资源、建造与解锁
   ========================================================= */

function hasMaterial(cost){ if(!cost) return true; return (G.materials[cost.mat]||0)>=cost.n; }
function payMaterial(cost){ if(!cost) return; G.materials[cost.mat]-=cost.n; }

function startBuild(designId, regionId, count = 1){
  const d = G.designs.find(x => x.id === designId); if(!d) return false;
  const st = designStats(d.mods, d.hullTier, d.shipClass); if(st.size > st.space) return false;
  
  const totalCost = st.cost * count;
  const totalEnergy = st.energyCost * count;
  
  if(G.alloy < totalCost || G.energy < totalEnergy) return false;
  
  const hull = HULLS[d.hullTier]; 
  if (hull.matCost && (G.materials[hull.matCost.mat] || 0) < hull.matCost.n * count) return false;
  
  G.alloy -= totalCost; 
  G.energy -= totalEnergy; 
  if (hull.matCost) G.materials[hull.matCost.mat] -= hull.matCost.n * count;
  
  for (let i = 0; i < count; i++) {
    G.buildQueue.push({ 
      id: uid('q'), designId: d.id, designName: d.name, regionId, 
      progress: 0, duration: 8 + st.cost * 0.015 
    });
  }
  
  addLog(`🏭 开始建造 ${d.name} × ${count}`, 'info'); 
  markDirty(); return true;
}

function cancelBuild(qId) {
  const idx = G.buildQueue.findIndex(q => q.id === qId);
  if(idx !== -1) {
    const q = G.buildQueue[idx];
    G.buildQueue.splice(idx, 1);
    addLog(`🛑 取消建造 ${q.designName}`, 'info');
    markDirty();
  }
}

function tickBuilds(dt){
  for(let i=G.buildQueue.length-1;i>=0;i--){ const q=G.buildQueue[i], region=G.planets[q.regionId]; if(!region){ G.buildQueue.splice(i,1); continue; }
    const speedMul=1+(region.facilities.includes('dock')?0.4:0); q.progress+=dt*speedMul/q.duration;
    if(q.progress>=1){ const ship=createPlayerShip(q.designId); if(ship) region.garrison.push(ship); G.buildQueue.splice(i,1); markRightDirty(); }
  }
}

function regionOutput(region){
  const lvMul=1+0.6*(region.level-1); let a=(4+region.level*2)*lvMul, e=(3+region.level*1.5)*lvMul;
  if(region.facilities.includes('mine')) a*=1.5; if(region.facilities.includes('plant')) e*=1.5; return {alloy:a,energy:e};
}

function regionMatOutput(region){ if(region.level<3) return 0; const lvMul=1+0.4*(region.level-1); let rate=Math.max(0.1,(region.level-2)*0.35)*lvMul; if(region.facilities.includes('lab')) rate*=1.6; return rate; }

function totalOutput(){ let a=0,e=0; for(const p of getPlayerPlanets()){ const o=regionOutput(p); a+=o.alloy; e+=o.energy; } return {alloy:a,energy:e}; }

function upgradeCost(region){ const lv=region.level; return { alloy:Math.floor(200*Math.pow(1.85,lv-1)), energy:Math.floor(140*Math.pow(1.85,lv-1)) }; }

function upgradeRegion(id){
  const r=G.planets[id]; if(!r||r.owner!=='player') return false; if(r.level>=7) return false;
  const c=upgradeCost(r); if(G.alloy<c.alloy||G.energy<c.energy) return false;
  G.alloy-=c.alloy; G.energy-=c.energy; r.level++; addLog(`⬆ ${r.name} 升级至 Lv.${r.level}`,'info'); markDirty(); return true;
}

function facilityCost(region,type){ const def=FACILITIES[type], count=region.facilities.filter(f=>f===type).length; return { alloy:Math.floor(def.base.alloy*Math.pow(def.growth,count)), energy:Math.floor(def.base.energy*Math.pow(def.growth,count)) }; }

function maxFacilitySlots(region){ const n=region.level; let base=Math.max(1,Math.floor(1+Math.pow(2,n/2-1))); if(region.id===G.playerHomeId) base=Math.max(base,region.facilities.length); return base; }

function buildFacility(id,type){
  const r=G.planets[id]; if(!r||r.owner!=='player') return false; if(!FACILITIES[type]) return false;
  if(r.facilities.length>=maxFacilitySlots(r)) return false; const c=facilityCost(r,type);
  if(G.alloy<c.alloy||G.energy<c.energy) return false;
  G.alloy-=c.alloy; G.energy-=c.energy; r.facilities.push(type); addLog(`🏗 ${r.name} 建成 ${FACILITIES[type].name}`,'info'); markDirty(); return true;
}

function unlockHull(tier){
  if(G.hullUnlocked[tier]) return {ok:false,reason:'已解锁'}; const h=HULLS[tier]; if(!h.unlock) return {ok:false,reason:'无法解锁'};
  const need=h.unlock.cost, have=G.materials[h.unlock.mat]||0; if(have<need) return {ok:false,reason:`需要 ${MAT_NAMES[h.unlock.mat]} × ${need}`};
  G.materials[h.unlock.mat]-=need; G.hullUnlocked[tier]=true; addLog(`✨ 解锁 ${h.name}`,'win'); markDirty(); return {ok:true};
}

function unlockPlaneHull(tier){
  if(G.planeHullUnlocked[tier]) return {ok:false,reason:'已解锁'}; const h=PLANE_HULLS[tier]; if(!h.unlock) return {ok:false,reason:'无法解锁'};
  const need=h.unlock.cost, have=G.materials[h.unlock.mat]||0; if(have<need) return {ok:false,reason:`需要 ${MAT_NAMES[h.unlock.mat]} × ${need}`};
  G.materials[h.unlock.mat]-=need; G.planeHullUnlocked[tier]=true; addLog(`✨ 解锁 ${h.name}`,'win'); markDirty(); return {ok:true};
}