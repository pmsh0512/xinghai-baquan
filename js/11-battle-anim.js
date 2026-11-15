/* =========================================================
   11-battle-anim.js — 战斗动画浮层
   ========================================================= */

// ★ 使用 window 挂载全局变量，防止因重复声明导致整个脚本崩溃
window.battleAnimId = null;
window.battleAnimTimer = null;
window.battleAnimPrevHp = {};

function openBattleAnim(planetId){
  const p = G.planets[planetId];
  if(!p || !p.battle){ toast('此星球没有战斗'); return; }
  window.battleAnimId = p.battle.id;
  window.battleAnimPrevHp = {};
  buildBattleOverlay();
  updateBattleOverlay();
  if(window.battleAnimTimer) clearInterval(window.battleAnimTimer);
  window.battleAnimTimer = setInterval(updateBattleOverlay, 150);
}

function closeBattleAnim(){
  window.battleAnimId = null;
  if(window.battleAnimTimer){ clearInterval(window.battleAnimTimer); window.battleAnimTimer = null; }
  const el = document.getElementById('battleOverlay');
  if(el) el.classList.remove('show');
}

function buildBattleOverlay(){
  let el = document.getElementById('battleOverlay');
  if(el) el.remove();
  el = document.createElement('div');
  el.id = 'battleOverlay';
  el.className = 'battle-overlay show';
  el.innerHTML = `<div class="battle-modal">
    <div class="battle-title"><span id="battleTitleText">⚔ 战斗</span><button class="battle-close-x" id="battleCloseBtn">×</button></div>
    <div class="air-zone" id="battleAirZone"></div>
    <div class="battle-arena">
      <div class="battle-side"><div class="side-label" id="atkLabel"></div><div class="formation-view" id="atkFormation">${formationSkeletonHTML('atk')}</div></div>
      <div class="battle-vs">VS</div>
      <div class="battle-side"><div class="side-label" id="defLabel"></div><div class="formation-view" id="defFormation">${formationSkeletonHTML('def')}</div></div>
    </div>
    <div class="battle-log-small" id="battleLogSmall"></div>
  </div>`;
  document.body.appendChild(el);
  document.getElementById('battleCloseBtn').addEventListener('click', closeBattleAnim);
}

function formationSkeletonHTML(side){
  let html = '<div class="battle-cols">';
  const visualOrder = (side === 'atk') ? [3,2,1,0] : [0,1,2,3];
  for(const c of visualOrder){
    html += `<div class="battle-col" id="${side}_col_${c}"><div class="battle-col-title">${COL_NAMES[c]}</div><div class="battle-col-ships" id="${side}_ships_${c}"></div></div>`;
  }
  html += '</div>';
  return html;
}

function updateBattleOverlay(){
  const el = document.getElementById('battleOverlay');
  if(!el || !el.classList.contains('show')) return;
  const b = G.battles.find(x => x.id === window.battleAnimId);
  const titleEl = document.getElementById('battleTitleText');
  if(!b){ if(titleEl) titleEl.textContent = '⚔ 战斗已结束'; return; }
  
  const region = G.planets[b.regionId];
  if(b.over){
    const resultText = b.outcome === 'attacker' ? '✅ 进攻方胜利' : b.outcome === 'defender' ? '🛡 防御方胜利' : b.outcome === 'mutual' ? '💥 两败俱伤' : '⏱ 超时结束';
    if(titleEl) titleEl.textContent = `⚔ ${region.name} · ${resultText}`;
    el.querySelector('.battle-vs')?.classList.add('ended');
  } else {
    if(titleEl) titleEl.textContent = `⚔ ${region.name} · ${b.time.toFixed(1)}s`;
  }
  
  const atkLbl = document.getElementById('atkLabel'); atkLbl.textContent = `${b.over?'✓':'⚔'} 进攻 · ${G.factions[b.attackerOwner]?.name} · ${b.attacker.filter(s=>s.hp>0).length}/${b.attacker.length}`; atkLbl.style.color = G.factions[b.attackerOwner]?.color || '#fff';
  const defLbl = document.getElementById('defLabel'); defLbl.textContent = `${b.over?'✓':'🛡'} 防御 · ${G.factions[b.defenderOwner]?.name} · ${b.defender.filter(s=>s.hp>0).length}/${b.defender.length}`; defLbl.style.color = G.factions[b.defenderOwner]?.color || '#fff';
  
  updateAirZone(b);
  updateFormationSide('atk', b.attacker);
  updateFormationSide('def', b.defender);
  
  const logEl = document.getElementById('battleLogSmall');
  logEl.innerHTML = b.log.slice(-6).reverse().map(l=>`<div class="logLine ${l.type}"><span class="r">${l.r}</span>${l.text}</div>`).join('');
}

