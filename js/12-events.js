/* =========================================================
   12-events.js — 事件绑定与大厅交互
   ========================================================= */

function openAttackSelect(targetId) {
  attackSelect = { targetId: targetId, selected: new Set() };
  document.getElementById('rightBody').dataset.sig = '';
  renderRight();
}

const tabContainer = document.getElementById('tabs');
if (tabContainer) {
  tabContainer.addEventListener('click', ev=>{
    const t = ev.target.closest('.tab');
    if(!t) return;
    G.tab = t.dataset.tab;
    attackSelect = null;
    document.getElementById('rightBody').dataset.sig = '';
    renderRight();
  });
}

const rightBody = document.getElementById('rightBody');
if (rightBody) {
  rightBody.addEventListener('click', ev=>{
    // ★ 安全获取元素，防止点击到纯文本节点导致崩溃
    const t = ev.target.nodeType === 3 ? ev.target.parentElement : ev.target;
    if (!t || !t.dataset) return;
    
    if (t.dataset.selectfleet) {
      G.selectedFleetId = t.dataset.selectfleet;
      document.getElementById('rightBody').dataset.sig = '';
      renderRight();
      return;
    }
    if (t.id === 'btnRecallFleet') {
      recallFleet(G.selectedFleetId);
      return;
    }

    const clsBtn = t.closest('[data-class]');
    if(clsBtn && !clsBtn.disabled){ G.designClass = clsBtn.dataset.class; document.getElementById('rightBody').dataset.sig=''; renderRight(); return; }
    
    const ptBtn = t.closest('[data-planetier]');
    if(ptBtn && !ptBtn.disabled){
      const newTier = +ptBtn.dataset.planetier; G.planeDesign.tier = newTier;
      if(G.planeDesign.weapons.main && G.planeDesign.weapons.main.tier > newTier) G.planeDesign.weapons.main = null;
      if(G.planeDesign.armor && G.planeDesign.armor.tier > newTier) G.planeDesign.armor = null;
      if(G.planeDesign.engine && G.planeDesign.engine.tier > newTier) G.planeDesign.engine = null;
      if(G.planeDesign.reactor && G.planeDesign.reactor.tier > newTier) G.planeDesign.reactor = null;
      document.getElementById('rightBody').dataset.sig=''; renderRight(); return;
    }
    const ptBtn2 = t.closest('[data-planetype]');
    if(ptBtn2){ G.planeDesign.type = ptBtn2.dataset.planetype; document.getElementById('rightBody').dataset.sig=''; renderRight(); return; }

    if(t.dataset.unlockplane){ const r = unlockPlaneHull(+t.dataset.unlockplane); if(!r.ok) toast(r.reason); document.getElementById('rightBody').dataset.sig=''; renderRight(); return; }
    if(t.dataset.battleanim){ openBattleAnim(+t.dataset.battleanim); return; }

    if(t.dataset.yard){ shipyardCurrent = +t.dataset.yard; document.getElementById('rightBody').dataset.sig=''; renderRight(); return; }
    if(t.dataset.buildyard){ 
      if(shipyardCurrent == null){ toast('请先选择造船厂'); return; } 
      const qtyInput = document.getElementById('buildqty_' + t.dataset.buildyard);
      const count = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
      
      if(startBuild(t.dataset.buildyard, shipyardCurrent, count)){ 
        document.getElementById('rightBody').dataset.sig=''; renderRight(); 
        toast(`🏭 已加入 ${count} 艘建造队列`);
      } else {
        toast('资源/材料不足或超空间'); 
      }
      return; 
    }
    if(t.dataset.gotab){ G.tab = t.dataset.gotab; attackSelect = null; document.getElementById('rightBody').dataset.sig=''; renderRight(); return; }

    if(t.dataset.newgroup){ const name = prompt('新建编组名称', G.nationName + '第' + (G.groups.length+1) + '舰队'); if(name !== null){ const gid = 'g' + (G.nextGroupId++); G.groups.push({id:gid, name:(name||'').slice(0,16) || ('编组'+G.groups.length)}); document.getElementById('rightBody').dataset.sig = ''; renderRight(); markDirty(); } return; }
    if(t.dataset.renamegroup){ const g = G.groups.find(x=>x.id===t.dataset.renamegroup); if(g){ const name = prompt('重命名', g.name); if(name !== null){ g.name = (name||'').slice(0,16); document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); } } return; }
    if(t.dataset.delgroup){
      if(!confirm('删除编组？')) return;
      const gid = t.dataset.delgroup;
      for(const p of G.planets) for(const s of p.garrison) if(s.groupId===gid) s.groupId=null;
      for(const f of G.fleets) for(const s of f.ships) if(s.groupId===gid) s.groupId=null;
      G.groups = G.groups.filter(g=>g.id!==gid);
      document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); return;
    }
    if(t.dataset.assignall){ const [gid, pid] = t.dataset.assignall.split('|'); const p = G.planets[+pid]; if(p){ for(const s of p.garrison) if(s.owner === 'player' && s.hp > 0) s.groupId = gid; document.getElementById('rightBody').dataset.sig = ''; renderRight(); markDirty(); } return; }
    if(t.dataset.clearassign){ const p = G.planets[+t.dataset.clearassign]; if(p){ for(const s of p.garrison) if(s.owner === 'player') s.groupId = null; document.getElementById('rightBody').dataset.sig = ''; renderRight(); markDirty(); } return; }

    if(t.dataset.delzone){
      G.zones = G.zones.filter(z => z.id !== t.dataset.delzone);
      document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); return;
    }

    if(t.dataset.saveplane){ 
      const inp = document.getElementById('planeNameInput'); 
      const name = (inp && inp.value.trim()) || '新战机'; 
      const st = planeStats(G.planeDesign); 
      const planeHull = PLANE_HULLS[G.planeDesign.tier || 1]; 
      if(st.size > planeHull.space){ toast('超出机舱空间'); return; } 
      if(!G.planeDesign.weapons.main){ toast('必须装配武器'); return; } 
      
      const newDesign = {
        id: G.editingPlaneDesignId || ('pd' + Date.now() + Math.random().toString(36).slice(2,5)), 
        name, type: G.planeDesign.type, tier: G.planeDesign.tier || 1, 
        weapons: JSON.parse(JSON.stringify(G.planeDesign.weapons)), 
        armor: G.planeDesign.armor ? {...G.planeDesign.armor} : null, 
        engine: G.planeDesign.engine ? {...G.planeDesign.engine} : null, 
        reactor: G.planeDesign.reactor ? {...G.planeDesign.reactor} : null, 
      };
      
      if (G.editingPlaneDesignId) {
        const idx = G.planeDesigns.findIndex(x => x.id === G.editingPlaneDesignId);
        if(idx !== -1) {
          G.planeDesigns[idx] = newDesign;
          addLog(`💾 修改飞机「${name}」`, 'info');
          toast('✅ 修改已保存');
        }
        G.editingPlaneDesignId = null;
      } else {
        G.planeDesigns.push(newDesign); 
        addLog(`💾 保存飞机设计「${name}」`, 'info'); 
      }
      
      document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); return; 
    }
    
    if(t.dataset.produceplane){ 
      const st = planeStats(G.planeDesign); 
      const planeHull = PLANE_HULLS[G.planeDesign.tier || 1]; 
      if(st.size > planeHull.space){ toast('超出机舱空间'); return; } 
      if(!G.planeDesign.weapons.main){ toast('必须装配武器'); return; } 
      if(G.alloy < st.cost){ toast('合金不足'); return; } 
      if(!hasMaterial(planeHull.matCost)){ toast('材料不足'); return; } 
      let d = G.planeDesigns.find(x=> x.name === G.planeDesign.name && x.type === G.planeDesign.type && x.tier === (G.planeDesign.tier||1)); 
      if(!d){ 
        d = { id: 'pd' + Date.now() + Math.random().toString(36).slice(2,5), name: (G.planeDesign.name||'新战机'), type: G.planeDesign.type, tier: G.planeDesign.tier || 1, weapons: JSON.parse(JSON.stringify(G.planeDesign.weapons)), armor: G.planeDesign.armor ? {...G.planeDesign.armor} : null, engine: G.planeDesign.engine ? {...G.planeDesign.engine} : null, reactor: G.planeDesign.reactor ? {...G.planeDesign.reactor} : null, }; 
        G.planeDesigns.push(d); 
      } 
      G.alloy -= st.cost; payMaterial(planeHull.matCost); G.hangar[d.id] = (G.hangar[d.id] || 0) + 1; 
      addLog(`🏭 生产 1 架 T${d.tier} ${d.name}`, 'info'); 
      document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); return; 
    }
    
    const prodBtn = t.closest('[data-produce]'); 
    if(prodBtn){ 
      const d = G.planeDesigns.find(x=>x.id === prodBtn.dataset.produce); if(!d) return; 
      const st = planeStats(d); const hull = PLANE_HULLS[d.tier||1]; 
      if(G.alloy < st.cost){ toast('合金不足'); return; } 
      if(!hasMaterial(hull.matCost)){ toast('材料不足'); return; } 
      G.alloy -= st.cost; payMaterial(hull.matCost); G.hangar[d.id] = (G.hangar[d.id] || 0) + 1; 
      document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); return; 
    }
    
    if(t.dataset.delplane){ 
      const id = t.dataset.delplane; delete G.hangar[id]; G.planeDesigns = G.planeDesigns.filter(x=>x.id !== id); 
      document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); return; 
    }

    if(t.dataset.deploy){ const ship = findPlayerShipByUid(t.dataset.deploy); if(!ship) return; const available = Object.entries(G.hangar).filter(([k,v])=>v>0); if(!available.length){ toast('仓库没有可用飞机'); return; } const deployed = (ship.squadron||[]).length; const slotsLeft = ship.hangarSlots - deployed; if(slotsLeft <= 0){ toast('飞机位已满'); return; } let msg = `部署飞机（空位 ${slotsLeft}）：\n`; available.forEach(([id, cnt], i)=>{ const d = G.planeDesigns.find(x=>x.id===id); if(d) msg += `${i+1}. T${d.tier||1} ${d.name} ×${cnt}\n`; }); const ans = prompt(msg, '1'); const idx = parseInt(ans,10) - 1; if(isNaN(idx) || idx < 0 || idx >= available.length) return; const [designId] = available[idx]; const plane = createPlaneInstance(designId); if(!plane) return; plane.row = 0; ship.squadron = ship.squadron || []; ship.squadron.push(plane); G.hangar[designId]--; if(G.hangar[designId] <= 0) delete G.hangar[designId]; document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); return; }
    if(t.dataset.recall){ const ship = findPlayerShipByUid(t.dataset.recall); if(!ship || !ship.squadron) return; for(const plane of ship.squadron){ G.hangar[plane.designId] = (G.hangar[plane.designId]||0) + 1; } ship.squadron = []; document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); return; }

    const hb = t.closest('[data-hull]'); 
    if(hb && !hb.disabled){ 
      const newHull = +hb.dataset.hull; G.designHull = newHull; const cap = newHull + 1; 
      for(const slot of MOD_KEYS){ const sel = G.designMods[slot]; if(sel && sel.tier > cap) G.designMods[slot] = null; } 
      document.getElementById('rightBody').dataset.sig=''; renderRight(); return; 
    }
    
    if(t.dataset.unlock){ 
      const r = unlockHull(+t.dataset.unlock); if(!r.ok) toast(r.reason); 
      document.getElementById('rightBody').dataset.sig=''; renderRight(); return; 
    }

    if(t.dataset.savedesign){ 
      const inp = document.getElementById('designNameInput'); 
      const name = (inp && inp.value.trim()) || '未命名方案'; 
      const st = designStats(G.designMods, G.designHull, G.designClass); 
      if(st.size > st.space){ toast('超出船体空间'); return; } 
      if(st.totalDmg <= 0 && st.hangarSlots <= 0){ toast('这艘船没有任何武器或飞机位'); return; } 
      const req = checkClassReq(G.designClass, G.designMods, G.designHull); 
      if(!req.ok){ toast(req.reason); return; } 
      
      if (G.editingDesignId) {
        const idx = G.designs.findIndex(x => x.id === G.editingDesignId);
        if (idx !== -1) {
          G.designs[idx] = { id: G.editingDesignId, name, hullTier: G.designHull, shipClass: G.designClass, mods: JSON.parse(JSON.stringify(G.designMods)) };
          addLog(`💾 修改方案「${name}」`, 'info');
          toast('✅ 修改已保存');
        }
        G.editingDesignId = null;
      } else {
        G.designs.push({ id: 'd' + Date.now() + Math.random().toString(36).slice(2,6), name, hullTier: G.designHull, shipClass: G.designClass, mods: JSON.parse(JSON.stringify(G.designMods)) }); 
        addLog(`💾 保存方案「${name}」`, 'info'); 
      }
      
      document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); return; 
    }

    const bd = t.closest('[data-builddesign]'); 
    if(bd){ 
      if(startBuild(bd.dataset.builddesign, G.playerHomeId)){ 
        document.getElementById('rightBody').dataset.sig=''; renderRight(); 
      } else { toast('资源/材料不足或超空间'); } 
      return; 
    }
    
    if(t.dataset.deldesign){ 
      G.designs = G.designs.filter(d=>d.id !== t.dataset.deldesign); 
      document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); return; 
    }

    if(t.dataset.upgrade){ if(upgradeRegion(+t.dataset.upgrade)){ document.getElementById('rightBody').dataset.sig=''; renderRight(); } return; }
    const fb = t.closest('[data-facility]'); if(fb){ if(buildFacility(+fb.dataset.region, fb.dataset.facility)){ document.getElementById('rightBody').dataset.sig=''; renderRight(); } else toast('资源不足或已达上限'); return; }

    if(t.dataset.attack){ openAttackSelect(+t.dataset.attack); return; }

    if(t.dataset.selectall){ if(!attackSelect) return; for(const p of G.planets){ if(p.id === attackSelect.targetId) continue; for(const s of p.garrison) if(s.owner==='player' && s.hp>0) attackSelect.selected.add(s.uid); } document.getElementById('rightBody').dataset.sig=''; renderRight(); return; }
    if(t.dataset.selectnone){ if(!attackSelect) return; attackSelect.selected.clear(); document.getElementById('rightBody').dataset.sig=''; renderRight(); return; }
    if(t.dataset.selectgroup){ if(!attackSelect) return; const gs = getAllPlayerShipsByGroup(t.dataset.selectgroup); const allSel = gs.every(s => attackSelect.selected.has(s.uid)); if(allSel) for(const s of gs) attackSelect.selected.delete(s.uid); else for(const s of gs) attackSelect.selected.add(s.uid); document.getElementById('rightBody').dataset.sig=''; renderRight(); return; }
    if(t.dataset.cancelattack){ attackSelect = null; document.getElementById('rightBody').dataset.sig=''; renderRight(); return; }
    
    if(t.dataset.confirmattack){
      if(!attackSelect) return;
      const targetId = attackSelect.targetId;
      const sel = [...attackSelect.selected];
      if(!sel.length) return;
      const taskType = document.getElementById('fleetTaskSelect')?.value || 'focus_attack';
      const byRegion = {};
      for(const p of G.planets){
        for(const s of p.garrison){
          if(sel.includes(s.uid) && s.hp > 0){ (byRegion[p.id] = byRegion[p.id] || []).push(s); }
        }
      }
      for(const fromId in byRegion){
        const ships = byRegion[fromId];
        const from = G.planets[+fromId];
        from.garrison = from.garrison.filter(s => !ships.includes(s));
        launchFleet('player', ships, +fromId, targetId, 'attack', { type: taskType });
      }
      addLog(`🚀 派遣 ${sel.length} 艘前往 ${G.planets[targetId].name}`, 'info');
      attackSelect = null; G.tab = 'region'; G.selected = targetId;
      document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty();
      return;
    }

    if(t.dataset.selectdesign) {
      G.tab = 'shipyard';
      document.getElementById('rightBody').dataset.sig = '';
      renderRight();
      toast('请选择造船厂并点击“批量建造”');
      return;
    }
    
    if(t.dataset.showqueue) {
      renderBuildQueueModal();
      return;
    }

    if(t.dataset.editdesign) {
      const d = G.designs.find(x => x.id === t.dataset.editdesign);
      if(d) {
        G.editingDesignId = d.id;
        G.designHull = d.hullTier;
        G.designClass = d.shipClass;
        G.designMods = JSON.parse(JSON.stringify(d.mods));
        G.designName = d.name;
        document.getElementById('rightBody').dataset.sig = '';
        renderRight();
        toast('✏️ 已载入设计，可修改后保存');
      }
      return;
    }
    if(t.dataset.canceledit) {
      G.editingDesignId = null;
      G.designName = '新设计';
      document.getElementById('rightBody').dataset.sig = '';
      renderRight();
      return;
    }
    if(t.dataset.exportdesign) {
      const d = G.designs.find(x => x.id === t.dataset.exportdesign);
      if(d) {
        const copyData = JSON.parse(JSON.stringify(d));
        delete copyData.id; 
        navigator.clipboard.writeText(JSON.stringify(copyData, null, 2)).then(() => toast('📋 舰船代码已复制到剪贴板')).catch(() => toast('❌ 复制失败，请手动截图'));
      }
      return;
    }
    if(t.dataset.importdesign) {
      const str = prompt('请粘贴由游戏导出的舰船 JSON 代码：');
      if(!str) return;
      try {
        const d = JSON.parse(str);
        if(!d.name || !d.hullTier || !d.mods) throw new Error('格式错误');
        d.id = 'd' + Date.now() + Math.random().toString(36).slice(2,6);
        G.designs.push(d);
        document.getElementById('rightBody').dataset.sig = '';
        renderRight(); markDirty();
        toast('✅ 舰船设计导入成功');
      } catch(e) {
        toast('❌ 导入失败：' + e.message);
      }
      return;
    }

    if(t.dataset.editplanedesign) {
      const d = G.planeDesigns.find(x => x.id === t.dataset.editplanedesign);
      if(d) {
        G.editingPlaneDesignId = d.id;
        G.planeDesign = JSON.parse(JSON.stringify(d));
        document.getElementById('rightBody').dataset.sig = '';
        renderRight();
        toast('✏️ 已载入战机设计');
      }
      return;
    }
    if(t.dataset.canceleditplane) {
      G.editingPlaneDesignId = null;
      G.planeDesign.name = '新战机';
      document.getElementById('rightBody').dataset.sig = '';
      renderRight();
      return;
    }
    if(t.dataset.exportplanedesign) {
      const d = G.planeDesigns.find(x => x.id === t.dataset.exportplanedesign);
      if(d) {
        const copyData = JSON.parse(JSON.stringify(d));
        delete copyData.id;
        navigator.clipboard.writeText(JSON.stringify(copyData, null, 2)).then(() => toast('📋 战机代码已复制')).catch(() => toast('❌ 复制失败'));
      }
      return;
    }
    if(t.dataset.importplanedesign) {
      const str = prompt('请粘贴由游戏导出的战机 JSON 代码：');
      if(!str) return;
      try {
        const d = JSON.parse(str);
        if(!d.name || !d.tier || !d.type) throw new Error('格式错误');
        d.id = 'pd' + Date.now() + Math.random().toString(36).slice(2,5);
        G.planeDesigns.push(d);
        document.getElementById('rightBody').dataset.sig = '';
        renderRight(); markDirty();
        toast('✅ 战机设计导入成功');
      } catch(e) {
        toast('❌ 导入失败：' + e.message);
      }
      return;
    }
  });

  rightBody.addEventListener('change', ev=>{
    const sel = ev.target;
    if(sel.type === 'checkbox' && sel.dataset.seluid){
      if(!attackSelect) return;
      if(sel.checked) attackSelect.selected.add(sel.dataset.seluid);
      else attackSelect.selected.delete(sel.dataset.seluid);
      document.getElementById('rightBody').dataset.sig=''; renderRight(); return;
    }
    
    if(sel.dataset && sel.dataset.planemod){
      const kind = sel.dataset.planemod, v = sel.value;
      if(!v){ if(kind === 'weapon') G.planeDesign.weapons.main = null; else G.planeDesign[kind] = null; }
      else {
        const [prefix, rest] = v.split(':'), parts = rest.split('|'), t = +parts[0];
        if(kind === 'weapon'){ const key = parts[1]; const m = mkPlaneWeapon(key, t); m.tier = t; G.planeDesign.weapons.main = m; }
        else if(kind === 'armor'){ const m = mkPlaneArmor(t); m.tier = t; G.planeDesign.armor = m; }
        else if(kind === 'engine'){ const m = mkPlaneEngine(t); m.tier = t; G.planeDesign.engine = m; }
        else if(kind === 'reactor'){ const m = mkPlaneReactor(t); m.tier = t; G.planeDesign.reactor = m; }
      }
      document.getElementById('rightBody').dataset.sig=''; renderRight(); return;
    }
    if(sel.dataset && sel.dataset.mod){
      const slot = sel.dataset.mod, v = sel.value;
      if(!v) G.designMods[slot] = null;
      else {
        const [tt, ss, key] = v.split('|'), tier = +tt;
        const list = getModuleList(slot, tier, ss, G.designHull);
        const obj = list.find(m => (m.key||'') === key) || list[0];
        if(obj) G.designMods[slot] = { tier, size: ss, obj };
      }
      document.getElementById('rightBody').dataset.sig=''; renderRight(); return;
    }
    if(sel.dataset && sel.dataset.shipgroup){
      const ship = findPlayerShipByUid(sel.dataset.shipgroup);
      if(ship) ship.groupId = sel.value || null;
      document.getElementById('rightBody').dataset.sig=''; renderRight(); markDirty(); return;
    }
  });

  rightBody.addEventListener('input', ev=>{
    if(ev.target.id === 'designNameInput') G.designName = ev.target.value;
    if(ev.target.id === 'planeNameInput') G.planeDesign.name = ev.target.value;
  });
}

