const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

// Game state variables
let score = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragCurrent = { x: 0, y: 0 };

// Ball properties
const ballDefault = { x: 150, y: 380, radius: 18, vx: 0, vy: 0, isShot: false };
let ball = { ...ballDefault };

// Hoop properties
const hoop = { x: 650, y: 200, width: 60, height: 8 };

// Physics constants
const gravity = 0.4;
const friction = 0.98;

// Event Listeners for Aiming and Shooting
canvas.addEventListener('mousedown', (e) => {
    if (ball.isShot) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if click is near the ball
    const dist = Math.hypot(mouseX - ball.x, mouseY - ball.y);
    if (dist < ball.radius * 2) {
        isDragging = true;
        dragStart = { x: mouseX, y: mouseY };
        dragCurrent = { x: mouseX, y: mouseY };
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    dragCurrent = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});

canvas.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;

    // Calculate launch velocity based on drag distance
    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;

    ball.vx = dx * 0.15;
    ball.vy = dy * 0.15;
    ball.isShot = true;
});

// Reset ball after shot
function resetBall() {
    ball = { ...ballDefault };
}

// Check if score was made
function checkScore() {
    if (
        ball.x > hoop.x &&
        ball.x < hoop.x + hoop.width &&
        ball.y > hoop.y &&
        ball.y < hoop.y + hoop.height &&
        ball.vy > 0 // Ball must be falling downwards
    ) {
        score += 1;
        scoreEl.textContent = score;
        resetBall();
    }
}

// Game Loop
function update() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Hoop & Backboard
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hoop.x + hoop.width, hoop.y - 60, 10, 80); // Backboard
    ctx.fillStyle = '#ff5722';
    ctx.fillRect(hoop.x, hoop.y, hoop.width, hoop.height); // Rim

    // Update Ball Physics
    if (ball.isShot) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vy += gravity;

        checkScore();

        // Out of bounds reset
        if (ball.y > canvas.height + 50 || ball.x > canvas.width + 50 || ball.x < -50) {
            resetBall();
        }
    }

    // Draw Aiming Line
    if (isDragging) {
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(
            ball.x + (dragStart.x - dragCurrent.x),
            ball.y + (dragStart.y - dragCurrent.y)
        );
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#e65100';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    requestAnimationFrame(update);
}

update();
