/**
 * ChatEvents.js
 * Sohbet olaylarını işleyen sınıf
 */
const RoomController = require('../controllers/RoomController');
const AuthController = require('../controllers/AuthController');

class ChatEvents {
    constructor(socketManager) {
        this.socketManager = socketManager;
        this.roomController = new RoomController();
        this.authController = new AuthController();
    }
    
    /**
     * Socket olaylarını ayarla
     * @param {Object} socket - Socket.io soketi
     */
    setupEvents(socket) {
        // Sohbet odasına katılma
        socket.on('join_chat', (data) => {
            socket.join(data.roomId);
            console.log(`${socket.id} joined chat room ${data.roomId}`);
        });
        
        // Mesaj gönderme
        socket.on('send_message', async (data) => {
            try {
                await this.handleChatMessage(socket, data);
            } catch (error) {
                console.error('Error handling chat message:', error);
                socket.emit('error', { message: 'Message sending failed', error: error.message });
            }
        });
    }
    
    /**
     * Sohbet mesajını işle
     * @param {Object} socket - Socket.io soketi
     * @param {Object} data - Mesaj verileri
     */
    async handleChatMessage(socket, data) {
        const { roomId, message, type, targetId } = data;
        
        // Kullanıcı ID'sini al
        const userId = this.socketManager.users.get(socket.id);
        if (!userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
        }
        
        // Kullanıcı bilgilerini al
        const user = await this.authController.getUser(userId);
        if (!user) {
            socket.emit('error', { message: 'User not found' });
            return;
        }
        
        // Mesaj tipine göre işle
        switch (type) {
            case 'all':
                await this.handleAllChat(socket, user, message, roomId);
                break;
            case 'team':
                await this.handleTeamChat(socket, user, message, roomId);
                break;
            case 'player':
                await this.handlePrivateChat(socket, user, message, targetId);
                break;
            default:
                await this.handleAllChat(socket, user, message, roomId);
        }
    }
    
    /**
     * Genel sohbet mesajını işle
     * @param {Object} socket - Socket.io soketi
     * @param {Object} user - Kullanıcı
     * @param {string} message - Mesaj
     * @param {string} roomId - Oda ID'si
     */
    async handleAllChat(socket, user, message, roomId) {
        // Oda kontrolü
        const room = await this.roomController.getRoom(roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        // Mesajı odadaki herkese gönder
        this.socketManager.io.to(roomId).emit('chat:message', {
            sender: user.username,
            senderId: user._id.toString(),
            message,
            type: 'all',
            timestamp: Date.now()
        });
        
        // Mesajı loglama veya veritabanına kaydetme işlemleri burada yapılabilir
        console.log(`[CHAT:ALL] ${user.username}: ${message}`);
    }
    
    /**
     * Takım sohbet mesajını işle
     * @param {Object} socket - Socket.io soketi
     * @param {Object} user - Kullanıcı
     * @param {string} message - Mesaj
     * @param {string} roomId - Oda ID'si
     */
    async handleTeamChat(socket, user, message, roomId) {
        // Oda kontrolü
        const room = await this.roomController.getRoom(roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        // Kullanıcının takımını bul
        const player = room.players.find(p => p.id.toString() === user._id.toString());
        if (!player || !player.team || player.team === 'none') {
            socket.emit('error', { message: 'You are not in a team' });
            return;
        }
        
        // Takım üyelerini bul
        const teamPlayers = room.players.filter(p => p.team === player.team);
        
        // Takım üyelerinin socket ID'lerini bul
        const teamSockets = [];
        for (const teamPlayer of teamPlayers) {
            const teamSocket = this.findSocketByUserId(teamPlayer.id.toString());
            if (teamSocket) {
                teamSockets.push(teamSocket);
            }
        }
        
        // Mesajı takım üyelerine gönder
        for (const teamSocket of teamSockets) {
            teamSocket.emit('chat:message', {
                sender: user.username,
                senderId: user._id.toString(),
                message,
                type: 'team',
                team: player.team,
                timestamp: Date.now()
            });
        }
        
        // Mesajı loglama veya veritabanına kaydetme işlemleri burada yapılabilir
        console.log(`[CHAT:TEAM:${player.team}] ${user.username}: ${message}`);
    }
    
    /**
     * Özel sohbet mesajını işle
     * @param {Object} socket - Socket.io soketi
     * @param {Object} user - Kullanıcı
     * @param {string} message - Mesaj
     * @param {string} targetId - Hedef kullanıcı ID'si
     */
    async handlePrivateChat(socket, user, message, targetId) {
        // Hedef kullanıcı kontrolü
        const targetUser = await this.authController.getUser(targetId);
        if (!targetUser) {
            socket.emit('error', { message: 'Target user not found' });
            return;
        }
        
        // Hedef kullanıcının socket'ini bul
        const targetSocket = this.findSocketByUserId(targetId);
        if (!targetSocket) {
            socket.emit('error', { message: 'Target user is offline' });
            return;
        }
        
        // Mesajı gönderen ve alıcıya gönder
        const messageData = {
            sender: user.username,
            senderId: user._id.toString(),
            message,
            type: 'player',
            timestamp: Date.now()
        };
        
        // Gönderene mesajı gönder
        socket.emit('chat:message', {
            ...messageData,
            receiver: targetUser.username,
            receiverId: targetId
        });
        
        // Alıcıya mesajı gönder
        targetSocket.emit('chat:message', {
            ...messageData,
            receiver: targetUser.username,
            receiverId: targetId
        });
        
        // Mesajı loglama veya veritabanına kaydetme işlemleri burada yapılabilir
        console.log(`[CHAT:PRIVATE] ${user.username} -> ${targetUser.username}: ${message}`);
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

module.exports = ChatEvents; 