/* 地图交互 */
let isDragging = false, dragStartX = 0, dragStartY = 0, dragCamX = 0, dragCamY = 0, hasDragged = false;

// ★ 手机端侧边栏控制
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileCloseBtn = document.getElementById('mobileCloseBtn');
const rightPanel = document.getElementById('right');
if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', () => rightPanel.classList.add('show'));
if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', () => rightPanel.classList.remove('show'));

// 地图触摸与拖拽
canvas.addEventListener('pointerdown', ev=>{ 
  if (G.isDrawingZone) {
    const w = screenToWorld(ev.clientX, ev.clientY);
    G.drawingZone = { startX: w.x, startY: w.y, curX: w.x, curY: w.y };
    return; 
  }
  isDragging = true; hasDragged = false; dragStartX = ev.clientX; dragStartY = ev.clientY; dragCamX = CAM.x; dragCamY = CAM.y; 
  if(ev.pointerType === 'mouse') canvas.setPointerCapture(ev.pointerId); 
});

canvas.addEventListener('pointermove', ev=>{ 
  if (G.isDrawingZone && G.drawingZone) {
    const w = screenToWorld(ev.clientX, ev.clientY);
    G.drawingZone.curX = w.x;
    G.drawingZone.curY = w.y;
    return;
  }
  if(!isDragging) return; 
  const dx = ev.clientX - dragStartX, dy = ev.clientY - dragStartY; 
  if(Math.abs(dx) + Math.abs(dy) > 4) hasDragged = true; 
  CAM.x = dragCamX - dx / CAM.scale; CAM.y = dragCamY - dy / CAM.scale; 
});

