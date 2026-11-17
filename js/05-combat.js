/* =========================================================
   05-combat.js — 战斗与舰队逻辑
   ========================================================= */

const BATTLE_TICK = 0.1;
const BATTLE_MAX_TIME = 60;

function startBattle(region, attackerFleet, attackerShips){
  const defenders=region.garrison.filter(s=>s.hp>0);
  if(!defenders.length){ region.garrison=attackerShips; region.owner=attackerFleet.owner; onCapture(region,attackerFleet.owner); return; }
  const defOwner=defenders[0].owner;
  for(const s of [...attackerShips,...defenders]) initCombatState(s);
  
  const atkPlanes=[], defPlanes=[];
  for(const s of attackerShips){ if(s.squadron&&s.squadron.length){ for(const p of s.squadron){ atkPlanes.push({...p,owner:attackerFleet.owner,_carrierUid:s.uid,hp:p.hp,shd:p.shd,_ch:0}); } } }
  for(const s of defenders){ if(s.squadron&&s.squadron.length){ for(const p of s.squadron){ defPlanes.push({...p,owner:defOwner,_carrierUid:s.uid,hp:p.hp,shd:p.shd,_ch:0}); } } }
  
  const battle={ id:uid('b'), regionId:region.id, attackerOwner:attackerFleet.owner, defenderOwner:defOwner, attacker:attackerShips, defender:defenders, atkPlanes, defPlanes, time:0, tickTimer:0, log:[], over:false, outcome:null, fromRegionId:attackerFleet.fromRegionId, task: attackerFleet.task };
  region.battle=battle; G.battles.push(battle);
  battle.log.push({r:0,text:`${G.factions[attackerFleet.owner]?.name} 进攻 ${region.name}`,type:'sys'});
  if(isMe(attackerFleet.owner)) addLog(`⚔ 进攻 ${region.name}`,'fight');
}

function initCombatState(s){ s._chMain=0; s._chSub=0; s._chMissile=0; s._chAa=0; s._rcd=0; }

function tickBattles(dt){
  for(const b of G.battles){ if(b.over) continue; b.tickTimer+=dt; while(b.tickTimer>=BATTLE_TICK){ b.tickTimer-=BATTLE_TICK; battleStep(b,BATTLE_TICK); } }
  for(let i=G.battles.length-1;i>=0;i--){ const b=G.battles[i]; if(b.over&&b._endTime&&Date.now()-b._endTime>5000) G.battles.splice(i,1); }
}

function battleStep(b,dt){
  b.time+=dt; const atkAlive=b.attacker.filter(s=>s.hp>0), defAlive=b.defender.filter(s=>s.hp>0);
  if(!atkAlive.length||!defAlive.length){ endBattle(b); return; } if(b.time>=BATTLE_MAX_TIME){ endBattle(b,'timeout'); return; }
  const atkBonus=calcFleetBonus(atkAlive), defBonus=calcFleetBonus(defAlive);
  tickAirCombat(b,dt); tickAAvsPlanes(b,dt); checkCarrierLoss(b);
  const atkDmg=collectSideDamage(atkAlive,defAlive,defBonus,dt), defDmg=collectSideDamage(defAlive,atkAlive,atkBonus,dt);
  applySideDamage(defAlive,atkDmg,b,'atk'); applySideDamage(atkAlive,defDmg,b,'def');
  tickRepair(b,dt); if(!b.attacker.some(s=>s.hp>0)||!b.defender.some(s=>s.hp>0)) endBattle(b);
}

function calcFleetBonus(ships){
  let dmg=0, eva=0;
  for(const s of ships){
    if(s.fleetDmg) dmg+=s.fleetDmg; if(s.fleetEva) eva+=s.fleetEva;
    if(s.commanderId) {
      const c = G.commanders.find(x => x.id === s.commanderId);
      if(c) {
        const levelMul = 1 + (c.level - 1) * 0.025;
        dmg += (c.atkBonus * 0.025) * levelMul;
        eva += (c.defBonus * 0.025) * levelMul;
      }
    }
  }
  return { dmg:clamp(dmg,0,0.6), eva:clamp(eva,0,0.5) };
}

