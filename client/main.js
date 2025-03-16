/**
 * 3D Multiplayer Uçak Simülasyonu
 * Ana JavaScript dosyası
 */

// Modülleri import et
import { World } from './src/classes/World.js';
import { Aircraft } from './src/classes/Aircraft.js';
import { FlightControls } from './src/classes/FlightControls.js';
import { Physics } from './src/classes/Physics.js';
import { UI } from './src/classes/UI.js';
import { Mission } from './src/classes/Mission.js';
import { Effects } from './src/classes/Effects.js';
import { NetworkManager } from './src/network/NetworkManager.js';
import { GameConstants } from './src/constants/GameConstants.js';
import { EngineSystem } from './src/classes/EngineSystem.js';
import { ChatSystem } from './src/classes/ChatSystem.js';
import { Player } from './src/classes/Player.js';
import { Enemy } from './src/classes/Enemy.js';
import { Projectile } from './src/classes/Projectile.js';
import { PerformanceManager } from './src/performance/PerformanceManager.js';

// Global değişkenler
let scene, camera, renderer, stats;
let world, aircraft, controls, physics, ui, mission, effects, networkManager;
let performanceManager; // PerformanceManager global tanımı
let clock, delta;
let isGameActive = false; // Tek bir değişken kullanıyoruz - isGameRunning değil
let currentPlayer = null;
let otherPlayers = new Map(); // id -> aircraft
let localPlayer;
let cameraView;
let lastTime = 0;
let lastFireTime = 0;
let projectiles = [];
let enemies = [];
let chatSystem; // ChatSystem için değişkeni tanımla
let orbitControls; // Orbit kontroller için değişkeni tanımla

// Hata ayıklama modu
const DEBUG = true;

// Hata ayıklama fonksiyonları
function debug(message, ...args) {
    if (DEBUG) {
        console.log(`[DEBUG] ${message}`, ...args);
    }
}

function debugError(message, ...args) {
    if (DEBUG) {
        console.error(`[DEBUG ERROR] ${message}`, ...args);
    }
}

function debugWarn(message, ...args) {
    if (DEBUG) {
        console.warn(`[DEBUG WARN] ${message}`, ...args);
    }
}

// Oyunu başlat
function init() {
    try {
        console.log('Initializing game...');
        console.log('Browser:', navigator.userAgent);
        console.log('Window size:', window.innerWidth, 'x', window.innerHeight);
        
        // Global değişkeni window'a ekle
        window.isGameActive = isGameActive;
        
        // Gerekli kütüphaneleri kontrol et
        console.log('Checking required libraries...');
        const requiredLibraries = {
            'THREE': typeof THREE !== 'undefined',
            'CANNON': typeof CANNON !== 'undefined',
            'io (Socket.io)': typeof io !== 'undefined',
            'Stats': typeof Stats !== 'undefined'
        };
        
        console.log('Library status:', requiredLibraries);
        
        // Eksik kütüphaneleri kontrol et
        const missingLibraries = Object.entries(requiredLibraries)
            .filter(([_, loaded]) => !loaded)
            .map(([name]) => name);
        
        if (missingLibraries.length > 0) {
            console.error('Missing required libraries:', missingLibraries.join(', '));
            alert(`Missing required libraries: ${missingLibraries.join(', ')}. Please check your internet connection and try again.`);
            return;
        }
        
        // Three.js kurulumu
        try {
            console.log('Setting up Three.js...');
            setupThreeJS();
        } catch (threeJsError) {
            console.error('Failed to set up Three.js:', threeJsError);
            alert('Failed to initialize 3D graphics. Please make sure your browser supports WebGL and try again.');
            return;
        }
        
        // Stats.js kurulumu
        try {
            console.log('Setting up Stats.js...');
            setupStats();
        } catch (statsError) {
            console.error('Failed to set up Stats.js:', statsError);
            console.warn('Continuing without performance monitoring');
            // Stats kritik değil, devam et
        }
        
        // Oyun bileşenlerini oluştur
        try {
            console.log('Setting up game components...');
            setupGameComponents();
        } catch (componentsError) {
            console.error('Failed to set up game components:', componentsError);
            alert('Failed to initialize game components. Please refresh the page and try again.');
            return;
        }
        
        // Event listener'ları ekle
        try {
            console.log('Setting up event listeners...');
            setupEventListeners();
        } catch (eventError) {
            console.error('Failed to set up event listeners:', eventError);
            console.warn('Continuing with limited controls');
            // Event listener'lar kritik değil, devam et
        }
        
        // Pencere boyutu değiştiğinde yeniden boyutlandır
        window.addEventListener('resize', onWindowResize, false);
        
        // Animasyon döngüsünü başlat
        console.log('Starting animation loop...');
        clock = new THREE.Clock();
        animate();
        
        // UI ekranlarını göster
        if (ui && ui.showLoginScreen) {
            console.log('Showing login screen...');
            ui.showLoginScreen();
        } else {
            console.error('UI not initialized properly');
            alert('User interface could not be initialized. Some features may not work properly.');
        }
        
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Critical error during initialization:', error);
        console.error('Stack trace:', error.stack);
        alert('Failed to initialize the game. Please refresh the page and try again.');
    }
}