canvas.addEventListener('pointerup', ev=>{
  if (G.isDrawingZone && G.drawingZone) {
    const dz = G.drawingZone;
    const x1 = Math.min(dz.startX, dz.curX), x2 = Math.max(dz.startX, dz.curX);
    const y1 = Math.min(dz.startY, dz.curY), y2 = Math.max(dz.startY, dz.curY);
    
    if (x2 - x1 < 10 || y2 - y1 < 10) {
      toast('⚠️ 划定的区域太小了');
      G.isDrawingZone = false; G.drawingZone = null;
      document.getElementById('rightBody').dataset.sig = ''; renderRight();
      return;
    }

    const targets = [];
    const pad = 20 / CAM.scale;
    for(const p of G.planets) {
      if (p.owner === 'player') continue;
      if (p.x >= x1 - pad && p.x <= x2 + pad && p.y >= y1 - pad && p.y <= y2 + pad) targets.push(p.id);
    }
    
    if (targets.length === 0) toast('⚠️ 该区域内没有敌方或中立目标');
    else {
      if (!G.zones) G.zones = [];
      G.zones.push({ id: 'z'+Date.now(), name: '战区 '+(G.zones.length+1), x1, y1, x2, y2, targets });
      toast(`✅ 划定战区成功，包含 ${targets.length} 个目标`);
    }
    G.isDrawingZone = false; G.drawingZone = null;
    document.getElementById('rightBody').dataset.sig = ''; renderRight(); markDirty();
    return;
  }
  
  if(!isDragging) return; 
  isDragging = false; 
  if(hasDragged) return;
  
  const w = screenToWorld(ev.clientX, ev.clientY);
  let best = null, bestD = Infinity;
  const b = viewBounds();
  
  for (const f of G.fleets) {
    if (f.owner !== 'player') continue;
    const d = Math.hypot(f.x - w.x, f.y - w.y);
    if (d < 40 / CAM.scale) { 
      G.selectedFleetId = f.id; G.selected = null; G.tab = 'fleet'; 
      document.getElementById('rightBody').dataset.sig = ''; renderRight(); return; 
    }
  }

  for(const p of G.planets){
    if(p.x < b.x1-20 || p.x > b.x2+20 || p.y < b.y1-20 || p.y > b.y2+20) continue;
    if((p.visibility||0) < 0.15) continue;
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    if(d < bestD){ bestD = d; best = p; }
  }
  
  const threshold = 30 / CAM.scale;
  if(best && bestD < threshold){
    G.selected = best.id; G.tab = 'region'; attackSelect = null;
    document.getElementById('rightBody').dataset.sig = ''; renderRight();
    // 手机端点击星球后自动弹出侧边栏
    if (window.innerWidth <= 768) rightPanel.classList.add('show');
  }
});

