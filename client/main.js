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

// Global değişkenler
let scene, camera, renderer, stats;
let world, aircraft, controls, physics, ui, mission, effects, networkManager;
let clock, delta;
let isGameRunning = false;
let currentPlayer = null;
let otherPlayers = new Map(); // id -> aircraft

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
        debug('Setting up game components...');
        
        // THREE.js ve CANNON.js yüklü mü kontrol et
        if (typeof THREE === 'undefined') {
            debugError('THREE is not defined. Make sure Three.js is loaded.');
            throw new Error('THREE is not defined');
        }
        
        if (typeof CANNON === 'undefined') {
            debugError('CANNON is not defined. Make sure Cannon.js is loaded.');
            throw new Error('CANNON is not defined');
        }
        
        // Her bileşeni ayrı try-catch bloklarında oluştur
        // Bu şekilde bir bileşen başarısız olsa bile diğerleri yüklenebilir
        
        // World oluştur
        try {
            debug('Creating World...');
            world = new World(scene);
            world.create();
            debug('World created successfully');
        } catch (worldError) {
            debugError('Error creating World:', worldError);
            // Kritik bileşen, hata fırlat
            throw worldError;
        }
        
        // Physics oluştur
        try {
            debug('Creating Physics...');
            physics = new Physics();
            physics.init();
            debug('Physics initialized successfully');
        } catch (physicsError) {
            debugError('Error creating Physics:', physicsError);
            // Kritik bileşen, hata fırlat
            throw physicsError;
        }
        
        // Controls oluştur
        try {
            debug('Creating FlightControls...');
            controls = new FlightControls();
            controls.init();
            debug('FlightControls initialized successfully');
        } catch (controlsError) {
            debugError('Error creating FlightControls:', controlsError);
            // Kritik bileşen, hata fırlat
            throw controlsError;
        }
        
        // UI oluştur
        try {
            debug('Creating UI...');
            ui = new UI();
            ui.init();
            debug('UI initialized successfully');
        } catch (uiError) {
            debugError('Error creating UI:', uiError);
            // UI kritik değil, devam et
            debugWarn('Continuing without UI, some features may not work properly');
            ui = {
                update: () => {},
                showHitInfo: () => {},
                showLoginScreen: () => {},
                hideAllScreens: () => {},
                updateScoreTable: () => {}
            };
        }
        
        // Mission oluştur
        try {
            debug('Creating Mission...');
            mission = new Mission(ui);
            mission.init();
            debug('Mission initialized successfully');
        } catch (missionError) {
            debugError('Error creating Mission:', missionError);
            // Mission kritik değil, devam et
            debugWarn('Continuing without Mission system');
            mission = {
                update: () => {},
                init: () => {}
            };
        }
        
        // Effects oluştur
        try {
            debug('Creating Effects...');
            effects = new Effects(scene, ui);
            effects.init();
            debug('Effects initialized successfully');
        } catch (effectsError) {
            debugError('Error creating Effects:', effectsError);
            // Effects kritik değil, devam et
            debugWarn('Continuing without Effects system');
            effects = {
                update: () => {},
                showMessage: () => {},
                playEngineSound: () => {},
                playFireSound: () => {},
                playTakeoffSound: () => {},
                playLandingSound: () => {}
            };
        }
        
        // NetworkManager oluştur
        try {
            debug('Creating NetworkManager...');
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
            debug('NetworkManager initialized successfully');
        } catch (networkError) {
            debugError('Error creating NetworkManager:', networkError);
            // NetworkManager kritik değil, çevrimdışı mod için devam et
            debugWarn('Continuing in offline mode');
            networkManager = {
                init: () => {},
                sendPlayerUpdate: () => {},
                lastUpdateTime: 0,
                login: (username) => {
                    // Offline mod için basit bir login simülasyonu
                    setTimeout(() => {
                        if (handleLoginSuccess) {
                            handleLoginSuccess({
                                id: 'local-player',
                                username: username,
                                isHost: true
                            });
                        }
                    }, 500);
                }
            };
        }
        
        debug('All game components set up successfully');
    } catch (error) {
        debugError('Error setting up game components:', error);
        debugError('Stack trace:', error.stack);
        alert('Failed to set up game components. Please refresh the page and try again.');
        throw error; // Yeniden fırlat
    }
}

