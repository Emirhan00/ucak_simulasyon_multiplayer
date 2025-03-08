/**
 * GameEvents.js
 * Oyun olaylarını işleyen sınıf
 */
const GameController = require('../controllers/GameController');
const RoomController = require('../controllers/RoomController');
const AuthController = require('../controllers/AuthController');

class GameEvents {
    constructor(socketManager) {
        this.socketManager = socketManager;
        this.gameController = new GameController();
        this.roomController = new RoomController();
        this.authController = new AuthController();
    }
    
    /**
     * Socket olaylarını ayarla
     * @param {Object} socket - Socket.io soketi
     */
    setupEvents(socket) {
        // Oyuncu giriş olayı - basitleştirilmiş versiyon
        socket.on('player:login', (data) => {
            try {
                console.log('Player login attempt:', data);
                
                // Basit test sunucusuyla aynı yanıt formatı
                socket.emit('login_success', {
                    id: 'user-' + socket.id,
                    username: data.username,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    isOnline: true,
                    room: {
                        id: 'default-room',
                        name: 'Default Game Room',
                        gameMode: 'free-flight',
                        players: [{
                            id: 'user-' + socket.id,
                            username: data.username,
                            position: { x: 0, y: 100, z: 0 },
                            rotation: { x: 0, y: 0, z: 0 },
                            team: 'blue'
                        }]
                    }
                });
                
                console.log('Player logged in:', data.username);
                
            } catch (error) {
                console.error('Error handling login:', error);
                socket.emit('login_error', { message: 'Login failed', error: error.message });
            }
        });
        
        // Vuruş kaydı
        socket.on('record_hit', async (data) => {
            try {
                await this.handleHit(socket, data);
            } catch (error) {
                console.error('Error handling hit:', error);
                socket.emit('error', { message: 'Hit recording failed', error: error.message });
            }
        });
        
        // Balon patlatma
        socket.on('pop_balloon', async (data) => {
            try {
                await this.handleBalloonPop(socket, data);
            } catch (error) {
                console.error('Error handling balloon pop:', error);
                socket.emit('error', { message: 'Balloon pop failed', error: error.message });
            }
        });
        
        // Bayrak yakalama
        socket.on('capture_flag', async (data) => {
            try {
                await this.handleFlagCapture(socket, data);
            } catch (error) {
                console.error('Error handling flag capture:', error);
                socket.emit('error', { message: 'Flag capture failed', error: error.message });
            }
        });
        
        // Bayrak taşıyıcısını koruma
        socket.on('defend_flag_carrier', async (data) => {
            try {
                await this.handleFlagDefend(socket, data);
            } catch (error) {
                console.error('Error handling flag defend:', error);
                socket.emit('error', { message: 'Flag defend failed', error: error.message });
            }
        });
    }
    
