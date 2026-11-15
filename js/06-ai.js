/* =========================================================
   06-ai.js — AI 策略、迷雾、近防炮
   ========================================================= */

function tickAI(dt){
  for(const key in G.factions){
    if(key==='player') continue; 
    G.aiTimers[key]-=dt; if(G.aiTimers[key]>0) continue;
    
    // 刷兵频率降低：初始 30 秒，最快 18 秒
    const isSuper = G.factions[key].isSuperPower;
    G.aiTimers[key] = isSuper ? 0.5 : Math.max(10, 20 - G.aiWaves[key]*0.1);
    G.aiWaves[key]++; 
    const wave=G.aiWaves[key];
    
    if(wave>0 && wave%10===0 && G.factions[key].designs){ 
      const newDesign=aiDesignShip(wave); 
      if(newDesign) G.factions[key].designs.push(newDesign); 
    }
    
    const myPlanets=G.planets.filter(p=>p.owner===key); 
    if(!myPlanets.length) continue;
    if (myPlanets.length >= 1 && !G.factions[key].isSuperPower) {
      G.factions[key].isSuperPower = true;
      addLog(`🔥 警告：${G.factions[key].name} 已觉醒终局霸权，开始全面暴兵！`, 'lose');
      toast(`🔥 警告：${G.factions[key].name} 已觉醒！`);
    }
    let home = myPlanets[0];
    let maxD = -1;
    for(const p of myPlanets) {
      const d = Math.hypot(p.x, p.y);
      if (d > maxD) { maxD = d; home = p; }
    }
    
    let bestTarget = null, bestD = Infinity;
    for(const p of G.planets) {
      if(p.owner === key) continue;
      const d = Math.hypot(p.x - home.x, p.y - home.y);
      if(d < bestD) { bestD = d; bestTarget = p; }
    }
    if(!bestTarget) continue;

    const pool = G.factions[key].designs || makeAIDesignPool();
    const maxHull = isSuper ? 10 : Math.min(7, 1 + Math.floor(wave / 8)); 
    const fleetShips = [];
    
    // 核心主力（最多 1 艘）
    const highTier = pool.filter(d => d.hull >= 5 && d.hull <= maxHull);
    if(highTier.length && Math.random() < 0.4) { 
      fleetShips.push(createEnemyShipFromDesign(highTier[Math.floor(Math.random()*highTier.length)], key));
    }
    
    // 中坚力量（基础 1 艘，每 5 波加 1 艘，最多 4 艘）
    const midTier = pool.filter(d => d.hull >= 3 && d.hull <= 4);
    const midCount = Math.min(10, Math.floor(wave / 8) + 1);
    for(let i=0; i<midCount; i++) {
      if(midTier.length) fleetShips.push(createEnemyShipFromDesign(midTier[Math.floor(Math.random()*midTier.length)], key));
    }
    
    // 护卫炮灰（基础 2 艘，每 4 波加 1 艘，最多 6 艘）
    const lowTier = pool.filter(d => d.hull <= 2);
    const lowCount = Math.min(20, 2 + Math.floor(wave / 4));
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
    
    // ★ 给 AI 赋予均衡推进
    launchFleet(key, fleetShips, home.id, bestTarget.id, 'attack', { type: 'balanced_attack' });
    addLog(`⚠ ${G.factions[key].name} 向 ${bestTarget.name} 进发（${fleetShips.length} 艘）`, 'lose');
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