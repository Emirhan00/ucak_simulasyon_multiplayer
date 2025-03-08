/**
 * GameState.js
 * Oyun durumu veri modeli
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const GameStateSchema = new Schema({
    roomId: {
        type: Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    gameMode: {
        type: String,
        enum: ['free-flight', 'team-deathmatch', 'balloon-hunt', 'capture-flag'],
        required: true
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
        position: {
            x: Number,
            y: Number,
            z: Number
        },
        rotation: {
            x: Number,
            y: Number,
            z: Number
        },
        speed: Number,
        health: Number,
        ammo: Number,
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
        balloonCount: {
            type: Number,
            default: 0
        },
        flagCaptured: {
            type: Boolean,
            default: false
        },
        isAlive: {
            type: Boolean,
            default: true
        },
        lastUpdate: {
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
            },
            flagCarrier: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                default: null
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
            },
            flagCarrier: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                default: null
            }
        }
    },
    balloons: [{
        id: String,
        position: {
            x: Number,
            y: Number,
            z: Number
        },
        isPopped: {
            type: Boolean,
            default: false
        },
        poppedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    }],
    flags: [{
        id: String,
        team: {
            type: String,
            enum: ['red', 'blue'],
            required: true
        },
        position: {
            x: Number,
            y: Number,
            z: Number
        },
        isAtBase: {
            type: Boolean,
            default: true
        },
        carrier: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    }],
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date,
        default: null
    },
    winner: {
        type: String,
        enum: ['red', 'blue', 'none', null],
        default: null
    }
});

module.exports = GameStateSchema; 