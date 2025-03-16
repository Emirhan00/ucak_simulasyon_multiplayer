/**
 * NetworkManager.js
 * Socket.io kullanarak sunucu ile iletişimi yöneten sınıf
 * Offline mod desteği ile
 */
import { GameConstants } from '../constants/GameConstants.js';

export class NetworkManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.lastUpdateTime = 0;
        this.callbacks = {};
        this.playerData = null;
        this.roomData = null;
        this.offlineMode = false;
        this.loginAttemptInProgress = false;
        this.connectionTimeoutId = null;
        this.loginTimeoutId = null;
        this.lastAttemptedUsername = null;
    }
    
    /**
     * NetworkManager'ı başlat
     * @param {Object} callbacks - Event callback'leri
     */
    init(callbacks) {
        try {
            console.log('Initializing NetworkManager');
            
            this.callbacks = callbacks || {};
            
            // Çevrimdışı mod kontrolü - localStorage'da ayarlanabilir
            const forceOffline = localStorage.getItem('offlineMode') === 'true';
            
            if (forceOffline) {
                console.log('Forced offline mode is enabled by localStorage setting');
                this.setupOfflineMode();
                return;
            }
            
            // Socket.io yüklü mü kontrol et
            if (typeof io === 'undefined') {
                console.error('Socket.io is not defined. Using offline mode.');
                this.setupOfflineMode();
                return;
            }
            
            console.log('Connecting to server:', GameConstants.NETWORK.SERVER_URL);
            
            // Bağlantı zaman aşımı
            this.connectionTimeoutId = setTimeout(() => {
                console.warn('Connection timeout. Switching to offline mode.');
                this.setupOfflineMode();
            }, 5000); // 5 saniye timeout
            
            // Socket.io bağlantısını oluştur
            this.socket = io(GameConstants.NETWORK.SERVER_URL, {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 10000,
                transports: ['websocket', 'polling']
            });
            
            // Socket.io event listener'larını ekle
            this.setupSocketListeners();
            
            console.log('NetworkManager initialized successfully');
        } catch (error) {
            console.error('Error initializing NetworkManager:', error);
            this.setupOfflineMode();
        }
    }
    
    /**
     * Çevrimdışı mod ayarla
     */
    setupOfflineMode() {
        console.log('Setting up offline mode');
        this.offlineMode = true;
        this.isConnected = false;
        
        // Zaman aşımını temizle
        if (this.connectionTimeoutId) {
            clearTimeout(this.connectionTimeoutId);
            this.connectionTimeoutId = null;
        }
        
        if (this.loginTimeoutId) {
            clearTimeout(this.loginTimeoutId);
            this.loginTimeoutId = null;
        }
        
        // Boş bir socket nesnesi oluştur
        this.socket = {
            on: () => {},
            emit: () => {},
            once: () => {},
            connect: () => {},
            connected: false
        };
        
        console.warn('Offline mode activated. Multiplayer features will not be available.');
        
        // Eğer login denemesi yapılmış ama tamamlanmamışsa, offline login yap
        if (this.loginAttemptInProgress && this.lastAttemptedUsername) {
            console.log('Completing pending login in offline mode');
            this.handleOfflineLogin(this.lastAttemptedUsername);
        }
    }
    
    /**
     * Socket.io event listener'larını ekle
     */
    setupSocketListeners() {
        // Bağlantı olayları
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.offlineMode = false;
            
            // Bağlantı timeoutunu temizle
            if (this.connectionTimeoutId) {
                clearTimeout(this.connectionTimeoutId);
                this.connectionTimeoutId = null;
            }
            
            if (this.callbacks.onConnect) {
                this.callbacks.onConnect();
            }
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server, reason:', reason);
            this.isConnected = false;
            
            if (this.callbacks.onDisconnect) {
                this.callbacks.onDisconnect();
            }
        });
        
        // Bağlantı hata olayları
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.isConnected = false;
            
            // Otomatik offline mode'a geç
            this.setupOfflineMode();
        });
        
        this.socket.on('connect_timeout', () => {
            console.error('Connection timeout');
            this.isConnected = false;
            
            // Otomatik offline mode'a geç
            this.setupOfflineMode();
        });
        
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
        
        this.socket.on('reconnect', (attemptNumber) => {
            console.log('Reconnected to server after', attemptNumber, 'attempts');
            this.isConnected = true;
            this.offlineMode = false;
        });
        
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('Attempting to reconnect:', attemptNumber);
        });
        
        this.socket.on('reconnect_error', (error) => {
            console.error('Reconnection error:', error);
        });
        
        this.socket.on('reconnect_failed', () => {
            console.error('Failed to reconnect');
            this.isConnected = false;
            this.setupOfflineMode();
        });
        
        // Login olayı
        this.socket.on('login_success', (data) => {
            console.log('Login successful from server:', data);
            
            // Login timeout'u temizle
            if (this.loginTimeoutId) {
                clearTimeout(this.loginTimeoutId);
                this.loginTimeoutId = null;
            }
            
            this.loginAttemptInProgress = false;
            this.playerData = data;
            
            if (this.callbacks.onLoginSuccess) {
                console.log('Calling onLoginSuccess callback with data:', data);
                this.callbacks.onLoginSuccess(data);
            } else {
                console.error('onLoginSuccess callback is not defined');
            }
        });
        
        this.socket.on('login_error', (data) => {
            console.error('Login error:', data);
            
            // Login timeout'u temizle
            if (this.loginTimeoutId) {
                clearTimeout(this.loginTimeoutId);
                this.loginTimeoutId = null;
            }
            
            this.loginAttemptInProgress = false;
            
            // Login hatası durumunda çevrimdışı moda geç
            console.warn('Login error occurred, switching to offline mode for this session');
            this.setupOfflineMode();
            
            // Çevrimdışı modda login'i tekrar çağır
            this.handleOfflineLogin(this.lastAttemptedUsername || 'Guest');
        });
        
        // Oyuncu olayları
        this.socket.on('player:join', (data) => {
            console.log('Player joined:', data);
            
            if (this.callbacks.onPlayerJoin) {
                this.callbacks.onPlayerJoin(data);
            }
        });
        
        this.socket.on('player:leave', (data) => {
            console.log('Player left:', data);
            
            if (this.callbacks.onPlayerLeave) {
                this.callbacks.onPlayerLeave(data);
            }
        });
        
        this.socket.on('player:update', (data) => {
            if (this.callbacks.onPlayerUpdate) {
                this.callbacks.onPlayerUpdate(data);
            }
        });
        
        // Oda olayları
        this.socket.on('room:list', (data) => {
            console.log('Room list:', data);
            
            if (this.callbacks.onRoomList) {
                this.callbacks.onRoomList(data);
            }
        });
        
        this.socket.on('room:join', (data) => {
            console.log('Joined room:', data);
            this.roomData = data;
            
            if (this.callbacks.onRoomJoin) {
                this.callbacks.onRoomJoin(data);
            }
        });
        
        this.socket.on('room:leave', (data) => {
            console.log('Left room:', data);
            this.roomData = null;
            
            if (this.callbacks.onRoomLeave) {
                this.callbacks.onRoomLeave(data);
            }
        });
        
        // Oyun olayları
        this.socket.on('game:start', (data) => {
            console.log('Game started:', data);
            
            if (this.callbacks.onGameStart) {
                this.callbacks.onGameStart(data);
            }
        });
        
        this.socket.on('game:end', (data) => {
            console.log('Game ended:', data);
            
            if (this.callbacks.onGameEnd) {
                this.callbacks.onGameEnd(data);
            }
        });
        
        // Sohbet olayları
        this.socket.on('chat:message', (data) => {
            console.log('Chat message:', data);
            
            if (this.callbacks.onChatMessage) {
                this.callbacks.onChatMessage(data);
            }
        });
        
        // Vuruş olayları
        this.socket.on('hit', (data) => {
            console.log('Hit:', data);
            
            if (this.callbacks.onHit) {
                this.callbacks.onHit(data);
            }
        });
    }
    
    /**
     * Sunucuya giriş yap
     * @param {string} username - Kullanıcı adı
     */
    login(username) {
        // Boş kullanıcı adı kontrolü
        if (!username || username.trim() === '') {
            username = 'Player' + Math.floor(Math.random() * 1000);
            console.warn('Empty username provided, using random name:', username);
        }
        
        console.log('NetworkManager.login called with username:', username);
        this.lastAttemptedUsername = username;
        
        // Eğer zaten giriş yapmışsa, tekrar giriş yapma
        if (this.playerData) {
            console.log('Already logged in as:', this.playerData.username);
            
            // Eğer callback varsa, mevcut verileri kullanarak çağır
            if (this.callbacks.onLoginSuccess) {
                this.callbacks.onLoginSuccess(this.playerData);
            }
            
            return;
        }
        
        // Eğer login denemesi zaten sürüyorsa yenisini başlatma
        if (this.loginAttemptInProgress) {
            console.warn('Login attempt already in progress, please wait');
            return;
        }
        
        this.loginAttemptInProgress = true;
        
        // Offline mod kontrolü
        if (this.offlineMode) {
            console.log('Using offline mode for login');
            this.handleOfflineLogin(username);
            return;
        }
        
        // Socket bağlantısı kontrolü
        if (!this.socket || !this.isConnected) {
            console.warn('Not connected to server, using offline mode');
            this.setupOfflineMode();
            this.handleOfflineLogin(username);
            return;
        }
        
        // Online login
        console.log('Emitting player:login event with username:', username);
        this.socket.emit('player:login', { username });
        
        // Timeout ekle - sunucu belirli bir süre içinde yanıt vermezse offline moda geç
        this.loginTimeoutId = setTimeout(() => {
            if (this.loginAttemptInProgress) {
                console.warn('Login timeout, switching to offline mode');
                this.loginAttemptInProgress = false;
                this.setupOfflineMode();
                this.handleOfflineLogin(username);
            }
        }, 3000); // 3 saniye timeout
    }
    
    /**
     * Çevrimdışı login işlemini gerçekleştir
     * @param {string} username - Kullanıcı adı
     */
    handleOfflineLogin(username) {
        console.log('Handling offline login for username:', username);
        
        // Offline oyuncu verileri
        const offlinePlayerData = {
            id: 'local-player-' + Date.now(),
            username: username,
            isHost: true,
            room: {
                id: 'offline-room',
                name: 'Offline Game',
                gameMode: 'free-flight',
                players: [
                    {
                        id: 'local-player-' + Date.now(),
                        username: username,
                        team: 'blue'
                    }
                ]
            }
        };
        
        // Oyuncu verilerini kaydet
        this.playerData = offlinePlayerData;
        this.loginAttemptInProgress = false;
        
        // Login başarılı callback'ini çağır
        if (this.callbacks.onLoginSuccess) {
            // Hemen çağır - gecikme ekleme
            console.log('Calling offline login success callback');
            this.callbacks.onLoginSuccess(offlinePlayerData);
        } else {
            console.error('onLoginSuccess callback is not defined for offline login');
            
            // Fallback - doğrudan DOM manipülasyonu ile login ekranını gizle
            const loginScreen = document.getElementById('login-screen');
            if (loginScreen) {
                loginScreen.classList.add('hidden');
                console.log('Login screen hidden via direct DOM manipulation (fallback)');
            }
            
            // isGameActive true yap (global değişkeni)
            if (typeof window.isGameActive !== 'undefined') {
                window.isGameActive = true;
                console.log('Set global isGameActive to true (fallback)');
            }
        }
    }
    
    /**
     * Odaları getir
     */
    getRoomList() {
        if (this.offlineMode) {
            // Offline modda sahte oda listesi
            const offlineRooms = [
                {
                    id: 'offline-room',
                    name: 'Offline Game Room',
                    playerCount: 1,
                    maxPlayers: 10,
                    gameMode: 'free-flight',
                    hasPassword: false
                }
            ];
            
            if (this.callbacks.onRoomList) {
                setTimeout(() => {
                    this.callbacks.onRoomList(offlineRooms);
                }, 300);
            }
            
            return;
        }
        
        if (!this.isConnected) {
            console.error('Not connected to server, cannot get room list');
            return;
        }
        
        this.socket.emit('room:list');
    }
    
    /**
     * Oda oluştur
     * @param {Object} roomData - Oda verileri
     */
    createRoom(roomData) {
        if (this.offlineMode) {
            // Offline modda oda oluşturma
            const offlineRoom = {
                id: 'offline-room',
                name: roomData.name || 'Offline Game Room',
                gameMode: roomData.gameMode || 'free-flight',
                maxPlayers: roomData.maxPlayers || 10,
                hasPassword: false,
                players: [
                    {
                        id: this.playerData.id,
                        username: this.playerData.username,
                        isHost: true,
                        team: 'blue'
                    }
                ]
            };
            
            if (this.callbacks.onRoomJoin) {
                setTimeout(() => {
                    this.callbacks.onRoomJoin(offlineRoom);
                }, 300);
            }
            
            return;
        }
        
        if (!this.isConnected) {
            console.error('Not connected to server, cannot create room');
            return;
        }
        
        this.socket.emit('room:create', roomData);
    }
    
    /**
     * Odaya katıl
     * @param {string} roomId - Oda ID
     * @param {string} password - Oda şifresi (opsiyonel)
     */
    joinRoom(roomId, password) {
        if (this.offlineMode) {
            // Offline modda odaya katılma
            const offlineRoom = {
                id: roomId || 'offline-room',
                name: 'Offline Game Room',
                gameMode: 'free-flight',
                maxPlayers: 10,
                hasPassword: false,
                players: [
                    {
                        id: this.playerData.id,
                        username: this.playerData.username,
                        isHost: true,
                        team: 'blue'
                    }
                ]
            };
            
            if (this.callbacks.onRoomJoin) {
                setTimeout(() => {
                    this.callbacks.onRoomJoin(offlineRoom);
                }, 300);
            }
            
            return;
        }
        
        if (!this.isConnected) {
            console.error('Not connected to server, cannot join room');
            return;
        }
        
        this.socket.emit('room:join', { roomId, password });
    }
    
    /**
     * Odadan ayrıl
     */
    leaveRoom() {
        if (this.offlineMode) {
            // Offline modda odadan ayrılma
            if (this.callbacks.onRoomLeave) {
                setTimeout(() => {
                    this.callbacks.onRoomLeave({ success: true });
                }, 300);
            }
            
            return;
        }
        
        if (!this.isConnected) {
            console.error('Not connected to server, cannot leave room');
            return;
        }
        
        this.socket.emit('room:leave');
    }
    
    /**
     * Hazır durumunu ayarla
     * @param {boolean} isReady - Hazır mı
     */
    setReady(isReady) {
        if (this.offlineMode) {
            // Offline modda hazır durumu
            if (this.callbacks.onGameStart) {
                setTimeout(() => {
                    this.callbacks.onGameStart({
                        player: this.playerData,
                        room: {
                            id: 'offline-room',
                            name: 'Offline Game Room',
                            gameMode: 'free-flight',
                            players: [
                                {
                                    id: this.playerData.id,
                                    username: this.playerData.username,
                                    isHost: true,
                                    team: 'blue'
                                }
                            ]
                        }
                    });
                }, 1000);
            }
            
            return;
        }
        
        if (!this.isConnected) {
            console.error('Not connected to server, cannot set ready state');
            return;
        }
        
        this.socket.emit('player:ready', { isReady });
    }
    
    /**
     * Oyuncu güncellemesi gönder
     * @param {Object} data - Güncelleme verileri
     */
    sendPlayerUpdate(data) {
        if (this.offlineMode) {
            // Offline modda güncelleme gönderilmez
            return;
        }
        
        if (!this.isConnected) {
            return;
        }
        
        this.socket.emit('player:update', data);
    }
    
    /**
     * Sohbet mesajı gönder
     * @param {string} message - Mesaj
     * @param {string} type - Mesaj tipi
     * @param {string} targetId - Hedef oyuncu (private mesaj için)
     */
    sendChatMessage(message, type = 'all', targetId = null) {
        if (this.offlineMode) {
            // Offline modda sohbet
            if (this.callbacks.onChatMessage) {
                setTimeout(() => {
                    this.callbacks.onChatMessage({
                        message: message,
                        type: type,
                        sender: this.playerData.username,
                        senderId: this.playerData.id,
                        timestamp: Date.now()
                    });
                }, 100);
            }
            
            return;
        }
        
        if (!this.isConnected) {
            console.error('Not connected to server, cannot send chat message');
            return;
        }
        
        this.socket.emit('chat:message', { message, type, targetId });
    }
    
    /**
     * Vuruş gönder
     * @param {string} targetId - Hedef oyuncu
     * @param {number} damage - Hasar
     */
    sendHit(targetId, damage) {
        if (this.offlineMode) {
            // Offline modda vuruş
            return;
        }
        
        if (!this.isConnected) {
            return;
        }
        
        this.socket.emit('hit', { targetId, damage });
    }
    
    /**
     * Ölüm gönder
     * @param {string} killerId - Öldüren oyuncu
     */
    sendDeath(killerId) {
        if (this.offlineMode) {
            // Offline modda ölüm
            return;
        }
        
        if (!this.isConnected) {
            return;
        }
        
        this.socket.emit('death', { killerId });
    }
    
    /**
     * Geribildirim gönder
     * @param {Object} feedback - Geribildirim
     */
    sendFeedback(feedback) {
        if (this.offlineMode) {
            // Offline modda geribildirim
            alert('Feedback received (offline mode): ' + feedback.text);
            return;
        }
        
        if (!this.isConnected) {
            console.error('Not connected to server, cannot send feedback');
            alert('Cannot send feedback, not connected to server. Please try again later.');
            return;
        }
        
        this.socket.emit('feedback', feedback);
    }
    
    /**
     * Bağlantıyı kapat
     */
    disconnect() {
        if (this.socket && !this.offlineMode) {
            this.socket.disconnect();
        }
        
        this.isConnected = false;
        console.log('NetworkManager disconnected');
    }
    
    /**
     * Çevrimdışı modu etkinleştir/devre dışı bırak
     * @param {boolean} enabled - Etkinleştir/devre dışı bırak
     */
    setOfflineMode(enabled) {
        localStorage.setItem('offlineMode', enabled ? 'true' : 'false');
        if (enabled) {
            this.setupOfflineMode();
        } else {
            this.offlineMode = false;
            this.init(this.callbacks);
        }
    }
} 