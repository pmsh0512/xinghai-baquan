/* =========================================================
   net-lobby.js — 悬浮网络面板（WebSocket / BroadcastChannel）
   ========================================================= */

function _netPanelEl(){
  let el = document.getElementById('netPanel');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'netPanel';
  el.style.cssText = 'position:fixed;top:64px;right:16px;z-index:99999;width:280px;' +
    'background:rgba(10,18,36,.96);border:1px solid rgba(78,168,255,.4);border-radius:10px;' +
    'color:#cfe1ff;font:13px system-ui;padding:14px;box-shadow:0 8px 24px rgba(0,0,0,.5);';
  document.body.appendChild(el);
  return el;
}

function netPrefGet(key, def){
  try { const v = localStorage.getItem(key); return (v === null || v === '') ? def : v; }
  catch(e){ return def; }
}
function netPrefSet(key, val){
  try { localStorage.setItem(key, val); } catch(e){}
}

function netTransportLabel(){
  if (NET.transportKind === 'bc') return 'BroadcastChannel · ' + NET.roomId;
  if (NET.transportKind === 'ws'){
    const u = (NET._transport && NET._transport.ws) ? NET._transport.ws.url : (NET.lastWsUrl || '');
    return (NET.connected ? 'WebSocket · ' : 'WebSocket（未连接） · ') + u;
  }
  return '正在连接服务器…';
}

/* 房主提示其他玩家使用的访问地址（跟随实际 HTTP 端口） */
function netHttpHint(){
  const cfg = netConfig();
  const port = (cfg && cfg.httpPort) ? cfg.httpPort : (location.port || '80');
  return 'http://' + netPageHost() + ':' + port;
}

function netPlayerName(){
  return String(G.playerName || G.nationName || '玩家1').slice(0, 12);
}
function netSeatName(id){
  return (NET.names && NET.names[id]) || (G.factions && G.factions[id] && G.factions[id].name) || id;
}
function netRosterNames(){
  return (NET.roster || []).map(netSeatName);
}

let _multiRooms = [];

/* 统一刷新：多人菜单界面 + 游戏内悬浮面板 + 右下角入口 */
function netUiRefresh(){
  const tb = document.getElementById('netToggleBtn');
  if (tb) tb.style.display = (NET.role === 'solo') ? 'none' : 'block';

  const menu = document.getElementById('appMenu');
  const menuOpen = menu && getComputedStyle(menu).display !== 'none';
  const multi = document.getElementById('menuMulti');
  const multiOpen = menuOpen && multi && getComputedStyle(multi).display !== 'none';
  if (multiOpen) netMultiRender();
  else netRoomsStop();

  const panel = document.getElementById('netPanel');
  if (panel && panel.style.display !== 'none') netPanelRender();
}

let _netLobbyBusy = false;

