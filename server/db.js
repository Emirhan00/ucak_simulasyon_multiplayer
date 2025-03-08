const mongoose = require('mongoose');
const sqlite3 = require('sqlite3').verbose();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/multiplayer_game';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// SQLite connection
const sqliteDb = new sqlite3.Database(process.env.SQLITE_DB_PATH || './database.sqlite', (err) => {
    if (err) {
        console.error('SQLite connection error:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Define a simple GameState model using mongoose for game state management
const gameStateSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    players: { type: Array, default: [] },
    teams: { type: Object, default: {} },
    balloons: { type: Array, default: [] },
    flags: { type: Array, default: [] },
    status: { type: String, default: 'waiting' },
    startedAt: Date,
    endedAt: Date,
    winner: String
});

const GameState = mongoose.model('GameState', gameStateSchema);

module.exports = {
    mongoose,
    models: {
        GameState
    },
    sqliteDb
}; 