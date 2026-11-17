/* =========================================================
   04-ships.js — 实体工厂与派系初始化
   ========================================================= */

function createPlayerShip(designId, commanderId = null, owner = MY_ID){
  const d=G.designs.find(x=>x.id===designId); if(!d) return null;
  const st=designStats(d.mods,d.hullTier,d.shipClass), n=G.nextUid++;
  return { uid:'s'+n, owner:owner, designId:d.id, name:d.name+'-'+String(n).padStart(3,'0'), tier:d.hullTier, shipClass:d.shipClass, groupId:null, column:0, squadron:[],
    commanderId: commanderId,
    maxHp:st.hp, hp:st.hp, maxShd:st.shd, shd:st.shd, maxEnergy:100+(st.regen||0)*5, energy:100+(st.regen||0)*5, baseSpd:st.spd, eva:st.eva,
    mainDmg:st.mainDmg, mainCharge:st.mainCharge, subDmg:st.subDmg, subCharge:st.subCharge, missileDmg:st.missileDmg, missileCharge:st.missileCharge,
    aaDmg:st.aaDmg, aaCharge:st.aaCharge, totalDmg:st.totalDmg, repairAmount:st.repairAmount, repairCd:st.repairCd, hangarSlots:st.hangarSlots||0,
    fleetDmg:st.fleetDmg, fleetEva:st.fleetEva, _rcd:0, _chMain:0, _chSub:0, _chMissile:0, _chAa:0, isEnemy:false };
}

function createEnemyShipFromDesign(design, owner){
  const hull=HULLS[design.hull]||HULLS[1], cls=SHIP_CLASSES[design.cls]||SHIP_CLASSES.none, bonus=cls.bonus||{};
  let hp=hull.baseHp, shd=0, spd=18, eva=0, mainDmg=0, subDmg=0, missileDmg=0, aaDmg=0, mainCharge=1.5, subCharge=1.0, missileCharge=2.5, aaCharge=1.5;
  for(const slot of ['main','sub','armor','engine','reactor','missile','aa']){
    const sel=design.mods[slot]; if(!sel) continue; const tier=sel.t, size=sel.s||'medium';
    if(slot==='main'){ const m=mkWeapon(sel.w||'midCharge',tier,size); mainDmg=m.dmg; mainCharge=m.charge; }
    else if(slot==='sub'){ const m=mkWeapon(sel.w||'lightCharge',tier,size); subDmg=m.dmg; subCharge=m.charge; }
    else if(slot==='missile'){ const m=mkWeapon(sel.w||'missileMid',tier,size); missileDmg=m.dmg; missileCharge=m.charge; }
    else if(slot==='aa'){ const m=mkWeapon(sel.w||'aaMissile',tier,size); aaDmg=m.dmg; aaCharge=m.charge; }
    else if(slot==='armor'){ const m=mkArmor(tier,size); hp+=m.hp; shd+=m.shd; }
    else if(slot==='engine'){ const m=mkEngine(tier,size); spd+=m.spd; eva+=m.eva; }
  }
  hp=Math.round(hp*(1+(bonus.hp||0))); spd=Math.round(spd*(1+(bonus.spd||0))); eva=Math.round(eva+(bonus.eva||0)*100);
  const dmgMul=1+(bonus.dmg||0), missileMul=1+(bonus.missileDmg||0), aaMul=1+(bonus.aaDmg||0), n=G.nextUid++;
const isSuper = G.factions[owner]?.isSuperPower;
  if (isSuper) {
    hp = Math.round(hp * 3.0);       // 血量翻 3 倍
    mainDmg = Math.round(mainDmg * 2.0); // 伤害翻倍
    subDmg = Math.round(subDmg * 2.0);
    missileDmg = Math.round(missileDmg * 2.0);
    aaDmg = Math.round(aaDmg * 2.0);
    eva = eva + 20;                  // 增加 20% 闪避
  }
  if(mainDmg) mainDmg=Math.round(mainDmg*dmgMul);
  return { uid:'e'+n, owner, name:design.name, column:0, squadron:[], maxHp:hp, hp, maxShd:shd, shd, maxEnergy:100, energy:100, baseSpd:spd, eva,
    mainDmg:Math.round(mainDmg*dmgMul), mainCharge, subDmg:Math.round(subDmg*dmgMul), subCharge, missileDmg:Math.round(missileDmg*missileMul), missileCharge,
    aaDmg:Math.round(aaDmg*aaMul), aaCharge, totalDmg:mainDmg+subDmg+missileDmg, repairAmount:0, repairCd:0, hangarSlots:0, fleetDmg:bonus.fleetDmg||0, fleetEva:bonus.fleetEva||0,
    _rcd:0, _chMain:0, _chSub:0, _chMissile:0, _chAa:0, isEnemy:true };
}

