/**
 * GameEvents.js
 * Oyun olaylarını yönetir
 */

class GameEvents {
    constructor(socketManager) {
        this.socketManager = socketManager;
        this.io = socketManager.io;
        this.gameController = socketManager.gameController;
    }
    
    /**
     * Oyun olaylarını ayarla
     * @param {Socket} socket - Socket.io soketi
     */
    setupEvents(socket) {
        // Vuruş olayı
        socket.on('hit', (data) => {
            this.handleHit(socket, data);
        });
        
        // Balon patlatma olayı
        socket.on('balloon:pop', (data) => {
            this.handleBalloonPop(socket, data);
        });
        
        // Bayrak yakalama olayı
        socket.on('flag:capture', (data) => {
            this.handleFlagCapture(socket, data);
        });
        
        // Bayrak taşıyıcısını koruma olayı
        socket.on('flag:defend', (data) => {
            this.handleFlagDefend(socket, data);
        });
    }
    
    /**
     * Vuruş olayını işle
     * @param {Socket} socket - Socket.io soketi
     * @param {Object} data - Vuruş verileri
     */
    async handleHit(socket, data) {
        try {
            // Kullanıcıyı bul
            const userId = this.socketManager.users.get(socket.id);
            
            if (!userId) return;
            
            // Oyuncunun odasını bul
            const room = await this.socketManager.findRoomByUserId(userId);
            
            if (!room || room.status !== 'playing') return;
            
            // Hedef oyuncuyu bul
            const targetId = data.targetId;
            const targetSocket = this.findSocketByUserId(targetId);
            
            if (!targetSocket) return;
            
            // Vuruş bilgilerini al
            const shooter = await this.socketManager.authController.getUser(userId);
            const target = await this.socketManager.authController.getUser(targetId);
            
            // Vuruş hasarını hesapla
            const damage = data.damage || 10;
            
            // Vuruşu kaydet
            await this.gameController.recordHit(room.id, userId, targetId, damage);
            
            // Vuruş bilgisini gönder
            this.io.to(room.id).emit('hit', {
                shooterId: userId,
                shooterName: shooter.username,
                targetId: targetId,
                targetName: target.username,
                damage: damage,
                killed: false // Öldürme bilgisi oyuncu tarafından gönderilecek
            });
        } catch (error) {
            console.error('Hit error:', error);
        }
    }
    
    /**
     * Balon patlatma olayını işle
     * @param {Socket} socket - Socket.io soketi
     * @param {Object} data - Balon verileri
     */
    async handleBalloonPop(socket, data) {
        try {
            // Kullanıcıyı bul
            const userId = this.socketManager.users.get(socket.id);
            
            if (!userId) return;
            
            // Oyuncunun odasını bul
            const room = await this.socketManager.findRoomByUserId(userId);
            
            if (!room || room.status !== 'playing') return;
            
            // Oyuncu bilgilerini al
            const user = await this.socketManager.authController.getUser(userId);
            
            // Balon ID'sini al
            const balloonId = data.balloonId;
            
            // Balonu patlat
            await this.gameController.popBalloon(room.id, balloonId, userId);
            
            // Oyuncunun takımını bul
            const player = room.players.find(p => p.id.toString() === userId.toString());
            const team = player ? player.team : 'none';
            
            // Takım puanını güncelle
            if (team === 'red' || team === 'blue') {
                await this.gameController.updateTeamBalloonCount(room.id, team, 1);
            }
            
            // Balon patlatma bilgisini gönder
            this.io.to(room.id).emit('balloon:pop', {
                balloonId: balloonId,
                playerId: userId,
                playerName: user.username,
                team: team
            });
        } catch (error) {
            console.error('Balloon pop error:', error);
        }
    }
    
    /**
     * Bayrak yakalama olayını işle
     * @param {Socket} socket - Socket.io soketi
     * @param {Object} data - Bayrak verileri
     */
    async handleFlagCapture(socket, data) {
        try {
            // Kullanıcıyı bul
            const userId = this.socketManager.users.get(socket.id);
            
            if (!userId) return;
            
            // Oyuncunun odasını bul
            const room = await this.socketManager.findRoomByUserId(userId);
            
            if (!room || room.status !== 'playing' || room.gameMode !== 'capture-flag') return;
            
            // Oyuncu bilgilerini al
            const user = await this.socketManager.authController.getUser(userId);
            
            // Bayrak ID'sini al
            const flagId = data.flagId;
            
            // Oyuncunun takımını bul
            const player = room.players.find(p => p.id.toString() === userId.toString());
            const team = player ? player.team : 'none';
            
            // Karşı takımın bayrağını mı yakaladı?
            const flag = await this.gameController.getFlag(room.id, flagId);
            
            if (!flag || flag.team === team) return;
            
            // Bayrağı yakala
            await this.gameController.captureFlag(room.id, flagId, userId);
            
            // Takım puanını güncelle
            await this.gameController.updateTeamFlagCaptures(room.id, team, 1);
            
            // Bayrak yakalama bilgisini gönder
            this.io.to(room.id).emit('flag:capture', {
                flagId: flagId,
                playerId: userId,
                playerName: user.username,
                team: team
            });
            
            // Oyun bitti mi kontrol et
            const gameState = await this.gameController.getGameState(room.id);
            
            if (gameState) {
                const redCaptures = gameState.teams.red.flagCaptures;
                const blueCaptures = gameState.teams.blue.flagCaptures;
                
                // 3 bayrak yakalayan takım kazanır
                if (redCaptures >= 3) {
                    await this.socketManager.endGame(room.id, 'red');
                } else if (blueCaptures >= 3) {
                    await this.socketManager.endGame(room.id, 'blue');
                }
            }
        } catch (error) {
            console.error('Flag capture error:', error);
        }
    }
    
    /**
     * Bayrak taşıyıcısını koruma olayını işle
     * @param {Socket} socket - Socket.io soketi
     * @param {Object} data - Koruma verileri
     */
    async handleFlagDefend(socket, data) {
        try {
            // Kullanıcıyı bul
            const userId = this.socketManager.users.get(socket.id);
            
            if (!userId) return;
            
            // Oyuncunun odasını bul
            const room = await this.socketManager.findRoomByUserId(userId);
            
            if (!room || room.status !== 'playing' || room.gameMode !== 'capture-flag') return;
            
            // Oyuncu bilgilerini al
            const user = await this.socketManager.authController.getUser(userId);
            
            // Korunan oyuncu ID'sini al
            const defendedId = data.defendedId;
            
            // Korunan oyuncu bilgilerini al
            const defendedUser = await this.socketManager.authController.getUser(defendedId);
            
            // Koruma bilgisini gönder
            this.io.to(room.id).emit('flag:defend', {
                defenderId: userId,
                defenderName: user.username,
                defendedId: defendedId,
                defendedName: defendedUser.username
            });
        } catch (error) {
            console.error('Flag defend error:', error);
        }
    }
    
    /**
     * Kullanıcı ID'sine göre socket bul
     * @param {string} userId - Kullanıcı ID'si
     * @returns {Socket} - Socket.io soketi
     */
    findSocketByUserId(userId) {
        for (const [socketId, id] of this.socketManager.users.entries()) {
            if (id.toString() === userId.toString()) {
                return this.io.sockets.sockets.get(socketId);
            }
        }
        return null;
    }
}

module.exports = GameEvents; 