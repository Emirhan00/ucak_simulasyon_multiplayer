/**
 * Room.js
 * Oda veri modeli
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const RoomSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        default: null
    },
    hasPassword: {
        type: Boolean,
        default: false
    },
    maxPlayers: {
        type: Number,
        default: 10,
        min: 2,
        max: 10
    },
    gameMode: {
        type: String,
        enum: ['free-flight', 'team-deathmatch', 'balloon-hunt', 'capture-flag'],
        default: 'free-flight'
    },
    status: {
        type: String,
        enum: ['waiting', 'playing', 'ended'],
        default: 'waiting'
    },
    players: [{
        id: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        team: {
            type: String,
            enum: ['red', 'blue', 'none'],
            default: 'none'
        },
        isReady: {
            type: Boolean,
            default: false
        },
        isHost: {
            type: Boolean,
            default: false
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    teams: {
        red: {
            score: {
                type: Number,
                default: 0
            },
            balloonCount: {
                type: Number,
                default: 0
            },
            flagCaptures: {
                type: Number,
                default: 0
            }
        },
        blue: {
            score: {
                type: Number,
                default: 0
            },
            balloonCount: {
                type: Number,
                default: 0
            },
            flagCaptures: {
                type: Number,
                default: 0
            }
        }
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    startedAt: {
        type: Date,
        default: null
    },
    endedAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = RoomSchema; 