function createPlaneInstance(designId){
  const d=G.planeDesigns.find(x=>x.id===designId); if(!d) return null;
  const st=planeStats(d), n=G.nextPlaneId++;
  return { uid:'p'+n, designId:d.id, name:d.name+'-'+String(n).padStart(3,'0'), type:d.type, tier:d.tier||1, maxHp:st.hp, hp:st.hp, maxShd:st.shd, shd:st.shd,
    dmg:st.dmg, aaDmg:st.aaDmg, charge:st.weapon?st.weapon.charge:1.5, hit:st.weapon?st.weapon.hit:'normal', spd:st.spd, eva:st.eva, row:0, _ch:0 };
}

function initFactions(numAI, humanIds){
  const humans = (humanIds && humanIds.length) ? humanIds : [MY_ID];
  G.factions={};
  G.aiTimers={}; G.aiWaves={};
  humans.forEach((id, i)=>{
    G.factions[id]={ name: i===0 ? G.nationName : ('玩家'+(i+1)), color: HUMAN_COLORS[HUMAN_IDS.indexOf(id)] || PLAYER_COLOR, isPlayer:true };
  });
  for(let i=0;i<numAI;i++){
    const key='ai'+(i+1);
    G.factions[key]={ name:AI_NAMES[i%AI_NAMES.length], color:AI_COLORS[i%AI_COLORS.length], isPlayer:false, designs:makeAIDesignPool() };
    G.aiTimers[key]=18+i*3; G.aiWaves[key]=0;
  }
}

function placeFactions(numAI){
  const outer=G.planets.filter(p=>p.level===1), home=outer[Math.floor(rng()*outer.length)];
  home.owner=MY_ID; home.facilities=['dock','repair']; G.playerHomeId=home.id;
  G.playerHomes=G.playerHomes||{}; G.playerHomes[MY_ID]=home.id;
  invalidatePlayerPlanets();
  const used=new Set([home.id]), MIN_D=130;
  for(let i=0;i<numAI;i++){
    const key='ai'+(i+1);
    let candidates=G.planets.filter(p=>{
      if(used.has(p.id)||p.owner) return false;
      const d=Math.hypot(p.x-home.x,p.y-home.y); if(d<250||d>2400) return false;
      for(const u of used){ const up=G.planets[u]; if(up&&Math.hypot(p.x-up.x,p.y-up.y)<MIN_D) return false; }
      return true;
    });
    if(!candidates.length) candidates=G.planets.filter(p=>!used.has(p.id)&&!p.owner);
    if(!candidates.length) continue;
    const pick=candidates[Math.floor(rng()*candidates.length)]; used.add(pick.id); pick.owner=key;
    const pool=G.factions[key].designs;
    for(let k=0;k<2;k++){ const s=createEnemyShipFromDesign(pool[0],key); s.column=Math.floor(rng()*3); pick.garrison.push(s); }
  }
  for(let k=0;k<2;k++) home.garrison.push(createPlayerShip('d0'));
}

function findPlayerShipByUid(uid){ for(const p of G.planets){ const s=p.garrison.find(x=>x.uid===uid); if(s) return s; } return null; }
function getAllPlayerShipsByGroup(gid){ const out=[]; for(const p of G.planets){ for(const s of p.garrison){ if(isMe(s.owner)&&s.groupId===gid&&s.hp>0) out.push(s); } } return out; }