// Three.js kurulumu
function setupThreeJS() {
    try {
        console.log('Setting up Three.js');
        
        // THREE yüklü mü kontrol et
        if (typeof THREE === 'undefined') {
            console.error('THREE is not defined. Make sure Three.js is loaded.');
            throw new Error('THREE is not defined');
        }
        
        // Canvas elementini kontrol et
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            console.error('Canvas element not found');
            throw new Error('Canvas element not found');
        }
        
        // Scene oluştur
        scene = new THREE.Scene();
        
        // Camera oluştur
        camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            10000 // Far clipping plane
        );
        camera.position.set(0, 10, 20);
        
        // Renderer oluştur
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Gökyüzü rengi
        scene.background = new THREE.Color(0x87CEEB);
        
        // Ambient light ekle
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        // Directional light ekle (güneş)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        scene.add(directionalLight);
        
        console.log('Three.js setup completed successfully');
    } catch (error) {
        console.error('Error setting up Three.js:', error);
        throw error; // Kritik bir hata, yeniden fırlat
    }
}

// Stats.js kurulumu
function setupStats() {
    try {
        console.log('Setting up Stats.js');
        
        // Stats.js yüklü mü kontrol et
        if (typeof Stats === 'undefined') {
            console.warn('Stats.js is not loaded. Performance monitoring will be disabled.');
            return;
        }
        
        // Stats container elementini kontrol et
        const statsContainer = document.getElementById('stats-container');
        if (!statsContainer) {
            console.warn('Stats container element not found. Performance monitoring will be disabled.');
            return;
        }
        
        // Stats oluştur
        stats = new Stats();
        stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        statsContainer.appendChild(stats.dom);
        
        console.log('Stats.js setup completed successfully');
    } catch (error) {
        console.error('Error setting up Stats.js:', error);
        console.warn('Continuing without performance monitoring');
        // Stats kritik değil, devam et
    }
}

