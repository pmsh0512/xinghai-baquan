/* =========================================================
   net-command.js — 命令总线（M0）
   单机：dispatch → executeCommand 直接执行
   联机：dispatch → netSendCommand（M2 接入），主机 executeCommand
   ========================================================= */

const Commands = {};
function registerCommand(type, handler){ Commands[type] = handler; }

function dispatch(cmd){
  if (!cmd || !cmd.type) return false;
  // 联机客户端模式：交给主机执行（M0 占位，M2 接入）
  if (window.NET_ROLE === 'client') {
    if (typeof netSendCommand === 'function') { netSendCommand(cmd); return true; }
    console.warn('[dispatch] 客户端模式但网络层未接入', cmd);
    return false;
  }
  // 单机 / 主机：本地执行
  return executeCommand(cmd, MY_ID);
}

function executeCommand(cmd, fromId){
  const fn = Commands[cmd.type];
  if (!fn) { console.warn('[dispatch] 未注册命令:', cmd.type); return false; }
  try { return fn(cmd, fromId); }
  catch (e) { console.error('[dispatch] 命令执行异常', cmd, e); return false; }
}

/* ---------- 命令注册（M0 只挂"点击类"，画布交互留到 M1） ---------- */

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

registerCommand('cancelBuild', (cmd) => cancelBuild(cmd.qid));

registerCommand('unlockHull', (cmd) => unlockHull(cmd.tier));
registerCommand('unlockPlaneHull', (cmd) => unlockPlaneHull(cmd.tier));

registerCommand('recall', (cmd) => {
  const f = G.fleets.find(x => x.id === cmd.fleetId);
  if (!f || !isMe(f.owner)) return false;
  recallFleet(cmd.fleetId);
  return true;
});