function netPanelRender(){
  const el = _netPanelEl();
  const r = NET.role;
  const busy = _netLobbyBusy;
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <b style="color:#7fd3ff">🌐 联机 (M3)</b>
    <span style="cursor:pointer;color:#ff5a5a" id="netClose">✕</span>
  </div>`;

  if (r === 'solo'){
    const mode  = netPrefGet('xh_net_mode', 'ws');
    const wsUrl = netEffectiveWsUrl();
    const room  = netPrefGet('xh_net_room', NET.roomId);
    const roomName = netPrefGet('xh_net_name', (G.nationName || '玩家1') + ' 的房间');
    html += `
      <div style="margin-bottom:6px">传输方式：
        <select id="netMode" style="width:100%;margin-top:3px;background:#0a1428;border:1px solid #2a4a7a;color:#cfe1ff;padding:4px;border-radius:4px">
          <option value="ws" ${mode === 'ws' ? 'selected' : ''}>WebSocket（局域网服务器）</option>
          <option value="bc" ${mode === 'bc' ? 'selected' : ''}>BroadcastChannel（同一浏览器）</option>
        </select>
      </div>
      ${mode === 'ws' ? `
      <div style="margin-bottom:6px">服务器地址：
        <input id="netWsUrl" value="${wsUrl}" style="width:100%;margin-top:3px;background:#0a1428;border:1px solid #2a4a7a;color:#cfe1ff;padding:2px 6px;border-radius:4px">
      </div>
      <div style="margin-bottom:6px">房间名称：
        <input id="netRoomName" value="${_netEsc(roomName)}" style="width:100%;margin-top:3px;background:#0a1428;border:1px solid #2a4a7a;color:#cfe1ff;padding:2px 6px;border-radius:4px">
      </div>` : ''}
      <div style="margin-bottom:6px">房间号：
        <input id="netRoomId" value="${room}" style="width:100%;margin-top:3px;background:#0a1428;border:1px solid #2a4a7a;color:#cfe1ff;padding:2px 6px;border-radius:4px">
      </div>
      ${mode === 'ws' ? `
      <div style="margin:8px 0 4px;border-top:1px solid rgba(78,168,255,.2);padding-top:8px;display:flex;justify-content:space-between;align-items:center">
        <b style="color:#7fd3ff;font-size:12px">局域网房间</b>
        <span id="netRoomsRefresh" style="cursor:pointer;color:#8fa8d6;font-size:11px">刷新</span>
      </div>
      <div id="netRoomList" style="max-height:140px;overflow:auto;font-size:11px;color:#8fa8d6">正在读取房间列表…</div>
      <div id="netScanStatus" style="display:none;font-size:11px;color:#8fa8d6;margin-top:4px;line-height:1.5"></div>` : ''}
      <button class="speed-btn" id="netHostBtn" style="width:100%;margin-top:4px;background:#4ea8ff;color:#04121f;font-weight:700" ${busy ? 'disabled' : ''}>${busy ? '连 接 中…' : '开 房 间（我当主机）'}</button>
      <div style="height:10px"></div>
      <div style="margin-bottom:4px">以哪个身份加入：</div>
      <select id="netJoinAs" style="width:100%;background:#0a1428;border:1px solid #2a4a7a;color:#cfe1ff;padding:4px;border-radius:4px">
        ${HUMAN_IDS.slice(1).map(id => `<option value="${id}">${id}</option>`).join('')}
      </select>
      <button class="speed-btn" id="netJoinBtn" style="width:100%;margin-top:6px;background:#22c55e;color:#04121f;font-weight:700" ${busy ? 'disabled' : ''}>${busy ? '连 接 中…' : '加 入 房 间'}</button>
    `;
  } else if (r === 'host'){
    const conn = NET.connected;
    html += `
      <div style="color:#ffd75f;margin-bottom:4px">你是房主 · <b>${_netEsc(NET.roomName || NET.roomId)}</b></div>
      <div style="font-size:11px;color:#8fa8d6;margin-bottom:4px">房间号 <b>${_netEsc(NET.roomId)}</b></div>
      <div style="font-size:11px;margin-bottom:6px;color:${conn ? '#7fe08a' : '#ffb45e'}">${conn ? '✅ 已连接服务器' : '⚠ 未连接服务器'} · ${netTransportLabel()}</div>
      <div style="margin-bottom:6px">已入座：<b>${NET.roster.join(' · ') || '(空)'}</b></div>
      <div style="font-size:11px;color:#8fa8d6;margin-bottom:8px">
        其他玩家在「多人游戏」界面选择本房间加入（房间号 ${_netEsc(NET.roomId)}）。
      </div>
      <button class="speed-btn" id="netStartBtn" style="width:100%;background:#f59e0b;color:#04121f;font-weight:700" ${(G.isPlaying || !conn) ? 'disabled style="opacity:.45"' : ''}>开 始 游 戏</button>
      ${conn ? '' : '<button class="speed-btn" id="netReconnectBtn" style="width:100%;margin-top:6px;background:#4ea8ff;color:#04121f;font-weight:700">重 新 连 接</button>'}
      <button class="speed-btn" id="netExitBtn" style="width:100%;margin-top:6px;background:transparent;border:1px solid #4a5a7a">退 出 房 间</button>
    `;
  } else if (r === 'client'){
    html += `
      <div style="color:#7fd3ff;margin-bottom:4px">已连接 · 身份 <b>${NET.myPlayerId}</b> · 房间 <b>${NET.roomId}</b></div>
      <div style="font-size:11px;color:#8fa8d6;margin-bottom:6px">${netTransportLabel()}</div>
      <div style="font-size:11px;color:#8fa8d6">等待房主开始…（或游戏已开始）</div>
      <button class="speed-btn" id="netExitBtn" style="width:100%;margin-top:8px;background:transparent;border:1px solid #4a5a7a">断 开</button>
    `;
  }
  el.innerHTML = html;

  // 事件绑定
  const $ = (id) => document.getElementById(id);
  $('netClose').onclick = () => { el.style.display = 'none'; netRoomsStop(); };

  if (r === 'solo'){
    const modeSel = $('netMode');
    modeSel.onchange = () => {
      netPrefSet('xh_net_mode', modeSel.value);
      netPanelRender();
    };
    const wsInput = $('netWsUrl');
    if (wsInput) wsInput.oninput = () => netPrefSet('xh_net_url', wsInput.value.trim());
    const roomInput = $('netRoomId');
    roomInput.oninput = () => netPrefSet('xh_net_room', roomInput.value.trim());
    const roomNameInput = $('netRoomName');
    if (roomNameInput) roomNameInput.oninput = () => netPrefSet('xh_net_name', roomNameInput.value.trim());

    const refreshBtn = $('netRoomsRefresh');
    if (refreshBtn) refreshBtn.onclick = () => netRoomsPoll(true);
    const roomListEl = $('netRoomList');
    if (roomListEl) roomListEl.onclick = (ev) => {
      const btn = ev.target.closest('[data-roomjoin]');
      if (!btn || btn.disabled) return;
      const rid = btn.getAttribute('data-roomjoin');
      const slot = btn.getAttribute('data-roomslot');
      if (!slot){ toast('房间已满'); return; }
      const url = btn.getAttribute('data-roomurl') || netEffectiveWsUrl();
      netPrefSet('xh_net_url', url);
      netPrefSet('xh_net_room', rid);
      netLobbyJoin('ws', rid, url, slot);
    };

    $('netHostBtn').onclick = () => {
      if (_netLobbyBusy) return;
      const mode = $('netMode').value;
      const room = $('netRoomId').value.trim() || 'xinghai-m1';
      const url  = mode === 'ws' ? (($('netWsUrl').value.trim()) || netEffectiveWsUrl()) : '';
      const name = mode === 'ws' ? (($('netRoomName').value.trim()) || room) : '';
      netPrefSet('xh_net_mode', mode);
      netPrefSet('xh_net_room', room);
      if (mode === 'ws'){ netPrefSet('xh_net_url', url); netPrefSet('xh_net_name', name); }
      netLobbyHost(mode, room, url, name);
    };
    $('netJoinBtn').onclick = () => {
      if (_netLobbyBusy) return;
      const mode = $('netMode').value;
      const room = $('netRoomId').value.trim() || 'xinghai-m1';
      const url  = mode === 'ws' ? (($('netWsUrl').value.trim()) || netEffectiveWsUrl()) : '';
      const asId = $('netJoinAs').value;
      netPrefSet('xh_net_mode', mode);
      netPrefSet('xh_net_room', room);
      if (mode === 'ws') netPrefSet('xh_net_url', url);
      netLobbyJoin(mode, room, url, asId);
    };
  } else if (r === 'host'){
    $('netStartBtn').onclick = () => {
      if (NET.roster.length < 1 || !NET.connected) return;
      hostStartMatch();
    };
    const rc = $('netReconnectBtn');
    if (rc) rc.onclick = () => {
      const p = _netLastHost || { room: NET.roomId, url: netEffectiveWsUrl(), name: NET.roomName || NET.roomId };
      netLobbyHost('ws', p.room, p.url, p.name);
    };
    $('netExitBtn').onclick = () => {
      netClose();
      el.style.display = 'none';
    };
  } else if (r === 'client'){
    $('netExitBtn').onclick = () => { netClose(); el.style.display = 'none'; netUiRefresh(); };
  }

  if (r === 'solo' && document.getElementById('netRoomList')) netRoomsStart();
  else netRoomsStop();
}

/* ---------- 局域网房间列表 ---------- */
function _netEsc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function netRoomSlot(room){
  const ids = room && Array.isArray(room.ids) ? room.ids : [];
  for (const id of HUMAN_IDS.slice(1)){ if (ids.indexOf(id) < 0) return id; }
  return null;
}
function netRoomsRender(rooms, targetId){
  _multiRooms = Array.isArray(rooms) ? rooms.slice() : [];
  const el = document.getElementById(targetId || 'netRoomList');
  if (!el) return;
  if (!rooms || !rooms.length){
    el.innerHTML = '<div style="padding:6px 0;color:#8fa8d6">未发现已开启的房间</div>';
    return;
  }
  let html = '';
  for (const room of rooms){
    const slot = netRoomSlot(room);
    const started = !!room.started;
    const full = !slot;
    const dis = started || full;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <div style="min-width:0">
        <div style="color:#d8e2f5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_netEsc(room.name || room.id)}</div>
        <div>房主 ${_netEsc(room.host || '?')} · ${room.count || 0}/6 人 · ${started ? '游戏中' : '等待中'}</div>
      </div>
      <button class="btn sm ${dis ? '' : 'green'}" data-roomjoin="${_netEsc(room.id)}" data-roomslot="${slot || ''}" data-roomurl="${_netEsc(room._wsUrl || '')}" ${dis ? 'disabled style="opacity:.4"' : ''}>${started ? '游戏中' : (full ? '满员' : '加入')}</button>
    </div>`;
  }
  el.innerHTML = html;
}

