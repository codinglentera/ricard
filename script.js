// Simple Pac-Man clone
// Tile-based grid, canvas rendering, keyboard controls

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');

const TILE = 32;             // tile pixel size
const COLS = Math.floor(canvas.width / TILE);   // 19
const ROWS = Math.floor(canvas.height / TILE);  // 15

// Map legend:
// 0 = empty path
// 1 = wall
// 2 = pellet
// 3 = power pellet
// We'll design a simple maze (ROWS x COLS)
let mapTemplate = [
  "1111111111111111111",
  "1000000001000000001",
  "1021111101011111101",
  "1000000100000000101",
  "1011110101111010101",
  "1000010101000010101",
  "1111010101011110101",
  "0000010000000000100",
  "1111010111111110111",
  "1000010100000010001",
  "1011110101111011101",
  "1000000101000000001",
  "1021111101011111101",
  "1000000001000000001",
  "1111111111111111111",
];

let map = []; // numeric map

function resetMap(){
  map = mapTemplate.map(row => row.split('').map(c => {
    if(c === '0') return 2; // place pellet by default
    return parseInt(c,10);
  }));
  // ensure power pellets at corners
  map[1][1] = 3;
  map[1][COLS-2] = 3;
  map[ROWS-2][1] = 3;
  map[ROWS-2][COLS-2] = 3;
}

// Utility
function inBounds(r,c){ return r>=0 && r<ROWS && c>=0 && c<COLS; }
function isWall(r,c){ return !inBounds(r,c) ? true : map[r][c] === 1; }

const DIRS = {
  'left': {x:-1,y:0},
  'right': {x:1,y:0},
  'up': {x:0,y:-1},
  'down': {x:0,y:1},
  'none': {x:0,y:0}
};

function oppositeDir(d){
  if(d==='left') return 'right';
  if(d==='right') return 'left';
  if(d==='up') return 'down';
  if(d==='down') return 'up';
  return 'none';
}

// Pac-Man
let pac;
let ghosts = [];
let score = 0;
let lives = 3;
let gameOver = false;
let poweredUntil = 0;

function createEntities(){
  pac = {
    r: 7, c: 9,           // grid pos (center)
    x: 9 * TILE,
    y: 7 * TILE,
    dir: 'none',
    nextDir: 'none',
    speed: 2.2,          // pixels per frame
    radius: TILE*0.45
  };

  ghosts = [
    {r:7,c:8,x:8*TILE,y:7*TILE,clr:'#ff0000',dir:'left',speed:1.5,mode:'chase'},
    {r:7,c:10,x:10*TILE,y:7*TILE,clr:'#ffb8ff',dir:'right',speed:1.4,mode:'chase'},
    {r:6,c:9,x:9*TILE,y:6*TILE,clr:'#00ffff',dir:'up',speed:1.3,mode:'chase'},
  ];
}

function restart(){
  resetMap();
  createEntities();
  score = 0;
  lives = 3;
  poweredUntil = 0;
  gameOver = false;
  statusEl.textContent = 'Use arrow keys to move';
  updateHud();
}

restartBtn.addEventListener('click', ()=> restart());

// Input
window.addEventListener('keydown', (e)=>{
  if(gameOver) return;
  const mapKey = {
    'ArrowLeft':'left',
    'ArrowRight':'right',
    'ArrowUp':'up',
    'ArrowDown':'down',
    'a':'left','d':'right','w':'up','s':'down'
  };
  const d = mapKey[e.key];
  if(d){
    pac.nextDir = d;
    // prevent scrolling
    e.preventDefault();
  }
});

// Movement helpers for grid alignment
function tileCenterCoord(tileIdx){
  return tileIdx * TILE + TILE/2;
}

// Check if tile at (r,c) is passable (not wall)
function passable(r,c){
  return inBounds(r,c) && map[r][c] !== 1;
}

// Align pixel pos to tile center and update grid pos
function syncGridFromPixels(entity){
  entity.c = Math.round((entity.x) / TILE);
  entity.r = Math.round((entity.y) / TILE);
}

