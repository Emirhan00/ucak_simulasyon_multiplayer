/**
 * AuthController.js
 * Kimlik doğrulama işlemlerini yönetir
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

class AuthController {
    /**
     * Kullanıcıyı doğrula veya oluştur
     * @param {string} username - Kullanıcı adı
     * @returns {Object} - Kullanıcı
     */
    async loginOrCreate(username) {
        try {
            // Kullanıcı adını temizle
            username = username.trim();
            
            // Kullanıcı adı geçerli mi?
            if (!username) {
                throw new Error('Username cannot be empty');
            }
            
            // Kullanıcı adı uzunluğunu kontrol et (en az 2 karakter)
            if (username.length < 2) {
                throw new Error('Username must be at least 2 characters long');
            }
            
            // Kullanıcı adı uzunluğunu kontrol et (en fazla 20 karakter)
            if (username.length > 20) {
                throw new Error('Username cannot be longer than 20 characters');
            }
            
            let user = null;
            
            // MongoDB bağlantısı varsa
            if (db.mongoose && db.mongoose.connection.readyState === 1 && db.models && db.models.User) {
                console.log('Using MongoDB for authentication');
                try {
                    // Kullanıcıyı bul
                    user = await db.models.User.findOne({ username });
                    
                    // Kullanıcı yoksa oluştur
                    if (!user) {
                        user = await db.models.User.create({
                            username,
                            lastLogin: new Date()
                        });
                    } else {
                        // Son giriş zamanını güncelle
                        user.lastLogin = new Date();
                        await user.save();
                    }
                    
                    return user;
                } catch (error) {
                    console.error('MongoDB authentication error:', error);
                    // MongoDB hatası durumunda SQLite veya bellek kullanıcısına geç
                }
            } 
            
            // SQLite bağlantısı varsa
            if (db.sqliteDb) {
                console.log('Using SQLite for authentication');
                try {
                    return new Promise((resolve, reject) => {
                        // Kullanıcıyı bul
                        db.sqliteDb.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                            if (err) {
                                console.error('SQLite query error:', err);
                                // SQLite hatası durumunda bellek kullanıcısına geç
                                const memoryUser = {
                                    id: uuidv4(),
                                    username: username,
                                    createdAt: new Date().toISOString(),
                                    lastLogin: new Date().toISOString(),
                                    isOnline: true
                                };
                                console.log('Falling back to in-memory user:', memoryUser);
                                resolve(memoryUser);
                                return;
                            }
                            
                            // Kullanıcı yoksa oluştur
                            if (!row) {
                                const userId = uuidv4();
                                const now = new Date().toISOString();
                                
                                db.sqliteDb.run(
                                    'INSERT INTO users (id, username, created_at, last_login, is_online) VALUES (?, ?, ?, ?, ?)',
                                    [userId, username, now, now, 1],
                                    function(err) {
                                        if (err) {
                                            console.error('SQLite insert error:', err);
                                            // SQLite hatası durumunda bellek kullanıcısına geç
                                            const memoryUser = {
                                                id: userId,
                                                username: username,
                                                createdAt: now,
                                                lastLogin: now,
                                                isOnline: true
                                            };
                                            console.log('Falling back to in-memory user:', memoryUser);
                                            resolve(memoryUser);
                                            return;
                                        }
                                        
                                        resolve({
                                            id: userId,
                                            username: username,
                                            createdAt: now,
                                            lastLogin: now,
                                            isOnline: true
                                        });
                                    }
                                );
                            } else {
                                // Son giriş zamanını güncelle
                                const now = new Date().toISOString();
                                
                                db.sqliteDb.run(
                                    'UPDATE users SET last_login = ?, is_online = 1 WHERE id = ?',
                                    [now, row.id],
                                    function(err) {
                                        if (err) {
                                            console.error('SQLite update error:', err);
                                            // SQLite hatası durumunda bellek kullanıcısına geç
                                            const memoryUser = {
                                                id: row.id,
                                                username: row.username,
                                                createdAt: row.created_at,
                                                lastLogin: now,
                                                isOnline: true
                                            };
                                            console.log('Falling back to in-memory user:', memoryUser);
                                            resolve(memoryUser);
                                            return;
                                        }
                                        
                                        resolve({
                                            id: row.id,
                                            username: row.username,
                                            createdAt: row.created_at,
                                            lastLogin: now,
                                            isOnline: true
                                        });
                                    }
                                );
                            }
                        });
                    });
                } catch (error) {
                    console.error('SQLite authentication error:', error);
                    // SQLite hatası durumunda bellek kullanıcısına geç
                }
            }
            
            // Hem MongoDB hem de SQLite bağlantısı yoksa veya hata durumunda
            console.log('No database connection available or error occurred, using in-memory user');
            // Basit bir kullanıcı nesnesi döndür
            return {
                id: uuidv4(),
                username: username,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                isOnline: true
            };
        } catch (error) {
            console.error('Login or create error:', error);
            throw error;
        }
    }
    
    /**
     * Kullanıcıyı çevrimiçi yap
     * @param {string} userId - Kullanıcı ID'si
     * @param {string} socketId - Socket ID'si
     */
    async setOnline(userId, socketId) {
        try {
            // MongoDB bağlantısı varsa
            if (db.mongoose && db.mongoose.connection.readyState === 1 && db.models && db.models.User) {
                await db.models.User.findByIdAndUpdate(userId, {
                    socketId,
                    isOnline: true
                });
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                db.sqliteDb.run(
                    'UPDATE users SET socket_id = ?, is_online = 1 WHERE id = ?',
                    [socketId, userId]
                );
            }
            // Hiçbir veritabanı bağlantısı yoksa
            else {
                console.log('No database connection available, skipping setOnline');
            }
        } catch (error) {
            console.error('Set online error:', error);
        }
    }
    
    /**
     * Kullanıcıyı çevrimdışı yap
     * @param {string} userId - Kullanıcı ID'si
     */
    async setOffline(userId) {
        try {
            // MongoDB bağlantısı varsa
            if (db.mongoose && db.mongoose.connection.readyState === 1 && db.models && db.models.User) {
                await db.models.User.findByIdAndUpdate(userId, {
                    socketId: null,
                    isOnline: false
                });
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                db.sqliteDb.run(
                    'UPDATE users SET socket_id = NULL, is_online = 0 WHERE id = ?',
                    [userId]
                );
            }
            // Hiçbir veritabanı bağlantısı yoksa
            else {
                console.log('No database connection available, skipping setOffline');
            }
        } catch (error) {
            console.error('Set offline error:', error);
        }
    }
    
    /**
     * Kullanıcıyı al
     * @param {string} userId - Kullanıcı ID'si
     * @returns {Object} - Kullanıcı
     */
    async getUser(userId) {
        try {
            // MongoDB bağlantısı varsa
            if (db.mongoose.connection.readyState === 1) {
                return await db.models.User.findById(userId);
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                return new Promise((resolve, reject) => {
                    db.sqliteDb.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        if (!row) {
                            resolve(null);
                            return;
                        }
                        
                        resolve({
                            _id: row.id,
                            username: row.username,
                            lastLogin: row.last_login,
                            stats: {
                                score: row.score || 0,
                                kills: row.kills || 0,
                                deaths: row.deaths || 0,
                                balloons: 0,
                                flags: 0,
                                gamesPlayed: 0,
                                wins: 0
                            }
                        });
                    });
                });
            } else {
                return null;
            }
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }
    
    /**
     * Kullanıcı istatistiklerini güncelle
     * @param {string} userId - Kullanıcı ID'si
     * @param {Object} stats - İstatistikler
     */
    async updateUserStats(userId, stats) {
        try {
            // MongoDB bağlantısı varsa
            if (db.mongoose.connection.readyState === 1) {
                await db.models.User.findByIdAndUpdate(userId, {
                    $inc: {
                        'stats.score': stats.score || 0,
                        'stats.kills': stats.kills || 0,
                        'stats.deaths': stats.deaths || 0,
                        'stats.balloons': stats.balloons || 0,
                        'stats.flags': stats.flags || 0,
                        'stats.gamesPlayed': stats.gamesPlayed || 0,
                        'stats.wins': stats.wins || 0
                    }
                });
            }
            // SQLite bağlantısı varsa
            else if (db.sqliteDb) {
                db.sqliteDb.run(
                    `UPDATE users SET 
                    score = score + ?,
                    kills = kills + ?,
                    deaths = deaths + ?
                    WHERE id = ?`,
                    [
                        stats.score || 0,
                        stats.kills || 0,
                        stats.deaths || 0,
                        userId
                    ]
                );
            }
        } catch (error) {
            console.error('Update user stats error:', error);
        }
    }
}

module.exports = AuthController; 