function netRoomListTargetId(){
  if (NET.role !== 'solo') return null;
  const menu = document.getElementById('appMenu');
  const menuOpen = menu && getComputedStyle(menu).display !== 'none';
  const multi = document.getElementById('menuMulti');
  const multiOpen = menuOpen && multi && getComputedStyle(multi).display !== 'none';
  if (multiOpen && document.getElementById('multiRoomList')) return 'multiRoomList';
  const panel = document.getElementById('netPanel');
  if (panel && panel.style.display !== 'none' && document.getElementById('netRoomList')) return 'netRoomList';
  return null;
}

let _netRoomsTimer = null, _netRoomsBusy = false, _netAutoScanFor = null;
function netRoomsStop(){
  if (_netRoomsTimer){ clearInterval(_netRoomsTimer); _netRoomsTimer = null; }
}
function netRoomsStart(){
  netRoomsStop();
  if (!netRoomListTargetId()) return;
  netRoomsPoll();
  _netRoomsTimer = setInterval(netRoomsPoll, 3000);
}
async function netRoomsPoll(force){
  if (NET.role !== 'solo' || netPrefGet('xh_net_mode', 'ws') !== 'ws'){ netRoomsStop(); return; }
  const targetId = netRoomListTargetId();
  if (!targetId){ netRoomsStop(); return; }
  if (_netRoomsBusy || _netScan) return;
  if (force){ _netAutoScanFor = null; netSetScanStatus('', false); }
  _netRoomsBusy = true;
  const url = netEffectiveWsUrl();
  const res = await netFetchRoomsResult(url);
  _netRoomsBusy = false;
  const stillId = netRoomListTargetId();
  if (!stillId){ netRoomsStop(); return; }
  if (res.ok){
    _netAutoScanFor = url;
    netRoomsRender(res.rooms, stillId);
    return;
  }
  netRoomsRender([], stillId);
  // 地址连不上时，自动扫一次全部端口（同一地址只自动扫一次）
  if (_netAutoScanFor !== url){
    _netAutoScanFor = url;
    netSetScanStatus('无法连接 ' + url + '，正在扫描全部端口…', true);
    netRunScan();
  }
}

