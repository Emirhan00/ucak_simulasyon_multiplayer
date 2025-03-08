/**
 * NetworkManager.js
 * Socket.io kullanarak sunucu ile iletişimi yöneten sınıf
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
    }
    
    /**
     * NetworkManager'ı başlat
     * @param {Object} callbacks - Event callback'leri
     */
    init(callbacks) {
        try {
            console.log('Initializing NetworkManager');
            
            // Socket.io yüklü mü kontrol et
            if (typeof io === 'undefined') {
                console.error('Socket.io is not defined. Make sure Socket.io is loaded.');
                throw new Error('Socket.io is not defined');
            }
            
            this.callbacks = callbacks || {};
            
            console.log('Connecting to server:', GameConstants.NETWORK.SERVER_URL);
            
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
            // Offline mod için boş bir socket nesnesi oluştur
            this.socket = {
                on: () => {},
                emit: () => {},
                connected: false
            };
            console.warn('Continuing in offline mode');
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
        });
        
        this.socket.on('connect_timeout', () => {
            console.error('Connection timeout');
            this.isConnected = false;
        });
        
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
        
        this.socket.on('reconnect', (attemptNumber) => {
            console.log('Reconnected to server after', attemptNumber, 'attempts');
            this.isConnected = true;
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
        });
        
        // Login olayı
        this.socket.on('login_success', (data) => {
            console.log('Login successful from server:', data);
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
            
            if (this.callbacks.onLoginError) {
                this.callbacks.onLoginError(data);
            }
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
        console.log('NetworkManager.login called with username:', username);
        
        // Eğer zaten giriş yapmışsa, tekrar giriş yapma
        if (this.playerData) {
            console.log('Already logged in as:', this.playerData.username);
            
            // Eğer callback varsa, mevcut verileri kullanarak çağır
            if (this.callbacks.onLoginSuccess) {
                this.callbacks.onLoginSuccess(this.playerData);
            }
            
            return;
        }
        
        if (!this.socket) {
            console.error('Socket is not initialized');
            this.init(this.callbacks);
        }
        
        if (!this.isConnected) {
            console.error('Not connected to server, attempting to connect...');
            
            // Bağlantı yoksa, bağlantı kurulduğunda login işlemini gerçekleştir
            this.socket.once('connect', () => {
                console.log('Connected to server, now logging in');
                this.socket.emit('player:login', { username });
            });
            
            // Bağlantıyı yeniden kur
            this.socket.connect();
            return;
        }
        
        console.log('Emitting player:login event with username:', username);
        this.socket.emit('player:login', { username });
    }
    
    /**
     * Oda listesini al
     */
    getRoomList() {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return;
        }
        
        this.socket.emit('room:list');
    }
    
    /**
     * Yeni oda oluştur
     * @param {Object} roomData - Oda verileri
     */
    createRoom(roomData) {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return;
        }
        
        this.socket.emit('room:create', roomData);
    }
    
    /**
     * Odaya katıl
     * @param {string} roomId - Oda ID'si
     * @param {string} password - Oda şifresi (opsiyonel)
     */
    joinRoom(roomId, password) {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return;
        }
        
        this.socket.emit('room:join', { roomId, password });
    }
    
    /**
     * Odadan ayrıl
     */
    leaveRoom() {
        if (!this.isConnected || !this.roomData) {
            console.error('Not connected to server or not in a room');
            return;
        }
        
        this.socket.emit('room:leave');
    }
    
    /**
     * Hazır durumunu değiştir
     * @param {boolean} isReady - Hazır durumu
     */
    setReady(isReady) {
        if (!this.isConnected || !this.roomData) {
            console.error('Not connected to server or not in a room');
            return;
        }
        
        this.socket.emit('player:ready', { isReady });
    }
    
    /**
     * Oyuncu pozisyonunu güncelle
     * @param {Object} data - Güncelleme verileri
     */
    sendPlayerUpdate(data) {
        if (!this.isConnected || !this.roomData) {
            return;
        }
        
        const now = Date.now();
        
        // Belirli aralıklarla güncelleme gönder
        if (now - this.lastUpdateTime >= GameConstants.NETWORK.UPDATE_RATE) {
            this.socket.emit('player:update', data);
            this.lastUpdateTime = now;
        }
    }
    
    /**
     * Sohbet mesajı gönder
     * @param {string} message - Mesaj
     * @param {string} type - Mesaj tipi (all, team, private)
     * @param {string} targetId - Hedef oyuncu ID'si (private mesaj için)
     */
    sendChatMessage(message, type = 'all', targetId = null) {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return;
        }
        
        this.socket.emit('chat:message', { message, type, targetId });
    }
    
    /**
     * Vuruş bildir
     * @param {string} targetId - Hedef oyuncu ID'si
     * @param {number} damage - Hasar miktarı
     */
    sendHit(targetId, damage) {
        if (!this.isConnected || !this.roomData) {
            console.error('Not connected to server or not in a room');
            return;
        }
        
        this.socket.emit('hit', { targetId, damage });
    }
    
    /**
     * Ölüm bildir
     * @param {string} killerId - Öldüren oyuncu ID'si
     */
    sendDeath(killerId) {
        if (!this.isConnected || !this.roomData) {
            console.error('Not connected to server or not in a room');
            return;
        }
        
        this.socket.emit('player:death', { killerId });
    }
    
    /**
     * Geri bildirim gönder
     * @param {Object} feedback - Geri bildirim verileri
     */
    sendFeedback(feedback) {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return;
        }
        
        this.socket.emit('feedback', feedback);
    }
    
    /**
     * Bağlantıyı kapat
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
} 