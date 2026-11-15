/* =========================================================
   02-map.js — 地图与渲染
   ========================================================= */

function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function generateMapData(seed){
  const rnd=mulberry32(seed), N=5000, out=[], GOLD=2.39996323;
  for(let i=0;i<N;i++){
    const r=Math.sqrt((i+0.5)/N)*2900, theta=i*GOLD+rnd()*0.6, rad=r+(rnd()-0.5)*90, ang=theta+(rnd()-0.5)*0.18;
    const x=Math.round(rad*Math.cos(ang)), y=Math.round(rad*Math.sin(ang)), d=Math.hypot(x,y);
    let level; if(d<350) level=7; else if(d<650) level=6; else if(d<1000) level=5; else if(d<1400) level=4; else if(d<1900) level=3; else if(d<2400) level=2; else level=1;
    out.push([x, y, level]);
  }
  return out;
}
function initPlanets(mapData){
  G.planets = [];
  const P = ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','φ','χ','ψ','ω'];
  for(let i=0;i<mapData.length;i++){
    const [x,y,level]=mapData[i], nameIdx=i%24, sub=Math.floor(i/24)+1;
    G.planets.push({ id:i, x, y, level, name:P[nameIdx]+sub, owner:null, garrison:[], facilities:[], battle:null, flash:0, visibility:0 });
  }
  invalidatePlayerPlanets();
}

const CAM = { x:0, y:0, scale:0.35, minScale:0.06, maxScale:3 };
let VW=0, VH=0, dpr=1;
function screenToWorld(sx, sy){ return { x:(sx-VW/2)/CAM.scale+CAM.x, y:(sy-VH/2)/CAM.scale+CAM.y }; }
function viewBounds(){ const hw=VW/2/CAM.scale, hh=VH/2/CAM.scale; return { x1:CAM.x-hw, y1:CAM.y-hh, x2:CAM.x+hw, y2:CAM.y+hh }; }

const canvas = document.getElementById('map'); const ctx = canvas.getContext('2d'); let bgStars = [];
function resize(){
  dpr=Math.min(window.devicePixelRatio||1,2); VW=window.innerWidth; VH=window.innerHeight;
  canvas.width=VW*dpr; canvas.height=VH*dpr; canvas.style.width=VW+'px'; canvas.style.height=VH+'px';
  bgStars=[]; const n=Math.floor(VW*VH/7000);
  for(let i=0;i<n;i++){ bgStars.push({ x:Math.random()*VW, y:Math.random()*VH, r:Math.random()*1.4+0.3, a:Math.random()*0.4+0.08, ph:Math.random()*Math.PI*2 }); }
}
window.addEventListener('resize', resize);
function planetRadius(level){ return 3+level*1.2; }

