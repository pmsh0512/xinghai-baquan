/* =========================================================
   03-design.js — 舰船/飞机设计计算与 AI 池
   ========================================================= */

function designStats(mods, hullTier, shipClass){
  const hull=HULLS[hullTier]||HULLS[1], cls=SHIP_CLASSES[shipClass||'none'], bonus=cls.bonus||{};
  let hp=hull.baseHp, shd=0, spd=18, eva=0, regen=0, size=0, cost=hull.hullCost;
  let mainWeapon=null, subWeapon=null, missileWeapon=null, aaWeapon=null, repairAmount=0, repairCd=0, hangarSlots=bonus.hangar||0;
  for(const slot of MOD_KEYS){
    const sel=mods[slot]; if(!sel||!sel.tier||!sel.obj) continue;
    const obj=sel.obj; size+=obj.size; cost+=obj.cost;
    if(slot==='main') mainWeapon=obj; else if(slot==='sub') subWeapon=obj; else if(slot==='missile') missileWeapon=obj; else if(slot==='aa') aaWeapon=obj;
    else if(slot==='armor'){ hp+=obj.hp||0; shd+=obj.shd||0; } else if(slot==='engine'){ spd+=obj.spd||0; eva+=obj.eva||0; }
    else if(slot==='reactor'){ regen+=obj.regen||0; } else if(slot==='repair'){ repairAmount+=obj.repairAmount||0; if(obj.repairCd&&(!repairCd||obj.repairCd<repairCd)) repairCd=obj.repairCd; }
    else if(slot==='catapult'){ hangarSlots+=obj.hangarSlots||0; }
  }
  hp=Math.round(hp*(1+(bonus.hp||0))); spd=Math.round(spd*(1+(bonus.spd||0))); eva=Math.round(eva+(bonus.eva||0)*100);
  if(repairAmount) repairAmount=Math.round(repairAmount*(1+(bonus.repair||0)));
  const dmgBonus=1+(bonus.dmg||0), missileBonus=1+(bonus.missileDmg||0), aaBonus=1+(bonus.aaDmg||0);
  const totalDmg=(mainWeapon?mainWeapon.dmg*dmgBonus:0)+(subWeapon?subWeapon.dmg*dmgBonus:0)+(missileWeapon?missileWeapon.dmg*missileBonus:0);
  return { hp, shd, spd, eva, regen, size, cost, energyCost:Math.round(cost*0.5), space:hull.space, hullTier, hull, shipClass,
    mainWeapon, subWeapon, missileWeapon, aaWeapon, mainDmg:mainWeapon?Math.round(mainWeapon.dmg*dmgBonus):0, subDmg:subWeapon?Math.round(subWeapon.dmg*dmgBonus):0,
    missileDmg:missileWeapon?Math.round(missileWeapon.dmg*missileBonus):0, aaDmg:aaWeapon?Math.round(aaWeapon.dmg*aaBonus):0,
    mainCharge:mainWeapon?mainWeapon.charge:0, subCharge:subWeapon?subWeapon.charge:0, missileCharge:missileWeapon?missileWeapon.charge:0, aaCharge:aaWeapon?aaWeapon.charge:0,
    repairAmount, repairCd, hangarSlots, totalDmg, fleetDmg:bonus.fleetDmg||0, fleetEva:bonus.fleetEva||0, eff:1
  };
}

function planeStats(design){
  const planeHull=PLANE_HULLS[design.tier||1]||PLANE_HULLS[1], type=PLANE_TYPES[design.type]||PLANE_TYPES.multirole, bonus=type.bonus||{};
  let hp=planeHull.baseHp, shd=0, spd=20, eva=5, size=0, cost=0; const weapon=design.weapons?.main||null;
  const armor=design.armor; if(armor){ size+=armor.size; cost+=armor.cost; hp+=armor.hp||0; shd+=armor.shd||0; }
  const engine=design.engine; if(engine){ size+=engine.size; cost+=engine.cost; spd+=engine.spd||0; eva+=engine.eva||0; }
  const reactor=design.reactor; if(reactor){ size+=reactor.size; cost+=reactor.cost; }
  if(weapon){ size+=weapon.size; cost+=weapon.cost; }
  hp=Math.round(hp*(1+(bonus.hp||0))); spd=Math.round(spd*(1+(bonus.spd||0))); eva=Math.round(eva+(bonus.eva||0)*100);
  const dmg=weapon?Math.round(weapon.dmg*(1+(bonus.shipDmg||0)+ (bonus.dmg||0))):0; 
  const aaDmg=weapon?Math.round(weapon.dmg*(1+(bonus.aaDmg||0)+ (bonus.dmg||0))):0;
  return { hp, shd, spd, eva, size, cost, weapon, dmg, aaDmg, type, space:planeHull.space, hull:planeHull };
}

function checkClassReq(classKey, mods, hullTier){
  const cls=SHIP_CLASSES[classKey]; if(!cls||!cls.req) return {ok:true};
  if(cls.req.weapon==='missile'&&(!mods.missile||!mods.missile.obj)) return {ok:false, reason:'导弹舰必须装配导弹'};
  if(cls.req.weapon==='aa'&&(!mods.aa||!mods.aa.obj)) return {ok:false, reason:'防空舰必须装配防空武器'};
  if(cls.req.weapon==='midCharge'){
    const main=mods.main&&mods.main.obj, sub=mods.sub&&mods.sub.obj;
    if(!(main&&['midCharge','heavyCharge','nova'].includes(main.key))&&!(sub&&sub.key==='midCharge')) return {ok:false, reason:`${cls.name}需要中型蓄力炮`};
  }
  if(cls.req.module==='catapult'&&(!mods.catapult||!mods.catapult.obj)) return {ok:false, reason:'航母必须装配弹射装置'};
  return {ok:true};
}