// Event listener'ları ekle
function setupEventListeners() {
    // Login butonu
    document.getElementById('login-btn').addEventListener('click', function() {
        console.log('Login button clicked');
        const username = document.getElementById('username').value.trim();
        if (username) {
            console.log('Login attempt with username:', username);
            networkManager.login(username);
        } else {
            alert('Please enter a username');
        }
    });
    
    // Username input Enter tuşu
    document.getElementById('username').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            console.log('Enter key pressed in username input');
            const username = document.getElementById('username').value.trim();
            if (username) {
                console.log('Login attempt with username:', username);
                networkManager.login(username);
            } else {
                alert('Please enter a username');
            }
        }
    });
    
    // Create Room butonu
    document.getElementById('create-room-btn').addEventListener('click', () => {
        document.getElementById('create-room-submit').style.display = 'block';
        document.querySelector('.lobby-section:nth-child(2)').style.display = 'block';
    });
    
    // Create Room Submit butonu
    document.getElementById('create-room-submit').addEventListener('click', handleCreateRoom);
    
    // Refresh Rooms butonu
    document.getElementById('refresh-rooms-btn').addEventListener('click', () => {
        networkManager.getRoomList();
    });
    
    // Ready butonu
    document.getElementById('ready-btn').addEventListener('click', handleReady);
    
    // Leave Room butonu
    document.getElementById('leave-room-btn').addEventListener('click', handleRoomLeave);
    
    // Chat Send butonu
    document.getElementById('chat-send').addEventListener('click', handleSendChat);
    
    // Chat input Enter tuşu
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendChat();
        }
    });
    
    // Feedback butonu
    document.getElementById('feedback-btn').addEventListener('click', () => {
        document.getElementById('feedback-modal').classList.remove('hidden');
    });
    
    // Close Modal butonu
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('feedback-modal').classList.add('hidden');
    });
    
    // Submit Feedback butonu
    document.getElementById('submit-feedback').addEventListener('click', handleSubmitFeedback);
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
    requestAnimationFrame(animate);
    
    try {
        // Delta time hesapla
        delta = clock.getDelta();
        
        // Stats güncelle (eğer tanımlıysa)
        if (stats) {
            stats.update();
        }
        
        // Oyun çalışıyorsa güncelle
        if (isGameRunning && currentPlayer) {
            try {
                // Kontrolleri güncelle
                if (controls) {
                    controls.update(delta);
                }
                
                // Kontrol değerlerini al
                const inputs = controls ? controls.getInputs() : {};
                
                // Oyuncuyu güncelle
                if (currentPlayer && currentPlayer.update) {
                    currentPlayer.update(delta, inputs);
                }
                
                // Diğer oyuncuları güncelle
                if (otherPlayers) {
                    otherPlayers.forEach(player => {
                        if (player && player.update) {
                            player.update(delta);
                        }
                    });
                }
                
                // Fiziği güncelle
                if (physics && physics.update) {
                    physics.update(delta);
                }
                
                // Kamerayı güncelle
                updateCamera();
                
                // Dünyayı güncelle
                if (world && world.update) {
                    world.update(delta);
                }
                
                // Efektleri güncelle
                if (effects && effects.update) {
                    effects.update(delta);
                }
                
                // Görevleri güncelle
                if (mission && mission.update) {
                    mission.update(delta, currentPlayer);
                }
                
                // Ağ güncellemesi gönder (her 60ms'de bir)
                const now = Date.now();
                if (networkManager && networkManager.sendPlayerUpdate && 
                    now - (networkManager.lastUpdateTime || 0) > (GameConstants.NETWORK.UPDATE_RATE || 60)) {
                    
                    if (currentPlayer) {
                        networkManager.sendPlayerUpdate({
                            position: currentPlayer.getPosition ? currentPlayer.getPosition() : { x: 0, y: 0, z: 0 },
                            rotation: currentPlayer.getRotation ? currentPlayer.getRotation() : { x: 0, y: 0, z: 0 },
                            speed: currentPlayer.getSpeed ? currentPlayer.getSpeed() : 0
                        });
                    }
                    
                    networkManager.lastUpdateTime = now;
                    
                    // Skor tablosunu periyodik olarak güncelle (her 5 saniyede bir)
                    if (now % 5000 < 100 && ui && ui.updateScoreTable) { // 5 saniyede bir, 100ms tolerans
                        // Tüm oyuncuların güncel verilerini topla
                        const allPlayers = [];
                        
                        if (currentPlayer) {
                            allPlayers.push({
                                id: currentPlayer.id,
                                name: currentPlayer.name,
                                score: currentPlayer.getScore ? currentPlayer.getScore() : 0,
                                kills: currentPlayer.getKills ? currentPlayer.getKills() : 0,
                                deaths: currentPlayer.getDeaths ? currentPlayer.getDeaths() : 0
                            });
                        }
                        
                        if (otherPlayers) {
                            otherPlayers.forEach(player => {
                                if (player) {
                                    allPlayers.push({
                                        id: player.id,
                                        name: player.name,
                                        score: player.getScore ? player.getScore() : 0,
                                        kills: player.getKills ? player.getKills() : 0,
                                        deaths: player.getDeaths ? player.getDeaths() : 0
                                    });
                                }
                            });
                        }
                        
                        // Skor tablosunu güncelle
                        ui.updateScoreTable(allPlayers);
                    }
                }
            } catch (gameError) {
                debugError('Error in game loop:', gameError);
                debugError('Stack trace:', gameError.stack);
            }
        }
        
        // Render
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    } catch (error) {
        debugError('Critical error in animation loop:', error);
        debugError('Stack trace:', error.stack);
    }
}

