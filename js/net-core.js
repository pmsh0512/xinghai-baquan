/* =========================================================
   net-core.js — 角色、消息总线、BroadcastChannel 传输
   ========================================================= */

const NET = {
  role: 'solo',              // 'solo' | 'host' | 'client'
  transportKind: null,       // 'bc' | 'ws'
  roomId: 'xinghai-m1',
  myPlayerId: 'p1',
  roster: [],                // ['p1','p2',...]
  names: {},                 // { p1:'昵称', p2:'昵称' }
  connected: false,
  _listeners: {},
  _transport: null,
  _seq: 0,
  joinName: '',
  roomName: '',
  lastWsUrl: '',
  stats: { txBytes: 0, rxBytes: 0, txMsgs: 0, rxMsgs: 0 },
};

function netStatsReset(){ NET.stats = { txBytes: 0, rxBytes: 0, txMsgs: 0, rxMsgs: 0 }; }

function netSetRole(role, myId){
  NET.role = role;
  window.NET_ROLE = (role === 'solo') ? undefined : role;
  if (myId) { NET.myPlayerId = myId; MY_ID = myId; }
  if (role === 'solo') MY_ID = 'p1';
  invalidatePlayerPlanets();
  markRightDirty();
}

function netOn(type, fn){ (NET._listeners[type] = NET._listeners[type] || []).push(fn); }
function netEmit(type, data){
  const a = NET._listeners[type]; if (!a) return;
  for (const fn of a) { try { fn(data); } catch(e){ console.error('[net]', type, e); } }
}

function netSend(msg){
  if (!NET._transport) return false;
  try { NET._transport.send(msg); return true; }
  catch(e){ console.error('[net] send', e); return false; }
}

function netBroadcast(msg){
  if (NET.role !== 'host') return false;
  return netSend(msg);
}

/* server.py 通过 /net-config.js 注入本次实际启动的端口 */
function netConfig(){
  return (typeof window !== 'undefined' && window.__NET_CFG) ? window.__NET_CFG : null;
}
function netPageHost(){
  return (location.hostname && location.hostname !== '') ? location.hostname : 'localhost';
}
function netDefaultWsUrl(){
  const cfg = netConfig();
  const port = (cfg && cfg.wsPort) ? cfg.wsPort : 8081;
  return 'ws://' + netPageHost() + ':' + port;
}
function netEffectiveWsUrl(){
  let pref = '';
  try { pref = (typeof netPrefGet === 'function') ? netPrefGet('xh_net_url', '') : ''; } catch(e){}
  const def = netDefaultWsUrl();
  if (!pref) return def;
  // 旧版本把默认端口写死成 8081，服务器实际端口变化后自动迁移
  const cfg = netConfig();
  if (cfg && cfg.wsPort && Number(cfg.wsPort) !== 8081){
    try { if (new URL(pref).port === '8081') return def; } catch(e){}
  }
  return pref;
}

/* WebSocket 传输：连上后先发 join，之后转为普通消息转发 */
function netOpenWS(url, roomId, joinName, roomName){
  return new Promise((resolve) => {
    if (!('WebSocket' in window)) { toast('❌ 浏览器不支持 WebSocket'); return resolve(false); }
    NET.roomId = roomId || NET.roomId;

    let ws;
    try { ws = new WebSocket(url); }
    catch (e) { toast('❌ WebSocket 地址无效'); return resolve(false); }

    const pending = [];
    let opened = false, settled = false;
    const finish = (ok) => { if (settled) return; settled = true; clearTimeout(timer); resolve(ok); };
    const timer = setTimeout(() => {
      toast('❌ 连接游戏服务器超时');
      try { ws.close(); } catch(e){}
      finish(false);
    }, 6000);

    NET.transportKind = 'ws';
    NET.lastWsUrl = url;
    NET.joinName = joinName || '';
    NET.roomName = roomName || '';
    NET._transport = {
      ws,
      send: (msg) => {
        msg._sender = NET.myPlayerId;
        msg._role = NET.role;
        const text = JSON.stringify(msg);
        NET.stats.txBytes += text.length; NET.stats.txMsgs++;
        if (ws.readyState === WebSocket.OPEN) ws.send(text);
        else if (ws.readyState === WebSocket.CONNECTING) pending.push(text);
      },
      close: () => { try { ws.close(); } catch(e){} },
    };

    ws.onopen = () => {
      opened = true;
      NET.connected = true;
      const join = JSON.stringify({
        t: 'join', roomId: NET.roomId, role: NET.role,
        playerId: NET.myPlayerId, name: NET.joinName || '',
        roomName: NET.roomName || '',
      });
      NET.stats.txBytes += join.length; NET.stats.txMsgs++;
      ws.send(join);
      for (const text of pending) { try { ws.send(text); } catch(e){} }
      pending.length = 0;
      finish(true);
    };
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch(e){ return; }
      NET.stats.rxBytes += (typeof ev.data === 'string') ? ev.data.length : 0;
      NET.stats.rxMsgs++;
      if (!msg || typeof msg !== 'object' || !msg.t) return;
      if (msg._sender === NET.myPlayerId && msg._role === NET.role) return;
      netEmit(msg.t, msg);
    };
    ws.onerror = () => { if (!opened && !settled) { toast('❌ 无法连接 ' + url); finish(false); } };
    ws.onclose = () => {
      NET.connected = false;
      if (NET._transport && NET._transport.ws === ws) NET._transport = null;
      if (opened && NET.role !== 'solo') toast('🔌 与服务器断开');
      finish(false);
      // 让等待室/面板同步显示“未连接”，而不是停在旧状态
      setTimeout(() => { if (typeof netUiRefresh === 'function') netUiRefresh(); }, 0);
    };
  });
}

