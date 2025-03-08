/**
 * index.js
 * Veritabanı bağlantısı ve modelleri
 */

const mongoose = require('mongoose');
const config = require('../src/config/database');

// MongoDB bağlantısı
const connectMongoDB = async () => {
    try {
        await mongoose.connect(config.mongodb.uri, config.mongodb.options);
        console.log('MongoDB connected');
        return true;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        return false;
    }
};

// SQLite bağlantısı (alternatif olarak)
const sqlite3 = require('sqlite3').verbose();
let sqliteDb = null;

const connectSQLite = () => {
    try {
        sqliteDb = new sqlite3.Database(config.sqlite.path, (err) => {
            if (err) {
                console.error('SQLite connection error:', err);
                return false;
            }
            console.log('Connected to SQLite database');
            
            // Tabloları oluştur
            createTables();
            
            return true;
        });
    } catch (error) {
        console.error('SQLite connection error:', error);
        return false;
    }
};

// SQLite tabloları oluştur
const createTables = () => {
    console.log('Creating SQLite tables...');
    try {
        sqliteDb.serialize(() => {
            // Users tablosu
            sqliteDb.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME,
                    socket_id TEXT,
                    is_online INTEGER DEFAULT 0,
                    score INTEGER DEFAULT 0,
                    kills INTEGER DEFAULT 0,
                    deaths INTEGER DEFAULT 0,
                    balloons INTEGER DEFAULT 0,
                    flags INTEGER DEFAULT 0,
                    games_played INTEGER DEFAULT 0,
                    wins INTEGER DEFAULT 0
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating users table:', err);
                } else {
                    console.log('Users table created or already exists');
                }
            });
            
            // Rooms tablosu
            sqliteDb.run(`
                CREATE TABLE IF NOT EXISTS rooms (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    password TEXT,
                    max_players INTEGER DEFAULT 10,
                    game_mode TEXT DEFAULT 'free-flight',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_by TEXT,
                    status TEXT DEFAULT 'waiting'
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating rooms table:', err);
                } else {
                    console.log('Rooms table created or already exists');
                }
            });
            
            // Room_Players tablosu
            sqliteDb.run(`
                CREATE TABLE IF NOT EXISTS room_players (
                    room_id TEXT,
                    user_id TEXT,
                    is_host INTEGER DEFAULT 0,
                    is_ready INTEGER DEFAULT 0,
                    team TEXT,
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (room_id, user_id)
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating room_players table:', err);
                } else {
                    console.log('Room_players table created or already exists');
                }
            });
            
            // Game_States tablosu
            sqliteDb.run(`
                CREATE TABLE IF NOT EXISTS game_states (
                    room_id TEXT PRIMARY KEY,
                    game_mode TEXT,
                    status TEXT,
                    start_time DATETIME,
                    end_time DATETIME,
                    winner TEXT,
                    team_a_score INTEGER DEFAULT 0,
                    team_b_score INTEGER DEFAULT 0,
                    team_a_balloons INTEGER DEFAULT 0,
                    team_b_balloons INTEGER DEFAULT 0,
                    team_a_flags INTEGER DEFAULT 0,
                    team_b_flags INTEGER DEFAULT 0
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating game_states table:', err);
                } else {
                    console.log('Game_states table created or already exists');
                }
            });
        });
    } catch (error) {
        console.error('Error creating SQLite tables:', error);
    }
};

// Veritabanı bağlantısını başlat
const initDatabase = async () => {
    // Önce MongoDB'ye bağlanmayı dene
    const mongoConnected = await connectMongoDB();
    
    // MongoDB bağlantısı başarısız olursa SQLite'a bağlan
    if (!mongoConnected) {
        connectSQLite();
    }
};

// Veritabanı bağlantısını başlat
initDatabase();

// Modelleri dışa aktar
module.exports = {
    mongoose,
    sqliteDb,
    initDatabase,
    models: {
        User: mongoose.model('User', require('../src/models/User')),
        Room: mongoose.model('Room', require('../src/models/Room')),
        GameState: mongoose.model('GameState', require('../src/models/GameState'))
    }
}; 