/* ---------- 全端口扫描 ---------- */
function netScanHost(){
  const el = document.getElementById('multiWsUrl') || document.getElementById('netWsUrl');
  const raw = (el && el.value.trim()) || netEffectiveWsUrl();
  try { const u = new URL(raw); if (u.hostname) return u.hostname; } catch(e){}
  return netPageHost();
}
function netSetScanStatus(text, visible){
  const el = document.getElementById('multiScanStatus') || document.getElementById('netScanStatus');
  if (!el) return;
  el.style.display = (visible === false || !text) ? 'none' : 'block';
  el.textContent = text || '';
}
function netSetScanBtn(label){
  ['multiScanBtn', 'netScanBtn'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = label;
  });
}
function netApplyDiscoveredUrl(url){
  if (!url) return;
  netPrefSet('xh_net_url', url);
  const a = document.getElementById('multiWsUrl'); if (a) a.value = url;
  const b = document.getElementById('netWsUrl'); if (b) b.value = url;
}
async function netRunScan(){
  if (_netScan){ netScanCancel(); return; }
  const targetId = netRoomListTargetId();
  if (!targetId) return;
  const host = netScanHost();
  netSetScanBtn('停 止 扫 描');
  netSetScanStatus('正在扫描 ' + host + ' 的全部端口…', true);
  let lastPct = -1;
  const res = await netScanAllPorts(host, (st) => {
    if (st.serverUrl) netApplyDiscoveredUrl(st.serverUrl);
    if (st.phase === 'priority'){
      netSetScanStatus(`正在探测常用/相邻端口…（${st.scanned}/${st.total}）`, true);
    } else {
      const pct = Math.floor(st.scanned / st.total * 100);
      if (pct !== lastPct){
        lastPct = pct;
        netSetScanStatus(`正在扫描 ${host} 的全部端口… ${pct}%（${st.scanned}/${st.total}）`, true);
      }
    }
    if (st.rooms.length){
      const tid = netRoomListTargetId();
      if (tid) netRoomsRender(st.rooms, tid);
    }
  });
  netSetScanBtn('扫 描 全 部 端 口');
  const tid = netRoomListTargetId();
  if (res.rooms.length && tid) netRoomsRender(res.rooms, tid);
  if (res.cancelled){
    netSetScanStatus(res.serverUrl ? '已停止扫描 · ' + res.serverUrl : '已停止扫描', true);
  } else if (res.serverUrl){
    netSetScanStatus(`扫描完成：${res.serverUrl} 上共有 ${res.rooms.length} 个房间`, true);
  } else {
    netSetScanStatus(`已扫描 ${res.scanned} 个端口，未找到游戏服务器。请确认服务器已启动。`, true);
  }
  _netAutoScanFor = netEffectiveWsUrl();
}

