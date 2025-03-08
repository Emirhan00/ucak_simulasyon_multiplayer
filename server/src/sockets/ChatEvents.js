/**
 * ChatEvents.js
 * Sohbet olaylarını yönetir
 */

class ChatEvents {
    constructor(socketManager) {
        this.socketManager = socketManager;
        this.io = socketManager.io;
    }
    
    /**
     * Sohbet olaylarını ayarla
     * @param {Socket} socket - Socket.io soketi
     */
    setupEvents(socket) {
        // Sohbet mesajı
        socket.on('chat:message', (data) => {
            this.handleChatMessage(socket, data);
        });
    }
    
    /**
     * Sohbet mesajını işle
     * @param {Socket} socket - Socket.io soketi
     * @param {Object} data - Mesaj verileri
     */
    async handleChatMessage(socket, data) {
        try {
            // Kullanıcıyı bul
            const userId = this.socketManager.users.get(socket.id);
            
            if (!userId) return;
            
            // Kullanıcı bilgilerini al
            const user = await this.socketManager.authController.getUser(userId);
            
            // Mesaj tipini kontrol et
            const type = data.type || 'all';
            
            // Mesaj içeriğini kontrol et
            const message = data.message.trim();
            
            if (!message) return;
            
            // Mesaj uzunluğunu kontrol et
            if (message.length > 200) {
                socket.emit('error', { message: 'Message too long' });
                return;
            }
            
            // Mesajı işle
            switch (type) {
                case 'all':
                    // Genel sohbet
                    this.handleAllChat(socket, user, message);
                    break;
                    
                case 'team':
                    // Takım sohbeti
                    this.handleTeamChat(socket, user, message);
                    break;
                    
                case 'private':
                    // Özel mesaj
                    this.handlePrivateChat(socket, user, message, data.targetId);
                    break;
                    
                default:
                    // Geçersiz tip
                    socket.emit('error', { message: 'Invalid chat type' });
                    break;
            }
        } catch (error) {
            console.error('Chat message error:', error);
        }
    }
    
    /**
     * Genel sohbet mesajını işle
     * @param {Socket} socket - Socket.io soketi
     * @param {Object} user - Kullanıcı
     * @param {string} message - Mesaj
     */
    async handleAllChat(socket, user, message) {
        try {
            // Oyuncunun odasını bul
            const room = await this.socketManager.findRoomByUserId(user._id);
            
            if (!room) return;
            
            // Mesajı odadaki herkese gönder
            this.io.to(room.id).emit('chat:message', {
                sender: user.username,
                message: message,
                type: 'all',
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('All chat error:', error);
        }
    }
    
    /**
     * Takım sohbet mesajını işle
     * @param {Socket} socket - Socket.io soketi
     * @param {Object} user - Kullanıcı
     * @param {string} message - Mesaj
     */
    async handleTeamChat(socket, user, message) {
        try {
            // Oyuncunun odasını bul
            const room = await this.socketManager.findRoomByUserId(user._id);
            
            if (!room) return;
            
            // Oyuncunun takımını bul
            const player = room.players.find(p => p.id.toString() === user._id.toString());
            
            if (!player || player.team === 'none') {
                // Takımı yoksa genel sohbete gönder
                this.handleAllChat(socket, user, message);
                return;
            }
            
            // Takım üyelerini bul
            const teamPlayers = room.players.filter(p => p.team === player.team);
            
            // Takım üyelerinin soketlerini bul
            const teamSockets = [];
            
            for (const teamPlayer of teamPlayers) {
                const teamSocket = this.findSocketByUserId(teamPlayer.id);
                
                if (teamSocket) {
                    teamSockets.push(teamSocket);
                }
            }
            
            // Mesajı takım üyelerine gönder
            for (const teamSocket of teamSockets) {
                teamSocket.emit('chat:message', {
                    sender: user.username,
                    message: message,
                    type: 'team',
                    team: player.team,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Team chat error:', error);
        }
    }
    
    /**
     * Özel sohbet mesajını işle
     * @param {Socket} socket - Socket.io soketi
     * @param {Object} user - Kullanıcı
     * @param {string} message - Mesaj
     * @param {string} targetId - Hedef kullanıcı ID'si
     */
    async handlePrivateChat(socket, user, message, targetId) {
        try {
            // Hedef kullanıcıyı bul
            const targetUser = await this.socketManager.authController.getUser(targetId);
            
            if (!targetUser) {
                socket.emit('error', { message: 'User not found' });
                return;
            }
            
            // Hedef kullanıcının soketini bul
            const targetSocket = this.findSocketByUserId(targetId);
            
            if (!targetSocket) {
                socket.emit('error', { message: 'User not online' });
                return;
            }
            
            // Mesajı gönderen ve alıcıya gönder
            const chatMessage = {
                sender: user.username,
                message: message,
                type: 'private',
                timestamp: Date.now()
            };
            
            socket.emit('chat:message', chatMessage);
            targetSocket.emit('chat:message', chatMessage);
        } catch (error) {
            console.error('Private chat error:', error);
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

module.exports = ChatEvents; 