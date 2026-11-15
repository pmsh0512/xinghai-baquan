/* =========================================================
   06-ai.js — AI 策略、迷雾、近防炮
   ========================================================= */

function tickAI(dt){
  for(const key in G.factions){
    if(key==='player') continue; 
    G.aiTimers[key]-=dt; if(G.aiTimers[key]>0) continue;
    
    // 刷兵频率
    const isSuper = G.factions[key].isSuperPower;
    G.aiTimers[key] = isSuper ? Math.max(8, 15 - G.aiWaves[key]*0.1) : Math.max(30, 45 - G.aiWaves[key]*0.5);
    G.aiWaves[key]++; 
    const wave=G.aiWaves[key];
    
    if(wave>0 && wave%10===0 && G.factions[key].designs){ 
      const newDesign=aiDesignShip(wave); 
      if(newDesign) G.factions[key].designs.push(newDesign); 
    }
    
    const myPlanets=G.planets.filter(p=>p.owner===key); 
    if(!myPlanets.length) continue;
    
    // 天灾觉醒判定
    if (myPlanets.length >= 100 && !G.factions[key].isSuperPower) {
      G.factions[key].isSuperPower = true;
      addLog(`🔥 警告：${G.factions[key].name} 发现了希特勒裸照！`, 'lose');
      toast(`🔥 警告：${G.factions[key].name} 发掘远古遗迹！`);
    }

    // 选择母星（离中心最远的己方星作为大本营）
    let home = myPlanets[0];
    let maxD = -1;
    for(const p of myPlanets) {
      const d = Math.hypot(p.x, p.y);
      if (d > maxD) { maxD = d; home = p; }
    }
    
    let bestTarget = null, bestD = Infinity;
    let priorityPlayerTarget = null, priorityD = Infinity;

    // 天灾觉醒后视野扩大，正常情况视野有限
    const visionRange = isSuper ? 2000 : 1200;

    for(const p of G.planets) {
      if(p.owner === key) continue;
      const d = Math.hypot(p.x - home.x, p.y - home.y);

      // ★ 核心逻辑：优先攻击视野内的玩家
      if (p.owner === 'player') {
        let inVision = false;
        // 扫描该玩家星球是否在 AI 任意星球的视野范围内
        for (const myP of myPlanets) {
          if (Math.hypot(p.x - myP.x, p.y - myP.y) < visionRange) { 
            inVision = true; 
            break; 
          }
        }
        if (inVision && d < priorityD) {
          priorityD = d;
          priorityPlayerTarget = p;
        }
      }

      // 常规寻找最近目标（如果玩家不在视野内，就会打这个）
      if(d < bestD) { 
        bestD = d; 
        bestTarget = p; 
      }
    }

    // ★ 如果发现了视野内的玩家，立刻无视中立星球，全军集火玩家
    if (priorityPlayerTarget) {
      bestTarget = priorityPlayerTarget;
    }
    if(!bestTarget) continue;

    const pool = G.factions[key].designs || makeAIDesignPool();
    const maxHull = isSuper ? 7 : Math.min(7, 1 + Math.floor(wave / 8)); 
    const fleetShips = [];
    
    // 核心主力
    const highTier = pool.filter(d => d.hull >= 5 && d.hull <= maxHull);
    if(highTier.length && (isSuper || Math.random() < 0.4)) { 
      fleetShips.push(createEnemyShipFromDesign(highTier[Math.floor(Math.random()*highTier.length)], key));
    }
    
    // 中坚力量
    const midTier = pool.filter(d => d.hull >= 3 && d.hull <= 4);
    const midCount = isSuper ? 6 : Math.min(3, Math.floor(wave / 8) + 1); 
    for(let i=0; i<midCount; i++) {
      if(midTier.length) fleetShips.push(createEnemyShipFromDesign(midTier[Math.floor(Math.random()*midTier.length)], key));
    }
    
    // 护卫炮灰
    const lowTier = pool.filter(d => d.hull <= 2);
    const lowCount = isSuper ? 10 : Math.min(5, 1 + Math.floor(wave / 6)); 
    for(let i=0; i<lowCount; i++) {
      const d = lowTier.length ? lowTier[Math.floor(Math.random()*lowTier.length)] : pool[0];
      fleetShips.push(createEnemyShipFromDesign(d, key));
    }

    for(const s of fleetShips) {
      if(s.maxHp > 800) s.column = 0;
      else if(s.maxHp > 300) s.column = 1;
      else if(s.aaDmg > 0) s.column = 3;
      else s.column = 2;
    }
    
    // 攻击并推进
    launchFleet(key, fleetShips, home.id, bestTarget.id, 'attack', { type: 'balanced_attack' });
    
    // 如果打的是玩家，日志颜色变红并特别提示
    if (bestTarget.owner === 'player') {
      addLog(` ${G.factions[key].name} 发现你的母星有蒋介石裸照，正率军扑向 ${bestTarget.name}（${fleetShips.length} 艘）`, 'lose');
    } else {
      addLog(`⚠ ${G.factions[key].name} 向 ${bestTarget.name} 进发（${fleetShips.length} 艘）`, 'lose');
    }
  }
}
function updateVisibility(dt){
  for(const p of G.planets){ if(p.visibility>0) p.visibility=Math.max(0,p.visibility-dt*0.03); }
  visionTimer-=dt; if(visionTimer>0) return; visionTimer=0.2;
  const sources=[]; for(const p of getPlayerPlanets()){ let range=500; const radars=p.facilities.filter(f=>f==='radar').length; range+=radars*350; if(p.id===G.playerHomeId) range+=200; sources.push({x:p.x,y:p.y,r:range}); }
  for(const f of G.fleets){ if(f.owner!=='player') continue; sources.push({x:f.x,y:f.y,r:320}); }
  if(!sources.length) return; const b=viewBounds(), pad=900;
  for(const p of G.planets){ if(p.x<b.x1-pad||p.x>b.x2+pad||p.y<b.y1-pad||p.y>b.y2+pad) continue; if(p.visibility>=1) continue;
    for(const s of sources){ const d=Math.hypot(p.x-s.x,p.y-s.y); if(d<s.r){ p.visibility=1; break; } }
  }
}

function tickCIWS(dt){
  for(const p of getPlayerPlanets()){ const ciwsCount=p.facilities.filter(f=>f==='ciws').length; if(ciwsCount===0) continue;
    const range=180+ciwsCount*120, dps=25*ciwsCount;
    for(const f of G.fleets){ if(f.owner==='player') continue; const d=Math.hypot(f.x-p.x,f.y-p.y); if(d>range) continue;
      const ships=f.ships.filter(s=>s.hp>0); if(!ships.length) continue; let dmg=dps*dt;
      for(const s of ships){ if(dmg<=0) break; if(s.shd>0){ const abs=Math.min(s.shd,dmg); s.shd-=abs; dmg-=abs; } if(dmg>0){ const take=Math.min(s.hp,dmg); s.hp-=take; dmg-=take; if(s.hp<=0) s.hp=0; } }
    }
  }
}