/* ---------- 多人游戏独立界面 ---------- */
function netMultiRender(){
  const body = document.getElementById('multiBody');
  if (!body) return;
  const info = document.getElementById('multiUserInfo');
  if (info) info.textContent = '昵称：' + netPlayerName();

  const r = NET.role;
  const busy = _netLobbyBusy;

  if (r === 'solo'){
    const url = netEffectiveWsUrl();
    const room = netPrefGet('xh_net_room', 'xinghai-m1');
    const roomName = netPrefGet('xh_net_name', netPlayerName() + ' 的房间');
    body.innerHTML = `
      <div style="text-align:left;font-size:13px;color:#cfe1ff">
        <div style="margin-bottom:8px">服务器地址
          <input id="multiWsUrl" value="${_netEsc(url)}" style="width:100%;margin-top:3px;background:#0a1428;border:1px solid #2a4a7a;color:#cfe1ff;padding:7px 9px;border-radius:6px">
        </div>
        <div style="display:flex;gap:8px">
          <div style="flex:1">房间名称
            <input id="multiRoomName" value="${_netEsc(roomName)}" style="width:100%;margin-top:3px;background:#0a1428;border:1px solid #2a4a7a;color:#cfe1ff;padding:7px 9px;border-radius:6px">
          </div>
          <div style="width:150px">房间号
            <input id="multiRoomId" value="${_netEsc(room)}" style="width:100%;margin-top:3px;background:#0a1428;border:1px solid #2a4a7a;color:#cfe1ff;padding:7px 9px;border-radius:6px">
          </div>
        </div>
        <button class="auth-btn" id="multiHostBtn" style="margin-top:10px;background:rgba(70,140,255,.25);border-color:rgba(120,180,255,.55);color:#fff" ${busy ? 'disabled' : ''}>${busy ? '连 接 中…' : '创 建 房 间'}</button>
        <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 6px;border-top:1px solid rgba(78,168,255,.2);padding-top:12px">
          <b style="color:#7fd3ff;font-size:12px">局域网房间</b>
          <span>
            <span id="multiScanBtn" style="cursor:pointer;color:#7fd3ff;font-size:11px;margin-right:12px">扫 描 全 部 端 口</span>
            <span id="multiRoomsRefresh" style="cursor:pointer;color:#8fa8d6;font-size:11px">刷新</span>
          </span>
        </div>
        <div id="multiScanStatus" style="display:none;font-size:11px;color:#8fa8d6;margin-bottom:6px;line-height:1.5"></div>
        <div id="multiRoomList" style="max-height:180px;overflow:auto;font-size:11px;color:#8fa8d6">正在读取房间列表…</div>
        <button class="auth-btn" id="multiJoinIdBtn" style="margin-top:10px;background:rgba(34,197,94,.16);border-color:rgba(74,222,128,.45)" ${busy ? 'disabled' : ''}>${busy ? '连 接 中…' : '按 房 间 号 加 入'}</button>
      </div>`;

    const savePrefs = () => {
      const urlEl = document.getElementById('multiWsUrl');
      const nameEl = document.getElementById('multiRoomName');
      const idEl = document.getElementById('multiRoomId');
      netPrefSet('xh_net_url', urlEl.value.trim() || netEffectiveWsUrl());
      netPrefSet('xh_net_name', nameEl.value.trim());
      netPrefSet('xh_net_room', idEl.value.trim() || 'xinghai-m1');
      return { url: urlEl.value.trim() || netEffectiveWsUrl(), name: nameEl.value.trim(), room: idEl.value.trim() || 'xinghai-m1' };
    };

    document.getElementById('multiHostBtn').onclick = () => {
      if (_netLobbyBusy) return;
      const p = savePrefs();
      netLobbyHost('ws', p.room, p.url, p.name || (netPlayerName() + ' 的房间'));
    };
    document.getElementById('multiWsUrl').oninput = () => {
      _netAutoScanFor = null;
      netSetScanStatus('', false);
    };
    document.getElementById('multiRoomsRefresh').onclick = () => netRoomsPoll(true);
    document.getElementById('multiScanBtn').onclick = () => {
      if (_netScan){ netScanCancel(); return; }
      _netAutoScanFor = null;
      netRunScan();
    };
    document.getElementById('multiRoomList').onclick = (ev) => {
      const btn = ev.target.closest('[data-roomjoin]');
      if (!btn || btn.disabled) return;
      const rid = btn.getAttribute('data-roomjoin');
      const slot = btn.getAttribute('data-roomslot');
      if (!slot){ toast('房间已满'); return; }
      const p = savePrefs();
      const roomUrl = btn.getAttribute('data-roomurl') || p.url;
      netPrefSet('xh_net_room', rid);
      netPrefSet('xh_net_url', roomUrl);
      netLobbyJoin('ws', rid, roomUrl, slot);
    };
    document.getElementById('multiJoinIdBtn').onclick = () => {
      if (_netLobbyBusy) return;
      const p = savePrefs();
      const found = _multiRooms.find(x => x.id === p.room);
      if (!found){ toast('列表中没有该房间，请刷新房间列表'); return; }
      if (found.started){ toast('该房间已开始游戏'); return; }
      const slot = netRoomSlot(found);
      if (!slot){ toast('房间已满'); return; }
      const roomUrl = found._wsUrl || p.url;
      netPrefSet('xh_net_url', roomUrl);
      netLobbyJoin('ws', p.room, roomUrl, slot);
    };
    netRoomsStart();
    return;
  }

  const roster = netRosterNames().map(n => _netEsc(n)).join(' · ') || '(空)';
  if (r === 'host'){
    const conn = NET.connected;
    body.innerHTML = `
      <div style="text-align:left;background:rgba(255,215,95,.06);border:1px solid rgba(255,215,95,.35);border-radius:10px;padding:14px">
        <div style="color:#ffd75f;font-weight:700;margin-bottom:6px">你是房主 · ${_netEsc(NET.roomName || NET.roomId)}</div>
        <div style="font-size:12px;color:#8fa8d6;margin-bottom:4px">房间号 <b style="color:#d8e2f5">${_netEsc(NET.roomId)}</b> · ${netTransportLabel()}</div>
        <div style="font-size:12px;margin-bottom:4px;color:${conn ? '#7fe08a' : '#ffb45e'}">${conn ? '✅ 已连接服务器，等待玩家加入' : '⚠ 未连接服务器，请检查端口后重试'}</div>
        <div style="font-size:12px;color:#8fa8d6;margin-bottom:10px">已入座：<b style="color:#d8e2f5">${roster}</b></div>
        <div style="font-size:11px;color:#8fa8d6;line-height:1.6;margin-bottom:12px">
          其他玩家在同一局域网打开 <b style="color:#d8e2f5">${netHttpHint()}</b>，输入昵称后进入「多人游戏」→ 在房间列表中点击加入。
        </div>
        <button class="auth-btn" id="multiStartBtn" style="margin-bottom:8px;background:rgba(245,158,11,.2);border-color:rgba(245,158,11,.6);color:#ffe2a8" ${(G.isPlaying || !conn) ? 'disabled style="opacity:.45"' : ''}>开 始 游 戏</button>
        ${conn ? '' : '<button class="auth-btn" id="multiReconnectBtn" style="margin-bottom:8px;background:rgba(70,140,255,.2);border-color:rgba(120,180,255,.55)">重 新 连 接</button>'}
        <button class="auth-btn" id="multiExitBtn" style="margin-bottom:0;background:rgba(255,255,255,.06)">退 出 房 间</button>
      </div>`;
    document.getElementById('multiStartBtn').onclick = () => {
      if (NET.roster.length < 1 || !NET.connected) return;
      hostStartMatch();
    };
    const rc = document.getElementById('multiReconnectBtn');
    if (rc) rc.onclick = () => {
      const p = _netLastHost || { room: NET.roomId, url: netEffectiveWsUrl(), name: NET.roomName || NET.roomId };
      netLobbyHost('ws', p.room, p.url, p.name);
    };
    document.getElementById('multiExitBtn').onclick = () => {
      netClose();
      netUiRefresh();
    };
    return;
  }

  if (r === 'client'){
    body.innerHTML = `
      <div style="text-align:left;background:rgba(78,168,255,.07);border:1px solid rgba(78,168,255,.35);border-radius:10px;padding:14px">
        <div style="color:#7fd3ff;font-weight:700;margin-bottom:6px">已进入房间 · ${_netEsc(NET.roomName || NET.roomId)}</div>
        <div style="font-size:12px;color:#8fa8d6;margin-bottom:4px">昵称 <b style="color:#d8e2f5">${_netEsc(netPlayerName())}</b> · 座位 <b style="color:#d8e2f5">${_netEsc(NET.myPlayerId)}</b> · ${netTransportLabel()}</div>
        <div style="font-size:12px;color:#8fa8d6;margin-bottom:10px">已入座：<b style="color:#d8e2f5">${roster}</b></div>
        <div style="font-size:12px;color:#8fa8d6;margin-bottom:12px">${NET.connected ? '等待房主开始游戏…' : '⚠ 与服务器断开'}</div>
        <button class="auth-btn" id="multiExitBtn" style="margin-bottom:0;background:rgba(255,255,255,.06)">断 开 房 间</button>
      </div>`;
    document.getElementById('multiExitBtn').onclick = () => {
      netClose();
      netUiRefresh();
    };
  }
}