// Kamerayı oyuncuya bağla
function updateCamera() {
    if (!currentPlayer) return;
    
    const position = currentPlayer.getPosition();
    const rotation = currentPlayer.getRotation();
    
    // Uçağın arkasında ve biraz yukarısında
    const offset = new THREE.Vector3(
        -15 * Math.sin(rotation.y),
        5,
        -15 * Math.cos(rotation.y)
    );
    
    camera.position.copy(position).add(offset);
    camera.lookAt(position);
}

/**
 * Oyunu başlat
 * @param {Object} playerData - Oyuncu verileri
 * @param {Object} roomData - Oda verileri
 */
function startGame(playerData, roomData) {
    try {
        debug('Starting game with player data:', playerData);
        debug('Room data:', roomData);
        
        // Eğer oyun zaten çalışıyorsa, önce durdur
        if (isGameRunning) {
            debug('Game is already running, stopping first...');
            stopGame();
        }
        
        // Oyuncu ID'sini global değişkene kaydet
        window.currentPlayerId = playerData.id;
        debug('Current player ID set to:', window.currentPlayerId);
        
        // Login ekranını gizle
        if (ui && ui.hideAllScreens) {
            ui.hideAllScreens();
            debug('All screens hidden');
        } else {
            debugWarn('UI not available, cannot hide screens');
        }
        
        // THREE.js ve CANNON.js yüklü mü kontrol et
        if (typeof THREE === 'undefined') {
            debugError('THREE is not defined. Make sure Three.js is loaded.');
            alert('Three.js is not loaded. Please check your internet connection and try again.');
            return;
        }
        
        if (typeof CANNON === 'undefined') {
            debugError('CANNON is not defined. Make sure Cannon.js is loaded.');
            alert('Cannon.js is not loaded. Please check your internet connection and try again.');
            return;
        }
        
        // Dünyayı oluştur
        try {
            debug('Creating world...');
            if (!world) {
                debugError('World is not initialized');
                throw new Error('World is not initialized');
            }
            world.create();
            debug('World created successfully');
        } catch (error) {
            debugError('Failed to create world:', error);
            alert('Failed to create game world. Please try again.');
            return;
        }
        
        // Başlangıç pozisyonunu ayarla
        const startPosition = new THREE.Vector3(
            playerData.position ? playerData.position.x : 0,
            playerData.position ? playerData.position.y : 100,
            playerData.position ? playerData.position.z : 0
        );
        
        debug('Creating player aircraft at position:', startPosition);
        
        // Uçak oluştur
        try {
            debug('Creating player aircraft...');
            
            if (!scene) {
                debugError('Scene is not initialized');
                throw new Error('Scene is not initialized');
            }
            
            if (!physics) {
                debugError('Physics is not initialized');
                throw new Error('Physics is not initialized');
            }
            
            currentPlayer = new Aircraft({
                id: playerData.id,
                name: playerData.username,
                type: playerData.type || 'fighter',
                position: startPosition,
                scene: scene,
                physics: physics,
                effects: effects,
                ui: ui,
                isRemote: false
            });
            
            debug('Aircraft instance created:', currentPlayer);
            
            // Uçağın oluşturulduğunu kontrol et
            if (!currentPlayer) {
                debugError('Failed to create player aircraft - currentPlayer is null');
                throw new Error('Failed to create player aircraft');
            }
            
            if (!currentPlayer.getMesh()) {
                debugError('Failed to create player aircraft - mesh is null');
                throw new Error('Failed to create player aircraft mesh');
            }
            
            debug('Player aircraft created successfully');
            
            // Uçağı sahneye ekle
            debug('Adding aircraft to scene');
            scene.add(currentPlayer.getMesh());
            debug('Player aircraft added to scene');
            
            // Kamerayı uçağa bağla
            debug('Attaching camera to aircraft');
            camera.position.set(0, 5, -15);
            camera.lookAt(new THREE.Vector3(0, 0, 0));
            currentPlayer.getMesh().add(camera);
            debug('Camera attached to aircraft');
            
            // Oyuncu bilgilerini UI'da göster
            if (ui) {
                debug('Updating UI with player info');
                ui.updatePlayerName(playerData.username);
                ui.updatePlayerCount(roomData.players.length);
            }
            
            // Görevleri yükle
            if (mission) {
                debug('Loading missions for game mode:', roomData.gameMode);
                mission.loadMissions(roomData.gameMode);
            }
            
            // Diğer oyuncuları ekle
            debug('Adding other players from room data');
            if (roomData.players && Array.isArray(roomData.players)) {
                roomData.players.forEach(player => {
                    if (player.id !== playerData.id) {
                        debug('Adding other player:', player.id);
                        addOtherPlayer(player);
                    }
                });
            }
            
            // Oyunu başlat
            isGameRunning = true;
            debug('Game started successfully');
            
            // Bildirim göster
            if (effects) {
                effects.showMessage('Game started!', 'success');
            }
            
            return true;
        } catch (error) {
            debugError('Failed to start game:', error);
            alert('Failed to start game. Please try again.');
            return false;
        }
    } catch (error) {
        debugError('Critical error starting game:', error);
        alert('Critical error starting game. Please refresh the page and try again.');
        return false;
    }
}