function netOpenBroadcast(roomId){
  if (!('BroadcastChannel' in window)) { toast('❌ 浏览器不支持 BroadcastChannel'); return false; }
  NET.roomId = roomId || NET.roomId;
  NET.transportKind = 'bc';
  const ch = new BroadcastChannel(NET.roomId);
  NET._transport = {
    send: (msg) => { msg._sender = NET.myPlayerId; msg._role = NET.role; ch.postMessage(msg); },
    close: () => ch.close(),
  };
  ch.onmessage = (ev) => {
    const msg = ev.data;
    if (!msg || typeof msg !== 'object' || !msg.t) return;
    if (msg._sender === NET.myPlayerId && msg._role === NET.role) return;
    netEmit(msg.t, msg);
  };
  NET.connected = true;
  return true;
}

function netClose(){
  if (NET._transport) {
    try { netSend({ t: 'leave' }); } catch(e){}
    try { NET._transport.close(); } catch(e){}
  }
  NET._transport = null;
  NET.connected = false;
  NET.transportKind = null;
  NET.joinName = '';
  NET.roomName = '';
  NET.names = {};
  netSetRole('solo');
  if (typeof updateSpeedUI === 'function') updateSpeedUI();
  if (typeof netUiRefresh === 'function') netUiRefresh();
}

/* 大厅：临时连一次服务器拉取房间列表（无需占用玩家席位） */
function netFetchRoomsResult(url, timeoutMs){
  return new Promise((resolve) => {
    let ws, done = false;
    const finish = (ok, list) => {
      if (done) return;
      done = true;
      try { ws.close(); } catch(e){}
      resolve({ ok: !!ok, rooms: Array.isArray(list) ? list : [] });
    };
    try { ws = new WebSocket(url); } catch(e){ resolve({ ok: false, rooms: [] }); return; }
    const timer = setTimeout(() => finish(false, []), timeoutMs || 3000);
    ws.onopen = () => { try { ws.send(JSON.stringify({ t: 'listRooms' })); } catch(e){} };
    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch(e){ return; }
      if (msg && msg.t === 'rooms'){ clearTimeout(timer); finish(true, msg.rooms); }
    };
    ws.onerror = () => finish(false, []);
    ws.onclose = () => finish(false, []);
  });
}
/* 探测某个端口是否是本游戏的 WS 服务器 */
function netProbePort(host, port, timeoutMs){
  return netFetchRoomsResult('ws://' + host + ':' + port, timeoutMs || 350);
}

/* 探测某个端口是否是本游戏的 HTTP 服务器（读取 /net-config.json） */
function netHttpProbePort(host, port, timeoutMs){
  if (typeof fetch !== 'function' || typeof AbortController !== 'function') return Promise.resolve({ ok: false });
  const ctl = new AbortController();
  const timer = setTimeout(() => { try { ctl.abort(); } catch(e){} }, timeoutMs || 700);
  return fetch('http://' + host + ':' + port + '/net-config.json', {
    cache: 'no-store', mode: 'cors', signal: ctl.signal,
  }).then((r) => {
    clearTimeout(timer);
    if (!r.ok) return { ok: false };
    return r.json()
      .then((cfg) => ({ ok: !!(cfg && cfg.wsPort), cfg }))
      .catch(() => ({ ok: false }));
  }).catch(() => { clearTimeout(timer); return { ok: false }; });
}

let _netScan = null;
function netScanCancel(){
  if (_netScan) _netScan.cancel = true;
}