// ★ 滚轮缩放（桌面端）
canvas.addEventListener('wheel', ev=>{ 
  ev.preventDefault(); 
  const wx0 = screenToWorld(ev.clientX, ev.clientY); 
  const factor = ev.deltaY > 0 ? 0.85 : 1.18; 
  CAM.scale = clamp(CAM.scale * factor, CAM.minScale, CAM.maxScale); 
  const wx1 = screenToWorld(ev.clientX, ev.clientY); 
  CAM.x += wx0.x - wx1.x; CAM.y += wx0.y - wx1.y; markDirty(); 
}, { passive: false });

// ★ 双指缩放（手机端）
let lastTouchDist = 0;
canvas.addEventListener('touchstart', ev => {
  if (ev.touches.length === 2) {
    lastTouchDist = Math.hypot(
      ev.touches[0].clientX - ev.touches[1].clientX,
      ev.touches[0].clientY - ev.touches[1].clientY
    );
  }
}, { passive: false });

canvas.addEventListener('touchmove', ev => {
  if (ev.touches.length === 2) {
    ev.preventDefault(); // 阻止页面滚动
    const dist = Math.hypot(
      ev.touches[0].clientX - ev.touches[1].clientX,
      ev.touches[0].clientY - ev.touches[1].clientY
    );
    if (lastTouchDist > 0) {
      const factor = dist / lastTouchDist;
      const cx = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
      const cy = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;
      const wx0 = screenToWorld(cx, cy);
      CAM.scale = clamp(CAM.scale * factor, CAM.minScale, CAM.maxScale);
      const wx1 = screenToWorld(cx, cy);
      CAM.x += wx0.x - wx1.x; CAM.y += wx0.y - wx1.y; 
    }
    lastTouchDist = dist;
  }
}, { passive: false });

