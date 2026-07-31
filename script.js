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

// Hoop & Backboard dimensions
const rim = { x: 620, y: 220, width: 60, height: 8 };
const backboard = { x: 680, y: 140, width: 10, height: 100 };

// Physics constants
const gravity = 0.45;
const bounceDamping = 0.65; // Speed loss on collision

// Event Listeners
canvas.addEventListener('mousedown', (e) => {
    if (ball.isShot) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

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

    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;

    ball.vx = dx * 0.16;
    ball.vy = dy * 0.16;
    ball.isShot = true;
});

function resetBall() {
    ball = { ...ballDefault };
}

// Collisions with Backboard and Rim Points
function handleCollisions() {
    // 1. Backboard Collision (vertical front face)
    if (
        ball.x + ball.radius > backboard.x &&
        ball.x - ball.radius < backboard.x + backboard.width &&
        ball.y > backboard.y &&
        ball.y < backboard.y + backboard.height
    ) {
        ball.x = backboard.x - ball.radius;
        ball.vx = -ball.vx * bounceDamping; // Reverse horizontal velocity
    }

    // Rim collision points (Front Rim Edge and Back Rim Edge)
    const rimPoints = [
        { x: rim.x, y: rim.y },                   // Front edge of rim
        { x: rim.x + rim.width, y: rim.y }        // Back edge of rim
    ];

    rimPoints.forEach(point => {
        const dx = ball.x - point.x;
        const dy = ball.y - point.y;
        const dist = Math.hypot(dx, dy);

        // If ball hits a rim edge point
        if (dist < ball.radius) {
            // Calculate bounce angle
            const angle = Math.atan2(dy, dx);
            const speed = Math.hypot(ball.vx, ball.vy) * bounceDamping;

            ball.vx = Math.cos(angle) * speed;
            ball.vy = Math.sin(angle) * speed;

            // Push ball slightly out of collision to prevent sticking
            ball.x = point.x + Math.cos(angle) * ball.radius;
            ball.y = point.y + Math.sin(angle) * ball.radius;
        }
    });
}

// Check if ball passes cleanly through the hoop
function checkScore() {
    if (
        ball.x > rim.x + 10 &&
        ball.x < rim.x + rim.width - 10 &&
        ball.y > rim.y &&
        ball.y < rim.y + rim.height + 10 &&
        ball.vy > 0 // Ball must be moving downward
    ) {
        score += 1;
        scoreEl.textContent = score;
        resetBall();
    }
}

// Game Loop
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Backboard
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(backboard.x, backboard.y, backboard.width, backboard.height);

    // Draw Rim
    ctx.fillStyle = '#ff5722';
    ctx.fillRect(rim.x, rim.y, rim.width, rim.height);

    // Update Physics if ball is in air
    if (ball.isShot) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vy += gravity;

        handleCollisions();
        checkScore();

        // Reset if ball leaves screen bounds
        if (ball.y > canvas.height + 50 || ball.x > canvas.width + 50 || ball.x < -50) {
            resetBall();
        }
    }

    // Draw Aiming Trajectory Line
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