let _netLastHost = null;

async function netLobbyHost(mode, room, url, name){
  if (_netLobbyBusy) return;
  url = url || netEffectiveWsUrl();
  _netLobbyBusy = true;
  netRoomsStop();
  netSetRole('host', 'p1');
  hostInstallHandlers();
  NET.roster = ['p1'];
  NET.names = { p1: netPlayerName() };
  NET.transportKind = (mode === 'ws') ? 'ws' : 'bc';
  NET.lastWsUrl = (mode === 'ws') ? url : '';
  G.nationName = netPlayerName();
  _netLastHost = { mode, room, url, name: name || room };
  netUiRefresh();

  const ok = (mode === 'ws') ? await netOpenWS(url, room, netPlayerName(), name || room) : netOpenBroadcast(room);
  _netLobbyBusy = false;

  if (!ok){
    // 不再自动退回上一级界面，保留等待卡显示“未连接”，可手动重连
    netUiRefresh();
    toast('❌ 创建房间失败，请检查服务器地址/端口');
    return;
  }

  G.factions = { p1: { name: netPlayerName(), color: HUMAN_COLORS[0], isPlayer: true } };
  G.isPlaying = false;
  addLog('🏠 房间已开启，等待玩家…', 'info');
  netSend({ t:'roomMeta', name: name || room, started: false });
  // 客户端可能先于房主进入房间（服务器此时无法转发 hello），开房后 ping 一次让其重新握手
  netSend({ t:'lobby_ping' });
  netUiRefresh();
}

