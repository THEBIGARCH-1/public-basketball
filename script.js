const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const hostBtn = document.getElementById('host-btn');
const joinBtn = document.getElementById('join-btn');
const joinInput = document.getElementById('join-id');
const statusText = document.getElementById('status-text');
const scoreboard = document.getElementById('scoreboard');
const lobby = document.getElementById('lobby');

// Game State
let peer, conn;
let isHost = false;
let myRole = 'p1'; // 'p1' or 'p2'

// Score State
let scores = { p1: 0, p2: 0 };

// Controls Input
const keys = {};

// Game Entities
const p1 = { x: 150, y: 250, radius: 18, color: '#e53935', speed: 4 };
const p2 = { x: 850, y: 250, radius: 18, color: '#1e88e5', speed: 4 };

// Ball State
const ball = {
    x: 500,
    y: 250,
    radius: 10,
    color: '#ff9800',
    holder: 'p1', // 'p1', 'p2', or null (in air)
    vx: 0,
    vy: 0,
    isShooting: false,
    targetHoop: null
};

// Hoops (Top-Down Positions)
const leftHoop = { x: 50, y: 250, radius: 15 };
const rightHoop = { x: 950, y: 250, radius: 15 };

// --- MULTIPLAYER SETUP (PEERJS) ---

hostBtn.addEventListener('click', () => {
    peer = new Peer();
    isHost = true;
    myRole = 'p1';

    peer.on('open', (id) => {
        statusText.innerHTML = `Game Code: <b>${id}</b><br>Share this with Player 2!`;
    });

    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
    });
});

joinBtn.addEventListener('click', () => {
    const code = joinInput.value.trim();
    if (!code) return alert('Please enter a game code!');

    peer = new Peer();
    isHost = false;
    myRole = 'p2';

    peer.on('open', () => {
        conn = peer.connect(code);
        setupConnection();
    });
});

function setupConnection() {
    conn.on('open', () => {
        lobby.classList.add('hidden');
        scoreboard.classList.remove('hidden');
    });

    conn.on('data', (data) => {
        if (data.type === 'sync') {
            if (!isHost) {
                p1.x = data.p1.x;
                p1.y = data.p1.y;
                ball.x = data.ball.x;
                ball.y = data.ball.y;
                ball.holder = data.ball.holder;
                scores = data.scores;
                updateScoreboard();
            } else {
                p2.x = data.p2.x;
                p2.y = data.p2.y;
            }
        } else if (data.type === 'action') {
            handlePlayerAction(data.role, data.action);
        }
    });
}

function sendNetworkData() {
    if (!conn || !conn.open) return;

    if (isHost) {
        conn.send({
            type: 'sync',
            p1: { x: p1.x, y: p1.y },
            p2: { x: p2.x, y: p2.y },
            ball: { x: ball.x, y: ball.y, holder: ball.holder },
            scores: scores
        });
    } else {
        conn.send({
            type: 'sync',
            p2: { x: p2.x, y: p2.y }
        });
    }
}

function sendAction(action) {
    if (conn && conn.open) {
        conn.send({ type: 'action', role: myRole, action: action });
    }
}

