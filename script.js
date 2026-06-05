const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let score = 0;

const player = {
    x: 375,
    y: 550,
    width: 50,
    height: 30,
    speed: 7
};

let bullets = [];
let enemies = [];

let keys = {};

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;

    if (e.code === "Space") {
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 5,
            height: 10,
            speed: 8
        });
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

function spawnEnemy() {
    enemies.push({
        x: Math.random() * (canvas.width - 40),
        y: -40,
        width: 40,
        height: 40,
        speed: 2 + Math.random() * 2
    });
}

setInterval(spawnEnemy, 1000);

function update() {

    if (keys["ArrowLeft"] && player.x > 0) {
        player.x -= player.speed;
    }

    if (keys["ArrowRight"] &&
        player.x < canvas.width - player.width) {
        player.x += player.speed;
    }

    bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;

        if (bullet.y < 0) {
            bullets.splice(index, 1);
        }
    });

    enemies.forEach((enemy, eIndex) => {
        enemy.y += enemy.speed;

        if (enemy.y > canvas.height) {
            alert("Game Over!\nScore: " + score);
            location.reload();
        }

        bullets.forEach((bullet, bIndex) => {
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                enemies.splice(eIndex, 1);
                bullets.splice(bIndex, 1);

                score += 10;
                document.getElementById("score").innerText =
                    "Score: " + score;
            }
        });
    });
}

function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Player
    ctx.fillStyle = "lime";
    ctx.fillRect(
        player.x,
        player.y,
        player.width,
        player.height
    );

    // Bullets
    ctx.fillStyle = "yellow";
    bullets.forEach((bullet) => {
        ctx.fillRect(
            bullet.x,
            bullet.y,
            bullet.width,
            bullet.height
        );
    });

    // Enemies
    ctx.fillStyle = "red";
    enemies.forEach((enemy) => {
        ctx.fillRect(
            enemy.x,
            enemy.y,
            enemy.width,
            enemy.height
        );
    });
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
