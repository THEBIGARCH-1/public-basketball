window.addEventListener('load', () => {

    // --- 1. THREE.JS SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a12);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Arena Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const stadiumLight1 = new THREE.SpotLight(0xffffff, 1.4);
    stadiumLight1.position.set(0, 30, 20);
    stadiumLight1.castShadow = true;
    scene.add(stadiumLight1);

    const stadiumLight2 = new THREE.SpotLight(0xffffff, 1.4);
    stadiumLight2.position.set(0, 30, -20);
    scene.add(stadiumLight2);

    // --- 2. COURT & STADIUM BUILD ---
    const arenaFloor = new THREE.Mesh(
        new THREE.BoxGeometry(40, 0.1, 50),
        new THREE.MeshStandardMaterial({ color: 0x22222a, roughness: 0.8 })
    );
    arenaFloor.position.y = -0.15;
    scene.add(arenaFloor);

    const courtWidth = 28;  
    const courtHeight = 15; 

    const floorGeo = new THREE.BoxGeometry(courtHeight, 0.2, courtWidth);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xc88b4a, roughness: 0.3 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerLine = new THREE.Mesh(new THREE.BoxGeometry(courtHeight, 0.22, 0.15), lineMat);
    centerLine.position.set(0, 0, 0);
    scene.add(centerLine);

    function createBleachers(x, z, rotY, width) {
        const group = new THREE.Group();
        for (let i = 0; i < 5; i++) {
            const step = new THREE.Mesh(
                new THREE.BoxGeometry(width, 1.2, 2),
                new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x1a237e : 0x283593 })
            );
            step.position.set(0, i * 1.0 + 0.6, i * 1.8);
            group.add(step);
        }
        group.position.set(x, 0, z);
        group.rotation.y = rotY;
        scene.add(group);
    }

    createBleachers(14, 0, -Math.PI / 2, 40);
    createBleachers(-14, 0, Math.PI / 2, 40);
    createBleachers(0, 22, Math.PI, 30);
    createBleachers(0, -22, 0, 30);

    function createHoop(zPos) {
        const group = new THREE.Group();

        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 4),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        pole.position.set(0, 2, zPos > 0 ? zPos + 0.8 : zPos - 0.8);
        group.add(pole);

        const backboard = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 1.5, 0.1),
            new THREE.MeshStandardMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.8 })
        );
        backboard.position.set(0, 3.5, zPos);
        group.add(backboard);

        const rimOffset = zPos > 0 ? -0.6 : 0.6;
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.45, 0.05, 16, 32),
            new THREE.MeshStandardMaterial({ color: 0xff3d00 })
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.set(0, 3.05, zPos + rimOffset);
        group.add(rim);

        scene.add(group);
        group.updateMatrixWorld(true);

        return {
            rimPos: new THREE.Vector3(0, 3.05, zPos + rimOffset),
            backboardBox: new THREE.Box3().setFromObject(backboard),
            rimRadius: 0.45
        };
    }

    const northHoop = createHoop(-13.5);
    const southHoop = createHoop(13.5);

    // --- 3. CHARACTERS & BALL ---
    function createHumanoidPlayer(shirtColor) {
        const group = new THREE.Group();

        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.8, 0.3),
            new THREE.MeshStandardMaterial({ color: shirtColor })
        );
        torso.position.y = 1.1;
        torso.castShadow = true;
        group.add(torso);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffcc99 })
        );
        head.position.y = 1.75;
        group.add(head);

        function createLimb(color) {
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.18, 0.7, 0.18),
                new THREE.MeshStandardMaterial({ color: color })
            );
            mesh.geometry.translate(0, -0.35, 0);
            return mesh;
        }

        const leftArm = createLimb(shirtColor);
        leftArm.position.set(-0.4, 1.4, 0);

        const rightArm = createLimb(shirtColor);
        rightArm.position.set(0.4, 1.4, 0);

        const leftLeg = createLimb(0x222222);
        leftLeg.position.set(-0.18, 0.7, 0);

        const rightLeg = createLimb(0x222222);
        rightLeg.position.set(0.18, 0.7, 0);

        group.add(leftArm, rightArm, leftLeg, rightLeg);

        return { group, leftArm, rightArm, leftLeg, rightLeg };
    }

    const player = createHumanoidPlayer(0x1e88e5);
    player.group.position.set(0, 0, 8);
    scene.add(player.group);

    const cpu = createHumanoidPlayer(0xd32f2f);
    cpu.group.position.set(0, 0, -2);
    scene.add(cpu.group);

    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.4 })
    );
    ball.castShadow = true;
    scene.add(ball);

    // --- 4. GAME STATE & CONTROLS ---
    let controlMode = 'pc';
    let playerScore = 0;
    let isPaused = false;

    let keys = {};
    const cameraRotation = { yaw: 0, pitch: 0 };

    let touchJoystickDir = { x: 0, z: 0 };
    let touchLookId = null;
    let lastTouchX = 0, lastTouchY = 0;
    let touchSprinting = false;

    let isChargingShot = false;
    let shotPower = 0;
    let shotPowerDir = 1;

    let isTrickDribbling = false;
    let trickDribbleTime = 0;
    
    let isDunking = false;
    let dunkProgress = 0;
    let dunkStartPos = new THREE.Vector3();
    let dunkSlammedBall = false;

    let ballPossession = 'player';
    let isBallInAir = false;
    let hasScoredThisShot = false;
    let ballVel = new THREE.Vector3();
    const gravity = -18;

    let animTime = 0;

    const btnPc = document.getElementById('btn-mode-pc');
    const btnMobile = document.getElementById('btn-mode-mobile');
    const touchControlsUI = document.getElementById('touch-controls');
    const hintText = document.getElementById('hint-text');

    function setControlMode(mode) {
        controlMode = mode;
        if (mode === 'pc') {
            btnPc.classList.add('active');
            btnMobile.classList.remove('active');
            touchControlsUI.classList.add('hidden');
            hintText.innerHTML = "<b>PC Mode:</b> Click canvas to lock mouse. WASD = Move | SHIFT = Sprint | E = Dribble | Q = Dunk | Left-Click = Shoot";
        } else {
            btnMobile.classList.add('active');
            btnPc.classList.remove('active');
            touchControlsUI.classList.remove('hidden');
            hintText.innerHTML = "<b>Mobile Mode:</b> Joystick = Move | Drag Screen = Aim | Tap DRIBBLE, DUNK, SPRINT, or SHOOT";
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        }
    }

    btnPc.addEventListener('click', (e) => { e.stopPropagation(); setControlMode('pc'); });
    btnMobile.addEventListener('click', (e) => { e.stopPropagation(); setControlMode('mobile'); });

    // --- PC INPUTS ---
    document.body.addEventListener('click', (e) => {
        if (controlMode === 'pc' && !isPaused && e.target.tagName !== 'BUTTON') {
            if (document.pointerLockElement !== document.body) {
                document.body.requestPointerLock();
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (controlMode !== 'pc' || document.pointerLockElement !== document.body || isPaused) return;
        cameraRotation.yaw -= e.movementX * 0.0025;
        cameraRotation.pitch -= e.movementY * 0.0025;
        cameraRotation.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 4, cameraRotation.pitch));
    });

    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyP') {
            isPaused = !isPaused;
            document.getElementById('pause-menu').style.display = isPaused ? 'block' : 'none';
        }
        if (e.code === 'KeyE') performTrickDribble();
        if (e.code === 'KeyQ') performDunk();
    });

    window.addEventListener('keyup', (e) => keys[e.code] = false);

    window.addEventListener('mousedown', (e) => {
        if (controlMode === 'pc' && e.button === 0 && !isPaused && ballPossession === 'player' && !isBallInAir && !isDunking && !isTrickDribbling) {
            triggerShotStart();
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (controlMode === 'pc' && e.button === 0 && isChargingShot) {
            triggerShotRelease();
        }
    });

    // --- MOBILE TOUCH INPUTS ---
    const joystickZone = document.getElementById('joystick-zone');
    const joystickStick = document.getElementById('joystick-stick');
    const shootBtn = document.getElementById('shoot-btn');
    const dribbleBtn = document.getElementById('dribble-btn');
    const dunkBtn = document.getElementById('dunk-btn');
    const sprintBtn = document.getElementById('sprint-btn');

    let joystickCenter = { x: 0, y: 0 };
    let joystickTouchId = null;

    joystickZone.addEventListener('touchstart', (e) => {
        if (controlMode !== 'mobile') return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;
        const rect = joystickZone.getBoundingClientRect();
        joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        updateJoystick(touch.clientX, touch.clientY);
    });

    joystickZone.addEventListener('touchmove', (e) => {
        if (controlMode !== 'mobile') return;
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId) {
                updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
            }
        }
    });

    function resetJoystick() {
        joystickTouchId = null;
        touchJoystickDir = { x: 0, z: 0 };
        joystickStick.style.transform = `translate(0px, 0px)`;
    }

    joystickZone.addEventListener('touchend', resetJoystick);
    joystickZone.addEventListener('touchcancel', resetJoystick);

    function updateJoystick(clientX, clientY) {
        const dx = clientX - joystickCenter.x;
        const dy = clientY - joystickCenter.y;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 45;

        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(dist, maxRadius);

        const stickX = Math.cos(angle) * clampedDist;
        const stickY = Math.sin(angle) * clampedDist;

        joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

        touchJoystickDir.x = stickX / maxRadius;
        touchJoystickDir.z = stickY / maxRadius;
    }

    document.addEventListener('touchstart', (e) => {
        if (controlMode !== 'mobile') return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const target = e.target;
            if (touch.clientX > window.innerWidth / 2 && touchLookId === null && target !== shootBtn && target !== dribbleBtn && target !== dunkBtn && target !== sprintBtn) {
                touchLookId = touch.identifier;
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
            }
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (controlMode !== 'mobile') return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === touchLookId) {
                const deltaX = touch.clientX - lastTouchX;
                const deltaY = touch.clientY - lastTouchY;

                cameraRotation.yaw -= deltaX * 0.005;
                cameraRotation.pitch -= deltaY * 0.005;
                cameraRotation.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 4, cameraRotation.pitch));

                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
            }
        }
    });

    function stopLookTouch(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchLookId) {
                touchLookId = null;
            }
        }
    }

    document.addEventListener('touchend', stopLookTouch);
    document.addEventListener('touchcancel', stopLookTouch);

    shootBtn.addEventListener('touchstart', (e) => {
        if (controlMode !== 'mobile') return;
        e.preventDefault();
        if (!isPaused && ballPossession === 'player' && !isBallInAir && !isDunking && !isTrickDribbling) {
            triggerShotStart();
        }
    });

    shootBtn.addEventListener('touchend', (e) => {
        if (controlMode !== 'mobile') return;
        e.preventDefault();
        if (isChargingShot) {
            triggerShotRelease();
        }
    });

    dribbleBtn.addEventListener('touchstart', (e) => {
        if (controlMode !== 'mobile') return;
        e.preventDefault();
        performTrickDribble();
    });

    dunkBtn.addEventListener('touchstart', (e) => {
        if (controlMode !== 'mobile') return;
        e.preventDefault();
        performDunk();
    });

    sprintBtn.addEventListener('touchstart', (e) => {
        if (controlMode !== 'mobile') return;
        e.preventDefault();
        touchSprinting = true;
    });

    sprintBtn.addEventListener('touchend', (e) => {
        if (controlMode !== 'mobile') return;
        e.preventDefault();
        touchSprinting = false;
    });

    function triggerShotStart() {
        isChargingShot = true;
        shotPower = 0;
        document.getElementById('shot-meter-container').style.display = 'block';
    }

    function triggerShotRelease() {
        isChargingShot = false;
        document.getElementById('shot-meter-container').style.display = 'none';
        releaseShot();
    }

    function performTrickDribble() {
        if (ballPossession === 'player' && !isBallInAir && !isTrickDribbling && !isDunking) {
            isTrickDribbling = true;
            trickDribbleTime = 0;
        }
    }

    function performDunk() {
        if (ballPossession === 'player' && !isBallInAir && !isDunking && !isTrickDribbling) {
            const distToHoop = player.group.position.distanceTo(northHoop.rimPos);
            if (distToHoop < 10.0) {
                isDunking = true;
                dunkProgress = 0;
                dunkSlammedBall = false;
                dunkStartPos.copy(player.group.position);
            }
        }
    }

    // --- 5. PHYSICS & SHOOTING ---
    function releaseShot() {
        isBallInAir = true;
        ballPossession = 'none';
        hasScoredThisShot = false;

        const accuracyFactor = 1 - Math.abs(shotPower - 75) / 75;
        const target = northHoop.rimPos.clone();

        if (accuracyFactor < 0.65) {
            target.x += (Math.random() - 0.5) * 2.2;
            target.z += (Math.random() - 0.5) * 2.2;
        }

        const timeToTarget = 1.15;
        ballVel.x = (target.x - player.group.position.x) / timeToTarget;
        ballVel.z = (target.z - player.group.position.z) / timeToTarget;
        ballVel.y = (target.y - player.group.position.y - 0.5 * gravity * Math.pow(timeToTarget, 2)) / timeToTarget;
    }

    function checkRimAndBackboardCollisions() {
        const ballRadius = 0.24;

        const distToRim = ball.position.distanceTo(northHoop.rimPos);
        if (Math.abs(distToRim - northHoop.rimRadius) < ballRadius + 0.05 && Math.abs(ball.position.y - northHoop.rimPos.y) < 0.2) {
            ballVel.x *= -0.6;
            ballVel.z *= -0.6;
            ballVel.y *= 0.5;
        }

        if (northHoop.backboardBox.intersectsSphere(new THREE.Sphere(ball.position, ballRadius))) {
            ballVel.z = Math.abs(ballVel.z) * 0.7;
        }
    }

    function animateCharacter(char, isMoving, isCharging, isDribble, isDunk, progress, time) {
        if (isDunk) {
            const jumpHeight = Math.sin(progress * Math.PI) * 2.4;
            char.group.position.y = jumpHeight;
            char.rightArm.rotation.x = -Math.PI + 0.2;
            char.leftArm.rotation.x = -Math.PI / 2;
            char.leftLeg.rotation.x = -0.5;
            char.rightLeg.rotation.x = 0.5;
        } else if (isDribble) {
            char.group.position.y = 0;
            char.leftLeg.rotation.x = 0.4;
            char.rightLeg.rotation.x = -0.4;
            char.rightArm.rotation.x = -0.8;
            char.leftArm.rotation.x = -0.8;
            char.rightArm.rotation.z = Math.sin(time * 20) * 0.5;
        } else if (isCharging) {
            char.group.position.y = 0;
            char.rightArm.rotation.x = -Math.PI + 0.3;
            char.leftArm.rotation.x = -Math.PI + 0.6;
            char.rightArm.rotation.z = -0.3;
            char.leftArm.rotation.z = 0.3;
        } else if (isMoving) {
            char.group.position.y = 0;
            const swing = Math.sin(time * 12) * 0.7;
            char.leftLeg.rotation.x = swing;
            char.rightLeg.rotation.x = -swing;
            char.leftArm.rotation.x = -swing * 0.8;
            char.rightArm.rotation.x = swing * 0.8;
        } else {
            char.group.position.y = 0;
            char.leftLeg.rotation.x = 0;
            char.rightLeg.rotation.x = 0;
            char.leftArm.rotation.x = 0;
            char.rightArm.rotation.x = 0;
            char.leftArm.rotation.z = 0;
            char.rightArm.rotation.z = 0;
        }
    }

    // --- 6. GAME LOOP ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();

        if (!isPaused) {
            animTime += delta;

            // Sprint Speed calculation
            const isSprinting = (controlMode === 'pc' && (keys['ShiftLeft'] || keys['ShiftRight'])) || (controlMode === 'mobile' && touchSprinting);
            let speed = 6.0;
            if (isSprinting) speed = 10.0;
            if (isTrickDribbling) speed = 8.5;

            const moveDir = new THREE.Vector3();

            if (isDunking) {
                dunkProgress += delta * 1.4;

                const targetDunkPos = northHoop.rimPos.clone();
                targetDunkPos.y = 0;
                targetDunkPos.z += 0.85;

                // Move player toward hoop
                player.group.position.lerpVectors(dunkStartPos, targetDunkPos, Math.min(1.0, dunkProgress));
                
                // Turn player toward hoop
                player.group.rotation.y = Math.atan2(
                    northHoop.rimPos.x - player.group.position.x,
                    northHoop.rimPos.z - player.group.position.z
                ) + Math.PI;

                if (dunkProgress < 0.65) {
                    // Holding ball above head during jump
                    ball.position.copy(player.group.position);
                    ball.position.y = player.group.position.y + 2.1;
                    ball.position.z -= 0.2;
                } else if (!dunkSlammedBall) {
                    // Slam ball through net physically
                    dunkSlammedBall = true;
                    ballPossession = 'none';
                    isBallInAir = true;

                    // Spawn ball directly in the hoop and shoot it downwards
                    ball.position.copy(northHoop.rimPos);
                    ballVel.set(0, -12, -0.5);

                    playerScore += 2;
                    document.getElementById('player-score').textContent = playerScore;
                }

                if (dunkProgress >= 1.0) {
                    isDunking = false;
                    player.group.position.y = 0;
                }
            } else {
                if (controlMode === 'pc') {
                    if (keys['KeyW']) moveDir.z -= 1;
                    if (keys['KeyS']) moveDir.z += 1;
                    if (keys['KeyA']) moveDir.x -= 1;
                    if (keys['KeyD']) moveDir.x += 1;
                } else {
                    if (touchJoystickDir.x !== 0 || touchJoystickDir.z !== 0) {
                        moveDir.x = touchJoystickDir.x;
                        moveDir.z = touchJoystickDir.z;
                    }
                }

                const isMoving = moveDir.lengthSq() > 0;

                if (isMoving) {
                    moveDir.normalize();
                    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);
                    player.group.position.addScaledVector(moveDir, speed * delta);
                    player.group.rotation.y = Math.atan2(moveDir.x, moveDir.z) + Math.PI;
                }
            }

            if (isTrickDribbling) {
                trickDribbleTime += delta;
                if (trickDribbleTime > 0.8) {
                    isTrickDribbling = false;
                }
            }

            player.group.position.x = Math.max(-courtHeight / 2 + 0.5, Math.min(courtHeight / 2 - 0.5, player.group.position.x));
            player.group.position.z = Math.max(-courtWidth / 2 + 0.5, Math.min(courtWidth / 2 - 0.5, player.group.position.z));

            // Camera Tracking
            const camOffset = new THREE.Vector3(0, 2.2, 4.5);
            camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);
            camera.position.copy(player.group.position).add(camOffset);

            const lookTarget = player.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
            lookTarget.x -= Math.sin(cameraRotation.yaw) * 10;
            lookTarget.z -= Math.cos(cameraRotation.yaw) * 10;
            lookTarget.y += Math.sin(cameraRotation.pitch) * 5;
            camera.lookAt(lookTarget);

            // CPU AI
            let cpuTargetPos = player.group.position.clone().add(new THREE.Vector3(0, 0, -2));
            if (ballPossession === 'none') {
                cpuTargetPos = ball.position.clone();
            }

            const cpuMoveX = (cpuTargetPos.x - cpu.group.position.x) * 2.5 * delta;
            const cpuMoveZ = (cpuTargetPos.z - cpu.group.position.z) * 2.5 * delta;
            cpu.group.position.x += cpuMoveX;
            cpu.group.position.z += cpuMoveZ;

            const isCpuMoving = Math.abs(cpuMoveX) > 0.01 || Math.abs(cpuMoveZ) > 0.01;
            animateCharacter(cpu, isCpuMoving, false, false, false, 0, animTime);

            const isMoving = moveDir.lengthSq() > 0;
            animateCharacter(player, isMoving, isChargingShot, isTrickDribbling, isDunking, dunkProgress, animTime);

            if (isChargingShot) {
                shotPower += shotPowerDir * 120 * delta;
                if (shotPower >= 100) { shotPower = 100; shotPowerDir = -1; }
                if (shotPower <= 0) { shotPower = 0; shotPowerDir = 1; }
                document.getElementById('shot-meter-bar').style.width = `${shotPower}%`;
            }

            if (!isDunking) {
                if (ballPossession === 'player') {
                    if (isTrickDribbling) {
                        const crossoverX = Math.sin(trickDribbleTime * 25) * 0.45;
                        const sideOffset = new THREE.Vector3(crossoverX, 0, -0.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.group.rotation.y);
                        ball.position.copy(player.group.position).add(sideOffset);
                        ball.position.y = Math.abs(Math.sin(trickDribbleTime * 25)) * 0.4 + 0.15;
                    } else {
                        const bounceHeight = Math.abs(Math.sin(animTime * 12)) * 0.75 + 0.24;
                        const handOffset = new THREE.Vector3(0.4, 0, -0.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.group.rotation.y);
                        ball.position.copy(player.group.position).add(handOffset);
                        ball.position.y = bounceHeight;
                    }
                } else if (ballPossession === 'cpu') {
                    const bounceHeight = Math.abs(Math.sin(animTime * 12)) * 0.75 + 0.24;
                    ball.position.copy(cpu.group.position).add(new THREE.Vector3(0.4, 0, 0.3));
                    ball.position.y = bounceHeight;
                } else {
                    ballVel.y += gravity * delta;
                    ball.position.addScaledVector(ballVel, delta);

                    checkRimAndBackboardCollisions();

                    if (!hasScoredThisShot && ball.position.distanceTo(northHoop.rimPos) < 0.45 && ballVel.y < 0) {
                        playerScore += 2;
                        document.getElementById('player-score').textContent = playerScore;
                        hasScoredThisShot = true;
                    }

                    if (ball.position.y <= 0.24) {
                        ball.position.y = 0.24;
                        ballVel.y = -ballVel.y * 0.65;
                        ballVel.x *= 0.8;
                        ballVel.z *= 0.8;

                        if (Math.abs(ballVel.y) < 1.0) ballVel.y = 0;
                    }

                    const distPlayerToBall = player.group.position.distanceTo(ball.position);
                    const distCpuToBall = cpu.group.position.distanceTo(ball.position);

                    if (distPlayerToBall < 1.2) {
                        ballPossession = 'player';
                        isBallInAir = false;
                    } else if (distCpuToBall < 1.2) {
                        ballPossession = 'cpu';
                        isBallInAir = false;
                    }
                }
            }
        }

        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    setControlMode('pc');
    animate();
});