/**
 * Oyunu durdur
 */
function stopGame() {
    console.log('Stopping game...');
    
    // Oyuncu uçağını kaldır
    if (currentPlayer) {
        if (currentPlayer.getMesh()) {
            scene.remove(currentPlayer.getMesh());
        }
        if (currentPlayer.getBody && currentPlayer.getBody()) {
            physics.removeBody(currentPlayer.getBody());
        }
        if (currentPlayer.dispose) {
            currentPlayer.dispose();
        }
        currentPlayer = null;
    }
    
    // Diğer oyuncuları kaldır
    otherPlayers.forEach(player => {
        if (player.getMesh()) {
            scene.remove(player.getMesh());
        }
        if (player.getBody && player.getBody()) {
            physics.removeBody(player.getBody());
        }
        if (player.dispose) {
            player.dispose();
        }
    });
    otherPlayers.clear();
    
    // Dünyayı temizle
    if (world && world.dispose) {
        world.dispose();
    }
    
    // Fizik motorunu sıfırla
    if (physics && physics.dispose) {
        physics.dispose();
    }
    
    // Kamerayı sıfırla
    if (camera) {
        camera.position.set(0, 10, 20);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
    }
    
    // Oyunu durdur
    isGameRunning = false;
    
    console.log('Game stopped');
}