canvas.addEventListener('touchend', ev => {
  if (ev.touches.length < 2) lastTouchDist = 0;
});

document.getElementById('btnZoomIn').addEventListener('click', ()=>{ CAM.scale = clamp(CAM.scale * 1.3, CAM.minScale, CAM.maxScale); });
document.getElementById('btnZoomOut').addEventListener('click', ()=>{ CAM.scale = clamp(CAM.scale / 1.3, CAM.minScale, CAM.maxScale); });
document.getElementById('btnCenter').addEventListener('click', ()=>{ const home = G.planets[G.playerHomeId]; if(home){ CAM.x = home.x; CAM.y = home.y; CAM.scale = 1; } });


/* =========================================================
   游戏速度与暂停控件
   ========================================================= */
function updateSpeedUI() {
  document.querySelectorAll('.speed-btn[data-speed]').forEach(btn => {
    btn.classList.toggle('on', parseInt(btn.dataset.speed) === G.gameSpeed);
  });
  const btnPause = document.getElementById('btnPause');
  if (btnPause) {
    btnPause.innerHTML = G.paused ? '▶' : '⏸';
    btnPause.classList.toggle('on', G.paused);
  }
}

function setGameSpeed(speed) {
  G.gameSpeed = speed;
  updateSpeedUI();
}