function tickAirCombat(b,dt){ const atkP=b.atkPlanes.filter(p=>p.hp>0), defP=b.defPlanes.filter(p=>p.hp>0); for(const p of atkP) planeFire(b,p,defP,atkP,b.defender); for(const p of defP) planeFire(b,p,atkP,defP,b.attacker); }
function planeFire(b,plane,enemyPlanes,allyPlanes,enemyShips){
  if(plane.hp<=0) return; plane._ch+=BATTLE_TICK; if(plane._ch<plane.charge) return; plane._ch-=plane.charge;
  let targets=[]; if(plane.row===0){ const frontRow=enemyPlanes.filter(p=>p.hp>0&&p.row===0); if(frontRow.length) targets=frontRow; else { const backRow=enemyPlanes.filter(p=>p.hp>0&&p.row===1); if(backRow.length) targets=backRow; else targets=enemyShips.filter(s=>s.hp>0); } }
  else { targets=enemyShips.filter(s=>s.hp>0); if(!targets.length) targets=enemyPlanes.filter(p=>p.hp>0); }
  if(!targets.length) return; const target=targets[Math.floor(rng()*targets.length)];
  let hit=true; if(plane.hit!=='always'){ const eva=(target.eva||0)/100; if(rng()<eva) hit=false; } if(!hit) return;
  let dmg=plane.dmg||0; if(target._carrierUid) dmg=plane.aaDmg||plane.dmg||0;
  applyDamage(target,dmg); if(target.hp<=0){ target.hp=0; b.log.push({r:Math.floor(b.time*10)/10,text:`${plane.name} 击毁 ${target.name}`,type:plane.owner===b.attackerOwner?'atk':'def'}); }
}
function applyDamage(target,dmg){ let d=dmg; if(target.shd>0){ const abs=Math.min(target.shd,d); target.shd-=abs; d-=abs; } if(d>0) target.hp-=d; }
function tickAAvsPlanes(b,dt){
  const allShips=[...b.attacker,...b.defender];
  for(const s of allShips){ if(s.hp<=0||!s.aaDmg) continue; s._chAa+=dt; if(s._chAa<(s.aaCharge||1)) continue; s._chAa-=(s.aaCharge||1);
    const isAtk=b.attacker.includes(s), enemyPlanes=isAtk?b.defPlanes.filter(p=>p.hp>0):b.atkPlanes.filter(p=>p.hp>0);
    if(!enemyPlanes.length) continue; const target=enemyPlanes[Math.floor(rng()*enemyPlanes.length)];
    const evadeChance=clamp((target.eva||0)/100,0,0.5); if(rng()<evadeChance) continue;
    const killChance=clamp(s.aaDmg/(target.maxHp+1),0.15,0.9);
    if(rng()<killChance){ target.hp=0; b.log.push({r:Math.floor(b.time*10)/10,text:`📡 ${s.name} 击落 ${target.name}`,type:isAtk?'atk':'def'}); } else applyDamage(target,s.aaDmg*0.5);
  }
}
function checkCarrierLoss(b){
  for(const s of [...b.attacker,...b.defender]){ if(s.hp>0) continue;
    if(!s._carrierPlanes){ const planes=s.owner===b.attackerOwner?b.atkPlanes.filter(p=>p._carrierUid===s.uid&&p.hp>0):b.defPlanes.filter(p=>p._carrierUid===s.uid&&p.hp>0); s._carrierPlanes=planes; }
    if(s._carrierPlanes&&s._carrierPlanes.length){ const isAtk=b.attacker.includes(s), enemySide=isAtk?b.defender:b.attacker, enemyAlive=enemySide.filter(x=>x.hp>0);
      for(const p of s._carrierPlanes){ if(p.hp<=0) continue; p.hp=0; if(!enemyAlive.length) break; const target=enemyAlive[Math.floor(rng()*enemyAlive.length)];
        if(rng()<0.75){ applyDamage(target,p.dmg*2||20); b.log.push({r:Math.floor(b.time*10)/10,text:`💥 ${p.name} 自爆命中 ${target.name}`,type:isAtk?'atk':'def'}); } else { b.log.push({r:Math.floor(b.time*10)/10,text:`💥 ${p.name} 自爆失误`,type:isAtk?'atk':'def'}); }
      } s._carrierPlanes=[]; }
  }
}
function collectSideDamage(attackers,targets,targetBonus,dt){
  const result=new Map(); let frontCol=Infinity;
  for(const s of targets){ if(s.hp<=0) continue; if((s.column||0)<frontCol) frontCol=s.column||0; }
  if(frontCol===Infinity) return result; const frontTargets=targets.filter(s=>s.hp>0&&(s.column||0)===frontCol); if(!frontTargets.length) return result;
  const addDmg=(target,dmg)=>{ if(!target||target.hp<=0) return; result.set(target.uid,(result.get(target.uid)||0)+dmg); };
  for(const ship of attackers){ if(ship.hp<=0) continue;
    if(ship.mainDmg>0){ ship._chMain+=dt; if(ship._chMain>=ship.mainCharge){ ship._chMain-=ship.mainCharge; const target=frontTargets[Math.floor(rng()*frontTargets.length)]; if(target&&rng()<hitChance(ship,target,targetBonus)) addDmg(target,ship.mainDmg); } }
    if(ship.subDmg>0){ ship._chSub+=dt; if(ship._chSub>=ship.subCharge){ ship._chSub-=ship.subCharge; const target=frontTargets[Math.floor(rng()*frontTargets.length)]; if(target&&rng()<hitChance(ship,target,targetBonus)) addDmg(target,ship.subDmg); } }
    if(ship.missileDmg>0){ ship._chMissile+=dt; if(ship._chMissile>=ship.missileCharge){ ship._chMissile-=ship.missileCharge; const target=frontTargets[Math.floor(rng()*frontTargets.length)]; if(target) addDmg(target,ship.missileDmg); } }
  }
  return result;
}
function hitChance(ship,target,targetBonus){ const baseEva=(target.eva||0)+(targetBonus?.eva||0)*100, spdEva=Math.min(40,(target.baseSpd||0)*0.1); const total=clamp(baseEva+spdEva,0,60); return clamp(1-total/100,0.4,0.95); }