// Oyun bileşenlerini oluştur
function setupGameComponents() {
    try {
        console.log('Setting up game components...');
        
        // World oluştur
        world = new World(scene);
        world.create();
        
        // Physics oluştur
        physics = new Physics();
        physics.init();
        
        // FlightControls oluştur
        controls = new FlightControls();
        controls.init();
        
        // UI oluştur
        ui = new UI();
        ui.init();
        
        // Efektler
        effects = new Effects(scene, ui);
        effects.init();
        
        // NetworkManager oluştur
        networkManager = new NetworkManager();
        networkManager.init({
            onConnect: handleConnect,
            onDisconnect: handleDisconnect,
            onLoginSuccess: handleLoginSuccess,
            onLoginError: handleLoginError,
            onPlayerJoin: handlePlayerJoin,
            onPlayerLeave: handlePlayerLeave,
            onPlayerUpdate: handlePlayerUpdate,
            onRoomList: handleRoomList,
            onRoomJoin: handleRoomJoin,
            onRoomLeave: handleRoomLeave,
            onGameStart: handleGameStart,
            onGameEnd: handleGameEnd,
            onChatMessage: handleChatMessage,
            onHit: handleHit
        });
        
        // ChatSystem oluştur
        chatSystem = new ChatSystem(ui, networkManager);
        chatSystem.init();
        
        // Oyuncu oluştur
        localPlayer = new Player({
            id: 'local-player',
            name: 'Player',
            scene: scene,
            physics: physics,
            controls: controls,
            effects: effects,
            isLocal: true
        });
        
        // Uçağımızı pozisyonla
        const startPosition = new THREE.Vector3(0, 100, 0);
        aircraft = new Aircraft({
            id: 'player-aircraft',
            ownerId: 'local-player',
            name: 'Player Aircraft',
            scene: scene,
            physics: physics, 
            position: startPosition,
            color: 0x0088ff,
            team: 'blue',
            effects: effects
        });
        localPlayer.setAircraft(aircraft);
        
        // Enemy AI uçaklar (test için)
        enemies = [];
        for (let i = 0; i < 3; i++) {
            const enemyPosition = new THREE.Vector3(
                200 * (Math.random() - 0.5),
                100 + 50 * Math.random(),
                200 * (Math.random() - 0.5)
            );
            
            const enemy = new Enemy({
                id: `enemy-${i}`,
                name: `Enemy ${i+1}`,
                scene: scene,
                physics: physics,
                position: enemyPosition,
                color: 0xff0000,
                team: 'red',
                effects: effects
            });
            
            enemies.push(enemy);
        }
        
        // Projectiles array
        projectiles = [];
        
        // UI için oyuncu bilgilerini ayarla
        ui.updatePlayerName('You');
        ui.updatePlayerCount(1);
        
        // Kamerayı uçağa bağla
        camera.position.set(0, 10, -20);
        
        // İlk kamera görünümü
        cameraView = 'follow';
        
        // Oyun henüz aktif değil - login sonrası aktifleşecek
        isGameActive = false;
        window.isGameActive = false;
        
        // Kamera referansını World'e gönder
        world.setCamera(camera);
        
        // Performance Manager oluştur
        performanceManager = new PerformanceManager({
            scene: scene,
            renderer: renderer,
            physics: physics,
            world: world,
            camera: camera,
            ui: ui
        });
        performanceManager.init();
        
        // Global erişim için performanceManager'ı window nesnesine ekle
        window.game = {
            performanceManager: performanceManager
        };
        
        console.log('Game components setup complete');
    } catch (error) {
        console.error('Error setting up game components:', error);
    }
}

// Event listener'ları ekle
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    try {
        // Login form event listener'ı
        const loginForm = document.getElementById('login-form');
        
        if (loginForm) {
            console.log('Setting up login form submit event listener');
            
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                console.log('Login form submitted');
                handleLoginButtonClick();
                return false;
            });
        } else {
            console.error('Login form not found in the DOM');
            
            // Fallback - login buton event listener'ı
            const loginBtn = document.getElementById('login-btn');
            
            if (loginBtn) {
                console.log('Setting up login button event listener (fallback)');
                
                loginBtn.addEventListener('click', function() {
                    console.log('Login button clicked');
                    handleLoginButtonClick();
                });
            } else {
                console.error('Login button not found in the DOM');
            }
        }
        
        // Keyboard event listener'ları
        document.addEventListener('keydown', function(e) {
            if (e.code === 'KeyV' && isGameActive) {
                // Kamera değiştirme
                toggleCameraView();
            }
        });
        
        console.log('Event listeners setup complete');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Login butonu işlevi
