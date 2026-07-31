window.addEventListener('load', () => {

    // --- 1. THREE.JS SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x11111d);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Arena Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const stadiumLight1 = new THREE.SpotLight(0xffffff, 1.2);
    stadiumLight1.position.set(0, 25, 20);
    stadiumLight1.castShadow = true;
    scene.add(stadiumLight1);

    const stadiumLight2 = new THREE.SpotLight(0xffffff, 1.2);
    stadiumLight2.position.set(0, 25, -20);
    scene.add(stadiumLight2);

    // --- 2. FULL BASKETBALL COURT & HOOPS ---
    // Floor
    const courtWidth = 28;  // NBA Length (Z-axis)
    const courtHeight = 15; // NBA Width (X-axis)

    const floorGeo = new THREE.BoxGeometry(courtHeight, 0.2, courtWidth);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xc88b4a, roughness: 0.3 }); // Hardwood color
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);

    // Court Lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerLine = new THREE.Mesh(new THREE.BoxGeometry(courtHeight, 0.22, 0.15), lineMat);
    centerLine.position.set(0, 0, 0);
    scene.add(centerLine);

    // Hoops Helper Function
    function createHoop(zPos, isMainHoop) {
        const group = new THREE.Group();

        // Pole
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 4),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        pole.position.set(0, 2, zPos > 0 ? zPos + 0.8 : zPos - 0.8);
        group.add(pole);

        // Backboard
        const backboard = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 1.5, 0.1),
            new THREE.MeshStandardMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.8 })
        );
        backboard.position.set(0, 3.5, zPos);
        group.add(backboard);

        // Rim
        const rimOffset = zPos > 0 ? -0.6 : 0.6;
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.45, 0.04, 16, 32),
            new THREE.MeshStandardMaterial({ color: 0xff3d00 })
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.set(0, 3.05, zPos + rimOffset);
        group.add(rim);

        scene.add(group);
        return { group, rimPos: new THREE.Vector3(0, 3.05, zPos + rimOffset) };
    }

    const northHoop = createHoop(-13.5, true);  // Primary Target Rim
    const southHoop = createHoop(13.5, false);

    // --- 3. PLAYERS & BASKETBALL ---
    // Basketball
    const ballGeo = new THREE.SphereGeometry(0.24, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.4 });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.castShadow = true;
    scene.add(ball);

    // Player Mesh
    const playerGroup = new THREE.Group();
    const playerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x1e88e5 }));
    playerBody.position.y = 0.8;
    const playerHead = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0xffcc99 }));
    playerHead.position.y = 1.8;
    playerGroup.add(playerBody, playerHead);
    playerGroup.position.set(0, 0, 8); // Start on offense
    scene.add(playerGroup);

    // CPU Defender Mesh
    const cpuGroup = new THREE.Group();
    const cpuBody = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6), new THREE.MeshStandardMaterial({ color: 0xd32f2f }));
    cpuBody.position.y = 0.8;
    const cpuHead = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
    cpuHead.position.y = 1.8;
    cpuGroup.add(cpuBody, cpuHead);
    cpuGroup.position.set(0, 0, -2);
    scene.add(cpuGroup);

    // --- 4. GAME STATE & MECHANICS ---
    let playerScore = 0, cpuScore = 0;
    let isLocked = false;

    // Movement & Aim Controls
    let keys = {};
    const cameraRotation = { yaw: 0, pitch: 0 };

    // Shot Power Meter
    let isChargingShot = false;
    let shotPower = 0;
    let shotPowerDir = 1;

    // Physics Ball Flight State
    let isBallInAir = false;
    let ballVel = new THREE.Vector3();
    const gravity = -18;

    // Pointer Lock for Mouse Aiming
    document.body.addEventListener('click', () => {
        if (!isLocked) document.body.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === document.body;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isLocked) return;
        cameraRotation.yaw -= e.movementX * 0.0025;
        cameraRotation.pitch -= e.movementY * 0.0025;
        cameraRotation.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 4, cameraRotation.pitch));
    });

    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    // Shooting Click Handler
    window.addEventListener('mousedown', (e) => {
        if (e.button === 0 && isLocked && !isBallInAir) {
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

    // --- 5. SHOOTING & PHYSICS ENGINE ---
    function releaseShot() {
        isBallInAir = true;

        // Calculate Shot Accuracy based on timing (Target spot is ~75%)
        const accuracyFactor = 1 - Math.abs(shotPower - 75) / 75;

        // Vector towards North Hoop Rim
        const target = northHoop.rimPos.clone();
        
        // Add random inaccuracy drift if timing was bad
        if (accuracyFactor < 0.7) {
            target.x += (Math.random() - 0.5) * 1.8;
            target.z += (Math.random() - 0.5) * 1.8;
        }

        const dist = playerGroup.position.distanceTo(target);

        // Calculate Arc Velocity
        const timeToTarget = 1.1;
        ballVel.x = (target.x - playerGroup.position.x) / timeToTarget;
        ballVel.z = (target.z - playerGroup.position.z) / timeToTarget;
        ballVel.y = (target.y - playerGroup.position.y - 0.5 * gravity * Math.pow(timeToTarget, 2)) / timeToTarget;
    }

    function resetPossession(scored) {
        if (scored) {
            playerScore += 2;
            document.getElementById('player-score').textContent = playerScore;
        }

        isBallInAir = false;
        playerGroup.position.set(0, 0, 8);
        cpuGroup.position.set(0, 0, -2);
    }

    // --- 6. MAIN GAME LOOP ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        if (isLocked) {
            // Player Movement (WASD relative to camera yaw)
            const speed = 6.0;
            const moveDir = new THREE.Vector3();

            if (keys['KeyW']) moveDir.z -= 1;
            if (keys['KeyS']) moveDir.z += 1;
            if (keys['KeyA']) moveDir.x -= 1;
            if (keys['KeyD']) moveDir.x += 1;

            moveDir.normalize();
            moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);

            playerGroup.position.addScaledVector(moveDir, speed * delta);

            // Clamp player to court bounds
            playerGroup.position.x = Math.max(-courtHeight/2 + 0.5, Math.min(courtHeight/2 - 0.5, playerGroup.position.x));
            playerGroup.position.z = Math.max(-courtWidth/2 + 0.5, Math.min(courtWidth/2 - 0.5, playerGroup.position.z));

            // Third-Person Camera Positioning
            const camOffset = new THREE.Vector3(0, 2.2, 4.5);
            camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);
            camera.position.copy(playerGroup.position).add(camOffset);

            const lookTarget = playerGroup.position.clone().add(new THREE.Vector3(0, 1.5, 0));
            lookTarget.x -= Math.sin(cameraRotation.yaw) * 10;
            lookTarget.z -= Math.cos(cameraRotation.yaw) * 10;
            lookTarget.y += Math.sin(cameraRotation.pitch) * 5;
            camera.lookAt(lookTarget);

            // CPU AI Defender Tracking
            const cpuTargetZ = playerGroup.position.z - 2.0;
            cpuGroup.position.x += (playerGroup.position.x - cpuGroup.position.x) * 3.0 * delta;
            cpuGroup.position.z += (cpuTargetZ - cpuGroup.position.z) * 2.0 * delta;

            // Shot Power Meter Charging
            if (isChargingShot) {
                shotPower += shotPowerDir * 120 * delta;
                if (shotPower >= 100) { shotPower = 100; shotPowerDir = -1; }
                if (shotPower <= 0) { shotPower = 0; shotPowerDir = 1; }
                document.getElementById('shot-meter-bar').style.width = `${shotPower}%`;
            }

            // Ball Physics & Shot Flight
            if (!isBallInAir) {
                // Ball held in hands
                ball.position.copy(playerGroup.position).add(new THREE.Vector3(0, 1.2, -0.4));
            } else {
                // Ball trajectory calculations
                ballVel.y += gravity * delta;
                ball.position.addScaledVector(ballVel, delta);

                // Check distance to North Hoop Rim for scoring
                if (ball.position.distanceTo(northHoop.rimPos) < 0.45 && ballVel.y < 0) {
                    resetPossession(true);
                }

                // Floor bounce / Missed Shot Reset
                if (ball.position.y <= 0.2) {
                    resetPossession(false);
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