// ★ 性能优化：将目标数组转为 Map，O(1) 查找
function applySideDamage(targets,dmgMap,b,side){
  const targetMap = new Map();
  for (const t of targets) targetMap.set(t.uid, t);

  for(const [uid2,dmg0] of dmgMap){ 
    const t = targetMap.get(uid2); 
    if(!t||t.hp<=0) continue; 
    let dmg=dmg0;
    if(t.shd>0){ const abs=Math.min(t.shd,dmg); t.shd-=abs; dmg-=abs; }
    if(dmg>0){ t.hp-=dmg; if(t.hp<=0){ t.hp=0; b.log.push({r:Math.floor(b.time*10)/10,text:`${t.name} 被击毁`,type:side==='atk'?'atk':'def'}); } }
  }
}
function tickRepair(b,dt){
  const sides=[b.attacker,b.defender];
  for(const list of sides){ for(const s of list){ if(s.hp<=0||!s.repairAmount) continue; s._rcd-=dt; if(s._rcd>0) continue;
    let target=null,worst=1; for(const f of list){ if(f.hp<=0) continue; const pct=f.hp/f.maxHp; if(pct<worst&&pct<0.99){ worst=pct; target=f; } }
    if(!target) continue; const heal=Math.min(s.repairAmount,target.maxHp-target.hp); if(heal<=0) continue; target.hp+=heal; s._rcd=s.repairCd||5;
  } }
}
function endBattle(b,reason){
  if(b.over) return; b.over=true; b._endTime=Date.now();
  const atkAlive=b.attacker.filter(s=>s.hp>0), defAlive=b.defender.filter(s=>s.hp>0), region=G.planets[b.regionId];
  if(reason==='timeout') b.outcome='draw'; 
  else if(!atkAlive.length&&!defAlive.length) b.outcome='mutual'; 
  else if(!atkAlive.length) b.outcome='defender'; 
  else if(!defAlive.length) b.outcome='attacker';
  
  for(const s of atkAlive){ if(s.squadron){ s.squadron=s.squadron.map(p=>{ const inst=b.atkPlanes.find(x=>x.designId===p.designId&&x._carrierUid===s.uid); if(inst) return {...p,hp:inst.hp,shd:inst.shd,_ch:0}; return p; }).filter(p=>p.hp>0); } }
  for(const s of defAlive){ if(s.squadron){ s.squadron=s.squadron.map(p=>{ const inst=b.defPlanes.find(x=>x.designId===p.designId&&x._carrierUid===s.uid); if(inst) return {...p,hp:inst.hp,shd:inst.shd,_ch:0}; return p; }).filter(p=>p.hp>0); } }
  for(const s of [...b.attacker,...b.defender]){ if(s.hp<=0&&s.squadron&&s.squadron.length){ for(const p of s.squadron){ G.hangar[p.designId]=(G.hangar[p.designId]||0)+1; } s.squadron=[]; } }
  
      if(b.outcome==='attacker'){
    region.owner = b.attackerOwner; 
    onCapture(region, b.attackerOwner);
    
    let moved = false;
    if (isHuman(b.attackerOwner) && b.task?.type === 'zone_sweep' && atkAlive.length) {
      if (typeof smartSplitAndAttack === 'function') {
        region.garrison = []; 
        smartSplitAndAttack(region, atkAlive, b.task.zoneId); 
        moved = true;
      }
    } 
    else if (b.task?.type === 'balanced_attack' && atkAlive.length) {
      let best = null, bestD = Infinity;
      for(const p of G.planets) {
        if (p.owner === b.attackerOwner || p.id === region.id) continue;
        const d = Math.hypot(p.x - region.x, p.y - region.y);
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best) {
        launchFleet(b.attackerOwner, atkAlive, region.id, best.id, 'attack', b.task);
        region.garrison = [];
        moved = true;
      }
    } 
    
    if (!moved) region.garrison = atkAlive;
    
  } else if(b.outcome==='defender'||b.outcome==='draw'){
    region.garrison=defAlive;
    if(b.outcome==='draw'&&atkAlive.length){ const from=G.planets[b.fromRegionId]; if(from) for(const s of atkAlive) from.garrison.push(s); }
  } else if(b.outcome==='mutual'){ 
    region.garrison=[]; region.owner=null; region.flash=1.2; 
  }
  
  region.battle=null; b.cleanup=true; invalidatePlayerPlanets(); markDirty();
}

function onCapture(region,owner){ region.flash=1.2; invalidatePlayerPlanets(); if(isMe(owner)) addLog(`★ 占领 ${region.name} (Lv${region.level})`,'win'); markDirty(); }