function handleLoginButtonClick() {
    const usernameInput = document.getElementById('username');
    
    if (!usernameInput) {
        console.error('Username input element not found');
        return;
    }
    
    const username = usernameInput.value.trim();
    console.log('Login attempt with username:', username);
    
    if (username) {
        // Login butonunu güncelle
        const loginButton = document.getElementById('login-btn');
        if (loginButton) {
            loginButton.innerText = 'Logging in...';
            loginButton.disabled = true;
        }
        
        // NetworkManager login çağrısı
        if (networkManager) {
            networkManager.login(username);
        } else {
            console.error('NetworkManager not initialized');
            
            // NetworkManager yoksa bile offline login simüle et
            if (ui) {
                ui.hideAllScreens();
            }
            
            // Oyunu aktif et
            isGameActive = true;
            window.isGameActive = true;
            
            // Oyuncu adını ayarla
            if (ui && ui.updatePlayerName) {
                ui.updatePlayerName(username);
            }
            
            // Login butonunu resetle
            if (loginButton) {
                loginButton.innerText = 'Login';
                loginButton.disabled = false;
            }
        }
    } else {
        console.warn('Empty username provided');
        alert('Please enter a username');
    }
}

// Pencere boyutu değiştiğinde yeniden boyutlandır
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Animasyon döngüsü
 */
function animate() {
    try {
        requestAnimationFrame(animate);
        
        // Zamanlama
        const now = performance.now();
        let deltaTime = (now - lastTime) / 1000; // Saniye cinsinden
        
        // Aşırı büyük delta zamanı kısıtla
        deltaTime = Math.min(deltaTime, 0.1);
        lastTime = now;
        
        // Stats güncelle
        if (stats) stats.begin();
        
        // Oyun aktif mi kontrol et
        if (!isGameActive) {
            // Oyun aktif değilse sadece renderer güncelle
            renderer.render(scene, camera);
            if (stats) stats.end();
            return;
        }
        
        // World güncelle
        if (world) world.update(deltaTime);
        
        // Physics güncelle
        if (physics) physics.update(deltaTime);
        
        // Controls güncelle
        if (controls) controls.update(deltaTime);
        
        // Kontrolleri al
        const inputs = controls ? controls.getInputs() : {};
        
        // Player güncelle
        if (localPlayer) {
            localPlayer.update(deltaTime);
            
            // Kamera pozisyonu
            if (cameraView === 'follow' && aircraft && aircraft.mesh) {
                updateCamera();
            }
            
            // Ateş etme
            if (inputs.fire) {
                handleFire();
            }
            
            // Kamera görünümü değiştirme
            if (inputs.cameraToggle) {
                toggleCameraView();
            }
        }
        
        // Mermileri güncelle
        updateProjectiles(deltaTime);
        
        // Düşman uçakları güncelle
        updateEnemies(deltaTime);
        
        // UI güncelle
        updateUI();
        
        // Effects güncelle
        if (effects) effects.update(deltaTime);
        
        // Performance manager'ı güncelle
        if (performanceManager) {
            performanceManager.update(deltaTime);
        }
        
        // Render
        renderer.render(scene, camera);
        
        // Stats güncelle
        if (stats) stats.end();
    } catch (error) {
        console.error('Error in animation loop:', error);
    }
}

