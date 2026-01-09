const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const tile = 20;

// Peta game
let map = [
  "####################",
  "#........#.........#",
  "#.####.###.#.####.###",
  "#..................#",
  "#.####.#.#####.#.###",
  "#......#....#.....#",
  "######.#####.#.#####",
  "#..................#",
  "#.####.#####.#.####.#",
  "#........#.........#",
  "####################"
];

let pacman = {
  x: 1,
  y: 1,
  dx: 0,
  dy: 0
};

let score = 0;

// Kontrol keyboard
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp")    { pacman.dx = 0; pacman.dy = -1; }
  if (e.key === "ArrowDown")  { pacman.dx = 0; pacman.dy = 1; }
  if (e.key === "ArrowLeft")  { pacman.dx = -1; pacman.dy = 0; }
  if (e.key === "ArrowRight") { pacman.dx = 1; pacman.dy = 0; }
});

// Gambar peta
function drawMap() {
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === "#") {
        ctx.fillStyle = "blue";
        ctx.fillRect(x * tile, y * tile, tile, tile);
      }
      if (map[y][x] === ".") {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x * tile + tile / 2, y * tile + tile / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// Gambar Pac-Man
function drawPacman() {
  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.arc(
    pacman.x * tile + tile / 2,
    pacman.y * tile + tile / 2,
    tile / 2 - 2,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

// Gerakan Pac-Man
function movePacman() {
  let nx = pacman.x + pacman.dx;
  let ny = pacman.y + pacman.dy;

  if (map[ny][nx] !== "#") {
    pacman.x = nx;
    pacman.y = ny;

    if (map[ny][nx] === ".") {
      map[ny] =
        map[ny].substring(0, nx) +
        " " +
        map[ny].substring(nx + 1);
      score++;
    }
  }
}

// Skor
function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText("Score: " + score, 10, canvas.height - 10);
}

// Game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  movePacman();
  drawPacman();
  drawScore();
}

setInterval(gameLoop, 150);
