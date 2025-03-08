/**
 * RoomController.js
 * Oda işlemlerini yönetir
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

class RoomController {
    /**
     * Oda oluştur
     * @param {Object} roomData - Oda verileri
     * @returns {Object} - Oda
     */
    async createRoom(roomData) {
        try {
            // MongoDB bağlantısı varsa
            if (db.mongoose && db.mongoose.connection.readyState === 1 && db.models && db.models.Room) {
                console.log('Using MongoDB to create room');
                return await db.models.Room.create({
                    name: roomData.name,
                    password: roomData.password,
                    hasPassword: !!roomData.password,
                    maxPlayers: roomData.maxPlayers || 10,
                    gameMode: roomData.gameMode || 'free-flight',
                    createdBy: roomData.createdBy,
                    status: 'waiting'
                });
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                console.log('Using SQLite to create room');
                return new Promise((resolve, reject) => {
                    const roomId = roomData.id || uuidv4();
                    const now = new Date().toISOString();
                    
                    db.sqliteDb.run(
                        'INSERT INTO rooms (id, name, password, max_players, game_mode, created_at, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            roomId,
                            roomData.name,
                            roomData.password || null,
                            roomData.maxPlayers || 10,
                            roomData.gameMode || 'free-flight',
                            now,
                            roomData.createdBy,
                            'waiting'
                        ],
                        function(err) {
                            if (err) {
                                console.error('SQLite insert error:', err);
                                reject(err);
                                return;
                            }
                            
                            resolve({
                                id: roomId,
                                name: roomData.name,
                                password: roomData.password,
                                hasPassword: !!roomData.password,
                                maxPlayers: roomData.maxPlayers || 10,
                                gameMode: roomData.gameMode || 'free-flight',
                                createdAt: now,
                                createdBy: roomData.createdBy,
                                status: 'waiting',
                                players: []
                            });
                        }
                    );
                });
            } else {
                // Veritabanı bağlantısı yoksa bellek içi oda oluştur
                console.log('No database connection, creating in-memory room');
                const roomId = roomData.id || uuidv4();
                return {
                    id: roomId,
                    name: roomData.name || 'Default Room',
                    password: roomData.password,
                    hasPassword: !!roomData.password,
                    maxPlayers: roomData.maxPlayers || 10,
                    gameMode: roomData.gameMode || 'free-flight',
                    createdAt: new Date().toISOString(),
                    createdBy: roomData.createdBy,
                    status: 'waiting',
                    players: []
                };
            }
        } catch (error) {
            console.error('Create room error:', error);
            throw error;
        }
    }
    
    /**
     * Oda bilgilerini al
     * @param {string} roomId - Oda ID'si
     * @returns {Object} - Oda
     */
    async getRoom(roomId) {
        try {
            console.log('Getting room with ID:', roomId);
            
            // MongoDB bağlantısı varsa
            if (db.mongoose && db.mongoose.connection.readyState === 1 && db.models && db.models.Room) {
                console.log('Using MongoDB to get room');
                return await db.models.Room.findById(roomId);
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                console.log('Using SQLite to get room');
                return new Promise((resolve, reject) => {
                    db.sqliteDb.get('SELECT * FROM rooms WHERE id = ?', [roomId], async (err, room) => {
                        if (err) {
                            console.error('SQLite query error:', err);
                            reject(err);
                            return;
                        }
                        
                        if (!room) {
                            resolve(null);
                            return;
                        }
                        
                        // Odadaki oyuncuları al
                        const players = await this.getRoomPlayers(roomId);
                        
                        resolve({
                            id: room.id,
                            name: room.name,
                            password: room.password,
                            hasPassword: !!room.password,
                            maxPlayers: room.max_players,
                            gameMode: room.game_mode,
                            createdAt: room.created_at,
                            createdBy: room.created_by,
                            status: room.status,
                            players: players || []
                        });
                    });
                });
            } else {
                // Veritabanı bağlantısı yoksa varsayılan odayı döndür
                console.log('No database connection, returning default room');
                return {
                    id: roomId,
                    name: 'Default Room',
                    password: null,
                    hasPassword: false,
                    maxPlayers: 10,
                    gameMode: 'free-flight',
                    createdAt: new Date().toISOString(),
                    createdBy: null,
                    status: 'waiting',
                    players: []
                };
            }
        } catch (error) {
            console.error('Get room error:', error);
            throw error;
        }
    }
    
    /**
     * Odadaki oyuncuları al
     * @param {string} roomId - Oda ID'si
     * @returns {Array} - Oyuncular
     */
    async getRoomPlayers(roomId) {
        try {
            console.log('Getting players for room:', roomId);
            
            // MongoDB bağlantısı varsa
            if (db.mongoose && db.mongoose.connection.readyState === 1 && db.models && db.models.Room) {
                console.log('Using MongoDB to get room players');
                const room = await db.models.Room.findById(roomId);
                return room ? room.players : [];
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                console.log('Using SQLite to get room players');
                return new Promise((resolve, reject) => {
                    db.sqliteDb.all(
                        `SELECT rp.*, u.username 
                        FROM room_players rp
                        JOIN users u ON rp.user_id = u.id
                        WHERE rp.room_id = ?`,
                        [roomId],
                        (err, rows) => {
                            if (err) {
                                console.error('SQLite query error:', err);
                                resolve([]);
                                return;
                            }
                            
                            const players = rows.map(row => ({
                                id: row.user_id,
                                username: row.username,
                                team: row.team,
                                isReady: row.is_ready === 1,
                                isHost: row.is_host === 1,
                                joinedAt: row.joined_at
                            }));
                            
                            resolve(players);
                        }
                    );
                });
            } else {
                // Veritabanı bağlantısı yoksa boş dizi döndür
                console.log('No database connection, returning empty player list');
                return [];
            }
        } catch (error) {
            console.error('Get room players error:', error);
            return [];
        }
    }
    
    /**
     * Tüm odaları al
        // SQLite bağlantısı yoksa boş dizi döndür
        if (!db.sqliteDb) return [];
        
        return new Promise((resolve, reject) => {
            db.sqliteDb.all(
                `SELECT u.id, u.username, rp.team, rp.is_ready, rp.is_host, rp.joined_at
                FROM room_players rp
                JOIN users u ON rp.user_id = u.id
                WHERE rp.room_id = ?`,
                [roomId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (!rows || rows.length === 0) {
                        resolve([]);
                        return;
                    }
                    
                    const players = rows.map(row => ({
                        id: row.id,
                        username: row.username,
                        team: row.team || 'none',
                        isReady: !!row.is_ready,
                        isHost: !!row.is_host,
                        joinedAt: row.joined_at
                    }));
                    
                    resolve(players);
                }
            );
        });
    }
    
    /**
     * Tüm odaları al
     * @returns {Array} - Odalar
     */
    async getRooms() {
        try {
            // MongoDB bağlantısı varsa
            if (db.mongoose.connection.readyState === 1) {
                return await db.models.Room.find({ isActive: true });
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                return new Promise((resolve, reject) => {
                    db.sqliteDb.all('SELECT * FROM rooms WHERE is_active = 1', async (err, rows) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        if (!rows || rows.length === 0) {
                            resolve([]);
                            return;
                        }
                        
                        try {
                            // Her oda için oyuncuları al
                            const rooms = [];
                            
                            for (const row of rows) {
                                const players = await this.getRoomPlayers(row.id);
                                
                                rooms.push({
                                    id: row.id,
                                    name: row.name,
                                    password: row.password,
                                    hasPassword: !!row.password,
                                    maxPlayers: row.max_players,
                                    gameMode: row.game_mode,
                                    status: row.status || 'waiting',
                                    players: players,
                                    teams: {
                                        red: { score: 0, balloonCount: 0, flagCaptures: 0 },
                                        blue: { score: 0, balloonCount: 0, flagCaptures: 0 }
                                    },
                                    createdBy: row.created_by,
                                    createdAt: row.created_at,
                                    startedAt: row.started_at,
                                    endedAt: row.ended_at,
                                    isActive: !!row.is_active
                                });
                            }
                            
                            resolve(rooms);
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
            } else {
                return [];
            }
        } catch (error) {
            console.error('Get rooms error:', error);
            return [];
        }
    }
    
    /**
     * Odayı sil
     * @param {string} roomId - Oda ID'si
     */
    async deleteRoom(roomId) {
        try {
            // MongoDB bağlantısı varsa
            if (db.mongoose.connection.readyState === 1) {
                await db.models.Room.findByIdAndUpdate(roomId, {
                    isActive: false
                });
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                db.sqliteDb.run(
                    'UPDATE rooms SET is_active = 0 WHERE id = ?',
                    [roomId]
                );
            }
        } catch (error) {
            console.error('Delete room error:', error);
        }
    }
    
    /**
     * Odaya oyuncu ekle
     * @param {string} roomId - Oda ID'si
     * @param {Object} playerData - Oyuncu verileri
     * @returns {Object} - Güncellenen oda
     */
    async addPlayerToRoom(roomId, playerData) {
        try {
            console.log('Adding player to room:', roomId, playerData);
            
            // MongoDB bağlantısı varsa
            if (db.mongoose && db.mongoose.connection.readyState === 1 && db.models && db.models.Room) {
                console.log('Using MongoDB to add player to room');
                const room = await db.models.Room.findById(roomId);
                
                if (!room) {
                    throw new Error('Room not found');
                }
                
                // Oyuncu zaten odada mı kontrol et
                const playerExists = room.players.some(player => player.id === playerData.id);
                
                if (!playerExists) {
                    room.players.push(playerData);
                    await room.save();
                }
                
                return room;
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                console.log('Using SQLite to add player to room');
                return new Promise((resolve, reject) => {
                    // Önce odayı kontrol et
                    db.sqliteDb.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
                        if (err) {
                            console.error('SQLite query error:', err);
                            reject(err);
                            return;
                        }
                        
                        if (!room) {
                            reject(new Error('Room not found'));
                            return;
                        }
                        
                        // Oyuncu zaten odada mı kontrol et
                        db.sqliteDb.get(
                            'SELECT * FROM room_players WHERE room_id = ? AND user_id = ?',
                            [roomId, playerData.id],
                            (err, player) => {
                                if (err) {
                                    console.error('SQLite query error:', err);
                                    reject(err);
                                    return;
                                }
                                
                                if (player) {
                                    // Oyuncu zaten odada, odayı döndür
                                    this.getRoom(roomId).then(resolve).catch(reject);
                                    return;
                                }
                                
                                // Oyuncuyu odaya ekle
                                db.sqliteDb.run(
                                    'INSERT INTO room_players (room_id, user_id, is_host, is_ready, team, joined_at) VALUES (?, ?, ?, ?, ?, ?)',
                                    [
                                        roomId,
                                        playerData.id,
                                        playerData.isHost ? 1 : 0,
                                        playerData.isReady ? 1 : 0,
                                        playerData.team || 'blue',
                                        new Date().toISOString()
                                    ],
                                    (err) => {
                                        if (err) {
                                            console.error('SQLite insert error:', err);
                                            reject(err);
                                            return;
                                        }
                                        
                                        // Güncellenmiş odayı döndür
                                        this.getRoom(roomId).then(resolve).catch(reject);
                                    }
                                );
                            }
                        );
                    });
                });
            } else {
                // Veritabanı bağlantısı yoksa bellek içi işlem yap
                console.log('No database connection, using in-memory room');
                
                // Varsayılan odayı al
                const room = await this.getRoom(roomId);
                
                if (!room) {
                    throw new Error('Room not found');
                }
                
                // Oyuncu zaten odada mı kontrol et
                const playerExists = room.players.some(player => player.id === playerData.id);
                
                if (!playerExists) {
                    room.players.push(playerData);
                }
                
                return room;
            }
        } catch (error) {
            console.error('Add player to room error:', error);
            throw error;
        }
    }
    
    /**
     * Odadan oyuncu çıkar
     * @param {string} roomId - Oda ID'si
     * @param {string} userId - Kullanıcı ID'si
     */
    async removePlayerFromRoom(roomId, userId) {
        try {
            // MongoDB bağlantısı varsa
            if (db.mongoose.connection.readyState === 1) {
                await db.models.Room.findByIdAndUpdate(roomId, {
                    $pull: {
                        players: {
                            id: userId
                        }
                    }
                });
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                db.sqliteDb.run(
                    'DELETE FROM room_players WHERE room_id = ? AND user_id = ?',
                    [roomId, userId]
                );
            }
        } catch (error) {
            console.error('Remove player from room error:', error);
        }
    }
    
    /**
     * Oyuncuyu hazır yap
     * @param {string} roomId - Oda ID'si
     * @param {string} userId - Kullanıcı ID'si
     * @param {boolean} isReady - Hazır durumu
     */
    async setPlayerReady(roomId, userId, isReady) {
        try {
            // MongoDB bağlantısı varsa
            if (db.mongoose.connection.readyState === 1) {
                await db.models.Room.updateOne(
                    { _id: roomId, 'players.id': userId },
                    { $set: { 'players.$.isReady': isReady } }
                );
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                db.sqliteDb.run(
                    'UPDATE room_players SET is_ready = ? WHERE room_id = ? AND user_id = ?',
                    [isReady ? 1 : 0, roomId, userId]
                );
            }
        } catch (error) {
            console.error('Set player ready error:', error);
        }
    }
    
    /**
     * Oyuncuyu ev sahibi yap
     * @param {string} roomId - Oda ID'si
     * @param {string} userId - Kullanıcı ID'si
     */
    async setPlayerAsHost(roomId, userId) {
        try {
            // MongoDB bağlantısı varsa
            if (db.mongoose.connection.readyState === 1) {
                // Önce tüm oyuncuların ev sahipliğini kaldır
                await db.models.Room.updateMany(
                    { _id: roomId },
                    { $set: { 'players.$[].isHost': false } }
                );
                
                // Sonra belirtilen oyuncuyu ev sahibi yap
                await db.models.Room.updateOne(
                    { _id: roomId, 'players.id': userId },
                    { $set: { 'players.$.isHost': true } }
                );
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                // Önce tüm oyuncuların ev sahipliğini kaldır
                db.sqliteDb.run(
                    'UPDATE room_players SET is_host = 0 WHERE room_id = ?',
                    [roomId]
                );
                
                // Sonra belirtilen oyuncuyu ev sahibi yap
                db.sqliteDb.run(
                    'UPDATE room_players SET is_host = 1 WHERE room_id = ? AND user_id = ?',
                    [roomId, userId]
                );
            }
        } catch (error) {
            console.error('Set player as host error:', error);
        }
    }
    
    /**
     * Oda durumunu güncelle
     * @param {string} roomId - Oda ID'si
     * @param {string} status - Durum
     */
    async updateRoomStatus(roomId, status) {
        try {
            // MongoDB bağlantısı varsa
            if (db.mongoose.connection.readyState === 1) {
                const updates = { status };
                
                if (status === 'playing') {
                    updates.startedAt = new Date();
                } else if (status === 'ended') {
                    updates.endedAt = new Date();
                }
                
                await db.models.Room.findByIdAndUpdate(roomId, updates);
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                const updates = ['status = ?'];
                const values = [status];
                
                if (status === 'playing') {
                    updates.push('started_at = ?');
                    values.push(new Date().toISOString());
                } else if (status === 'ended') {
                    updates.push('ended_at = ?');
                    values.push(new Date().toISOString());
                }
                
                values.push(roomId);
                
                db.sqliteDb.run(
                    `UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`,
                    values
                );
            }
        } catch (error) {
            console.error('Update room status error:', error);
        }
    }
    
    /**
     * Odadaki tüm oyuncular hazır mı?
     * @param {string} roomId - Oda ID'si
     * @returns {boolean} - Tüm oyuncular hazır mı?
     */
    async areAllPlayersReady(roomId) {
        try {
            console.log('Checking if all players are ready in room:', roomId);
            
            // Odadaki oyuncuları al
            const players = await this.getRoomPlayers(roomId);
            
            // Oyuncu yoksa false döndür
            if (!players || players.length === 0) {
                return false;
            }
            
            // Tüm oyuncular hazır mı kontrol et
            return players.every(player => player.isReady);
        } catch (error) {
            console.error('Check all players ready error:', error);
            return false;
        }
    }
}

module.exports = RoomController; 