function updateAirZone(b){
  const zone = document.getElementById('battleAirZone');
  if(!zone) return;
  const atkP = b.atkPlanes || [], defP = b.defPlanes || [];
  if(!atkP.length && !defP.length){ zone.innerHTML = ''; return; }
  const renderSide = (planes, color) => {
    const front = planes.filter(p=>p.row===0), back = planes.filter(p=>p.row===1);
    const renderRow = (arr, label) => {
      if(!arr.length) return '';
      return `<div class="air-row-label">${label}</div><div class="air-row">${arr.map(p=>`<span class="plane-token ${p.hp<=0?'dead':''}">${p.hp<=0?'✕':'✈'} T${p.tier||1}${p.name.slice(-3)}</span>`).join('')}</div>`;
    };
    return `<div class="air-side"><div class="air-side-label" style="color:${color}">✈ 空军 ${planes.filter(p=>p.hp>0).length}/${planes.length}</div>${renderRow(front, '前排')}${renderRow(back, '后排')}</div>`;
  };
  zone.innerHTML = renderSide(atkP, G.factions[b.attackerOwner]?.color || '#fff') + renderSide(defP, G.factions[b.defenderOwner]?.color || '#fff');
}

function updateFormationSide(side, ships){
  const byCol = [[],[],[],[]];
  for(const s of ships) byCol[clamp(s.column || 0, 0, 3)].push(s);
  let frontCol = -1;
  for(let c = 0; c < 4; c++){ if(byCol[c].some(s => s.hp > 0)){ frontCol = c; break; } }
  
  for(let c = 0; c < 4; c++){
    const colEl = document.getElementById(`${side}_col_${c}`); if(!colEl) continue;
    colEl.classList.toggle('front', c === frontCol);
    const shipsEl = document.getElementById(`${side}_ships_${c}`); if(!shipsEl) continue;
    const existing = shipsEl.querySelectorAll('.battle-ship');
    const sameLen = existing.length === byCol[c].length;
    const sameOrder = sameLen && Array.from(existing).every((n,i)=>n.dataset.uid === byCol[c][i].uid);
    if(sameOrder){ for(let i = 0; i < byCol[c].length; i++) updateShipCard(existing[i], byCol[c][i]); }
    else { shipsEl.innerHTML = byCol[c].map(shipCardHTML).join(''); }
  }
}

function shipCardHTML(s){
  const hpPct = Math.max(0, s.hp / s.maxHp * 100), shdPct = s.maxShd > 0 ? Math.max(0, s.shd / s.maxShd * 100) : 0, dead = s.hp <= 0;
  const hpCls = hpPct > 60 ? '' : (hpPct > 30 ? 'w' : 'c'), shortName = s.name.replace(/-\d+$/, '').slice(0, 8);
  const charge = s.mainCharge > 0 ? clamp(s._chMain / s.mainCharge, 0, 1) : 0, full = charge >= 1 ? 'full' : '';
  return `<div class="battle-ship ${dead ? 'dead' : ''}" data-uid="${s.uid}">
    <div class="battle-ship-name">${shortName}</div>
    <div class="bar hp ${hpCls}" style="width:100%"><i style="width:${hpPct}%"></i></div>
    <div class="bar shd" style="width:100%"><i style="width:${shdPct}%"></i></div>
    <div class="charge-bar ${full}"><i style="width:${charge*100}%"></i></div>
    <div class="battle-ship-hp">${dead ? '已击毁' : Math.ceil(s.hp) + '/' + s.maxHp}</div>
  </div>`;
}

function updateShipCard(cardEl, s){
  if(!cardEl || !s) return;
  const hpPct = Math.max(0, s.hp / s.maxHp * 100), shdPct = s.maxShd > 0 ? Math.max(0, s.shd / s.maxShd * 100) : 0, dead = s.hp <= 0;
  const hpBar = cardEl.querySelector('.bar.hp'); if(hpBar){ hpBar.className = 'bar hp ' + (hpPct > 60 ? '' : (hpPct > 30 ? 'w' : 'c')); hpBar.querySelector('i').style.width = hpPct + '%'; }
  const shdBar = cardEl.querySelector('.bar.shd'); if(shdBar){ shdBar.querySelector('i').style.width = shdPct + '%'; }
  const chargeBar = cardEl.querySelector('.charge-bar'); if(chargeBar){ const charge = s.mainCharge > 0 ? clamp(s._chMain / s.mainCharge, 0, 1) : 0; chargeBar.querySelector('i').style.width = charge * 100 + '%'; chargeBar.classList.toggle('full', charge >= 1); }
  const hpText = cardEl.querySelector('.battle-ship-hp'); if(hpText) hpText.textContent = dead ? '已击毁' : Math.ceil(s.hp) + '/' + s.maxHp;
  cardEl.classList.toggle('dead', dead);
  
  const prev = window.battleAnimPrevHp[s.uid];
  if(prev !== undefined && s.hp < prev && s.hp > 0){
    cardEl.classList.remove('hit'); void cardEl.offsetWidth; cardEl.classList.add('hit');
    setTimeout(()=>{ const c = document.querySelector(`.battle-ship[data-uid="${s.uid}"]`); if(c) c.classList.remove('hit'); }, 380);
  }
  window.battleAnimPrevHp[s.uid] = s.hp;
}

document.addEventListener('keydown', ev=>{ if(ev.key === 'Escape' && window.battleAnimId !== null) closeBattleAnim(); });