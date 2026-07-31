const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

// Game state variables
let score = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragCurrent = { x: 0, y: 0 };
let scoreMessageTimer = 0; // Timer to display "SCORE!" message

// Ball properties
const ballDefault = { x: 150, y: 380, radius: 16, vx: 0, vy: 0, isShot: false };
let ball = { ...ballDefault };

// Rim & Backboard setup
const rim = { x: 590, y: 220, width: 70, height: 10, nodeRadius: 6 };
const backboard = { x: 660, y: 130, width: 12, height: 110 };

// Physics constants
const gravity = 0.42;
const bounceDamping = 0.7; // Elasticity of bounce

// Event Listeners for Drag-and-Shoot
canvas.addEventListener('mousedown', (e) => {
    if (ball.isShot) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dist = Math.hypot(mouseX - ball.x, mouseY - ball.y);
    if (dist < ball.radius * 2.5) {
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

// Solid Rim and Backboard Collisions
function handleCollisions() {
    // 1. Backboard Collision
    if (
        ball.x + ball.radius > backboard.x &&
        ball.x - ball.radius < backboard.x + backboard.width &&
        ball.y + ball.radius > backboard.y &&
        ball.y - ball.radius < backboard.y + backboard.height
    ) {
        ball.x = backboard.x - ball.radius;
        ball.vx = -ball.vx * bounceDamping;
    }

    // 2. Front and Back Rim Nodes (Circular collision boundaries)
    const rimNodes = [
        { x: rim.x, y: rim.y },                  // Front of ring
        { x: rim.x + rim.width, y: rim.y }       // Back of ring
    ];

    rimNodes.forEach(node => {
        const dx = ball.x - node.x;
        const dy = ball.y - node.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = ball.radius + rim.nodeRadius;

        if (distance < minDistance) {
            // Angle between ball and rim node
            const angle = Math.atan2(dy, dx);

            // Reposition ball outside collision node
            ball.x = node.x + Math.cos(angle) * minDistance;
            ball.y = node.y + Math.sin(angle) * minDistance;

            // Reflect velocity vector
            const normalX = Math.cos(angle);
            const normalY = Math.sin(angle);
            const dotProduct = ball.vx * normalX + ball.vy * normalY;

            ball.vx = (ball.vx - 2 * dotProduct * normalX) * bounceDamping;
            ball.vy = (ball.vy - 2 * dotProduct * normalY) * bounceDamping;
        }
    });
}

// Check Score Condition
function checkScore() {
    if (
        ball.x > rim.x + 8 &&
        ball.x < rim.x + rim.width - 8 &&
        ball.y > rim.y &&
        ball.y < rim.y + rim.height + 12 &&
        ball.vy > 0 // Ball must be falling down
    ) {
        score += 1;
        scoreEl.textContent = score;
        scoreMessageTimer = 45; // Show "SCORE!" message for 45 frames
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

    // Draw Front Rim Node Knob
    ctx.beginPath();
    ctx.arc(rim.x, rim.y, rim.nodeRadius, 0, Math.PI * 2);
    ctx.arc(rim.x + rim.width, rim.y, rim.nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#d84315';
    ctx.fill();

    // Physics Step
    if (ball.isShot) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vy += gravity;

        handleCollisions();
        checkScore();

        // Reset if ball goes off-screen
        if (ball.y > canvas.height + 50 || ball.x > canvas.width + 50 || ball.x < -50) {
            resetBall();
        }
    }

    // Draw Aim Line
    if (isDragging) {
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(
            ball.x + (dragStart.x - dragCurrent.x),
            ball.y + (dragStart.y - dragCurrent.y)
        );
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
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

    // Render "SCORE!" text popup
    if (scoreMessageTimer > 0) {
        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = '#4caf50';
        ctx.textAlign = 'center';
        ctx.fillText('SCORE! 🏀', canvas.width / 2, 120);
        scoreMessageTimer--;
    }

    requestAnimationFrame(update);
}

update();
