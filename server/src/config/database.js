/**
 * database.js
 * Veritabanı konfigürasyonu
 */

module.exports = {
    // MongoDB bağlantı bilgileri
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aircraft-game',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    },
    
    // SQLite bağlantı bilgileri (alternatif olarak)
    sqlite: {
        path: process.env.SQLITE_PATH || './db/database.sqlite'
    }
}; 