/* 扫描指定主机的全部端口（1-65535），先串行探测已知/相邻端口，再并发扫描其余端口。
   HTTP 探测不像 WebSocket 那样受浏览器并发握手限制，且能直接拿到真实 WS 端口。 */
function netScanAllPorts(host, onProgress){
  if (_netScan) return _netScan.promise;

  const cfg = netConfig() || {};
  const pri = [];
  const addPri = (p) => {
    p = parseInt(p, 10);
    if (p > 0 && p < 65536 && pri.indexOf(p) < 0) pri.push(p);
  };
  // 优先已知端口 + 页面端口附近（server.py 的两个端口通常相邻）
  addPri(cfg.httpPort);
  addPri(cfg.wsPort);
  const pagePort = parseInt(location.port, 10);
  if (pagePort > 0){
    [-2, -1, 0, 1, 2, 3, 4].forEach((d) => addPri(pagePort + d));
  }
  addPri(8080); addPri(8081);
  for (let p = 8000; p <= 8100; p++) addPri(p);
  const inPri = {};
  pri.forEach(p => { inPri[p] = true; });
  const rest = [];
  for (let p = 1; p <= 65535; p++) if (!inPri[p]) rest.push(p);

  // HTTP 探测失败时，再直接对少量最可能的相邻端口做 WS 探测
  const wsCand = [];
  const addWs = (p) => {
    p = parseInt(p, 10);
    if (p > 0 && p < 65536 && wsCand.indexOf(p) < 0) wsCand.push(p);
  };
  addWs(cfg.wsPort);
  if (pagePort > 0){
    [-1, 0, 1, 2, 3, 4].forEach((d) => addWs(pagePort + d));
  }
  addWs(8081); addWs(8080);

  const state = {
    cancel: false, scanned: 0, total: pri.length + rest.length,
    serverUrl: '', rooms: [], phase: 'priority',
  };
  let done = false, resolveFn = null;
  const seenRoom = {};

  const finish = (cancelled) => {
    if (done) return;
    done = true;
    if (_netScan === state) _netScan = null;
    resolveFn({ rooms: state.rooms, serverUrl: state.serverUrl, cancelled: !!cancelled, scanned: state.scanned, total: state.total });
  };

  const tryPort = async (port) => {
    const res = await netHttpProbePort(host, port, state.phase === 'priority' ? 900 : 500);
    if (res.ok && res.cfg && res.cfg.wsPort && !state.serverUrl){
      const wsUrl = 'ws://' + host + ':' + res.cfg.wsPort;
      // 只对真正命中的端口做一次 WS 探测，避免被浏览器限流
      const rr = await netProbePort(host, res.cfg.wsPort, 2500);
      if (rr.ok && !state.serverUrl){
        state.serverUrl = wsUrl;
        for (const room of rr.rooms){
          if (seenRoom[room.id]) continue;
          seenRoom[room.id] = true;
          room._wsUrl = wsUrl;
          state.rooms.push(room);
        }
      }
    }
    state.scanned++;
    if (onProgress){ try { onProgress(state); } catch(e){} }
  };

  const runQueue = async (ports, conc) => {
    let i = 0;
    const workers = [];
    for (let w = 0; w < conc; w++){
      workers.push((async () => {
        while (!state.cancel && !state.serverUrl && i < ports.length){
          const port = ports[i++];
          await tryPort(port);
        }
      })());
    }
    await Promise.all(workers);
  };

  // 旧版服务器没有 /net-config.json，直接用 WS 探测相邻端口（低并发避免被限流）
  const runWsCandidates = async () => {
    for (const port of wsCand){
      if (state.cancel || state.serverUrl) return;
      const rr = await netProbePort(host, port, 400);
      state.scanned++;
      if (rr.ok && !state.serverUrl){
        state.serverUrl = 'ws://' + host + ':' + port;
        for (const room of rr.rooms){
          if (seenRoom[room.id]) continue;
          seenRoom[room.id] = true;
          room._wsUrl = state.serverUrl;
          state.rooms.push(room);
        }
      }
      if (onProgress){ try { onProgress(state); } catch(e){} }
    }
  };

  state.promise = new Promise((res) => { resolveFn = res; });
  _netScan = state;
  (async () => {
    // 已知/相邻端口低并发优先探测，保证真实服务器不会被并发限流漏掉
    await runQueue(pri, 4);
    if (!state.cancel && !state.serverUrl) await runWsCandidates();
    if (!state.cancel && !state.serverUrl){
      state.phase = 'full';
      await runQueue(rest, 24);
    }
    finish(state.cancel);
  })();
  return state.promise;
}