function togglePause() {
  G.paused = !G.paused;
  updateSpeedUI();
}

document.addEventListener('click', (ev) => {
  const speedBtn = ev.target.closest('.speed-btn[data-speed]');
  if (speedBtn) {
    setGameSpeed(parseInt(speedBtn.dataset.speed));
    if (G.paused) { G.paused = false; updateSpeedUI(); }
    return;
  }
  if (ev.target.closest('#btnPause')) {
    togglePause();
    return;
  }
});

document.addEventListener('keydown', (ev) => {
  const ae = document.activeElement;
  const tag = ae ? ae.tagName : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (typeof window.battleAnimId !== 'undefined' && window.battleAnimId !== null) return;

  if (ev.code === 'Space') {
    ev.preventDefault();
    togglePause();
  } else if (ev.key === '+' || ev.key === '=') {
    ev.preventDefault();
    if (G.gameSpeed === 1) setGameSpeed(2);
    else if (G.gameSpeed === 2) setGameSpeed(4);
  } else if (ev.key === '-' || ev.key === '_') {
    ev.preventDefault();
    if (G.gameSpeed === 4) setGameSpeed(2);
    else if (G.gameSpeed === 2) setGameSpeed(1);
  }
});

const btnGuest = document.getElementById('btnGuest');
if (btnGuest) {
  btnGuest.addEventListener('click', () => {
    G.playerUser = null; G.isGuest = true;
    showMenuScreen('menuSaves');
    document.getElementById('btnLogout').style.display = 'none';
    document.getElementById('menuUserInfo').textContent = '游客模式';
    refreshSaveList();
  });
}

