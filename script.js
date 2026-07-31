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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const stadiumLight1 = new THREE.SpotLight(0xffffff, 1.5);
    stadiumLight1.position.set(0, 30, 20);
    stadiumLight1.castShadow = true;
    scene.add(stadiumLight1);

    const stadiumLight2 = new THREE.SpotLight(0xffffff, 1.5);
    stadiumLight2.position.set(0, 30, -20);
    scene.add(stadiumLight2);

    // --- 2. STADIUM & COURT BUILD ---
    // Concrete Arena Base
    const arenaFloor = new THREE.Mesh(
        new THREE.BoxGeometry(40, 0.1, 50),
        new THREE.MeshStandardMaterial({ color: 0x22222a, roughness: 0.8 })
    );
    arenaFloor.position.y = -0.15;
    scene.add(arenaFloor);

    // Hardwood Basketball Court
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

    // Stadium Bleachers / Audience Stands
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

    createBleachers(14, 0, -Math.PI / 2, 40); // East Stands
    createBleachers(-14, 0, Math.PI / 2, 40);  // West Stands
    createBleachers(0, 22, Math.PI, 30);       // South Stands
    createBleachers(0, -22, 0, 30);            // North Stands

    // Hoop Builder
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

        return {
            rimPos: new THREE.Vector3(0, 3.05, zPos + rimOffset),
            backboardBox: new THREE.Box3().setFromObject(backboard),
            rimRadius: 0.45
        };
    }

    const northHoop = createHoop(-13.5);
    const southHoop = createHoop(13.5);

    // --- 3. PLAYER & CPU CREATION ---
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

    // --- 4. GAME STATE VARIABLES ---
    let playerScore = 0;
    let cpuScore = 0;
    let isLocked = false;
    let isPaused = false;

    let keys = {};
    const cameraRotation = { yaw: 0, pitch: 0 };

    let isChargingShot = false;
    let shotPower = 0;
    let shotPowerDir = 1;

    // Ball & Possession State
    let ballPossession = 'player'; // 'player', 'cpu', or 'none'
    let isBallInAir = false;
    let hasScoredThisShot = false;
    let ballVel = new THREE.Vector3();
    const gravity = -18;

    let animTime = 0;

    // --- 5. CONTROLS & PAUSE ---
    document.body.addEventListener('click', () => {
        if (!isLocked && !isPaused) document.body.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === document.body;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isLocked || isPaused) return;
        cameraRotation.yaw -= e.movementX * 0.0025;
        cameraRotation.pitch -= e.movementY * 0.0025;
        cameraRotation.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 4, cameraRotation.pitch));
    });

    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;

        if (e.code === 'KeyP') {
            isPaused = !isPaused;
            document.getElementById('pause-menu').style.display = isPaused ? 'block' : 'none';
            if (isPaused && document.pointerLockElement) {
                document.exitPointerLock();
            }
        }
    });

    window.addEventListener('keyup', (e) => keys[e.code] = false);

    window.addEventListener('mousedown', (e) => {
        if (e.button === 0 && isLocked && !isPaused && ballPossession === 'player' && !isBallInAir) {
            isChargingShot = true;
            shotPower = 0;
            document.getElementById('shot-meter-container').style.display = 'block';
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 0 && isChargingShot) {
            isChargingShot = false;
            document.getElementById('shot-meter-container').style.display = 'none';
            releaseShot();
        }
    });

    // --- 6. PHYSICS & SHOOTING MECHANICS ---
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

        // Rim bounce
        const distToRim = ball.position.distanceTo(northHoop.rimPos);
        if (Math.abs(distToRim - northHoop.rimRadius) < ballRadius + 0.05 && Math.abs(ball.position.y - northHoop.rimPos.y) < 0.2) {
            ballVel.x *= -0.6;
            ballVel.z *= -0.6;
            ballVel.y *= 0.5;
        }

        // Backboard bounce
        if (northHoop.backboardBox.intersectsSphere(new THREE.Sphere(ball.position, ballRadius))) {
            ballVel.z = Math.abs(ballVel.z) * 0.7;
        }
    }

    function animateCharacter(char, isMoving, isCharging, time) {
        if (isCharging) {
            char.rightArm.rotation.x = -Math.PI + 0.3;
            char.leftArm.rotation.x = -Math.PI + 0.6;
            char.rightArm.rotation.z = -0.3;
            char.leftArm.rotation.z = 0.3;
        } else if (isMoving) {
            const swing = Math.sin(time * 10) * 0.6;
            char.leftLeg.rotation.x = swing;
            char.rightLeg.rotation.x = -swing;
            char.leftArm.rotation.x = -swing * 0.8;
            char.rightArm.rotation.x = swing * 0.8;
        } else {
            char.leftLeg.rotation.x = 0;
            char.rightLeg.rotation.x = 0;
            char.leftArm.rotation.x = 0;
            char.rightArm.rotation.x = 0;
            char.leftArm.rotation.z = 0;
            char.rightArm.rotation.z = 0;
        }
    }

    // --- 7. ANIMATION & GAME LOOP ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();

        if (isLocked && !isPaused) {
            animTime += delta;

            // Player Movement
            const speed = 6.0;
            const moveDir = new THREE.Vector3();

            if (keys['KeyW']) moveDir.z -= 1;
            if (keys['KeyS']) moveDir.z += 1;
            if (keys['KeyA']) moveDir.x -= 1;
            if (keys['KeyD']) moveDir.x += 1;

            const isMoving = moveDir.lengthSq() > 0;

            moveDir.normalize();
            moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);

            player.group.position.addScaledVector(moveDir, speed * delta);

            if (isMoving) {
                player.group.rotation.y = Math.atan2(moveDir.x, moveDir.z) + Math.PI;
            }

            // Boundary limits
            player.group.position.x = Math.max(-courtHeight / 2 + 0.5, Math.min(courtHeight / 2 - 0.5, player.group.position.x));
            player.group.position.z = Math.max(-courtWidth / 2 + 0.5, Math.min(courtWidth / 2 - 0.5, player.group.position.z));

            // Camera follow
            const camOffset = new THREE.Vector3(0, 2.2, 4.5);
            camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);
            camera.position.copy(player.group.position).add(camOffset);

            const lookTarget = player.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
            lookTarget.x -= Math.sin(cameraRotation.yaw) * 10;
            lookTarget.z -= Math.cos(cameraRotation.yaw) * 10;
            lookTarget.y += Math.sin(cameraRotation.pitch) * 5;
            camera.lookAt(lookTarget);

            // CPU AI Behavior: Chases ball if loose, guards player if player has ball
            let cpuTargetPos = player.group.position.clone().add(new THREE.Vector3(0, 0, -2));
            if (ballPossession === 'none') {
                cpuTargetPos = ball.position.clone();
            }

            const cpuMoveX = (cpuTargetPos.x - cpu.group.position.x) * 2.5 * delta;
            const cpuMoveZ = (cpuTargetPos.z - cpu.group.position.z) * 2.5 * delta;
            cpu.group.position.x += cpuMoveX;
            cpu.group.position.z += cpuMoveZ;

            const isCpuMoving = Math.abs(cpuMoveX) > 0.01 || Math.abs(cpuMoveZ) > 0.01;
            animateCharacter(cpu, isCpuMoving, false, animTime);

            animateCharacter(player, isMoving, isChargingShot, animTime);

            // Shot Meter Charging
            if (isChargingShot) {
                shotPower += shotPowerDir * 120 * delta;
                if (shotPower >= 100) { shotPower = 100; shotPowerDir = -1; }
                if (shotPower <= 0) { shotPower = 0; shotPowerDir = 1; }
                document.getElementById('shot-meter-bar').style.width = `${shotPower}%`;
            }

            // --- BALL POSSESSION & PHYSICAL LOOSE BALL LOGIC ---
            if (ballPossession === 'player') {
                // Dribbling
                const bounceHeight = Math.abs(Math.sin(animTime * 12)) * 0.75 + 0.24;
                const handOffset = new THREE.Vector3(0.4, 0, -0.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.group.rotation.y);
                ball.position.copy(player.group.position).add(handOffset);
                ball.position.y = bounceHeight;
            } else if (ballPossession === 'cpu') {
                // CPU holds ball
                const bounceHeight = Math.abs(Math.sin(animTime * 12)) * 0.75 + 0.24;
                ball.position.copy(cpu.group.position).add(new THREE.Vector3(0.4, 0, 0.3));
                ball.position.y = bounceHeight;
            } else {
                // Ball is loose in the air or bouncing on floor
                ballVel.y += gravity * delta;
                ball.position.addScaledVector(ballVel, delta);

                checkRimAndBackboardCollisions();

                // Basket Scoring Check
                if (!hasScoredThisShot && ball.position.distanceTo(northHoop.rimPos) < 0.45 && ballVel.y < 0) {
                    playerScore += 2;
                    document.getElementById('player-score').textContent = playerScore;
                    hasScoredThisShot = true;
                }

                // Floor Bounce physics (Dampened bounce)
                if (ball.position.y <= 0.24) {
                    ball.position.y = 0.24;
                    ballVel.y = -ballVel.y * 0.65; // Bounce energy loss
                    ballVel.x *= 0.8;
                    ballVel.z *= 0.8;

                    if (Math.abs(ballVel.y) < 1.0) ballVel.y = 0; // Stop micro bouncing
                }

                // Manual Pickup Detection (Walk over ball to grab it)
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

        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
});
