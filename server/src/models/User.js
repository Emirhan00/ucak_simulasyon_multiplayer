/**
 * User.js
 * Kullanıcı veri modeli
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    socketId: {
        type: String,
        default: null
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    stats: {
        score: {
            type: Number,
            default: 0
        },
        kills: {
            type: Number,
            default: 0
        },
        deaths: {
            type: Number,
            default: 0
        },
        balloons: {
            type: Number,
            default: 0
        },
        flags: {
            type: Number,
            default: 0
        },
        gamesPlayed: {
            type: Number,
            default: 0
        },
        wins: {
            type: Number,
            default: 0
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = UserSchema; 