const btnLogin = document.getElementById('btnLogin');
if (btnLogin) {
  btnLogin.addEventListener('click', async () => {
    const usernameInput = document.getElementById('authUsername');
    const pwdInput = document.getElementById('authPassword');
    if (!usernameInput || !pwdInput) return toast('❌ 界面错误');
    const username = usernameInput.value.trim(), pwd = pwdInput.value;
    if (!username || !pwd) return toast('请输入用户名和密码');
    if (!supabaseClient) return toast('⚠️ 未配置 Supabase');
    
    try {
      const { data, error } = await withRetry(() => supabaseClient.auth.signInWithPassword({ email: usernameToEmail(username), password: pwd }));
      if (error) throw error;
      G.playerUser = data.user; G.isGuest = false;
      showMenuScreen('menuSaves');
      document.getElementById('btnLogout').style.display = 'block';
      document.getElementById('menuUserInfo').textContent = '已登录: ' + (data.user.user_metadata?.username || username);
      refreshSaveList();
    } catch (err) { toast('❌ 登录失败: ' + (err.message || '网络异常')); }
  });
}

const btnRegister = document.getElementById('btnRegister');
if (btnRegister) {
  btnRegister.addEventListener('click', async () => {
    const usernameInput = document.getElementById('authUsername');
    const pwdInput = document.getElementById('authPassword');
    if (!usernameInput || !pwdInput) return toast('❌ 界面错误');
    const username = usernameInput.value.trim(), pwd = pwdInput.value;
    if (!username || !pwd) return toast('请输入用户名和密码');
    if (pwd.length < 6) return toast('密码至少 6 位');
    const confirmPwd = prompt('请再次输入密码以确认：');
    if (confirmPwd === null) return;
    if (pwd !== confirmPwd) return toast('两次输入的密码不一致');
    if (!supabaseClient) return toast('⚠️ 未配置 Supabase');
    
    try {
      const { data, error } = await withRetry(() => supabaseClient.auth.signUp({ email: usernameToEmail(username), password: pwd, options: { data: { username } } }));
      if (error) throw error;
      toast('✅ 注册成功，请点击登录');
    } catch (err) { toast('❌ 注册失败: ' + (err.message || '网络异常')); }
  });
}