    /**
     * Vuruş olayını işle
     * @param {Object} socket - Socket.io soketi
     * @param {Object} data - Vuruş verileri
     */
    async handleHit(socket, data) {
        const { roomId, shooterId, targetId, damage } = data;
        
        // Oda ve oyuncuları kontrol et
        const room = await this.roomController.getRoom(roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        // Oyun durumunu kontrol et
        if (room.status !== 'playing') {
            socket.emit('error', { message: 'Game is not in progress' });
            return;
        }
        
        // Vuruşu kaydet
        const result = await this.gameController.recordHit(roomId, shooterId, targetId, damage);
        
        // Sonucu odadaki herkese bildir
        this.socketManager.io.to(roomId).emit('hit_recorded', {
            shooterId,
            targetId,
            damage,
            killed: result ? result.killed : false
        });
        
        // Eğer öldürme olduysa, öldüren oyuncuya puan ekle
        if (result && result.killed) {
            // Öldüren oyuncuya puan ekle
            await this.authController.updateUserStats(shooterId, { kills: 1, score: 100 });
            
            // Ölen oyuncuya ölüm ekle
            await this.authController.updateUserStats(targetId, { deaths: 1 });
            
            // Öldürme bilgisini odadaki herkese bildir
            this.socketManager.io.to(roomId).emit('player_killed', {
                shooterId,
                targetId,
                killerName: result.killerName,
                victimName: result.victimName
            });
            
            // Takım skorunu güncelle (eğer takım ölüm maçı ise)
            if (room.gameMode === 'team-deathmatch') {
                const shooter = room.players.find(p => p.id.toString() === shooterId);
                if (shooter && shooter.team) {
                    // Takım skorunu güncelle
                    if (shooter.team === 'red') {
                        room.teams.red.score += 1;
                    } else if (shooter.team === 'blue') {
                        room.teams.blue.score += 1;
                    }
                    
                    // Odayı güncelle
                    await this.roomController.updateRoom(roomId, room);
                    
                    // Takım skorunu odadaki herkese bildir
                    this.socketManager.io.to(roomId).emit('team_score_updated', {
                        red: room.teams.red.score,
                        blue: room.teams.blue.score
                    });
                }
            }
        }
    }
    
    /**
     * Balon patlatma olayını işle
     * @param {Object} socket - Socket.io soketi
     * @param {Object} data - Balon patlatma verileri
     */
    async handleBalloonPop(socket, data) {
        const { roomId, balloonId, userId } = data;
        
        // Oda ve oyuncuları kontrol et
        const room = await this.roomController.getRoom(roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        // Oyun durumunu kontrol et
        if (room.status !== 'playing') {
            socket.emit('error', { message: 'Game is not in progress' });
            return;
        }
        
        // Balon patlatmayı kaydet
        await this.gameController.popBalloon(roomId, balloonId, userId);
        
        // Oyuncuya puan ekle
        await this.authController.updateUserStats(userId, { balloons: 1, score: 50 });
        
        // Balon patlatma bilgisini odadaki herkese bildir
        this.socketManager.io.to(roomId).emit('balloon_popped', {
            balloonId,
            userId
        });
        
        // Takım skorunu güncelle (eğer balon avı ise)
        if (room.gameMode === 'balloon-hunt') {
            const player = room.players.find(p => p.id.toString() === userId);
            if (player && player.team) {
                // Takım balon sayısını güncelle
                if (player.team === 'red') {
                    room.teams.red.balloonCount += 1;
                    room.teams.red.score += 50;
                } else if (player.team === 'blue') {
                    room.teams.blue.balloonCount += 1;
                    room.teams.blue.score += 50;
                }
                
                // Odayı güncelle
                await this.roomController.updateRoom(roomId, room);
                
                // Takım skorunu odadaki herkese bildir
                this.socketManager.io.to(roomId).emit('team_balloon_updated', {
                    red: room.teams.red.balloonCount,
                    blue: room.teams.blue.balloonCount
                });
                
                this.socketManager.io.to(roomId).emit('team_score_updated', {
                    red: room.teams.red.score,
                    blue: room.teams.blue.score
                });
            }
        }
    }
    
    /**
     * Bayrak yakalama olayını işle
     * @param {Object} socket - Socket.io soketi
     * @param {Object} data - Bayrak yakalama verileri
     */
    async handleFlagCapture(socket, data) {
        const { roomId, flagId, userId } = data;
        
        // Oda ve oyuncuları kontrol et
        const room = await this.roomController.getRoom(roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        // Oyun durumunu kontrol et
        if (room.status !== 'playing') {
            socket.emit('error', { message: 'Game is not in progress' });
            return;
        }
        
        // Bayrak yakalamayı kaydet
        const result = await this.gameController.captureFlag(roomId, flagId, userId);
        
        // Bayrak yakalama bilgisini odadaki herkese bildir
        this.socketManager.io.to(roomId).emit('flag_captured', {
            flagId,
            userId,
            team: result ? result.team : null
        });
        
        // Eğer bayrak üsse götürüldüyse
        if (result && result.captured) {
            // Oyuncuya puan ekle
            await this.authController.updateUserStats(userId, { flags: 1, score: 200 });
            
            // Takım skorunu güncelle
            if (result.team === 'red') {
                room.teams.red.flagCaptures += 1;
                room.teams.red.score += 200;
            } else if (result.team === 'blue') {
                room.teams.blue.flagCaptures += 1;
                room.teams.blue.score += 200;
            }
            
            // Odayı güncelle
            await this.roomController.updateRoom(roomId, room);
            
            // Takım skorunu odadaki herkese bildir
            this.socketManager.io.to(roomId).emit('team_flag_updated', {
                red: room.teams.red.flagCaptures,
                blue: room.teams.blue.flagCaptures
            });
            
            this.socketManager.io.to(roomId).emit('team_score_updated', {
                red: room.teams.red.score,
                blue: room.teams.blue.score
            });
            
            // Bayrak taşıyıcısını sıfırla
            if (result.team === 'red') {
                room.teams.blue.flagCarrier = null;
            } else if (result.team === 'blue') {
                room.teams.red.flagCarrier = null;
            }
            
            // Odayı güncelle
            await this.roomController.updateRoom(roomId, room);
        }
    }
    
    /**
     * Bayrak taşıyıcısını koruma olayını işle
     * @param {Object} socket - Socket.io soketi
     * @param {Object} data - Bayrak taşıyıcısını koruma verileri
     */
    async handleFlagDefend(socket, data) {
        const { roomId, defenderId, carrierId, attackerId } = data;
        
        // Oda ve oyuncuları kontrol et
        const room = await this.roomController.getRoom(roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        // Oyun durumunu kontrol et
        if (room.status !== 'playing') {
            socket.emit('error', { message: 'Game is not in progress' });
            return;
        }
        
        // Bayrak taşıyıcısını koruma bilgisini odadaki herkese bildir
        this.socketManager.io.to(roomId).emit('flag_defended', {
            defenderId,
            carrierId,
            attackerId
        });
        
        // Oyuncuya puan ekle
        await this.authController.updateUserStats(defenderId, { score: 100 });
        
        // Takım skorunu güncelle
        const defender = room.players.find(p => p.id.toString() === defenderId);
        if (defender && defender.team) {
            if (defender.team === 'red') {
                room.teams.red.score += 100;
            } else if (defender.team === 'blue') {
                room.teams.blue.score += 100;
            }
            
            // Odayı güncelle
            await this.roomController.updateRoom(roomId, room);
            
            // Takım skorunu odadaki herkese bildir
            this.socketManager.io.to(roomId).emit('team_score_updated', {
                red: room.teams.red.score,
                blue: room.teams.blue.score
            });
        }
    }
    
    /**
     * Kullanıcı ID'sine göre socket bul
     * @param {string} userId - Kullanıcı ID'si
     * @returns {Object|null} - Socket.io soketi
     */
    findSocketByUserId(userId) {
        for (const [socketId, id] of this.socketManager.users.entries()) {
            if (id.toString() === userId.toString()) {
                return this.socketManager.io.sockets.sockets.get(socketId);
            }
        }
        return null;
    }
}

module.exports = GameEvents; 