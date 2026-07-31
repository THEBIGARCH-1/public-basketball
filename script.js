const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const hostBtn = document.getElementById('host-btn');
const joinBtn = document.getElementById('join-btn');
const joinInput = document.getElementById('join-id');
const statusText = document.getElementById('status-text');
const scoreboard = document.getElementById('scoreboard');
const lobby = document.getElementById('lobby');
const myScoreEl = document.getElementById('my-score');
const oppScoreEl = document.getElementById('opponent-score');

// Game State
let peer, conn;
let isHost = false;
let myScore = 0;
let oppScore = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragCurrent = { x: 0, y: 0 };

// Player Balls (Red = You, Blue = Opponent)
let myBall = { x: 150, y: 380, radius: 15, vx: 0, vy: 0, isShot: false, color: '#ff5722' };
let oppBall = { x: 150, y: 380, radius: 15, vx: 0, vy: 0, isShot: false, color: '#2196f3' };

// Court Setup
const rim = { x: 600, y: 220, width: 65, height: 10, nodeRadius: 6 };
const backboard = { x: 665, y: 130, width: 12, height: 110 };
const gravity = 0.42;
const bounceDamping = 0.7;

// --- MULTIPLAYER SETUP (PEERJS) ---

// Host Game
hostBtn.addEventListener('click', () => {
    peer = new Peer();
    isHost = true;

    peer.on('open', (id) => {
        statusText.innerHTML = `Your Room Code: b>${id}</b><br>Share this code with your friend!`;
    });

    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
    });
});

// Join Game
joinBtn.addEventListener('click', () => {
    const gameCode = joinInput.value.trim();
    if (!gameCode) return alert('Enter a room code first!');

    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(gameCode);
        setupConnection();
    });
});

// Handle Data Connection
function setupConnection() {
    conn.on('open', () => {
        lobby.classList.add('hidden');
        scoreboard.classList.remove('hidden');
        document.getElementById('match-status').textContent = '⚡ LIVE MATCH ⚡';
    });

    conn.on('data', (data) => {
        if (data.type === 'ballUpdate') {
            oppBall.x = data.x;
            oppBall.y = data.y;
            oppBall.isShot = data.isShot;
        } else if (data.type === 'scoreUpdate') {
            oppScore = data.score;
            oppScoreEl.textContent = oppScore;
        }
    });
}

// Send local ball state over PeerJS connection
function sendBallData() {
    if (conn && conn.open) {
        conn.send({
            type: 'ballUpdate',
            x: myBall.x,
            y: myBall.y,
            isShot: myBall.isShot
        });
    }
}

// Send score updates
function sendScoreData() {
    if (conn && conn.open) {
        conn.send({ type: 'scoreUpdate', score: myScore });
    }
}

// --- CONTROLS ---

canvas.addEventListener('mousedown', (e) => {
    if (myBall.isShot) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (Math.hypot(mouseX - myBall.x, mouseY - myBall.y) < myBall.radius * 2.5) {
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

    myBall.vx = dx * 0.16;
    myBall.vy = dy * 0.16;
    myBall.isShot = true;
});

function resetMyBall() {
    myBall.x = 150;
    myBall.y = 380;
    myBall.vx = 0;
    myBall.vy = 0;
    myBall.isShot = false;
    sendBallData();
}

// --- PHYSICS & COLLISIONS ---

function handleCollisions() {
    // Backboard
    if (
        myBall.x + myBall.radius > backboard.x &&
        myBall.x - myBall.radius < backboard.x + backboard.width &&
        myBall.y + myBall.radius > backboard.y &&
        myBall.y - myBall.radius < backboard.y + backboard.height
    ) {
        myBall.x = backboard.x - myBall.radius;
        myBall.vx = -myBall.vx * bounceDamping;
    }

    // Rim Nodes
    const rimNodes = [{ x: rim.x, y: rim.y }, { x: rim.x + rim.width, y: rim.y }];
    rimNodes.forEach(node => {
        const dx = myBall.x - node.x;
        const dy = myBall.y - node.y;
        const distance = Math.hypot(dx, dy);
        const minDist = myBall.radius + rim.nodeRadius;

        if (distance < minDist) {
            const angle = Math.atan2(dy, dx);
            myBall.x = node.x + Math.cos(angle) * minDist;
            myBall.y = node.y + Math.sin(angle) * minDist;

            const normalX = Math.cos(angle);
            const normalY = Math.sin(angle);
            const dot = myBall.vx * normalX + myBall.vy * normalY;

            myBall.vx = (myBall.vx - 2 * dot * normalX) * bounceDamping;
            myBall.vy = (myBall.vy - 2 * dot * normalY) * bounceDamping;
        }
    });
}

function checkScore() {
    if (
        myBall.x > rim.x + 8 &&
        myBall.x < rim.x + rim.width - 8 &&
        myBall.y > rim.y &&
        myBall.y < rim.y + rim.height + 10 &&
        myBall.vy > 0
    ) {
        myScore += 1;
        myScoreEl.textContent = myScore;
        sendScoreData();
        resetMyBall();
    }
}

// --- GAME LOOP ---

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Hoop & Backboard
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(backboard.x, backboard.y, backboard.width, backboard.height);
    ctx.fillStyle = '#ff5722';
    ctx.fillRect(rim.x, rim.y, rim.width, rim.height);

    // Update Local Ball Physics
    if (myBall.isShot) {
        myBall.x += myBall.vx;
        myBall.y += myBall.vy;
        myBall.vy += gravity;

        handleCollisions();
        checkScore();
        sendBallData();

        if (myBall.y > canvas.height + 50 || myBall.x > canvas.width + 50 || myBall.x < -50) {
            resetMyBall();
        }
    }

    // Aim Line
    if (isDragging) {
        ctx.beginPath();
        ctx.moveTo(myBall.x, myBall.y);
        ctx.lineTo(myBall.x + (dragStart.x - dragCurrent.x), myBall.y + (dragStart.y - dragCurrent.y));
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Render Opponent Ball (Blue)
    if (oppBall.isShot || oppBall.x !== 150) {
        ctx.beginPath();
        ctx.arc(oppBall.x, oppBall.y, oppBall.radius, 0, Math.PI * 2);
        ctx.fillStyle = oppBall.color;
        ctx.fill();
        ctx.stroke();
    }

    // Render My Ball (Red)
    ctx.beginPath();
    ctx.arc(myBall.x, myBall.y, myBall.radius, 0, Math.PI * 2);
    ctx.fillStyle = myBall.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    requestAnimationFrame(update);
}

update();
