/* =========================================================
   net-command.js — 命令总线
   单机/主机：dispatch → executeCommand 本地执行
   联机客户端：dispatch → netSend({t:'cmd'}) → 主机执行并 ack
   ========================================================= */

const Commands = {};
function registerCommand(type, handler){ Commands[type] = handler; }

function dispatch(cmd){
  if (!cmd || !cmd.type) return false;
  // 联机客户端：交给主机执行（乐观提交，主机 ack 失败时 toast）
  if (typeof NET !== 'undefined' && NET.role === 'client') {
    if (!NET.connected) { toast('⚠ 未连接主机'); return false; }
    NET._seq++;
    return netSend({ t: 'cmd', seq: NET._seq, cmd });
  }
  // 单机 / 主机：本地执行
  return executeCommand(cmd, MY_ID);
}

function executeCommand(cmd, fromId){
  const fn = Commands[cmd.type];
  if (!fn) { console.warn('[dispatch] 未注册命令:', cmd.type); return false; }
  // 主机替其他玩家执行时，临时切换 MY_ID，让 isMe() 等判定落到发起者
  const prevId = MY_ID;
  const swap = !!fromId && fromId !== MY_ID;
  if (swap){ MY_ID = fromId; invalidatePlayerPlanets(); }
  try { return fn(cmd, fromId); }
  catch (e) { console.error('[dispatch] 命令执行异常', cmd, e); return false; }
  finally {
    if (swap){ MY_ID = prevId; invalidatePlayerPlanets(); }
  }
}

/* ---------- 命令注册（点击类操作） ---------- */

registerCommand('upgrade', (cmd) => {
  const r = G.planets[cmd.region];
  if (!r || !isMe(r.owner)) return false;
  return upgradeRegion(cmd.region);
});

registerCommand('facility', (cmd) => {
  const r = G.planets[cmd.region];
  if (!r || !isMe(r.owner)) return false;
  return buildFacility(cmd.region, cmd.facility);
});

registerCommand('build', (cmd) => {
  const r = G.planets[cmd.region];
  if (!r || !isMe(r.owner)) return false;
  return startBuild(cmd.designId, cmd.region, cmd.count || 1);
});

registerCommand('cancelBuild', (cmd) => {
  const q = G.buildQueue.find(x => x.id === cmd.qid);
  if (!q || (q.owner && !isMe(q.owner))) return false;
  cancelBuild(cmd.qid);
  return true;
});

registerCommand('addZone', (cmd) => {
  const z = cmd.zone;
  if (!z) return false;
  const x1 = Math.min(z.x1, z.x2), x2 = Math.max(z.x1, z.x2);
  const y1 = Math.min(z.y1, z.y2), y2 = Math.max(z.y1, z.y2);
  if (x2 - x1 < 10 || y2 - y1 < 10) return false;
  const owner = MY_ID;
  const mine = G.zones.filter(zz => (zz.owner || 'p1') === owner).length;
  const targets = [];
  for (const p of G.planets){
    if (p.owner === owner) continue;
    if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) targets.push(p.id);
  }
  G.zones.push({ id: 'z' + Date.now() + '_' + owner, owner, name: '战区 ' + (mine + 1), x1, y1, x2, y2, targets });
  if (typeof markRightDirty === 'function') markRightDirty();
  return true;
});

registerCommand('delZone', (cmd) => {
  const z = G.zones.find(x => x.id === cmd.zoneId);
  if (!z || (z.owner && z.owner !== MY_ID)) return false;
  G.zones = G.zones.filter(x => x.id !== cmd.zoneId);
  if (typeof markRightDirty === 'function') markRightDirty();
  return true;
});

registerCommand('unlockHull', (cmd) => unlockHull(cmd.tier));
registerCommand('unlockPlaneHull', (cmd) => unlockPlaneHull(cmd.tier));

registerCommand('recall', (cmd) => {
  const f = G.fleets.find(x => x.id === cmd.fleetId);
  if (!f || !isMe(f.owner)) return false;
  recallFleet(cmd.fleetId);
  return true;
});

registerCommand('launch', (cmd) => {
  const from = G.planets[cmd.from], to = G.planets[cmd.to];
  if (!from || !to || !isMe(from.owner)) return false;
  const want = new Set(cmd.uids || []);
  const ships = from.garrison.filter(s => want.has(s.uid) && s.hp > 0);
  if (!ships.length) return false;
  from.garrison = from.garrison.filter(s => !want.has(s.uid));
  launchFleet(from.owner, ships, cmd.from, cmd.to, cmd.purpose || 'move', cmd.task || null);
  invalidatePlayerPlanets();
  return true;
});
