/* =========================================================
   10-ui.js — UI 渲染与面板视图
   ========================================================= */

function isEditingInput(){
  const ae = document.activeElement; 
  if(!ae) return false;
  const tag = ae.tagName;
  if(tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return false;
  const rb = document.getElementById('rightBody'); 
  return rb && rb.contains(ae);
}

function renderTop(){
  document.getElementById('uiNation').textContent = G.nationName;
  document.getElementById('uiAlloy').textContent = Math.floor(G.alloy);
  document.getElementById('uiEnergy').textContent = Math.floor(G.energy);
  const playerList = getPlayerPlanets();
  document.getElementById('uiRegion').textContent = playerList.length + '/' + G.planets.length;
  
  const out = totalOutput();
  document.getElementById('uiAlloyRate').textContent = '+' + out.alloy.toFixed(1) + '/s';
  document.getElementById('uiEnergyRate').textContent = '+' + out.energy.toFixed(1) + '/s';
  
  const box = document.getElementById('uiMatsBox');
  let html = '<span class="i">⬢</span>'; let has = false;
  for(let i=1;i<=7;i++){
    const v = Math.floor(G.materials[i] || 0);
    const hasRate = playerList.some(p => Math.min(p.level-1, 7) === i);
    if(v > 0 || hasRate){
      html += `<span class="matv" style="background:${hexA(MAT_COLORS[i], 0.2)};color:${MAT_COLORS[i]}">${v}</span>`;
      has = true;
    }
  }
  if(!has) html += '<span style="opacity:.4;font-size:11px;margin-left:4px">—</span>';
  box.innerHTML = html;
  document.getElementById('zoomLabel').textContent = CAM.scale.toFixed(2) + '×';
}

function renderRight(){
  if(isEditingInput()) return;

  document.querySelectorAll('.tab').forEach(t=>{ t.classList.toggle('on', t.dataset.tab === G.tab); });
  
  const body = document.getElementById('rightBody');
  let html = '';
  if(attackSelect) html = viewAttackSelect();
  else if(G.tab === 'region') html = viewRegion();
  else if(G.tab === 'design') html = viewDesign();
  else if(G.tab === 'airforce') html = viewAirforce();
  else if(G.tab === 'shipyard') html = viewShipyard();
  else if(G.tab === 'fleet') html = viewFleet();
  else html = viewLog();
  
  if(body.dataset.sig !== html){ 
    const scrollTop = body.scrollTop;
    body.innerHTML = html; 
    body.dataset.sig = html; 
    body.scrollTop = scrollTop;
  }
}

function viewRegion(){
  const p = G.selected !== null ? G.planets[G.selected] : null;
  if(!p) return '<div class="empt">点击地图上的星球查看详情</div>';
  
  const fac = p.owner ? G.factions[p.owner] : null;
  const color = fac ? fac.color : NEUTRAL_COLOR;
  const isPlayer = p.owner === 'player';
  const o = regionOutput(p);
  const mr = regionMatOutput(p);
  
  let facilityLine = '';
  if(p.facilities.length){
    const counts = {};
    for(const f of p.facilities) counts[f] = (counts[f]||0)+1;
    facilityLine = Object.keys(counts).map(k=>`${FACILITIES[k]?.icon}${FACILITIES[k]?.name}×${counts[k]}`).join(' ');
  }

  let html = `<div class="panel">
    <div class="ptitle">
      <span class="pdot" style="background:${color};color:${color}"></span>
      <span class="pname">${p.name}</span>
      <span class="ptag">Lv.${p.level}</span>
    </div>
    <div class="line" style="color:${color};font-weight:700">${fac ? fac.name : '无主星球'}</div>
    <div class="line">◈ <b>+${o.alloy.toFixed(1)}/s</b> &nbsp; ⚡ <b>+${o.energy.toFixed(1)}/s</b></div>
    ${p.level >= 3 ? `<div class="line">⬢ <b style="color:${MAT_COLORS[p.level-1]}">${MAT_NAMES[p.level-1]}</b> +${mr.toFixed(2)}/s</div>` : ''}
    ${facilityLine ? `<div class="line">设施：${facilityLine}</div>` : ''}
  </div>`;

  if(p.battle){
    const b = p.battle;
    html += `<div class="panel" style="border-color:rgba(255,215,95,.5)">
      <h3>⚔ 交战中 <span class="sub">${b.time.toFixed(1)}s</span></h3>
      <div class="line">进攻：${G.factions[b.attackerOwner]?.name} · ${b.attacker.filter(s=>s.hp>0).length}/${b.attacker.length}</div>
      <div class="line">防御：${G.factions[b.defenderOwner]?.name} · ${b.defender.filter(s=>s.hp>0).length}/${b.defender.length}</div>
      <button class="btn wide gold" data-battleanim="${p.id}">🎬 查看战斗动画</button>
      <div class="logBox" style="max-height:140px;margin-top:8px">
        ${b.log.slice(-10).reverse().map(l=>`<div class="logLine ${l.type}"><span class="r">${l.r}</span>${l.text}</div>`).join('')}
      </div>
    </div>`;
  }

  const alive = p.garrison.filter(s=>s.hp>0);
  if(alive.length){
    html += `<div class="panel"><h3>驻军 <span class="sub">${alive.length} 艘</span></h3>`;
    for(const s of alive.slice(0, 15)) html += shipRowHTML(s);
    if(alive.length > 15) html += `<div class="line" style="text-align:center;opacity:.6;margin-top:4px;">……以及另外 ${alive.length - 15} 艘舰船（已折叠）</div>`;
    html += `</div>`;
  }

  if(isPlayer){
    if(p.level < 7){
      const c = upgradeCost(p);
      const can = G.alloy >= c.alloy && G.energy >= c.energy;
      html += `<div class="panel"><h3>星球升级</h3>
        <button class="btn wide ${can?'green':''}" data-upgrade="${p.id}" ${can?'':'disabled'}>
          升级至 Lv.${p.level+1} &nbsp; ◈${c.alloy} ⚡${c.energy}
        </button></div>`;
    }
    
    const slots = maxFacilitySlots(p);
    html += `<div class="panel"><h3>设施 <span class="sub">${p.facilities.length}/${slots}</span></h3>`;
    if(p.facilities.length < slots){
      for(const key in FACILITIES){
        if(key === 'lab' && p.level < 3) continue;
        const f = FACILITIES[key], c = facilityCost(p, key), can = G.alloy >= c.alloy && G.energy >= c.energy;
        html += `<button class="btn wide" data-facility="${key}" data-region="${p.id}" ${can?'':'disabled'} style="margin-top:6px;text-align:left">
          ${f.icon} ${f.name} &nbsp; <span style="opacity:.7;font-size:10px">${f.desc}</span><br>
          <span style="font-size:10px;opacity:.6">◈${c.alloy} ⚡${c.energy}</span>
        </button>`;
      }
    } else html += `<div class="line">设施已满</div>`;
    html += `</div>`;
    
    if(p.facilities.includes('dock')){
      html += `<div class="panel"><h3>造船厂</h3>
        <button class="btn wide green" data-gotab="shipyard">🏗 前往造船页面</button></div>`;
    }
    
    const hasOthers = getPlayerPlanets().some(pp => pp.id !== p.id);
    if(hasOthers){
      html += `<div class="panel"><h3>调兵</h3>
        <button class="btn wide" data-attack="${p.id}">🚀 从其他星球派兵至此</button></div>`;
    }
  } else if(!p.battle){
    const hasPlayer = getPlayerPlanets().length > 0;
    if(hasPlayer){
      html += `<div class="panel"><h3>发起进攻</h3>
        <button class="btn wide red" data-attack="${p.id}">⚔ 派兵攻打此星球</button></div>`;
    }
  }
  
  const myQueue = G.buildQueue.filter(q => q.regionId === p.id);
  if(myQueue.length){
    html += `<div class="panel"><h3>建造队列</h3>`;
    for(const q of myQueue){
      const pct = Math.round(q.progress * 100);
      html += `<div class="bqRow"><span class="bqn">${q.designName}</span><div class="bqBar"><i style="width:${pct}%"></i></div><span class="num">${pct}%</span></div>`;
    }
    html += `</div>`;
  }
  return html;
}

function shipRowHTML(s){
  const hpPct = s.hp / s.maxHp * 100, hpCls = hpPct > 60 ? '' : (hpPct > 30 ? 'w' : 'c');
  const shdPct = s.maxShd > 0 ? s.shd / s.maxShd * 100 : 0;
  const tierTag = s.tier ? `<span style="font-size:9.5px;color:#8fa8d6;padding:1px 4px;border-radius:4px;background:rgba(120,160,255,.12);margin-right:4px">T${s.tier}</span>` : '';
  const cls = s.shipClass ? SHIP_CLASSES[s.shipClass] : null;
  const clsTag = cls && cls.icon ? `<span style="font-size:9px;margin-right:3px">${cls.icon}</span>` : '';
  const colTag = `<span style="font-size:9px;color:#7fd3ff;padding:1px 4px;border-radius:3px;background:rgba(120,200,255,.12);margin-right:4px">${COL_NAMES[s.column||0]}</span>`;
  return `<div class="srow">${tierTag}${clsTag}${colTag}<span class="nm">${s.name}</span><div class="bar hp ${hpCls}"><i style="width:${hpPct}%"></i></div><div class="bar shd"><i style="width:${shdPct}%"></i></div><span class="num">${Math.ceil(s.hp)}/${s.maxHp}</span></div>`;
}

function viewFleet(){
  let html = '';
  
  html += `<div class="panel"><h3>👤 指挥官名册 <span class="sub">${G.commanders.length} 人</span></h3>`;
  html += `<div style="max-height:120px; overflow-y:auto; margin-bottom:8px;">`;
  for(const c of G.commanders) {
     let isBusy = G.fleets.some(f => f.ships.some(s => s.commanderId === c.id)) || G.planets.some(p => p.garrison.some(s => s.commanderId === c.id));
     const statusTag = isBusy ? `<span style="color:#8fa8d6; font-size:10px;">[出征中]</span>` : `<span style="color:#8bffa0; font-size:10px;">[待命]</span>`;
     html += `<div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0; border-bottom:1px dashed rgba(255,255,255,0.1);">
       <span>${c.name} <b>Lv.${c.level}</b> <span style="font-size:10px;color:#7fd3ff">攻+${c.atkBonus} 防+${c.defBonus}</span></span>
       ${statusTag}
     </div>`;
  }
  html += `</div></div>`;

  html += `<div class="panel"><h3>🗺️ 作战计划 <span class="sub">划定范围</span></h3>`;
  if (G.isDrawingZone) {
    html += `<div class="line" style="color:#ffd75f">👉 请在地图上拖拽鼠标划定矩形区域，松开结束。</div>`;
    html += `<button class="btn wide red" onclick="cancelDrawZone()">取消划线</button>`;
  } else {
    html += `<button class="btn wide gold" onclick="startDrawZone()">✏️ 在地图上划定战区</button>`;
  }
  
  if (G.zones && G.zones.length) {
    html += `<div class="modrow" style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,.05); margin-bottom:6px;">
      <span class="modlabel" style="width:90px; font-size:10px;">最大分兵路线</span>
      <input type="number" class="txt" style="width:60px; padding:4px 8px; height:26px; margin:0;" value="${G.maxSweepRoutes || 3}" onchange="setMaxSweepRoutes(this.value)">
      <span style="font-size:10px;color:#7e8fae;margin-left:8px;">路 (1-10)</span>
    </div>`;
    
    for (const z of G.zones) {
      let leftCount = 0;
      const minX = Math.min(z.x1, z.x2), maxX = Math.max(z.x1, z.x2);
      const minY = Math.min(z.y1, z.y2), maxY = Math.max(z.y1, z.y2);
      const pad = 20 / CAM.scale;
      for(const p of G.planets) {
        if (p.owner === 'player') continue;
        if (p.x >= minX - pad && p.x <= maxX + pad && p.y >= minY - pad && p.y <= maxY + pad) leftCount++;
      }

      html += `<div style="background:rgba(0,0,0,0.2); padding:8px; border-radius:6px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span class="gname" style="color:#ffd75f; font-weight:700;">${z.name}</span>
          <span class="gcount" style="font-size:10px;">余 ${leftCount} 目标</span>
          <button class="gedit gdel" data-delzone="${z.id}">×</button>
        </div>
        <div style="display:flex; gap:4px; flex-wrap:wrap;">
          <button class="btn sm gold" onclick="globalDispatch('${z.id}', 'sweep')" style="flex:1">🚀 全军扫荡</button>
          <button class="btn sm" onclick="globalDispatch('${z.id}', 'balance')" style="flex:1; background:rgba(78,168,255,.15); color:#a8cdfa;">🛡️ 完全均衡</button>
          <button class="btn sm" onclick="globalDispatch('${z.id}', 'frontline')" style="flex:1; background:rgba(255,140,80,.15); color:#ffb08a;">🛡️ 填线守备</button>
        </div>
      </div>`;
    }
  }
  html += `</div>`;

  html += `<div class="panel"><h3>🚩 舰队编组 <span class="sub">${G.groups.length}</span></h3>`;
  if(!G.groups.length){
    html += `<div class="empt" style="padding:8px 0">还没有编组，先创建一个</div>`;
  } else {
    for(const g of G.groups){
      const ships = getAllPlayerShipsByGroup(g.id);
      html += `<div class="groupRow">
        <span class="gname">${g.name}</span>
        <span class="gcount">${ships.length} 艘</span>
        <button class="gedit" data-renamegroup="${g.id}">改名</button>
        <button class="gedit gdel" data-delgroup="${g.id}">×</button>
      </div>`;
    }
  }
  html += `<button class="btn wide green" data-newgroup="1">➕ 新建编组</button></div>`;

  html += `<div class="panel"><h3>🚀 部队指令</h3>`;
  
  const myFleets = G.fleets.filter(f => f.owner === 'player');
  if(myFleets.length){
    html += `<h4 style="font-size:11px;color:#a8cdfa;margin:10px 0 4px;">航行中 (${myFleets.length})</h4>`;
    for(const f of myFleets){
      const to = G.planets[f.toRegionId];
      const cmdName = f.ships[0]?.commanderId ? G.commanders.find(c=>c.id === f.ships[0].commanderId)?.name : '无';
      
      html += `<div style="background:rgba(0,0,0,0.2); padding:6px; border-radius:6px; margin-bottom:6px; border:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:12px; margin-bottom:4px; cursor:pointer;" data-selectfleet="${f.id}">→ ${to.name} (${Math.round(f.progress*100)}%) · ${f.ships.length}艘</div>
        <div class="modrow" style="padding:2px 0;">
          <span class="modlabel" style="width:60px; font-size:10px;">指挥官</span>
          <select class="grpSel" style="flex:1; max-width:100%;" onchange="assignCommanderToFleet('${f.id}', this.value)">
            <option value="">— 无 —</option>
            ${G.commanders.map(c => `<option value="${c.id}" ${f.ships[0]?.commanderId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="modrow" style="padding:2px 0;">
          <span class="modlabel" style="width:60px; font-size:10px;">任务</span>
          <select class="grpSel" style="flex:1; max-width:100%;" onchange="assignTaskToFleet('${f.id}', this.value)">
            <option value="">— 仅移动 —</option>
            ${G.zones.map(z => `<option value="zone_${z.id}" ${f.task?.zoneId === z.id ? 'selected' : ''}>扫荡: ${z.name}</option>`).join('')}
          </select>
        </div>
        ${f.id === G.selectedFleetId ? `<button class="btn wide red" id="btnRecallFleet" style="margin-top:6px;">召回舰队</button>` : ''}
      </div>`;
    }
  }

  const withShips = G.planets.filter(p => p.owner === 'player' && p.garrison.some(s=>s.owner==='player' && s.hp>0));
  if(withShips.length){
    html += `<h4 style="font-size:11px;color:#a8cdfa;margin:10px 0 4px;">星球驻军 (${withShips.length})</h4>`;
    for(const p of withShips){
      const mine = p.garrison.filter(s=>s.owner==='player' && s.hp>0);
      const currentCmdId = mine.find(s => s.commanderId)?.commanderId || "";
      
      html += `<div style="background:rgba(0,0,0,0.2); padding:6px; border-radius:6px; margin-bottom:6px; border:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:12px; margin-bottom:4px;">★ ${p.name} (${mine.length}艘)</div>
        <div class="modrow" style="padding:2px 0;">
          <span class="modlabel" style="width:60px; font-size:10px;">指挥官</span>
          <select class="grpSel" style="flex:1; max-width:100%;" onchange="assignCommanderToPlanet(${p.id}, this.value)">
            <option value="">— 无 —</option>
            ${G.commanders.map(c => `<option value="${c.id}" ${currentCmdId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>`;
      
      const byCol = [[],[],[],[]];
      for(const s of mine){ byCol[clamp(s.column || 0, 0, 3)].push(s); }
      
      html += `<div class="formation">`;
      for(let c = 0; c < 4; c++){
        html += `<div class="fcol" data-fcol="${c}"><div class="fcol-title">${COL_NAMES[c]}</div>`;
        if(byCol[c].length === 0) html += `<div class="fempty">空</div>`;
        else {
          for(const s of byCol[c].slice(0, 5)){ 
            const hpPct = s.hp/s.maxHp*100, hpCls = hpPct>60?'':(hpPct>30?'w':'c');
            const cls = SHIP_CLASSES[s.shipClass || 'none'];
            html += `<div class="fship" draggable="true" data-drag-ship="${s.uid}">
              <div class="fship-name">${cls.icon} T${s.tier} ${s.name.split('-')[0]}</div>
              <div class="bar hp ${hpCls}" style="width:100%"><i style="width:${hpPct}%"></i></div>
            </div>`;
          }
          if (byCol[c].length > 5) html += `<div style="font-size:9px;text-align:center;color:#7fd3ff;margin-top:2px;">+${byCol[c].length - 5} 艘</div>`;
        }
        html += `</div>`;
      }
      html += `</div>`;

      if(G.groups.length){
        html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">`;
        for(const g of G.groups) html += `<button class="btn sm" data-assignall="${g.id}|${p.id}">${g.name} 全部</button>`;
        html += `<button class="btn sm red" data-clearassign="${p.id}">取消编组</button></div>`;
      }

      html += `<div style="margin-top:8px">`;
      for(const s of mine.slice(0, 10)) html += shipRowWithGroup(s);
      if (mine.length > 10) html += `<div style="text-align:center; font-size:11px; color:#7e8fae; padding:4px;">……另有 ${mine.length - 10} 艘（为了性能已隐藏）</div>`;
      html += `</div></div>`;
    }
  }
  if(!withShips.length && !myFleets.length) html += '<div class="empt">你还没有任何舰船</div>';
  html += `</div>`;
  
  return html;
}

function shipRowWithGroup(s){
  const hpPct = s.hp / s.maxHp * 100, hpCls = hpPct > 60 ? '' : (hpPct > 30 ? 'w' : 'c'), shdPct = s.maxShd > 0 ? s.shd / s.maxShd * 100 : 0;
  const tierTag = s.tier ? `<span style="font-size:9.5px;color:#8fa8d6;padding:1px 4px;border-radius:4px;background:rgba(120,160,255,.12);margin-right:4px">T${s.tier}</span>` : '';
  let options = '<option value="">未编组</option>';
  for(const g of G.groups){
    const sel = s.groupId === g.id ? 'selected' : '';
    options += `<option value="${g.id}" ${sel}>${g.name}</option>`;
  }
  let html = `<div class="srow">
    ${tierTag}<span class="nm">${s.name}</span>
    <div class="bar hp ${hpCls}"><i style="width:${hpPct}%"></i></div>
    <div class="bar shd"><i style="width:${shdPct}%"></i></div>
    <select class="grpSel" data-shipgroup="${s.uid}">${options}</select>
  </div>`;
  if(s.hangarSlots > 0){
    const deployed = (s.squadron||[]).length;
    html += `<div style="padding:4px 0 6px 24px;font-size:10px;color:#8fa8d6">
      ✈ 飞机位 ${deployed}/${s.hangarSlots}
      <button class="btn sm" data-deploy="${s.uid}" style="margin-left:6px">部署</button>
      ${deployed>0?`<button class="btn sm red" data-recall="${s.uid}" style="margin-left:4px">召回</button>`:''}
    </div>`;
  }
  return html;
}

window.startDrawZone = () => { G.isDrawingZone = true; G.drawingZone = null; toast('✏️ 请在地图上拖拽划定战区'); document.getElementById('rightBody').dataset.sig = ''; renderRight(); };
window.cancelDrawZone = () => { G.isDrawingZone = false; G.drawingZone = null; document.getElementById('rightBody').dataset.sig = ''; renderRight(); };
window.assignCommanderToFleet = (fleetId, cmdId) => { const f = G.fleets.find(x => x.id === fleetId); if(f) { for(const s of f.ships) s.commanderId = cmdId || null; markDirty(); } };
window.assignCommanderToPlanet = (planetId, cmdId) => { const p = G.planets[planetId]; if(p) { for(const s of p.garrison) { if(s.owner === 'player') s.commanderId = cmdId || null; } markDirty(); } };
window.assignTaskToFleet = (fleetId, taskVal) => {
  const f = G.fleets.find(x => x.id === fleetId);
  if(!f) return;
  if(!taskVal) { f.task = null; return; }
  f.task = { type: 'zone_sweep', zoneId: taskVal.replace('zone_', '') };
  toast('🎯 已分配扫荡任务');
};

window.setMaxSweepRoutes = (val) => {
  G.maxSweepRoutes = Math.max(1, Math.min(10, parseInt(val) || 3));
  toast(`设置最大分兵路线为 ${G.maxSweepRoutes}`);
  document.getElementById('rightBody').dataset.sig = '';
  renderRight();
};

window.globalDispatch = (zoneId, mode) => {
  const zone = G.zones.find(z => z.id === zoneId);
  if (!zone) return;

  // 收集全图所有闲置兵
  let availableShips = [];
  for (const p of G.planets) {
    if (p.owner !== 'player') continue;
    for (const s of p.garrison) {
      if (s.owner === 'player' && s.hp > 0) {
        availableShips.push({ ship: s, from: p.id, x: p.x, y: p.y });
      }
    }
  }

  if (availableShips.length === 0) { toast('全图没有闲置的舰船'); return; }

  const minX = Math.min(zone.x1, zone.x2), maxX = Math.max(zone.x1, zone.x2);
  const minY = Math.min(zone.y1, zone.y2), maxY = Math.max(zone.y1, zone.y2);
  const pad = 20 / CAM.scale;

  if (mode === 'sweep') {
    // 1. 获取框内所有敌人
    let targets = [];
    for (const p of G.planets) {
      if (p.owner !== 'player') {
        if (p.x >= minX - pad && p.x <= maxX + pad && p.y >= minY - pad && p.y <= maxY + pad) targets.push(p);
      }
    }
    if (targets.length === 0) { toast('该战区内没有敌人'); return; }
    
    // ★ 2. 按距离排序，并限制路线数量
    const maxRoutes = G.maxSweepRoutes || 3;
    if (targets.length > maxRoutes) {
      // 按距离“战区中心”的位置寻找最近的几个
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      targets.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
      targets = targets.slice(0, maxRoutes);
    }

    // 3. 计算选定目标的战力权重
    let totalPower = 0;
    targets.forEach(t => {
      t._tempPower = (typeof getGarrisonPower === 'function' ? getGarrisonPower(t.garrison) : 100) + (t.level * 100);
      totalPower += t._tempPower;
    });
    
    // 4. 按比例分兵与就近出击
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      let count = 0;
      
      if (i === targets.length - 1) {
        count = availableShips.length; // 最后一路拿走所有剩下的
      } else {
        count = Math.max(1, Math.round(availableShips.length * (t._tempPower / totalPower)));
      }
      
      if (count <= 0) continue;

      // ★ 5. 就近原则：把剩余的兵，按距离目标远近排序
      availableShips.sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
      const assigned = availableShips.splice(0, count);
      
      // 打包出发
      const grouped = {};
      for (const item of assigned) {
        if (!grouped[item.from]) grouped[item.from] = [];
        grouped[item.from].push(item.ship);
      }
      
      for (const pid in grouped) {
        const fId = +pid;
        const p = G.planets[fId];
        // 从原星球移除
        p.garrison = p.garrison.filter(gs => !grouped[pid].some(x => x.uid === gs.uid));
        launchFleet('player', grouped[pid], fId, t.id, 'attack', { type: 'zone_sweep', zoneId: zone.id });
      }
    }
    
    toast(`🚀 全军出击：锁定 ${targets.length} 个目标，就近出击`);
    addLog(`🚀 执行全军扫荡，分兵 ${targets.length} 路`, 'info');

  } else if (mode === 'balance' || mode === 'frontline') {
    let defendTargets = [];
    for (const p of G.planets) {
      if (p.owner !== 'player') continue;
      if (p.x >= minX - pad && p.x <= maxX + pad && p.y >= minY - pad && p.y <= maxY + pad) {
        if (mode === 'frontline') {
          let isFront = false;
          for (const e of G.planets) {
            if (e.owner && e.owner !== 'player' && Math.hypot(e.x - p.x, e.y - p.y) < 350) { isFront = true; break; }
          }
          if (isFront) defendTargets.push(p);
        } else {
          defendTargets.push(p);
        }
      }
    }

    if (defendTargets.length === 0) { toast('没有符合条件需要防守的星球'); return; }
    
    const chunkSize = Math.ceil(availableShips.length / defendTargets.length);
    for (let i = 0; i < defendTargets.length; i++) {
      const chunk = availableShips.slice(i * chunkSize, (i + 1) * chunkSize);
      const grouped = {};
      for (const item of chunk) { (grouped[item.from] = grouped[item.from] || []).push(item.ship); }
      
      for (const pid in grouped) {
        const p = G.planets[+pid];
        p.garrison = p.garrison.filter(gs => !grouped[pid].some(x => x.uid === gs.uid));
        launchFleet('player', grouped[pid], +pid, defendTargets[i].id, 'move', null);
      }
    }
    toast(`🛡️ 全军布防：已分兵前往 ${defendTargets.length} 个星球`);
    addLog(`🛡️ 执行区域守备，调动至 ${defendTargets.length} 处`, 'info');
  }

  markDirty();
  document.getElementById('rightBody').dataset.sig = '';
  renderRight();
};
function viewAttackSelect(){
  if(!attackSelect) return '';
  const target = G.planets[attackSelect.targetId];
  if(!target){ attackSelect = null; return '<div class="empt">目标已不存在</div>'; }
  const sel = attackSelect.selected;

  let html = `<div class="panel">
    <h3>派遣至 ${target.name} <span class="sub">已选 ${sel.size}</span></h3>
    
    <div style="display:flex; gap:10px; margin-bottom:10px;">
      <select id="fleetTaskSelect" class="modsel" style="width:100%">
        <option value="focus_attack">集中突击（直奔目标，驻扎）</option>
        <option value="balanced_attack">均衡推进（攻下后自动推进）</option>
        <option value="fixed_defend">定点防守（抵达驻扎）</option>
      </select>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px">
      <button class="btn sm" data-selectall="1">全选</button>
      <button class="btn sm" data-selectnone="1">清空</button>`;
  for(const g of G.groups){
    const gs = getAllPlayerShipsByGroup(g.id);
    if(gs.length) html += `<button class="btn sm" data-selectgroup="${g.id}">${g.name} · ${gs.length}</button>`;
  }
  html += `</div></div>`;

  for(const p of G.planets){
    if(p.id === target.id) continue;
    const mine = p.garrison.filter(s=>s.owner==='player' && s.hp>0);
    if(!mine.length) continue;
    html += `<div class="panel"><h3>${p.name} <span class="sub">${mine.length}艘</span></h3>`;
    for(const s of mine.slice(0, 15)){
      const checked = sel.has(s.uid), hpPct = s.hp/s.maxHp*100, hpCls = hpPct>60?'':(hpPct>30?'w':'c');
      html += `<label class="srow" style="cursor:pointer">
        <input type="checkbox" data-seluid="${s.uid}" ${checked?'checked':''} style="accent-color:#4ea8ff;width:14px;height:14px">
        <span class="nm">T${s.tier} ${s.name}</span>
        <div class="bar hp ${hpCls}"><i style="width:${hpPct}%"></i></div>
        <span class="num">${Math.ceil(s.hp)}</span>
      </label>`;
    }
    if (mine.length > 15) html += `<div class="line" style="text-align:center;opacity:.6;margin-top:4px;">……另有 ${mine.length - 15} 艘（已折叠）</div>`;
    html += `</div>`;
  }

  html += `<div class="panel">
    <button class="btn wide red" data-confirmattack="1" ${sel.size?'':'disabled'}>
      ⚔ 出击（${sel.size}艘）
    </button>
    <button class="btn wide" data-cancelattack="1">取消</button>
  </div>`;
  return html;
}

function viewDesign(){
  const hull = HULLS[G.designHull] || HULLS[1];
  const st = designStats(G.designMods, G.designHull, G.designClass);
  const usedSpace = st.size, maxSpace = st.space;
  const spacePct = maxSpace > 0 ? Math.min(100, usedSpace / maxSpace * 100) : 0;
  const over = usedSpace > maxSpace;
  const req = checkClassReq(G.designClass, G.designMods, G.designHull);

  let html = '';
  html += `<div class="panel"><h3>船体 <span class="sub">${hull.name} · ${hull.space}格</span></h3>`;
  html += `<div class="hullgrid">`;
  for(let t = 1; t <= 7; t++){
    const h = HULLS[t];
    const unlocked = G.hullUnlocked[t];
    const onCls = t === G.designHull ? ' on' : '';
    if(unlocked){
      html += `<button class="hullbtn${onCls}" data-hull="${t}" title="${h.space}格">
        T${t}<br><small style="font-size:8px;opacity:.7">${h.space}</small>
      </button>`;
    } else {
      const need = h.unlock ? `${MAT_NAMES[h.unlock.mat]}×${h.unlock.cost}` : '无法解锁';
      const have = h.unlock ? Math.floor(G.materials[h.unlock.mat] || 0) : 0;
      const canUnlock = h.unlock && have >= h.unlock.cost;
      html += `<button class="hullbtn" data-unlock="${t}" title="${need}（持有 ${have}）"
        style="opacity:${canUnlock ? 0.85 : 0.4};border-color:${canUnlock ? 'rgba(255,215,95,.5)' : ''}">
        🔒<br><small style="font-size:8px">${need}</small>
      </button>`;
    }
  }
  html += `</div></div>`;

  html += `<div class="panel"><h3>职业 <span class="sub">${SHIP_CLASSES[G.designClass].name}</span></h3>`;
  html += `<div class="classgrid">`;
  for(const key in SHIP_CLASSES){
    const c = SHIP_CLASSES[key];
    const onCls = key === G.designClass ? ' on' : '';
    const reqBad = c.req ? ' ⚠' : '';
    html += `<button class="classbtn${onCls}" data-class="${key}">
      ${c.icon}<br>${c.name}${reqBad}
      <small>${c.desc}</small>
    </button>`;
  }
  html += `</div>`;
  if(!req.ok) html += `<div class="matneed">⚠ ${req.reason}</div>`;
  html += `</div>`;

  html += `<div class="panel"><h3>模块装配 <span class="sub">上限 T${Math.min(7, G.designHull + 1)}</span></h3>`;
  const tierCap = Math.min(7, G.designHull + 1);
  for(const slot of MOD_KEYS){
    const sel = G.designMods[slot];
    const options = [];
    for(let t = 1; t <= tierCap; t++){
      for(const s of SIZES){
        const list = getModuleList(slot, t, s, G.designHull);
        if(!list || !list.length) continue;
        for(const m of list) options.push({ t, s, m });
      }
    }
    if(!options.length && slot !== 'catapult'){
      html += `<div class="modrow"><span class="modlabel">${SLOT_ICON[slot]} ${SLOT_LABEL[slot]}</span>
        <span style="flex:1;font-size:10px;color:#4e5b74">— 当前船体无可用模块 —</span></div>`;
      continue;
    }
    if(!options.length) continue;

    html += `<div class="modrow"><span class="modlabel">${SLOT_ICON[slot]} ${SLOT_LABEL[slot]}</span>`;
    html += `<select class="modsel" data-mod="${slot}"><option value="">— 空 —</option>`;
    let lastGroup = '';
    for(const {t, s, m} of options){
      const gLabel = `T${t} ${SIZE_LABEL[s]}`;
      if(gLabel !== lastGroup){
        if(lastGroup) html += `</optgroup>`;
        html += `<optgroup label="${gLabel}">`;
        lastGroup = gLabel;
      }
      const v = `${t}|${s}|${m.key || ''}`;
      const isSel = sel && sel.tier === t && sel.size === s && (sel.obj.key || '') === (m.key || '');
      const label = `${m.name} · ${m.size || 0}格`;
      html += `<option value="${v}" ${isSel ? 'selected' : ''}>${label}</option>`;
    }
    if(lastGroup) html += `</optgroup>`;
    html += `</select></div>`;

    if(sel && sel.obj){
      const o = sel.obj;
      let info = [`${o.size || 0}格`];
      if(o.dmg)          info.push(`伤害${o.dmg}`);
      if(o.hp)           info.push(`HP+${o.hp}`);
      if(o.shd)          info.push(`盾+${o.shd}`);
      if(o.spd)          info.push(`速度+${o.spd}`);
      if(o.eva)          info.push(`闪避+${o.eva}`);
      if(o.regen)        info.push(`回能+${o.regen}`);
      if(o.repairAmount) info.push(`修复${o.repairAmount}/${o.repairCd || 0}s`);
      if(o.hangarSlots)  info.push(`机位+${o.hangarSlots}`);
      html += `<div class="modinfo">${info.join(' · ')}</div>`;
    }
  }
  html += `</div>`;

  html += `<div class="panel"><h3>空间 <span class="sub">${usedSpace} / ${maxSpace}</span></h3>`;
  html += `<div class="sbar ${over ? 'over' : ''}"><i style="width:${spacePct}%"></i></div>`;
  html += `<div class="st"><span class="k">装甲 HP</span><span class="v">${st.hp}</span></div>`;
  html += `<div class="st"><span class="k">护盾</span><span class="v">${st.shd}</span></div>`;
  html += `<div class="st"><span class="k">速度</span><span class="v">${st.spd}</span></div>`;
  html += `<div class="st"><span class="k">闪避</span><span class="v">${st.eva}%</span></div>`;
  if(st.repairAmount) html += `<div class="st"><span class="k">修复</span><span class="v">${st.repairAmount}/${st.repairCd}s</span></div>`;
  if(st.hangarSlots)  html += `<div class="st"><span class="k">机位</span><span class="v">${st.hangarSlots}</span></div>`;
  html += `<div class="st"><span class="k">总伤害</span><span class="v">${st.totalDmg}</span></div>`;
  html += `<div class="st"><span class="k">造价</span><span class="v">◈${st.cost} ⚡${st.energyCost}</span></div>`;
  const hullMat = hull.matCost;
  if(hullMat){
    const ok = hasMaterial(hullMat);
    html += `<div class="matneed ${ok ? 'ok' : ''}">材料：${MAT_NAMES[hullMat.mat]} × ${hullMat.n}（持有 ${Math.floor(G.materials[hullMat.mat] || 0)}）</div>`;
  }
  html += `</div>`;

    // --- 保存设计区域 ---
  html += `<div class="panel"><h3>${G.editingDesignId ? '✏️ 修改设计' : '保存设计'}</h3>`;
  html += `<input type="text" class="txt" id="designNameInput" placeholder="设计名称" maxlength="16" value="${G.designName || '新设计'}">`;
  const canSave = !over && req.ok && st.size <= st.space;
  
  html += `<div style="display:flex; gap:6px;">
    <button class="btn wide green" data-savedesign="1" ${canSave ? '' : 'disabled'} style="flex:1">
      ${G.editingDesignId ? '💾 保存修改' : '💾 保存为新建'}
    </button>
    ${G.editingDesignId ? `<button class="btn wide red" data-canceledit="1" style="flex:0.5">取消修改</button>` : ''}
  </div>`;
  
  html += `<button class="btn wide" data-importdesign="1" style="margin-top:6px; background:rgba(160,120,255,.1); border-color:rgba(160,120,255,.3); color:#e0d0ff;">📥 导入外部设计</button>`;
  html += `</div>`;

  // --- 设计库区域 ---
  html += `<div class="panel"><h3>设计库 <span class="sub">${G.designs.length}</span></h3>`;
  if(!G.designs.length){
    html += `<div class="empt" style="padding:6px 0">还没有保存的设计</div>`;
  } else {
    for(const d of G.designs){
      const dst = designStats(d.mods, d.hullTier, d.shipClass);
      const cls = SHIP_CLASSES[d.shipClass] || SHIP_CLASSES.none;
      const isEditing = G.editingDesignId === d.id;
      
      html += `<div class="drow" style="${isEditing ? 'border:1px solid #ffd75f; background:rgba(255,215,95,.05)' : ''}">
        <div class="dname">${cls.icon} T${d.hullTier} ${d.name} ${isEditing ? '<span style="font-size:9px;color:#ffd75f">[正在修改]</span>' : ''}</div>
        <div class="dstat">HP ${dst.hp} · 速度 ${dst.spd} · 伤害 ${dst.totalDmg} · ◈${dst.cost}</div>
        <div class="dbtns">
          <button class="btn sm green" data-builddesign="${d.id}">建造</button>
          <button class="btn sm" data-editdesign="${d.id}">编辑</button>
          <button class="btn sm" data-exportdesign="${d.id}">导出</button>
          <button class="btn sm red" data-deldesign="${d.id}">×</button>
        </div>
      </div>`;
    }
  }
  html += `</div>`;

  return html;
}

function viewAirforce(){
  const curTier = G.planeDesign.tier || 1;
  const planeHull = PLANE_HULLS[curTier] || PLANE_HULLS[1];
  const st = planeStats(G.planeDesign);
  const spacePct = planeHull.space > 0 ? Math.min(100, st.size / planeHull.space * 100) : 0;
  const over = st.size > planeHull.space;
  const hasWeapon = !!(G.planeDesign.weapons && G.planeDesign.weapons.main);

  let html = '';
  html += `<div class="panel"><h3>机体 <span class="sub">${planeHull.name} · ${planeHull.space}格</span></h3>`;
  html += `<div class="hullgrid">`;
  for(let t = 1; t <= 7; t++){
    const h = PLANE_HULLS[t];
    const unlocked = G.planeHullUnlocked[t];
    const onCls = t === curTier ? ' on' : '';
    if(unlocked){
      html += `<button class="hullbtn${onCls}" data-planetier="${t}" title="${h.space}格">
        T${t}<br><small style="font-size:8px;opacity:.7">${h.space}</small>
      </button>`;
    } else {
      const need = h.unlock ? `${MAT_NAMES[h.unlock.mat]}×${h.unlock.cost}` : '无法解锁';
      const have = h.unlock ? Math.floor(G.materials[h.unlock.mat] || 0) : 0;
      const canUnlock = h.unlock && have >= h.unlock.cost;
      html += `<button class="hullbtn" data-unlockplane="${t}" title="${need}（持有 ${have}）"
        style="opacity:${canUnlock ? 0.85 : 0.4};border-color:${canUnlock ? 'rgba(255,215,95,.5)' : ''}">
        🔒<br><small style="font-size:8px">${need}</small>
      </button>`;
    }
  }
  html += `</div></div>`;

  html += `<div class="panel"><h3>机型 <span class="sub">${PLANE_TYPES[G.planeDesign.type].name}</span></h3>`;
  html += `<div class="classgrid">`;
  for(const key in PLANE_TYPES){
    const t = PLANE_TYPES[key];
    const onCls = key === G.planeDesign.type ? ' on' : '';
    html += `<button class="classbtn${onCls}" data-planetype="${key}">
      ${t.icon}<br>${t.name}<small>${t.desc}</small>
    </button>`;
  }
  html += `</div></div>`;

  html += `<div class="panel"><h3>装备</h3>`;
  const wSel = G.planeDesign.weapons && G.planeDesign.weapons.main;
  html += `<div class="modrow"><span class="modlabel">🔴 武器</span><select class="modsel" data-planemod="weapon"><option value="">— 空 —</option>`;
  for(let t = 1; t <= curTier; t++){
    for(const k in PLANE_WEAPONS){
      const m = mkPlaneWeapon(k, t);
      const v = `w:${t}|${k}`;
      const isSel = wSel && wSel.tier === t && wSel.key === k;
      html += `<option value="${v}" ${isSel ? 'selected' : ''}>T${t} ${m.name} · 伤${m.dmg} · ${m.size}格</option>`;
    }
  }
  html += `</select></div>`;

  const slotDefs = [
    { key:'armor',   label:'🛡 装甲', mk: mkPlaneArmor,   desc: m => `HP+${m.hp} 盾+${m.shd}` },
    { key:'engine',  label:'🚀 引擎', mk: mkPlaneEngine,  desc: m => `速度+${m.spd} 闪避+${m.eva}` },
    { key:'reactor', label:'⚡ 储能', mk: mkPlaneReactor, desc: m => `回能+${m.regen}` },
  ];
  for(const sd of slotDefs){
    const sel = G.planeDesign[sd.key];
    html += `<div class="modrow"><span class="modlabel">${sd.label}</span><select class="modsel" data-planemod="${sd.key}"><option value="">— 空 —</option>`;
    for(let t = 1; t <= curTier; t++){
      const m = sd.mk(t);
      const v = `${sd.key[0]}:${t}`;
      const isSel = sel && sel.tier === t;
      html += `<option value="${v}" ${isSel ? 'selected' : ''}>T${t} ${m.name} · ${sd.desc(m)} · ${m.size}格</option>`;
    }
    html += `</select></div>`;
  }
  html += `</div>`;

  html += `<div class="panel"><h3>性能 <span class="sub">${st.size} / ${planeHull.space}格</span></h3>`;
  html += `<div class="sbar ${over ? 'over' : ''}"><i style="width:${spacePct}%"></i></div>`;
  html += `<div class="st"><span class="k">HP</span><span class="v">${st.hp}</span></div>`;
  html += `<div class="st"><span class="k">护盾</span><span class="v">${st.shd}</span></div>`;
  html += `<div class="st"><span class="k">速度</span><span class="v">${st.spd}</span></div>`;
  html += `<div class="st"><span class="k">闪避</span><span class="v">${st.eva}%</span></div>`;
  html += `<div class="st"><span class="k">对舰伤害</span><span class="v">${st.dmg}</span></div>`;
  html += `<div class="st"><span class="k">对空伤害</span><span class="v">${st.aaDmg}</span></div>`;
  html += `<div class="st"><span class="k">造价</span><span class="v">◈${st.cost}</span></div>`;
  const pMat = planeHull.matCost;
  if(pMat){
    const ok = hasMaterial(pMat);
    html += `<div class="matneed ${ok ? 'ok' : ''}">材料：${MAT_NAMES[pMat.mat]} × ${pMat.n}（持有 ${Math.floor(G.materials[pMat.mat] || 0)}）</div>`;
  }
  html += `</div>`;

    // --- 保存/生产区域 ---
  html += `<div class="panel"><h3>${G.editingPlaneDesignId ? '✏️ 修改战机' : '保存 / 生产'}</h3>`;
  html += `<input type="text" class="txt" id="planeNameInput" placeholder="战机名称" maxlength="16" value="${G.planeDesign.name || '新战机'}">`;
  const canDo = !over && hasWeapon;
  
  html += `<div style="display:flex; gap:6px; margin-bottom:6px;">
    <button class="btn wide green" data-saveplane="1" ${canDo ? '' : 'disabled'} style="flex:1">
      ${G.editingPlaneDesignId ? '💾 保存修改' : '💾 保存为新建'}
    </button>
    ${G.editingPlaneDesignId ? `<button class="btn wide red" data-canceleditplane="1" style="flex:0.5">取消</button>` : ''}
  </div>`;
  
  html += `<button class="btn wide gold" data-produceplane="1" ${canDo ? '' : 'disabled'}>🏭 生产 1 架</button>`;
  html += `<button class="btn wide" data-importplanedesign="1" style="margin-top:6px; background:rgba(160,120,255,.1); border-color:rgba(160,120,255,.3); color:#e0d0ff;">📥 导入战机代码</button>`;
  html += `</div>`;

  // --- 设计库 ---
  html += `<div class="panel"><h3>设计库 <span class="sub">${G.planeDesigns.length}</span></h3>`;
  if(!G.planeDesigns.length){
    html += `<div class="empt" style="padding:6px 0">还没有保存的战机</div>`;
  } else {
    for(const d of G.planeDesigns){
      const dst = planeStats(d);
      const cnt = G.hangar[d.id] || 0;
      const isEditing = G.editingPlaneDesignId === d.id;
      
      html += `<div class="drow" style="${isEditing ? 'border:1px solid #ffd75f; background:rgba(255,215,95,.05)' : ''}">
        <div class="dname">✈ T${d.tier || 1} ${d.name} <span style="color:#7fd3ff;font-size:10px">×${cnt}</span></div>
        <div class="dstat">HP ${dst.hp} · 伤${dst.dmg} · 对空${dst.aaDmg} · ◈${dst.cost}</div>
        <div class="dbtns">
          <button class="btn sm green" data-produce="${d.id}">生产</button>
          <button class="btn sm" data-editplanedesign="${d.id}">编辑</button>
          <button class="btn sm" data-exportplanedesign="${d.id}">导出</button>
          <button class="btn sm red" data-delplane="${d.id}">×</button>
        </div>
      </div>`;
    }
  }
  html += `</div>`;

  return html;
}

function viewShipyard(){
  const yards = G.planets.filter(p => p.owner === 'player' && p.facilities.includes('dock'));
  let html = '';
  
  html += `<div style="display:flex; gap:6px; margin-bottom:10px;">
    <button class="btn wide" data-showqueue="1" style="margin-top:0; background:rgba(255,215,95,.1); border-color:rgba(255,215,95,.3); color:#ffd75f;">📋 查看建造列表 (${G.buildQueue.length})</button>
  </div>`;

  html += `<div class="panel"><h3>造船厂 <span class="sub">${yards.length} 座</span></h3>`;
  if(!yards.length){
    html += `<div class="empt">你还没有造船厂<br>请先在已占领星球上建造「🏗 造船厂」设施</div>`;
  } else {
    html += `<div class="yardgrid">`;
    for(const p of yards){
      const onCls = shipyardCurrent === p.id ? ' on' : '';
      html += `<button class="yardbtn${onCls}" data-yard="${p.id}">
        ${p.name}<br><small style="font-size:9px;opacity:.7">Lv${p.level}</small>
      </button>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  html += `<div class="panel"><h3>可建造舰船 <span class="sub">${G.designs.length}</span></h3>`;
  if(!shipyardCurrent){
    html += `<div class="empt">请先选择一艘造船厂</div>`;
  } else if(!G.designs.length){
    html += `<div class="empt">还没有设计<br>请先到「设计」页创建舰船方案</div>`;
  } else {
    for(const d of G.designs){
      const dst = designStats(d.mods, d.hullTier, d.shipClass);
      const hullDef = HULLS[d.hullTier] || HULLS[1];
      const matOk = hasMaterial(hullDef.matCost);
      const over = dst.size > dst.space;
      const cls = SHIP_CLASSES[d.shipClass] || SHIP_CLASSES.none;
      const matLabel = hullDef.matCost ? `${MAT_NAMES[hullDef.matCost.mat]}×${hullDef.matCost.n}` : '';
      
      html += `<div class="drow">
        <div class="dname">${cls.icon} T${d.hullTier} ${d.name}</div>
        <div class="dstat">HP ${dst.hp} · 速度 ${dst.spd} · 伤害 ${dst.totalDmg}<br>
          ◈${dst.cost} ⚡${dst.energyCost}${matLabel ? ' · ' + matLabel : ''}${over ? ' · <span style="color:#ff8a8a">超空间</span>' : ''}
        </div>
        <div style="display:flex; gap:4px; align-items:center; margin-top:6px;">
          <input type="number" class="txt" id="buildqty_${d.id}" value="1" min="1" max="99" style="width:60px; height:24px; padding:2px 6px; margin:0; text-align:center; font-size:12px;">
          <button class="btn sm green" data-buildyard="${d.id}" style="flex:1;">批量建造</button>
        </div>
      </div>`;
    }
  }
  html += `</div>`;
  return html;
}

function renderBuildQueueModal() {
  let el = document.getElementById('buildQueueModal');
  const isFirstOpen = !el;

  if (isFirstOpen) {
    el = document.createElement('div');
    el.id = 'buildQueueModal';
    el.className = 'modal-overlay show';
    el.innerHTML = `
      <div class="modal-box" style="width:min(800px, 90vw); max-height:80vh; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <h2 style="font-size:18px; color:#bcd8ff; letter-spacing:1px;">🏗 建造队列</h2>
          <button class="auth-btn" style="width:auto; margin:0; padding:6px 12px; background:rgba(255,255,255,0.1);" onclick="closeBuildQueueModal()">关闭</button>
        </div>
        <div id="bqListContainer" style="overflow-y:auto; flex:1;"></div>
      </div>`;
    document.body.appendChild(el);
  }

  const container = document.getElementById('bqListContainer');
  if (!container) return;

  const lastScrollTop = container.scrollTop;
  let html = '';
  
  if(!G.buildQueue.length) {
    html += `<div style="color:#7e8fae; text-align:center; padding:30px;">暂无建造任务</div>`;
  } else {
    html += `<table style="width:100%; border-collapse:collapse; font-size:12px;">
      <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:#8fa8d6; text-align:left;">
        <th style="padding:8px;">舰船名称</th>
        <th style="padding:8px;">建造星球</th>
        <th style="padding:8px; width:40%;">进度</th>
        <th style="padding:8px; text-align:right;">操作</th>
      </tr>`;
    for (const q of G.buildQueue) {
      const region = G.planets[q.regionId];
      const pct = Math.round(q.progress * 100);
      html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
        <td style="padding:8px; color:#d8e2f5;">${q.designName}</td>
        <td style="padding:8px; color:#a8cdfa;">${region ? region.name : '?'}</td>
        <td style="padding:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="flex:1; background:rgba(0,0,0,0.5); height:6px; border-radius:3px; overflow:hidden;">
              <div class="bq-progress-bar" data-qid="${q.id}" style="background:#4ea8ff; height:100%; width:${pct}%; transition: width 0.1s linear;"></div>
            </div>
            <span class="bq-pct-text" data-qid="${q.id}" style="font-size:10px; color:#7e8fae; width:30px; text-align:right;">${pct}%</span>
          </div>
        </td>
        <td style="padding:8px; text-align:right;">
          <button class="btn sm red" onclick="cancelBuild('${q.id}'); renderBuildQueueModal();">取消</button>
        </td>
      </tr>`;
    }
    html += `</table>`;
  }
  
  container.innerHTML = html;
  container.scrollTop = lastScrollTop;
}

window.closeBuildQueueModal = () => {
  const el = document.getElementById('buildQueueModal');
  if(el) el.remove();
};

function viewLog(){
  let html = '';

  const activeBattles = G.battles.filter(b => !b.over);
  if(activeBattles.length){
    html += `<div class="panel" style="border-color:rgba(255,215,95,.4)"><h3>⚔ 交战中 <span class="sub">${activeBattles.length}</span></h3>`;
    for(const b of activeBattles){
      const region = G.planets[b.regionId];
      const atkAlive = b.attacker.filter(s => s.hp > 0).length;
      const defAlive = b.defender.filter(s => s.hp > 0).length;
      html += `<div class="line" style="display:flex;align-items:center;gap:6px">
        <span style="flex:1">
          <b>${region ? region.name : '?'}</b>
          · ${atkAlive}/${b.attacker.length} vs ${defAlive}/${b.defender.length}
          · <span style="color:#8fa8d6">${b.time.toFixed(1)}s</span>
        </span>
        <button class="btn sm gold" data-battleanim="${b.regionId}">查看</button>
      </div>`;
    }
    html += `</div>`;
  }

  html += `<div class="panel"><h3>事件日志 <span class="sub">${G.logs.length}</span></h3>`;
  if(!G.logs.length){
    html += `<div class="empt">暂无日志</div>`;
  } else {
    html += `<div class="logBox">`;
    for(const l of G.logs){
      const typeCls =
        (l.type === 'fight' || l.type === 'win'  || l.type === 'atk') ? 'atk' :
        (l.type === 'lose'  || l.type === 'def')                      ? 'def' :
        (l.type === 'info'  || l.type === 'sys')                      ? 'sys' : '';
      html += `<div class="logLine ${typeCls}"><span class="r">${fmtTime(l.t)}</span>${l.text}</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  return html;
}