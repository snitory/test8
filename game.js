/* 2D Craft - small tile-based demo
   - Save/load to localStorage
   - Move, jump, break/place blocks, simple inventory
   - Procedural terrain (perlin-like noise)
   - Assets: assets/tiles.png (tileset)
*/

/* CONFIG */
const TILE = 16;               // tile pixel size
const WORLD_W = 256;           // tiles
const WORLD_H = 64;            // tiles
const VIEW_W = 64;             // visible tiles horizontally
const GRAVITY = 1400;
const JUMP_V = -420;
const PLAYER_SPEED = 120;

/* DOM */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', {alpha:false});
const blocksCountEl = document.getElementById('blocksCount');
const hotbarEl = document.getElementById('hotbar');
const saveBtn = document.getElementById('save');
const loadBtn = document.getElementById('load');
const resetBtn = document.getElementById('reset');

canvas.width = VIEW_W * TILE;
canvas.height = 32 * TILE; // fixed vertical view

/* ASSETS */
const tilesImg = new Image();
tilesImg.src = 'assets/tiles.png'; // provided base64 image file

/* WORLD representation: 1 = dirt, 2 = stone, 3 = grass, 4 = wood (example), 0 = air */
let world = new Uint8Array(WORLD_W * WORLD_H);

/* Simple pseudo-noise for terrain */
function pseudoNoise(x){
  x = (x<<13) ^ x;
  return (1.0 - ((x * (x * x * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
}
function makeTerrain(){
  for(let x=0;x<WORLD_W;x++){
    const n = (pseudoNoise(x*3|0)+1)*0.5;
    const h = Math.floor(18 + n*12 + Math.sin(x*0.12)*4);
    for(let y=0;y<WORLD_H;y++){
      const idx = y*WORLD_W + x;
      if(y > h) world[idx] = 0;
      else if (y === h) world[idx] = 3; // grass
      else if (y > h-4) world[idx] = 1; // dirt
      else world[idx] = 2; // stone
    }
  }
  // add some trees
  for(let x=8;x<WORLD_W-8;x+=12){
    if(Math.random()<0.45){
      const top = getTopY(x);
      const trunkH = 3 + Math.floor(Math.random()*3);
      for(let t=1;t<=trunkH;t++) setBlock(x, top - t, 4);
      // leaves
      for(let lx=-2;lx<=2;lx++) for(let ly=-2;ly<=0;ly++){
        if(Math.abs(lx)+Math.abs(ly) < 4) setBlock(x+lx, top - trunkH + ly, 5);
      }
    }
  }
}

/* helpers */
function idx(x,y){ return y*WORLD_W + x; }
function inBounds(x,y){ return x>=0 && x<WORLD_W && y>=0 && y<WORLD_H; }
function setBlock(x,y,v){ if(!inBounds(x,y)) return; world[idx(x,y)] = v; }
function getBlock(x,y){ if(!inBounds(x,y)) return 0; return world[idx(x,y)]; }
function getTopY(x){
  for(let y=0;y<WORLD_H;y++){
    if(getBlock(x,y) !== 0) return y;
  }
  return WORLD_H-1;
}

/* PLAYER */
const player = {
  x: WORLD_W/2 * TILE,
  y: 0,
  w: 12, h: 24,
  vx: 0, vy: 0,
  onGround: false,
  facing: 1
};

/* INVENTORY: mapping tile id -> count */
const inventory = new Map();
const tileList = [1,2,3,4,5]; // available block ids in hotbar
tileList.forEach(id => inventory.set(id, 0));
let hotIndex = 0;

/* input */
const keys = {};
window.addEventListener('keydown', e=>{
  keys[e.key] = true;
  if(e.key>='1' && e.key<='9'){
    const idx = parseInt(e.key,10)-1;
    if(idx < tileList.length) { hotIndex = idx; updateHotbar(); }
  }
});
window.addEventListener('keyup', e=> keys[e.key] = false);

canvas.addEventListener('contextmenu', e=> e.preventDefault());
canvas.addEventListener('mousedown', onMouseDown);

function worldToScreen(wx, wy){
  return {
    sx: Math.floor((wx - camX/TILE) - 0),
    sy: Math.floor((wy - camY/TILE) - 0)
  };
}

/* CAMERA */
let camX = (player.x - canvas.width/2);
let camY = 0;

/* mouse actions: break/place */
function onMouseDown(e){
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const wx = Math.floor((mx + camX) / TILE);
  const wy = Math.floor((my + camY) / TILE);
  if(e.button === 0){ // left = break
    const b = getBlock(wx, wy);
    if(b !== 0){
      // add to inventory if placeable type
      if(inventory.has(b)) inventory.set(b, inventory.get(b)+1);
      setBlock(wx, wy, 0);
      updateBlocksCount();
    }
  } else if(e.button === 2){ // right = place
    const tileId = tileList[hotIndex];
    // place only if empty and we have blocks
    if(getBlock(wx,wy) === 0 && inventory.get(tileId) > 0){
      setBlock(wx, wy, tileId);
      inventory.set(tileId, inventory.get(tileId)-1);
      updateBlocksCount();
    }
  }
}

/* HUD hotbar */
function updateHotbar(){
  hotbarEl.innerHTML = '';
  tileList.forEach((id, i) => {
    const el = document.createElement('div');
    el.className = 'hot' + (i===hotIndex ? ' selected':'');
    el.addEventListener('click', ()=>{ hotIndex = i; updateHotbar(); });
    const canvasThumb = document.createElement('canvas');
    canvasThumb.width = 48; canvasThumb.height = 48;
    const cctx = canvasThumb.getContext('2d');
    drawTilePreview(cctx, id);
    el.appendChild(canvasThumb);
    const lbl = document.createElement('span');
    lbl.textContent = inventory.get(id) || '0';
    el.appendChild(lbl);
    hotbarEl.appendChild(el);
  });
}

/* draw small tile preview for hotbar */
function drawTilePreview(cctx, id){
  cctx.fillStyle = '#0b1a24';
  cctx.fillRect(0,0,48,48);
  if(!tilesImg.complete) { cctx.fillStyle='#666'; cctx.fillRect(8,8,32,32); return; }
  const sx = ((id-1) % 4) * TILE;
  const sy = Math.floor((id-1)/4) * TILE;
  cctx.drawImage(tilesImg, sx, sy, TILE, TILE, 8,8,32,32);
}

/* update blocks count HUD */
function updateBlocksCount(){
  let tot = 0;
  for(const v of inventory.values()) tot += v;
  blocksCountEl.textContent = tot;
  // update hotbar labels
  const children = hotbarEl.children;
  tileList.forEach((id,i)=>{
    const el = children[i];
    if(el) el.querySelector('span').textContent = inventory.get(id) || '0';
  });
}

/* SAVE / LOAD */
function saveGame(){
  const data = {
    world: Array.from(world),
    player,
    inventory: Array.from(inventory.entries())
  };
  localStorage.setItem('2dcraft_save_v1', JSON.stringify(data));
  alert('Saved');
}
function loadGame(){
  const raw = localStorage.getItem('2dcraft_save_v1');
  if(!raw) { alert('No save found'); return; }
  try{
    const data = JSON.parse(raw);
    world = Uint8Array.from(data.world);
    Object.assign(player, data.player);
    inventory.clear();
    data.inventory.forEach(([k,v]) => inventory.set(k,v));
    updateHotbar();
    updateBlocksCount();
    alert('Loaded');
  }catch(e){ alert('Load failed'); }
}
saveBtn.addEventListener('click', saveGame);
loadBtn.addEventListener('click', loadGame);
resetBtn.addEventListener('click', ()=>{ if(confirm('Reset world?')) { makeTerrain(); updateHotbar(); updateBlocksCount(); } });

/* RENDERING */
function draw(){
  ctx.fillStyle = '#7ec2ff';
  ctx.fillRect(0,0,canvas.width,canvas.height); // sky

  // camera follow (smooth)
  const targetCamX = player.x - canvas.width/2;
  camX += (targetCamX - camX) * 0.12;
  camY += ((player.y - canvas.height/2) - camY) * 0.12;

  // determine visible tile range
  const startX = Math.floor(camX / TILE) - 2;
  const endX = Math.ceil((camX + canvas.width) / TILE) + 2;
  const startY = Math.floor(camY / TILE) - 2;
  const endY = Math.ceil((camY + canvas.height) / TILE) + 2;

  // draw tiles
  if(tilesImg.complete){
    for(let x = startX; x <= endX; x++){
      if(x < 0 || x >= WORLD_W) continue;
      for(let y = startY; y <= endY; y++){
        if(y < 0 || y >= WORLD_H) continue;
        const b = getBlock(x,y);
        if(b === 0) continue;
        const sx = ((b-1) % 4) * TILE;
        const sy = Math.floor((b-1)/4) * TILE;
        const dx = Math.floor(x * TILE - camX);
        const dy = Math.floor(y * TILE - camY);
        ctx.drawImage(tilesImg, sx, sy, TILE, TILE, dx, dy, TILE, TILE);
      }
    }
  } else {
    // fallback: solid rects
    for(let x = startX; x <= endX; x++){
      if(x < 0 || x >= WORLD_W) continue;
      for(let y = startY; y <= endY; y++){
        const b = getBlock(x,y);
        if(!b) continue;
        const dx = Math.floor(x * TILE - camX);
        const dy = Math.floor(y * TILE - camY);
        ctx.fillStyle = b===1? '#8b5a3d' : b===2? '#6b6b6b' : b===3? '#3aa23a' : '#704214';
        ctx.fillRect(dx,dy,TILE,TILE);
      }
    }
  }

  // player
  const px = Math.floor(player.x - camX - player.w/2);
  const py = Math.floor(player.y - camY - player.h);
  ctx.fillStyle = '#ffdb7a';
  ctx.fillRect(px, py, player.w, player.h);

  // simple shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(px+2, py+player.h-4, player.w-4, 3);
}

/* PHYSICS: tile collisions */
function tileAtPixel(px, py){
  const bx = Math.floor(px / TILE);
  const by = Math.floor(py / TILE);
  return {bx, by, tile: getBlock(bx,by)};
}

function resolveCollisions(dt){
  // horizontal movement: move then check
  player.x += player.vx * dt;
  // check left/right collision by sampling corners
  const left = player.x - player.w/2;
  const right = player.x + player.w/2;
  const top = player.y - player.h;
  const bottom = player.y;
  // sample corners for solids
  const samples = [
    {x:left, y:top},
    {x:right-1, y:top},
    {x:left, y:bottom-1},
    {x:right-1, y:bottom-1}
  ];
  for(const s of samples){
    const t = tileAtPixel(s.x, s.y);
    if(t.tile !== 0){
      if(player.vx > 0) { // moved right, push left
        player.x = t.bx * TILE - player.w/2;
        player.vx = 0;
      } else if(player.vx < 0) {
        player.x = (t.bx + 1) * TILE + player.w/2;
        player.vx = 0;
      }
    }
  }

  // vertical
  player.y += player.vy * dt;
  const left2 = player.x - player.w/2;
  const right2 = player.x + player.w/2;
  const top2 = player.y - player.h;
  const bottom2 = player.y;
  const vsamples = [
    {x:left2, y:bottom2},
    {x:right2-1, y:bottom2}
  ];
  player.onGround = false;
  for(const s of vsamples){
    const t = tileAtPixel(s.x, s.y);
    if(t.tile !== 0){
      // landed on ground
      player.y = t.by * TILE;
      player.vy = 0;
      player.onGround = true;
    }
  }
}

/* GAME LOOP */
let lastTime = performance.now();
function update(){
  const now = performance.now();
  const dt = Math.min(0.033, (now - lastTime)/1000);
  lastTime = now;

  // input horizontal
  let move = 0;
  if(keys['ArrowLeft'] || keys['a']) move -= 1;
  if(keys['ArrowRight'] || keys['d']) move += 1;
  player.vx = move * PLAYER_SPEED;
  if(move !== 0) player.facing = move;

  // jump
  if((keys[' '] || keys['Spacebar']) && player.onGround){
    player.vy = JUMP_V;
    player.onGround = false;
  }

  // gravity
  player.vy += GRAVITY * dt;

  // collisions & movement
  resolveCollisions(dt);

  // update camY so ground stays somewhat centered
  // (handled in draw smoothing)

  draw();
  requestAnimationFrame(update);
}

/* INIT */
tilesImg.onload = ()=>{
  // once tiles loaded, build hotbar previews
  updateHotbar();
  updateBlocksCount();
};
makeTerrain();
updateHotbar();
updateBlocksCount();
requestAnimationFrame(update);