function getModuleList(slot, tier, size, hullTier){
  if(slot==='main'){ const allowed=['rapid','lightCharge','midCharge','heavyCharge','nova'].filter(k=>hullTier>=(WEAPON_TYPES[k].reqHull||0)); return MODULES.main[tier][size].filter(m=>allowed.includes(m.key)); }
  if(slot==='sub'){ const list=['rapid','lightCharge']; if(hullTier>=5) list.push('midCharge'); return MODULES.sub[tier][size].filter(m=>list.includes(m.key)); }
  if(slot==='missile') return MODULES.missile[tier][size]; if(slot==='aa') return MODULES.aa[tier][size];
  const m=MODULES[slot]?.[tier]?.[size]; return m?[m]:[];
}

function makeAIDesignPool(){
  return [
    {name:'巡逻艇', hull:1, cls:'escort', mods:{main:{t:1,s:'medium',w:'lightCharge'}, sub:{t:1,s:'light',w:'rapid'}, armor:{t:1,s:'medium'}, engine:{t:1,s:'medium'}, reactor:{t:1,s:'medium'}}},
    {name:'突击舰', hull:2, cls:'vanguard', mods:{main:{t:1,s:'medium',w:'lightCharge'}, sub:{t:2,s:'medium',w:'rapid'}, armor:{t:2,s:'medium'}, engine:{t:2,s:'medium'}, reactor:{t:1,s:'medium'}}},
    {name:'驱逐编队', hull:3, cls:'destroyer', mods:{main:{t:3,s:'medium',w:'midCharge'}, sub:{t:2,s:'medium',w:'lightCharge'}, armor:{t:3,s:'medium'}, engine:{t:3,s:'medium'}, reactor:{t:3,s:'medium'}}},
    {name:'导击舰', hull:3, cls:'missile', mods:{main:{t:2,s:'medium',w:'lightCharge'}, sub:{t:2,s:'medium',w:'rapid'}, armor:{t:3,s:'medium'}, engine:{t:3,s:'medium'}, reactor:{t:2,s:'medium'}, missile:{t:3,s:'medium',w:'missileMid'}}},
    {name:'巡洋舰', hull:4, cls:'cruiser', mods:{main:{t:4,s:'heavy',w:'midCharge'}, sub:{t:3,s:'medium',w:'lightCharge'}, armor:{t:4,s:'heavy'}, engine:{t:3,s:'medium'}, reactor:{t:4,s:'heavy'}}},
    {name:'战列舰', hull:5, cls:'battleship', mods:{main:{t:5,s:'heavy',w:'heavyCharge'}, sub:{t:4,s:'medium',w:'midCharge'}, armor:{t:5,s:'heavy'}, engine:{t:4,s:'medium'}, reactor:{t:5,s:'heavy'}}},
    {name:'防空舰', hull:4, cls:'aa', mods:{main:{t:3,s:'medium',w:'lightCharge'}, armor:{t:4,s:'medium'}, engine:{t:4,s:'medium'}, reactor:{t:3,s:'medium'}, aa:{t:4,s:'medium',w:'aaMissile'}}},
    {name:'泰坦', hull:6, cls:'battlecruiser', mods:{main:{t:6,s:'heavy',w:'heavyCharge'}, sub:{t:5,s:'heavy',w:'midCharge'}, armor:{t:6,s:'heavy'}, engine:{t:5,s:'heavy'}, reactor:{t:6,s:'heavy'}}},
    {name:'指挥舰', hull:5, cls:'command', mods:{main:{t:4,s:'medium',w:'midCharge'}, sub:{t:3,s:'medium',w:'lightCharge'}, armor:{t:5,s:'heavy'}, engine:{t:4,s:'medium'}, reactor:{t:4,s:'medium'}}},
  ];
}

function aiDesignShip(wave){
  const maxHull=Math.min(7,1+Math.floor(wave/4)), hull=1+Math.floor(Math.random()*maxHull);
  const classes=['escort','vanguard','destroyer','cruiser','battleship','battlecruiser','missile','aa'], cls=classes[Math.floor(Math.random()*classes.length)];
  const mods={}, mainOptions=['lightCharge']; if(hull>=3) mainOptions.push('midCharge'); if(hull>=5) mainOptions.push('heavyCharge');
  if(hull>=3&&Math.random()<0.3) mainOptions.push('nova');
  const mainWeapon=(cls==='missile'||cls==='aa')?'lightCharge':mainOptions[Math.floor(Math.random()*mainOptions.length)];
  mods.main={t:hull,s:'medium',w:mainWeapon}; if(Math.random()<0.7) mods.sub={t:Math.max(1,hull-1),s:'medium',w:'rapid'};
  mods.armor={t:hull,s:Math.random()<0.5?'medium':'heavy'}; mods.engine={t:Math.max(1,hull-1),s:'medium'}; if(Math.random()<0.8) mods.reactor={t:hull,s:'medium'};
  if(cls==='missile'){ mods.missile={t:hull,s:'medium',w:'missileMid'}; if(hull>=4&&Math.random()<0.5) mods.missile.w='missileLong'; }
  if(cls==='aa'){ mods.aa={t:hull,s:'medium',w:'aaMissile'}; if(hull>=4) mods.aa.w='aaGun'; }
  return {name:`${SHIP_CLASSES[cls].name}-${wave}`, hull, cls, mods};
}