function handleFire() {
    // Ateş etme kısıtlaması
    const now = Date.now();
    if (now - lastFireTime < 200) { // 5 ateş/saniye
        return;
    }
    lastFireTime = now;
    
    if (!aircraft || !aircraft.isAlive() || !isGameActive) {
        return;
    }
    
    // Mermi oluştur
    const position = aircraft.getPosition().clone();
    
    // Uçağın ön tarafına offset ekle
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(aircraft.getQuaternion());
    position.add(direction.clone().multiplyScalar(3)); // Uçağın 3 birim önünde
    
    // Mermi oluştur
    try {
        const projectile = new Projectile({
            id: `projectile-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            ownerId: 'local-player',
            position: position,
            direction: direction,
            speed: 100,
            damage: 10,
            scene: scene,
            lifeTime: 3,
            ownerObject: aircraft,
            team: 'blue',
            color: 0x0088ff,
            createTrail: true,
            addLight: true
        });
        
        projectiles.push(projectile);
        
        // Ses efekti
        if (effects) {
            effects.playFireSound();
        }
    } catch (error) {
        console.error('Error creating projectile:', error);
    }
}

function updateProjectiles(deltaTime) {
    // Aktif mermileri filtrele
    const targets = enemies.map(enemy => enemy.aircraft).filter(aircraft => aircraft && aircraft.isAlive && aircraft.isAlive());
    
    projectiles = projectiles.filter(projectile => {
        return projectile && projectile.update(deltaTime, targets);
    });
}

function updateEnemies(deltaTime) {
    enemies.forEach(enemy => {
        if (enemy && enemy.aircraft) {
            // Hedef olarak oyuncuyu ver
            const targets = [aircraft];
            // Mermi listesini ver
            enemy.updateEnemy(deltaTime, targets, projectiles);
        }
    });
}

function updateUI() {
    if (!ui || !aircraft || !localPlayer) return;
    
    // Uçuş verilerini güncelle
    const position = aircraft.getPosition();
    const altitude = Math.max(0, Math.round(position.y));
    const speed = Math.round(aircraft.getSpeed() * 3.6); // m/s to km/h
    const verticalSpeed = Math.round(aircraft.getVerticalSpeed());
    
    ui.updateFlightData({
        altitude: altitude,
        speed: speed,
        verticalSpeed: verticalSpeed
    });
    
    // Silah bilgilerini güncelle
    ui.updateAmmoCounter({
        current: aircraft.getAmmo ? aircraft.getAmmo() : 100,
        max: aircraft.getMaxAmmo ? aircraft.getMaxAmmo() : 100
    });
    
    // Radar güncelle
    const radarTargets = enemies.map(enemy => {
        if (enemy && enemy.aircraft && enemy.aircraft.getPosition) {
            return {
                position: enemy.aircraft.getPosition(),
                team: 'red',
                type: 'enemy'
            };
        }
        return null;
    }).filter(target => target !== null);
    
    ui.updateRadar(position, radarTargets);
    
    // Skorboard
    const players = [
        {
            id: 'local-player',
            name: 'You',
            score: localPlayer.getScore?.() || 0,
            kills: localPlayer.getKills?.() || 0,
            deaths: localPlayer.getDeaths?.() || 0,
            team: 'blue'
        }
    ];
    
    enemies.forEach((enemy, index) => {
        players.push({
            id: `enemy-${index}`,
            name: `Enemy ${index+1}`,
            score: enemy.getScore?.() || 0,
            kills: enemy.getKills?.() || 0,
            deaths: enemy.getDeaths?.() || 0,
            team: 'red'
        });
    });
    
    ui.updateScoreTable(players);
}

function toggleCameraView() {
    const views = ['cockpit', 'follow', 'free'];
    const currentIndex = views.indexOf(cameraView);
    const nextIndex = (currentIndex + 1) % views.length;
    cameraView = views[nextIndex];
    
    console.log(`Camera view changed to: ${cameraView}`);
    
    // Kamera pozisyonunu hemen güncelle
    updateCamera();
}

function updateCamera() {
    if (!aircraft || !aircraft.mesh) return;
    
    const position = aircraft.getPosition();
    const rotation = aircraft.getRotation();
    const quaternion = aircraft.getQuaternion();
    
    switch (cameraView) {
        case 'cockpit':
            // Kokpit görünümü
            const cockpitOffset = new THREE.Vector3(0, 1, 0.5);
            const worldOffset = cockpitOffset.clone().applyQuaternion(quaternion);
            camera.position.copy(position).add(worldOffset);
            camera.quaternion.copy(quaternion);
            break;
            
        case 'follow':
            // Takip kamerası
            const followOffset = new THREE.Vector3(0, 5, -15);
            const followWorldOffset = followOffset.clone().applyQuaternion(quaternion);
            camera.position.copy(position).add(followWorldOffset);
            camera.lookAt(position);
            break;
            
        case 'free':
            // Controls kamerası (kullanıcı kontrolleri)
            if (!orbitControls) {
                orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
                orbitControls.target.copy(position);
                orbitControls.minDistance = 10;
                orbitControls.maxDistance = 100;
                orbitControls.enableDamping = true;
                orbitControls.dampingFactor = 0.05;
            }
            
            orbitControls.target.copy(position);
            orbitControls.update();
            break;
    }
}

// Event Handlers
function handleConnect() {
    console.log('Connected to server');
    networkManager.getRoomList();
}

function handleDisconnect() {
    console.log('Disconnected from server');
    // Oyunu durdur
    isGameActive = false;
    window.isGameActive = false;
    
    if (ui) {
        ui.showLoginScreen();
    }
}

function handleLoginSuccess(userData) {
    console.log('Login successful', userData);
    
    try {
        // Login butonunu resetle
        const loginButton = document.getElementById('login-btn');
        if (loginButton) {
            loginButton.innerText = 'Login';
            loginButton.disabled = false;
        }
        
        // Kullanıcı adını UI'da göster
        if (ui && ui.updatePlayerName) {
            ui.updatePlayerName(userData.username);
        } else {
            console.error('UI or updatePlayerName method is not available');
            // Doğrudan DOM manipülasyonu
            const playerNameElement = document.getElementById('player-name');
            if (playerNameElement) {
                playerNameElement.textContent = userData.username;
            }
        }
        
        // Tüm ekranları gizle
        if (ui && ui.hideAllScreens) {
            console.log('Hiding all UI screens');
            ui.hideAllScreens();
        } else {
            console.error('UI or hideAllScreens method is not available');
            // Doğrudan DOM manipülasyonu
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.add('hidden');
            });
        }
        
        // Oyun ekranını göster
        console.log('Showing game UI');
        const uiContainer = document.getElementById('ui-container');
        if (uiContainer) {
            uiContainer.style.display = 'block';
        }
        
        // Oyunu aktif et
        console.log('Activating game');
        isGameActive = true;
        window.isGameActive = true;
        
        console.log('Game activated successfully after login');
        
        // Efektler için bildirim
        if (effects) {
            effects.showMessage('Welcome, ' + userData.username + '!', 'success');
        }
    } catch (error) {
        console.error('Error in handleLoginSuccess:', error);
        
        // Hata durumunda fallback
        alert('An error occurred while starting the game. Trying emergency start...');
        
        // Tüm ekranları gizle - doğrudan DOM manipülasyonu
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Oyunu aktif et
        isGameActive = true;
        window.isGameActive = true;
    }
}

function handleLoginError(error) {
    console.error('Login error:', error);
    
    // Login butonunu resetle
    const loginButton = document.getElementById('login-btn');
    if (loginButton) {
        loginButton.innerText = 'Login';
        loginButton.disabled = false;
    }
    
    alert('Login failed. Please try again later.');
}

function handlePlayerJoin(playerData) {
    console.log('Player joined:', playerData);
    ui.addChatMessage(`${playerData.name} joined the game`, 'system');
    
    if (isGameActive) {
        addOtherPlayer(playerData);
    }
    
    ui.updatePlayerCount(playerData.playerCount);
    ui.updatePlayerList(playerData.players);
    
    // Skor tablosunu güncelle
    if (playerData.players) {
        ui.updateScoreTable(playerData.players);
    }
}

function handlePlayerLeave(playerData) {
    console.log('Player left:', playerData);
    ui.addChatMessage(`${playerData.name} left the game`, 'system');
    
    if (isGameActive) {
        removeOtherPlayer(playerData.id);
    }
    
    ui.updatePlayerCount(playerData.playerCount);
    ui.updatePlayerList(playerData.players);
    
    // Skor tablosunu güncelle
    if (playerData.players) {
        ui.updateScoreTable(playerData.players);
    }
}

function handlePlayerUpdate(playerData) {
    if (playerData.id !== currentPlayer?.id) {
        updateOtherPlayer(playerData);
    }
}

function handleRoomList(rooms) {
    ui.updateRoomList(rooms);
    ui.showLobbyScreen();
}

function handleCreateRoom() {
    const roomName = document.getElementById('room-name').value.trim();
    const roomPassword = document.getElementById('room-password').value.trim();
    const maxPlayers = parseInt(document.getElementById('max-players').value);
    const gameMode = document.getElementById('game-mode').value;
    
    if (roomName) {
        networkManager.createRoom({
            name: roomName,
            password: roomPassword,
            maxPlayers: maxPlayers,
            gameMode: gameMode
        });
    } else {
        alert('Please enter a room name');
    }
}

function handleRoomJoin(roomData) {
    console.log('Joined room:', roomData);
    ui.updateRoomInfo(roomData);
    ui.updatePlayerList(roomData.players);
    ui.showRoomScreen();
}

function handleRoomLeave() {
    networkManager.leaveRoom();
}

function handleReady() {
    const readyBtn = document.getElementById('ready-btn');
    const isReady = readyBtn.classList.toggle('ready');
    
    networkManager.setReady(isReady);
    
    if (isReady) {
        readyBtn.textContent = 'Cancel Ready';
    } else {
        readyBtn.textContent = 'Ready';
    }
}

function handleGameStart(gameData) {
    console.log('Game started:', gameData);
    ui.addChatMessage('Game started!', 'system');
    startGame(gameData.player, gameData.room);
}

function handleGameEnd(gameData) {
    console.log('Game ended:', gameData);
    ui.addChatMessage('Game ended!', 'system');
    stopGame();
}

function handleSendChat() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (message) {
        networkManager.sendChatMessage(message);
        chatInput.value = '';
    }
}

function handleChatMessage(messageData) {
    ui.addChatMessage(messageData.message, messageData.type, messageData.sender);
}

function handleHit(hitData) {
    console.log('Hit:', hitData);
    
    if (hitData.targetId === currentPlayer?.id) {
        // Oyuncu vuruldu
        currentPlayer.damage(hitData.damage);
        effects.createHitEffect(currentPlayer.getPosition());
        ui.showHitInfo(`You were hit by ${hitData.shooterName}!`, 'damage');
        
        // Eğer oyuncu öldüyse
        if (currentPlayer.getHealth() <= 0) {
            networkManager.sendDeath(hitData.shooterId);
            effects.createExplosion(currentPlayer.getPosition());
            
            // 5 saniye sonra yeniden doğ
            setTimeout(() => {
                currentPlayer.respawn();
            }, 5000);
        }
    } else if (hitData.shooterId === currentPlayer?.id) {
        // Oyuncu birini vurdu
        ui.showHitInfo(`You hit ${hitData.targetName}!`, 'hit');
        
        // Eğer hedef öldüyse
        if (hitData.killed) {
            currentPlayer.addScore(100);
            ui.showHitInfo(`You killed ${hitData.targetName}!`, 'kill');
        }
    }
}

function handleSubmitFeedback() {
    const type = document.getElementById('feedback-type').value;
    const text = document.getElementById('feedback-text').value.trim();
    
    if (text) {
        networkManager.sendFeedback({
            type: type,
            text: text
        });
        
        document.getElementById('feedback-text').value = '';
        document.getElementById('feedback-modal').classList.add('hidden');
        
        alert('Thank you for your feedback!');
    } else {
        alert('Please enter a description');
    }
}

// Sayfa yüklendiğinde başlat
window.addEventListener('load', () => {
    debug('Page loaded, initializing game...');
    init();
}); 