// Collision detection
function distance(a,b){
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function tryChangeDirectionCharacter(entity){
  if(entity.nextDir === 'none') return false;
  const nd = DIRS[entity.nextDir];
  const targetC = Math.round((entity.x + nd.x * TILE) / TILE);
  const targetR = Math.round((entity.y + nd.y * TILE) / TILE);

  // We allow direction change only when entity is near center of its current tile
  const centerX = entity.c * TILE + TILE/2;
  const centerY = entity.r * TILE + TILE/2;
  const dx = Math.abs(entity.x - centerX);
  const dy = Math.abs(entity.y - centerY);

  if(dx <= entity.speed + 0.5 && dy <= entity.speed + 0.5){
    // check if the tile in that direction is passable
    if(passable(entity.r + nd.y, entity.c + nd.x)){
      // snap to center
      entity.x = centerX;
      entity.y = centerY;
      entity.dir = entity.nextDir;
      return true;
    }
  }
  return false;
}

function updatePac(){
  // Sync grid roughly
  syncGridFromPixels(pac);

  // Try to change direction if possible
  tryChangeDirectionCharacter(pac);

  const d = DIRS[pac.dir];
  if(d.x === 0 && d.y === 0) return;

  // compute next pixel position
  const nextX = pac.x + d.x * pac.speed;
  const nextY = pac.y + d.y * pac.speed;

  // check collision with wall at next tile
  // check tile we're heading to based on pixel center offset
  const headingC = Math.round(nextX / TILE);
  const headingR = Math.round(nextY / TILE);

  if(!isWall(headingR, headingC)){
    pac.x = nextX;
    pac.y = nextY;
    syncGridFromPixels(pac);
    // Eat pellets when near center
    const centerX = pac.c * TILE + TILE/2;
    const centerY = pac.r * TILE + TILE/2;
    if(Math.abs(pac.x - centerX) < 3 && Math.abs(pac.y - centerY) < 3){
      const tileVal = map[pac.r][pac.c];
      if(tileVal === 2){ score += 10; map[pac.r][pac.c] = 0; }
      if(tileVal === 3){ score += 50; map[pac.r][pac.c] = 0; poweredUntil = performance.now() + 7000; }
      updateHud();
      // Check win (no pellets left)
      if(!map.flat().some(v => v === 2 || v === 3)){
        statusEl.textContent = 'You Win! 🎉 Press Restart to play again.';
        gameOver = true;
      }
    }
  } else {
    // can't move, stop
    pac.dir = 'none';
  }
}

function updateGhosts(delta){
  const now = performance.now();
  const frightened = now < poweredUntil;

  for(const g of ghosts){
    // sync center-based grid
    g.c = Math.round(g.x / TILE);
    g.r = Math.round(g.y / TILE);

    // If eaten recently, respawn center
    // Choose new direction at intersections or if next tile is wall
    const currentDir = g.dir;
    const ndir = currentDir;

    // If ghost centered on tile, decide direction
    const centerX = g.c * TILE + TILE/2;
    const centerY = g.r * TILE + TILE/2;
    const dx = Math.abs(g.x - centerX);
    const dy = Math.abs(g.y - centerY);
    if(dx < 2 && dy < 2){
      // check possible directions
      const possible = [];
      for(const [k,v] of Object.entries(DIRS)){
        if(k === 'none') continue;
        // avoid reversing unless no choice
        if(oppositeDir(k) === currentDir) continue;
        if(passable(g.r + v.y, g.c + v.x)) possible.push(k);
      }
      if(possible.length === 0){
        // must reverse
        const rev = oppositeDir(currentDir);
        if(rev && passable(g.r + DIRS[rev].y, g.c + DIRS[rev].x)) g.dir = rev;
      } else {
        // random choice but prefer moving towards or away from Pac when not frightened
        if(frightened){
          // choose direction away from Pac with some randomness
          possible.sort((a,b)=>{
            const da = Math.hypot((g.c+DIRS[a].x)-pac.c, (g.r+DIRS[a].y)-pac.r);
            const db = Math.hypot((g.c+DIRS[b].x)-pac.c, (g.r+DIRS[b].y)-pac.r);
            return db - da; // larger distance preferred
          });
          // small randomness
          g.dir = possible[Math.floor(Math.random()*Math.min(2, possible.length))];
        } else {
          // chase: prefer closer to Pac
          possible.sort((a,b)=>{
            const da = Math.hypot((g.c+DIRS[a].x)-pac.c, (g.r+DIRS[a].y)-pac.r);
            const db = Math.hypot((g.c+DIRS[b].x)-pac.c, (g.r+DIRS[b].y)-pac.r);
            return da - db;
          });
          g.dir = possible[0];
        }
      }
      // snap to center to avoid getting stuck
      g.x = centerX;
      g.y = centerY;
    }

    // move
    const speed = frightened ? g.speed * 0.9 : g.speed;
    const dd = DIRS[g.dir] || DIRS.none;
    const nextX = g.x + dd.x * speed;
    const nextY = g.y + dd.y * speed;

    // If next tile is a wall, stop and choose new dir next tick
    const headingC = Math.round(nextX / TILE);
    const headingR = Math.round(nextY / TILE);
    if(!isWall(headingR, headingC)){
      g.x = nextX;
      g.y = nextY;
    } else {
      // force pick new direction next loop
      g.dir = oppositeDir(g.dir);
    }
  }

  // collisions with Pac
  for(const g of ghosts){
    const coll = distance({x: pac.x, y: pac.y}, {x: g.x, y: g.y}) < TILE*0.6;
    if(coll){
      if(now < poweredUntil){
        // eat ghost
        score += 200;
        updateHud();
        // send ghost back home (respawn at center top) quickly
        g.x = 9 * TILE;
        g.y = 3 * TILE;
        g.c = Math.round(g.x / TILE);
        g.r = Math.round(g.y / TILE);
      } else {
        // Pac-Man dies
        lives--;
        updateHud();
        if(lives <= 0){
          gameOver = true;
          statusEl.textContent = 'Game Over! Press Restart to try again.';
        } else {
          // reset positions briefly
          pac.x = 9 * TILE; pac.y = 7 * TILE; pac.dir = 'none'; pac.nextDir = 'none';
          for(const gg of ghosts){
            gg.x = gg.c * TILE; gg.y = gg.r * TILE;
            gg.dir = oppositeDir(gg.dir) || 'left';
          }
          // brief pause effect
          poweredUntil = 0;
        }
      }
    }
  }
}

function updateHud(){
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
}

// Drawing
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // background
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // draw map walls, pellets
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const val = map[r][c];
      const x = c * TILE;
      const y = r * TILE;

      if(val === 1){
        // wall
        ctx.fillStyle = '#1932a6';
        ctx.fillRect(x+2,y+2,TILE-4,TILE-4);
      } else {
        // draw pellet or power pellet
        if(val === 2){
          ctx.fillStyle = '#ffd966';
          ctx.beginPath();
          ctx.arc(x + TILE/2, y + TILE/2, 4, 0, Math.PI*2);
          ctx.fill();
        } else if(val === 3){
          ctx.fillStyle = '#ffd966';
          ctx.beginPath();
          ctx.arc(x + TILE/2, y + TILE/2, 8, 0, Math.PI*2);
          ctx.fill();
        }
      }
    }
  }

  // draw Pac-Man (simple circle with mouth direction)
  const px = pac.x;
  const py = pac.y;
  const mouthAngle = 0.25; // radians
  let angleStart = 0;
  let angleEnd = Math.PI*2;
  switch(pac.dir){
    case 'left': angleStart = Math.PI + mouthAngle; angleEnd = Math.PI - mouthAngle; break;
    case 'right': angleStart = -mouthAngle; angleEnd = mouthAngle; break;
    case 'up': angleStart = -Math.PI/2 + mouthAngle; angleEnd = -Math.PI/2 - mouthAngle; break;
    case 'down': angleStart = Math.PI/2 + mouthAngle; angleEnd = Math.PI/2 - mouthAngle; break;
    default: angleStart = -mouthAngle; angleEnd = mouthAngle;
  }
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(px,py);
  ctx.arc(px,py,pac.radius,angleStart,angleEnd);
  ctx.closePath();
  ctx.fill();

  // draw ghosts
  const frightened = performance.now() < poweredUntil;
  for(const g of ghosts){
    const gx = g.x;
    const gy = g.y;
    ctx.save();
    ctx.translate(gx,gy);
    // body
    ctx.beginPath();
    ctx.fillStyle = frightened ? '#1a73e8' : g.clr;
    ctx.arc(0, -6, 12, Math.PI, 0);
    ctx.rect(-12, -6, 24, 18);
    ctx.fill();
    // scallops
    ctx.fillStyle = frightened ? '#1a73e8' : g.clr;
    for(let i=-12;i<12;i+=8){
      ctx.beginPath();
      ctx.arc(i, 12, 4, 0, Math.PI, true);
      ctx.fill();
    }
    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-4, -2, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -2, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-4 + (g.dir==='left'?-1: g.dir==='right'?1:0), -2 + 0, 1.8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(6 + (g.dir==='left'?-1: g.dir==='right'?1:0), -2 + 0, 1.8, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  }
}

// Game loop
let lastTime = 0;
function loop(ts){
  if(!lastTime) lastTime = ts;
  const delta = ts - lastTime;
  lastTime = ts;

  if(!gameOver){
    updatePac();
    updateGhosts(delta);
    draw();
  }

  requestAnimationFrame(loop);
}

// initialize
resetMap();
createEntities();
updateHud();
requestAnimationFrame(loop);