function render(){
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle='#04060e'; ctx.fillRect(0,0,VW,VH);
  for(const s of bgStars){ const tw=0.65+0.35*Math.sin(G.time*1.4+s.ph); ctx.fillStyle=`rgba(180,210,255,${s.a*tw})`; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,6.2832); ctx.fill(); }
  ctx.save(); ctx.translate(VW/2, VH/2); ctx.scale(CAM.scale, CAM.scale); ctx.translate(-CAM.x, -CAM.y);
  const b=viewBounds();
  if(CAM.scale<0.3){ ctx.strokeStyle='rgba(80,120,200,.05)'; ctx.lineWidth=1/CAM.scale; for(let i=1;i<=6;i++){ ctx.beginPath(); ctx.arc(0,0,i*500,0,6.2832); ctx.stroke(); } }
  const visible=[]; for(const p of G.planets){ if(p.x<b.x1-20||p.x>b.x2+20||p.y<b.y1-20||p.y>b.y2+20) continue; visible.push(p); }
  
  for(const f of G.fleets){
    const from=G.planets[f.fromRegionId], to=G.planets[f.toRegionId]; if(!from||!to) continue;
    const c=G.factions[f.owner]?.color||'#fff'; ctx.strokeStyle=hexA(c,0.25); ctx.lineWidth=1.2/CAM.scale;
    ctx.setLineDash([6,8]); ctx.lineDashOffset=-G.time*30; ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke(); ctx.setLineDash([]);
  }
  
  // ★ 绘制作战区域
  for (const z of (G.zones || [])) {
    ctx.fillStyle = 'rgba(255, 215, 95, 0.05)';
    ctx.strokeStyle = 'rgba(255, 215, 95, 0.4)';
    ctx.lineWidth = 2 / CAM.scale;
    ctx.setLineDash([10, 10]);
    ctx.fillRect(z.x1, z.y1, z.x2 - z.x1, z.y2 - z.y1);
    ctx.strokeRect(z.x1, z.y1, z.x2 - z.x1, z.y2 - z.y1);
    ctx.setLineDash([]);
    
    ctx.fillStyle = 'rgba(255, 215, 95, 0.8)';
    ctx.font = `700 ${Math.round(14/CAM.scale)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(`${z.name}`, (z.x1 + z.x2) / 2, z.y1 - 20 / CAM.scale);
    ctx.font = `500 ${Math.round(10/CAM.scale)}px system-ui`;
    ctx.fillText(`剩余目标: ${z.targets.filter(id => G.planets[id] && G.planets[id].owner !== 'player').length}`, (z.x1 + z.x2) / 2, z.y1 - 5 / CAM.scale);
  }

  // ★ 绘制正在拖拽的框
  if (G.isDrawingZone && G.drawingZone) {
    const dz = G.drawingZone;
    const x1 = Math.min(dz.startX, dz.curX);
    const y1 = Math.min(dz.startY, dz.curY);
    const x2 = Math.max(dz.startX, dz.curX);
    const y2 = Math.max(dz.startY, dz.curY);
    ctx.fillStyle = 'rgba(78, 168, 255, 0.15)';
    ctx.strokeStyle = 'rgba(78, 168, 255, 0.8)';
    ctx.lineWidth = 2 / CAM.scale;
    ctx.fillRect(x1, y1, x2-x1, y2-y1);
    ctx.strokeRect(x1, y1, x2-x1, y2-y1);
  }

  for(const p of visible) drawPlanet(p); 
  
  // 性能优化：画面上最多画 300 个舰队
  let drawn = 0;
  for(const f of G.fleets) {
    if (drawn > 300) break; 
    drawFleet(f);
    drawn++;
  }
  
  ctx.restore();
}

function drawPlanet(p){
  const v=p.visibility||0;if (p.owner === 'player') v = 1;
  if(v<0.05){ if(CAM.scale>0.15){ ctx.fillStyle='rgba(60,70,90,.5)'; ctx.beginPath(); ctx.arc(p.x,p.y,1.8/CAM.scale,0,6.2832); ctx.fill(); } return; }
  const faction=p.owner?G.factions[p.owner]:null, color=faction?faction.color:NEUTRAL_COLOR, r=planetRadius(p.level), isSelected=G.selected===p.id;
  ctx.save(); ctx.globalAlpha=Math.min(1,v*1.15);
  if(isSelected){ ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=2/CAM.scale; ctx.setLineDash([5,5]); ctx.lineDashOffset=-G.time*40; ctx.beginPath(); ctx.arc(p.x,p.y,r+5/CAM.scale,0,6.2832); ctx.stroke(); ctx.setLineDash([]); }
  if(p.battle){ const pulse=1+0.15*Math.sin(G.time*8); ctx.strokeStyle='rgba(255,215,95,.9)'; ctx.lineWidth=2/CAM.scale; ctx.beginPath(); ctx.arc(p.x,p.y,(r+8/CAM.scale)*pulse,0,6.2832); ctx.stroke(); }
  if(CAM.scale>0.5){ const glow=p.flash>0?0.6:(p.battle?0.5:0.35), gr=r*3, grad=ctx.createRadialGradient(p.x,p.y,r*0.5,p.x,p.y,gr); grad.addColorStop(0,hexA(color,glow)); grad.addColorStop(1,hexA(color,0)); ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(p.x,p.y,gr,0,6.2832); ctx.fill(); }
  const grad2=ctx.createRadialGradient(p.x-r*0.35,p.y-r*0.35,r*0.08,p.x,p.y,r);
  grad2.addColorStop(0,'#ffffff'); grad2.addColorStop(0.2,color); grad2.addColorStop(1,hexA(color,0.3));
  ctx.fillStyle=grad2; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,6.2832); ctx.fill();
  ctx.strokeStyle=hexA(color,p.owner?0.85:0.5); ctx.lineWidth=1.5/CAM.scale; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,6.2832); ctx.stroke();
  if(CAM.scale>0.25&&p.level>=5){ ctx.strokeStyle=MAT_COLORS[p.level]; ctx.lineWidth=1.8/CAM.scale; ctx.beginPath(); ctx.arc(p.x,p.y,r+2/CAM.scale,0,6.2832); ctx.stroke(); }
  if(CAM.scale>0.6){
    const radars=p.facilities.filter(f=>f==='radar').length, ciws=p.facilities.filter(f=>f==='ciws').length;
    if(radars>0){ ctx.fillStyle='#7fd3ff'; ctx.font=`700 ${Math.round(9/CAM.scale)}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText('📡'+(radars>1?radars:''),p.x-8/CAM.scale,p.y-r-2/CAM.scale); }
    if(ciws>0){ ctx.fillStyle='#ff8b5f'; ctx.font=`700 ${Math.round(9/CAM.scale)}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText('⚙'+(ciws>1?ciws:''),p.x+8/CAM.scale,p.y-r-2/CAM.scale); }
  }
  if(CAM.scale>0.8&&v>0.6){ ctx.font=`700 ${Math.round(11/CAM.scale)}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillStyle=`rgba(230,240,255,${v*0.9})`; ctx.fillText(p.name,p.x,p.y+r+3/CAM.scale); }
  ctx.restore();
  if(v<1){ ctx.fillStyle=`rgba(6,8,16,${(1-v)*0.85})`; ctx.beginPath(); ctx.arc(p.x,p.y,r+3/CAM.scale,0,6.2832); ctx.fill(); }
}

function drawFleet(f){
  const to=G.planets[f.toRegionId]; if(!to) return;
  const ang=Math.atan2(to.y-f.y,to.x-f.x), color=G.factions[f.owner]?.color||'#fff', count=f.ships.filter(s=>s.hp>0).length;
  if(!count) return; const size=4+Math.min(count,15)*0.3;
  ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(ang); 
  
  // ★ 性能优化：只有舰船较少时才开启阴影发光
  if (count < 50) {
    if (f.owner === 'player' && G.selectedFleetId === f.id) {
      ctx.shadowColor = '#ffd75f'; ctx.shadowBlur = 15/CAM.scale;
    } else {
      ctx.shadowColor = color; ctx.shadowBlur = 10/CAM.scale; 
    }
  }
  
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.moveTo(size,0); ctx.lineTo(-size*0.7,-size*0.65); ctx.lineTo(-size*0.32,0); ctx.lineTo(-size*0.7,size*0.65); ctx.closePath(); ctx.fill(); ctx.restore();
  if (f.task) {
    ctx.fillStyle='#fff'; ctx.font=`700 ${Math.round(9/CAM.scale)}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(FLEET_TASKS[f.task.type]?.name.slice(0,2) || '', f.x, f.y - size - 12/CAM.scale);
  }
}