async function netLobbyJoin(mode, room, url, asId){
  if (_netLobbyBusy) return;
  url = url || netEffectiveWsUrl();
  _netLobbyBusy = true;
  netRoomsStop();
  netSetRole('client', asId);
  clientInstallHandlers();
  NET.names = { [asId]: netPlayerName() };
  NET.transportKind = (mode === 'ws') ? 'ws' : 'bc';
  NET.lastWsUrl = (mode === 'ws') ? url : '';
  netUiRefresh();

  const ok = (mode === 'ws') ? await netOpenWS(url, room, netPlayerName()) : netOpenBroadcast(room);
  _netLobbyBusy = false;

  if (!ok){
    netClose();
    netUiRefresh();
    toast('❌ 加入房间失败');
    return;
  }

  netSend({ t:'hello', name: netPlayerName() });
  netUiRefresh();
  toast('🔗 已进入房间 ' + room);
}

function netPanelOpen(){
  if (NET.role === 'solo') return;
  const el = _netPanelEl();
  el.style.display = '';
  netPanelRender();
}

const _netToggleBtn = document.getElementById('netToggleBtn');
if (_netToggleBtn) _netToggleBtn.addEventListener('click', netPanelOpen);

// 主机侧收到自己的 roster/start 后刷新界面
netOn('_roster', () => { netUiRefresh(); });
netOn('_started', () => {
  const p = document.getElementById('netPanel');
  if (p) p.style.display = 'none';
  netUiRefresh();
});
netOn('_joined', () => {
  const p = document.getElementById('netPanel');
  if (p) p.style.display = 'none';
  netUiRefresh();
});
