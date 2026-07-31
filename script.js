// --- 1. THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1c29);
scene.fog = new THREE.FogExp2(0x1a1c29, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
scene.add(dirLight);

// --- 2. COURT & HOOP GEOMETRY ---

// Hardwood Court
const courtGeo = new THREE.PlaneGeometry(30, 60);
const courtMat = new THREE.MeshStandardMaterial({ color: 0xd29e62, roughness: 0.4 });
const court = new THREE.Mesh(courtGeo, courtMat);
court.rotation.x = -Math.PI / 2;
court.receiveShadow = true;
scene.add(court);

// Hoop Structure
const hoopGroup = new THREE.Group();
hoopGroup.position.set(0, 0, -26);

// Pole & Backboard
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7), new THREE.MeshStandardMaterial({ color: 0x333333 }));
pole.position.set(0, 3.5, -1);
hoopGroup.add(pole);

const backboard = new THREE.Mesh(new THREE.BoxGeometry(4, 2.8, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff }));
backboard.position.set(0, 5.5, 0);
hoopGroup.add(backboard);

// Rim
const rimTargetPos = new THREE.Vector3(0, 4.5, -25.2);
const rim = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 16, 32), new THREE.MeshStandardMaterial({ color: 0xff5722 }));
rim.rotation.x = Math.PI / 2;
rim.position.set(0, 4.5, 0.8);
hoopGroup.add(rim);

scene.add(hoopGroup);

// --- 3. PLAYER & ANIMATION SETUP ---

function createCharacter(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color });

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 1.4), mat);
    torso.position.y = 1.4;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffcc99 }));
    head.position.y = 2.4;
    group.add(head);

    // Limbs (For Running & Dribbling Animations)
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, 0.25), mat);
    legL.position.set(-0.25, 0.5, 0);
    const legR = legL.clone();
    legR.position.set(0.25, 0.5, 0);

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), mat);
    armL.position.set(-0.55, 1.5, 0);
    const armR = armL.clone();
    armR.position.set(0.55, 1.5, 0);

    group.add(legL, legR, armL, armR);

    return { group, torso, legL, legR, armL, armR };
}

const player = createCharacter(0xe53935);
scene.add(player.group);
player.group.position.set(0, 0, 10);

// Basketball
const ballGeo = new THREE.SphereGeometry(0.35, 32, 32);
const ballMat = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.5 });
const ball = new THREE.Mesh(ballGeo, ballMat);
ball.castShadow = true;
scene.add(ball);

// --- 4. GAME VARIABLES & CONTROLS ---

let playerScore = 0;
let oppScore = 0;

let ballState = 'dribbling'; // 'dribbling', 'shot'
let ballVel = new THREE.Vector3();
let animTime = 0;

const keys = {};
let mouseX = 0, mouseY = 0;

// Mouse Control Pointer Lock for Aiming
window.addEventListener('mousemove', (e) => {
    mouseX -= e.movementX * 0.003;
    mouseY -= e.movementY * 0.003;
    mouseY = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, mouseY));
});

document.addEventListener('click', () => {
    document.body.requestPointerLock();
});

window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// Click to Shoot
window.addEventListener('mousedown', (e) => {
    if (e.button === 0 && ballState === 'dribbling') {
        shootBall();
    }
});

// --- 5. SHOOTING & ACCURACY PHYSICS ---

function shootBall() {
    ballState = 'shot';

    const pPos = player.group.position;
    const distanceToHoop = pPos.distanceTo(rimTargetPos);

    // Aim direction based on camera angle
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);

    // Deep Shot Penalty (Half-Court Shot Accuracy Drop)
    let inaccuracyScale = 0;
    if (distanceToHoop > 20) {
        // High penalty from half court (adds random spray)
        inaccuracyScale = (distanceToHoop - 20) * 0.08;
    }

    const sprayX = (Math.random() - 0.5) * inaccuracyScale;
    const sprayY = (Math.random() - 0.5) * inaccuracyScale;

    // Shot Power Calculation
    const forwardPower = 12 + distanceToHoop * 0.45;
    const upwardPower = 8 + distanceToHoop * 0.25;

    ballVel.set(
        dir.x * forwardPower + sprayX,
        upwardPower + sprayY,
        dir.z * forwardPower
    );
}

function resetBall() {
    ballState = 'dribbling';
    ballVel.set(0, 0, 0);
}

// --- 6. GAME LOOP & ANIMATION ---

const gravity = -22;
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    animTime += delta * 10;

    // --- Movement Logic ---
    const moveSpeed = 8 * delta;
    let isMoving = false;

    // Calculate move direction relative to camera facing angle
    const forward = new THREE.Vector3(Math.sin(mouseX), 0, Math.cos(mouseX)).negate();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).negate();

    if (keys['w']) { player.group.position.addScaledVector(forward, moveSpeed); isMoving = true; }
    if (keys['s']) { player.group.position.addScaledVector(forward, -moveSpeed); isMoving = true; }
    if (keys['a']) { player.group.position.addScaledVector(right, -moveSpeed); isMoving = true; }
    if (keys['d']) { player.group.position.addScaledVector(right, moveSpeed); isMoving = true; }

    // Face Player in Camera Direction
    player.group.rotation.y = mouseX;

    // --- Procedural Running & Dribbling Animations ---
    if (isMoving) {
        player.legL.rotation.x = Math.sin(animTime) * 0.6;
        player.legR.rotation.x = -Math.sin(animTime) * 0.6;
    } else {
        player.legL.rotation.x = 0;
        player.legR.rotation.x = 0;
    }

    // Ball & Dribble Animation
    if (ballState === 'dribbling') {
        const bounceY = Math.abs(Math.sin(animTime * 1.5)) * 0.8;
        const handPos = player.group.position.clone();

        // Right hand dribbling position
        handPos.x += Math.cos(mouseX) * 0.6;
        handPos.z += Math.sin(mouseX) * 0.6;
        handPos.y = 0.35 + bounceY;

        ball.position.copy(handPos);
        player.armR.rotation.x = -bounceY * 0.8;
    } 
    // Shot Flight Physics
    else if (ballState === 'shot') {
        ballVel.y += gravity * delta;
        ball.position.addScaledVector(ballVel, delta);

        // Check Score Collision with Rim
        if (ball.position.distanceTo(rimTargetPos) < 0.9 && ballVel.y < 0) {
            playerScore += 2;
            document.getElementById('player-score').textContent = playerScore;
            resetBall();
        }

        // Bounce/Reset on ground hit
        if (ball.position.y <= 0.35) {
            resetBall();
        }
    }

    // --- Third Person Camera Positioning ---
    const camOffset = new THREE.Vector3(0, 3.5, 7.5); // Behind & Above Player
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);

    camera.position.copy(player.group.position).add(camOffset);
    camera.position.y += Math.sin(mouseY) * 3; // Vertical tilt angle
    camera.lookAt(player.group.position.x, player.group.position.y + 2, player.group.position.y - 5);

    renderer.render(scene, camera);
}

// Window Resize Handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