const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    G.playerUser = null; G.isGuest = false;
    showMenuScreen('menuLogin');
  });
}

const btnNewGame = document.getElementById('btnNewGame');
if (btnNewGame) {
  btnNewGame.addEventListener('click', () => {
    showMenuScreen('menuNew');
    document.getElementById('inputNationName').focus();
  });
}

const btnBackToSaves = document.getElementById('btnBackToSaves');
if (btnBackToSaves) {
  btnBackToSaves.addEventListener('click', () => { showMenuScreen('menuSaves'); });
}

const btnConfirmNew = document.getElementById('btnConfirmNew');
if (btnConfirmNew) {
  btnConfirmNew.addEventListener('click', async () => {
    try {
      const name = document.getElementById('inputNationName').value.trim() || '泰拉联邦';
      G.nationName = name.slice(0, 12);
      newGame();
      if (G.playerUser && !G.isGuest) { G.activeSaveId = crypto.randomUUID(); await uploadCloudSave(G.nationName); }
      else saveToLocal(true);
      enterGame();
    } catch (e) {
      console.error(e);
      alert("进入游戏失败: " + e.message);
    }
  });
}

const btnMenu = document.getElementById('btnMenu');
if (btnMenu) {
  btnMenu.addEventListener('click', () => {
    if (!confirm('是否返回主菜单？游戏进度将自动保存。')) return;
    saveToLocal(true);
    if (G.playerUser && !G.isGuest && G.activeSaveId) uploadCloudSave(G.nationName);
    G.isPlaying = false; G.paused = true;
    document.getElementById('gameUI').style.display = 'none';
    document.getElementById('appMenu').style.display = 'flex';
    showMenuScreen('menuSaves'); refreshSaveList();
  });
}