// --- INPUT LISTENERS ---

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    if (e.code === 'Space') {
        executeShootOrSteal(myRole);
        sendAction('space');
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// --- GAMEPLAY MECHANICS ---

function handlePlayerAction(role, action) {
    if (action === 'space') {
        executeShootOrSteal(role);
    }
}

function executeShootOrSteal(role) {
    const player = role === 'p1' ? p1 : p2;
    const opponent = role === 'p1' ? p2 : p1;

    // Shooting
    if (ball.holder === role) {
        ball.holder = null;
        ball.isShooting = true;

        // P1 shoots right, P2 shoots left
        const target = role === 'p1' ? rightHoop : leftHoop;
        const dx = target.x - ball.x;
        const dy = target.y - ball.y;
        const dist = Math.hypot(dx, dy);

        ball.vx = (dx / dist) * 7;
        ball.vy = (dy / dist) * 7;
        ball.targetHoop = target;
    } 
    // Stealing
    else if (ball.holder === (role === 'p1' ? 'p2' : 'p1')) {
        const dist = Math.hypot(player.x - opponent.x, player.y - opponent.y);
        if (dist < 45) { // Steal radius
            ball.holder = role;
        }
    }
}

function resetAfterScore() {
    p1.x = 200; p1.y = 250;
    p2.x = 800; p2.y = 250;
    ball.x = 500; ball.y = 250;
    ball.vx = 0; ball.vy = 0;
    ball.isShooting = false;
    ball.holder = 'p1';
    updateScoreboard();
}

function updateScoreboard() {
    document.getElementById('p1-score').textContent = scores.p1;
    document.getElementById('p2-score').textContent = scores.p2;
}

// --- PHYSICS AND LOGIC UPDATES ---

function updateGame() {
    // Local player movement
    const myPlayer = myRole === 'p1' ? p1 : p2;

    if (keys['a'] || keys['arrowleft']) myPlayer.x -= myPlayer.speed;
    if (keys['d'] || keys['arrowright']) myPlayer.x += myPlayer.speed;
    if (keys['w'] || keys['arrowup']) myPlayer.y -= myPlayer.speed;
    if (keys['s'] || keys['arrowdown']) myPlayer.y += myPlayer.speed;

    // Boundaries
    myPlayer.x = Math.max(p1.radius, Math.min(canvas.width - p1.radius, myPlayer.x));
    myPlayer.y = Math.max(p1.radius, Math.min(canvas.height - p1.radius, myPlayer.y));

    // Ball movement & updates (Handled by Host)
    if (isHost) {
        if (ball.holder === 'p1') {
            ball.x = p1.x + 12;
            ball.y = p1.y;
        } else if (ball.holder === 'p2') {
            ball.x = p2.x - 12;
            ball.y = p2.y;
        } else if (ball.isShooting) {
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Check hoop collision
            const distToHoop = Math.hypot(ball.x - ball.targetHoop.x, ball.y - ball.targetHoop.y);
            if (distToHoop < 12) {
                if (ball.targetHoop === rightHoop) scores.p1 += 2;
                else scores.p2 += 2;
                resetAfterScore();
            }

            // Out of bounds missed shot reset
            if (ball.x < 0 || ball.x > canvas.width || ball.y < 0 || ball.y > canvas.height) {
                ball.isShooting = false;
                ball.holder = null;
            }
        } else {
            // Loose ball pickup
            if (Math.hypot(p1.x - ball.x, p1.y - ball.y) < p1.radius + ball.radius) ball.holder = 'p1';
            if (Math.hypot(p2.x - ball.x, p2.y - ball.y) < p2.radius + ball.radius) ball.holder = 'p2';
        }

        sendNetworkData();
    } else {
        sendNetworkData();
    }
}

// --- RENDER COURT & PLAYERS ---

function drawCourt() {
    // Clear court floor
    ctx.fillStyle = '#d29e62';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;

    // Center Line & Circle
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Key Areas (Paint)
    ctx.strokeRect(0, 150, 150, 200);
    ctx.strokeRect(850, 150, 150, 200);

    // Three-point arcs
    ctx.beginPath();
    ctx.arc(50, 250, 180, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(950, 250, 180, Math.PI / 2, -Math.PI / 2);
    ctx.stroke();

    // Hoops
    ctx.fillStyle = '#ff5722';
    ctx.beginPath();
    ctx.arc(leftHoop.x, leftHoop.y, leftHoop.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(rightHoop.x, rightHoop.y, rightHoop.radius, 0, Math.PI * 2);
    ctx.fill();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawCourt();

    // Draw P1 (Red)
    ctx.fillStyle = p1.color;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Draw P2 (Blue)
    ctx.fillStyle = p2.color;
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, p2.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Draw Ball
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function loop() {
    updateGame();
    render();
    requestAnimationFrame(loop);
}

loop();