// Diğer oyuncuyu ekle
function addOtherPlayer(playerData) {
    const otherPlayer = new Aircraft({
        id: playerData.id,
        name: playerData.name,
        type: playerData.type || 'fighter',
        position: new THREE.Vector3(
            playerData.position ? playerData.position.x : 0,
            playerData.position ? playerData.position.y : 100,
            playerData.position ? playerData.position.z : 0
        ),
        scene: scene,
        physics: physics,
        effects: effects,
        isRemote: true
    });
    
    scene.add(otherPlayer.getMesh());
    otherPlayers.set(playerData.id, otherPlayer);
}

// Diğer oyuncuyu kaldır
function removeOtherPlayer(playerId) {
    const player = otherPlayers.get(playerId);
    if (player) {
        scene.remove(player.getMesh());
        otherPlayers.delete(playerId);
    }
}

// Diğer oyuncuyu güncelle
function updateOtherPlayer(playerData) {
    const player = otherPlayers.get(playerData.id);
    if (player) {
        player.setTargetPosition(new THREE.Vector3(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        ));
        player.setTargetRotation(new THREE.Euler(
            playerData.rotation.x,
            playerData.rotation.y,
            playerData.rotation.z
        ));
        player.setSpeed(playerData.speed);
    }
}

// Event Handlers
function handleConnect() {
    console.log('Connected to server');
    networkManager.getRoomList();
}

function handleDisconnect() {
    console.log('Disconnected from server');
    stopGame();
    ui.showLoginScreen();
}

function handleLoginSuccess(userData) {
    console.log('Login successful', userData);
    
    try {
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
        
        // Eğer oyun zaten çalışıyorsa ve aynı kullanıcı ise, tekrar başlatma
        if (isGameRunning && currentPlayer && currentPlayer.id === userData.id) {
            console.log('Game is already running with the same user, not restarting');
            return;
        }
        
        // Sunucudan gelen oda bilgisi varsa kullan
        if (userData.room) {
            console.log('Using room data from server:', userData.room);
            
            // Oyuncu verisini oluştur
            const playerData = {
                id: userData.id,
                username: userData.username,
                position: { x: 0, y: 100, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                team: 'blue'
            };
            
            // Oyunu başlat
            startGame(playerData, userData.room);
        } else {
            // Sunucudan oda bilgisi gelmezse varsayılan değerleri kullan
            console.log('Starting game with default room data');
            
            // Varsayılan oyuncu ve oda verileri oluştur
            const defaultPlayerData = {
                id: userData.id,
                username: userData.username,
                position: { x: 0, y: 100, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                team: 'blue'
            };
            
            const defaultRoomData = {
                id: 'default-room',
                name: 'Default Game Room',
                gameMode: 'free-flight',
                players: [defaultPlayerData]
            };
            
            // Oyunu başlat
            startGame(defaultPlayerData, defaultRoomData);
        }
    } catch (error) {
        console.error('Error in handleLoginSuccess:', error);
    }
}

function handleLoginError(error) {
    console.error('Login error:', error);
    alert('Login failed. Please try again later.');
}

function handlePlayerJoin(playerData) {
    console.log('Player joined:', playerData);
    ui.addChatMessage(`${playerData.name} joined the game`, 'system');
    
    if (isGameRunning) {
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
    
    if (isGameRunning) {
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