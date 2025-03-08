/**
 * SocketManager.js
 * Socket.io bağlantılarını ve olaylarını yönetir
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const AuthController = require('../controllers/AuthController');
const RoomController = require('../controllers/RoomController');
const GameController = require('../controllers/GameController');
const GameEvents = require('./GameEvents');
const ChatEvents = require('./ChatEvents');

class SocketManager {
    constructor(io) {
        this.io = io;
        this.users = new Map(); // socketId -> userId
        this.rooms = new Map(); // roomId -> roomData
        this.games = new Map(); // roomId -> gameState
        
        // Kontrolcüler
        this.authController = new AuthController();
        this.roomController = new RoomController();
        this.gameController = new GameController();
        
        // Olay yöneticileri
        this.gameEvents = new GameEvents(this);
        this.chatEvents = new ChatEvents(this);
    }
    
    /**
     * Socket.io sunucusunu başlat
     */
    init() {
        this.io.on('connection', (socket) => {
            console.log(`New connection: ${socket.id}`);
            
            // Bağlantı olayları
            this.setupConnectionEvents(socket);
            
            // Oyuncu olayları
            this.setupPlayerEvents(socket);
            
            // Oda olayları
            this.setupRoomEvents(socket);
            
            // Oyun olayları
            this.gameEvents.setupEvents(socket);
            
            // Sohbet olayları
            this.chatEvents.setupEvents(socket);
            
            // Geri bildirim olayları
            this.setupFeedbackEvents(socket);
        });
    }
    
    /**
     * Bağlantı olaylarını ayarla
     * @param {Socket} socket - Socket.io soketi
     */
    setupConnectionEvents(socket) {
        // Bağlantı kesildiğinde
        socket.on('disconnect', () => {
            console.log(`Disconnected: ${socket.id}`);
            
            // Kullanıcıyı bul
            const userId = this.users.get(socket.id);
            
            if (userId) {
                // Kullanıcıyı odadan çıkar
                this.leaveAllRooms(socket, userId);
                
                // Kullanıcıyı çevrimdışı yap
                this.authController.setOffline(userId);
                
                // Kullanıcıyı listeden çıkar
                this.users.delete(socket.id);
            }
        });
    }
    
    /**
     * Oyuncu olaylarını ayarla
     * @param {Socket} socket - Socket.io soketi
     */
    setupPlayerEvents(socket) {
        // Giriş
        socket.on('player:login', async (data) => {
            try {
                // Kullanıcıyı doğrula veya oluştur
                const user = await this.authController.loginOrCreate(data.username);
                
                // Kullanıcıyı çevrimiçi yap
                await this.authController.setOnline(user._id, socket.id);
                
                // Kullanıcıyı listeye ekle
                this.users.set(socket.id, user._id);
                
                // Login başarılı yanıtı gönder
                socket.emit('login_success', {
                    id: user._id,
                    username: user.username,
                    stats: user.stats || {}
                });
                
                // Oda listesini gönder
                const rooms = await this.roomController.getRooms();
                socket.emit('room:list', rooms);
                
                console.log(`User logged in: ${user.username}`);
            } catch (error) {
                console.error('Login error:', error);
                socket.emit('login_error', { message: 'Login failed' });
            }
        });
        
        // Oyuncu güncelleme
        socket.on('player:update', (data) => {
            // Kullanıcıyı bul
            const userId = this.users.get(socket.id);
            
            if (!userId) return;
            
            // Oyuncunun odasını bul
            const room = this.findRoomByUserId(userId);
            
            if (!room || room.status !== 'playing') return;
            
            // Oyun durumunu güncelle
            this.gameController.updatePlayerPosition(room.id, userId, data);
            
            // Diğer oyunculara bildir
            socket.to(room.id).emit('player:update', {
                id: userId,
                position: data.position,
                rotation: data.rotation,
                speed: data.speed
            });
        });
        
        // Oyuncu hazır
        socket.on('player:ready', (data) => {
            // Kullanıcıyı bul
            const userId = this.users.get(socket.id);
            
            if (!userId) return;
            
            // Oyuncunun odasını bul
            const room = this.findRoomByUserId(userId);
            
            if (!room || room.status !== 'waiting') return;
            
            // Oyuncuyu hazır yap
            this.roomController.setPlayerReady(room.id, userId, data.isReady);
            
            // Odadaki herkese bildir
            this.io.to(room.id).emit('player:ready', {
                id: userId,
                isReady: data.isReady
            });
            
            // Tüm oyuncular hazırsa oyunu başlat
            if (this.roomController.areAllPlayersReady(room.id)) {
                this.startGame(room.id);
            }
        });
        
        // Oyuncu ölümü
        socket.on('player:death', (data) => {
            // Kullanıcıyı bul
            const userId = this.users.get(socket.id);
            
            if (!userId) return;
            
            // Oyuncunun odasını bul
            const room = this.findRoomByUserId(userId);
            
            if (!room || room.status !== 'playing') return;
            
            // Öldüren oyuncuya öldürme puanı ver
            if (data.killerId) {
                this.gameController.addKill(room.id, data.killerId, userId);
            }
            
            // Ölen oyuncuya ölüm ekle
            this.gameController.addDeath(room.id, userId);
            
            // Odadaki herkese bildir
            this.io.to(room.id).emit('player:death', {
                id: userId,
                killerId: data.killerId
            });
        });
    }
    
    /**
     * Oda olaylarını ayarla
     * @param {Socket} socket - Socket.io soketi
     */
    setupRoomEvents(socket) {
        // Oda listesi
        socket.on('room:list', async () => {
            try {
                // Oda listesini al
                const rooms = await this.roomController.getRooms();
                
                // Oda listesini gönder
                socket.emit('room:list', rooms);
            } catch (error) {
                console.error('Room list error:', error);
                socket.emit('error', { message: 'Failed to get room list' });
            }
        });
        
        // Oda oluştur
        socket.on('room:create', async (data) => {
            try {
                // Kullanıcıyı bul
                const userId = this.users.get(socket.id);
                
                if (!userId) {
                    socket.emit('error', { message: 'Not logged in' });
                    return;
                }
                
                // Oda oluştur
                const room = await this.roomController.createRoom({
                    name: data.name,
                    password: data.password,
                    hasPassword: !!data.password,
                    maxPlayers: data.maxPlayers || 10,
                    gameMode: data.gameMode || 'free-flight',
                    createdBy: userId
                });
                
                // Odaya katıl
                await this.joinRoom(socket, room.id, data.password);
                
                console.log(`Room created: ${room.name}`);
            } catch (error) {
                console.error('Room create error:', error);
                socket.emit('error', { message: 'Failed to create room' });
            }
        });
        
        // Odaya katıl
        socket.on('room:join', async (data) => {
            try {
                // Kullanıcıyı bul
                const userId = this.users.get(socket.id);
                
                if (!userId) {
                    socket.emit('error', { message: 'Not logged in' });
                    return;
                }
                
                // Odaya katıl
                await this.joinRoom(socket, data.roomId, data.password);
            } catch (error) {
                console.error('Room join error:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });
        
        // Odadan ayrıl
        socket.on('room:leave', async () => {
            try {
                // Kullanıcıyı bul
                const userId = this.users.get(socket.id);
                
                if (!userId) {
                    socket.emit('error', { message: 'Not logged in' });
                    return;
                }
                
                // Odadan ayrıl
                await this.leaveAllRooms(socket, userId);
            } catch (error) {
                console.error('Room leave error:', error);
                socket.emit('error', { message: 'Failed to leave room' });
            }
        });
    }
    
    /**
     * Geri bildirim olaylarını ayarla
     * @param {Socket} socket - Socket.io soketi
     */
    setupFeedbackEvents(socket) {
        // Geri bildirim
        socket.on('feedback', (data) => {
            // Kullanıcıyı bul
            const userId = this.users.get(socket.id);
            
            if (!userId) return;
            
            // Geri bildirimi kaydet
            console.log('Feedback received:', data);
            
            // TODO: Geri bildirimi veritabanına kaydet
        });
    }
    
    /**
     * Odaya katıl
     * @param {Socket} socket - Socket.io soketi
     * @param {string} roomId - Oda ID'si
     * @param {string} password - Oda şifresi (opsiyonel)
     */
    async joinRoom(socket, roomId, password) {
        try {
            // Kullanıcıyı bul
            const userId = this.users.get(socket.id);
            
            if (!userId) {
                socket.emit('error', { message: 'Not logged in' });
                return;
            }
            
            // Kullanıcı bilgilerini al
            const user = await this.authController.getUser(userId);
            
            // Odayı kontrol et
            const room = await this.roomController.getRoom(roomId);
            
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }
            
            // Şifreyi kontrol et
            if (room.hasPassword && room.password !== password) {
                socket.emit('error', { message: 'Incorrect password' });
                return;
            }
            
            // Oda dolu mu?
            if (room.players.length >= room.maxPlayers) {
                socket.emit('error', { message: 'Room is full' });
                return;
            }
            
            // Oyun başladı mı?
            if (room.status === 'playing') {
                socket.emit('error', { message: 'Game already started' });
                return;
            }
            
            // Önce tüm odalardan ayrıl
            await this.leaveAllRooms(socket, userId);
            
            // Odaya katıl
            socket.join(roomId);
            
            // Oyuncuyu odaya ekle
            const isHost = room.players.length === 0;
            await this.roomController.addPlayerToRoom(roomId, {
                id: userId,
                username: user.username,
                isHost: isHost,
                team: this.assignTeam(room)
            });
            
            // Güncel oda bilgilerini al
            const updatedRoom = await this.roomController.getRoom(roomId);
            
            // Odadaki herkese bildir
            this.io.to(roomId).emit('player:join', {
                id: userId,
                username: user.username,
                isHost: isHost,
                team: this.assignTeam(room),
                playerCount: updatedRoom.players.length,
                players: updatedRoom.players
            });
            
            // Odaya katıldığını bildir
            socket.emit('room:join', updatedRoom);
            
            console.log(`User ${user.username} joined room ${room.name}`);
        } catch (error) {
            console.error('Join room error:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    }
    
    /**
     * Tüm odalardan ayrıl
     * @param {Socket} socket - Socket.io soketi
     * @param {string} userId - Kullanıcı ID'si
     */
    async leaveAllRooms(socket, userId) {
        try {
            // Kullanıcının odasını bul
            const room = this.findRoomByUserId(userId);
            
            if (!room) return;
            
            // Kullanıcı bilgilerini al
            const user = await this.authController.getUser(userId);
            
            // Odadan ayrıl
            socket.leave(room.id);
            
            // Oyuncuyu odadan çıkar
            await this.roomController.removePlayerFromRoom(room.id, userId);
            
            // Güncel oda bilgilerini al
            const updatedRoom = await this.roomController.getRoom(room.id);
            
            // Odadaki herkese bildir
            this.io.to(room.id).emit('player:leave', {
                id: userId,
                username: user.username,
                playerCount: updatedRoom ? updatedRoom.players.length : 0,
                players: updatedRoom ? updatedRoom.players : []
            });
            
            // Odadan ayrıldığını bildir
            socket.emit('room:leave', { roomId: room.id });
            
            // Oda boş mu?
            if (updatedRoom && updatedRoom.players.length === 0) {
                // Odayı sil
                await this.roomController.deleteRoom(room.id);
            } else if (updatedRoom) {
                // Ev sahibi ayrıldı mı?
                const hostLeft = !updatedRoom.players.some(p => p.isHost);
                
                if (hostLeft && updatedRoom.players.length > 0) {
                    // Yeni ev sahibi ata
                    const newHost = updatedRoom.players[0];
                    await this.roomController.setPlayerAsHost(room.id, newHost.id);
                    
                    // Odadaki herkese bildir
                    this.io.to(room.id).emit('room:host', {
                        id: newHost.id,
                        username: newHost.username
                    });
                }
            }
            
            console.log(`User ${user.username} left room ${room.name}`);
        } catch (error) {
            console.error('Leave room error:', error);
            socket.emit('error', { message: 'Failed to leave room' });
        }
    }
    
    /**
     * Oyunu başlat
     * @param {string} roomId - Oda ID'si
     */
    async startGame(roomId) {
        try {
            // Odayı al
            const room = await this.roomController.getRoom(roomId);
            
            if (!room) {
                console.error('Room not found');
                return;
            }
            
            // Odanın durumunu güncelle
            await this.roomController.updateRoomStatus(roomId, 'playing');
            
            // Oyun durumunu oluştur
            const gameState = await this.gameController.createGameState(room);
            
            // Oyun durumunu kaydet
            this.games.set(roomId, gameState);
            
            // Odadaki herkese bildir
            this.io.to(roomId).emit('game:start', {
                room: room,
                gameState: gameState
            });
            
            console.log(`Game started in room ${room.name}`);
        } catch (error) {
            console.error('Start game error:', error);
            this.io.to(roomId).emit('error', { message: 'Failed to start game' });
        }
    }
    
    /**
     * Oyunu bitir
     * @param {string} roomId - Oda ID'si
     * @param {string} winner - Kazanan takım
     */
    async endGame(roomId, winner = null) {
        try {
            // Odayı al
            const room = await this.roomController.getRoom(roomId);
            
            if (!room) {
                console.error('Room not found');
                return;
            }
            
            // Odanın durumunu güncelle
            await this.roomController.updateRoomStatus(roomId, 'ended');
            
            // Oyun durumunu güncelle
            await this.gameController.endGameState(roomId, winner);
            
            // Oyun durumunu temizle
            this.games.delete(roomId);
            
            // Odadaki herkese bildir
            this.io.to(roomId).emit('game:end', {
                room: room,
                winner: winner
            });
            
            console.log(`Game ended in room ${room.name}`);
        } catch (error) {
            console.error('End game error:', error);
            this.io.to(roomId).emit('error', { message: 'Failed to end game' });
        }
    }
    
    /**
     * Kullanıcının odasını bul
     * @param {string} userId - Kullanıcı ID'si
     * @returns {Object} - Oda
     */
    async findRoomByUserId(userId) {
        try {
            // Tüm odaları al
            const rooms = await this.roomController.getRooms();
            
            // Kullanıcının olduğu odayı bul
            return rooms.find(room => room.players.some(player => player.id.toString() === userId.toString()));
        } catch (error) {
            console.error('Find room error:', error);
            return null;
        }
    }
    
    /**
     * Takım ata
     * @param {Object} room - Oda
     * @returns {string} - Takım
     */
    assignTeam(room) {
        // Serbest uçuş modunda takım yok
        if (room.gameMode === 'free-flight') {
            return 'none';
        }
        
        // Takım sayılarını hesapla
        const redCount = room.players.filter(p => p.team === 'red').length;
        const blueCount = room.players.filter(p => p.team === 'blue').length;
        
        // Dengeli takım ataması yap
        return redCount <= blueCount ? 'red' : 'blue';
    }
}

module.exports = SocketManager; 