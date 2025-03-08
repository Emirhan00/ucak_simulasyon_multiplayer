// GameController.js
// Oyun işlemlerini yönetir

const db = require('../../db');

class GameController {
    async recordHit(roomId, shooterId, targetId, damage) {
        try {
            if (db.mongoose.connection.readyState === 1) {
                const gameState = await db.models.GameState.findOne({ roomId });
                if (!gameState) return;
                const targetPlayer = gameState.players.find(p => p.id.toString() === targetId.toString());
                if (targetPlayer) {
                    targetPlayer.health -= damage;
                    let killed = false;
                    if (targetPlayer.health <= 0) {
                        targetPlayer.health = 0;
                        killed = true;
                        const shooter = gameState.players.find(p => p.id.toString() === shooterId.toString());
                        if (shooter) {
                            shooter.score = (shooter.score || 0) + 10;
                            shooter.kills = (shooter.kills || 0) + 1;
                        }
                        targetPlayer.deaths = (targetPlayer.deaths || 0) + 1;
                    }
                    await gameState.save();
                    return { killed };
                }
            } else if (db.sqliteDb) {
                await new Promise((resolve, reject) => {
                    db.sqliteDb.run(
                        `UPDATE users SET kills = kills + 1, score = score + ? WHERE id = ?`,
                        [10, shooterId],
                        err => err ? reject(err) : resolve()
                    );
                });
                await new Promise((resolve, reject) => {
                    db.sqliteDb.run(
                        `UPDATE users SET deaths = deaths + 1 WHERE id = ?`,
                        [targetId],
                        err => err ? reject(err) : resolve()
                    );
                });
                return { killed: true };
            }
        } catch (error) {
            console.error('Record hit error:', error);
        }
    }

    async popBalloon(roomId, balloonId, userId) {
        try {
            if (db.mongoose.connection.readyState === 1) {
                const gameState = await db.models.GameState.findOne({ roomId });
                if (!gameState) return;
                const balloon = gameState.balloons.find(b => b.id === balloonId);
                if (balloon && !balloon.isPopped) {
                    balloon.isPopped = true;
                    balloon.poppedBy = userId;
                    await gameState.save();
                }
            } else if (db.sqliteDb) {
                await new Promise((resolve, reject) => {
                    db.sqliteDb.run(
                        `UPDATE users SET score = score + ? WHERE id = ?`,
                        [30, userId],
                        err => err ? reject(err) : resolve()
                    );
                });
            }
        } catch (error) {
            console.error('Pop balloon error:', error);
        }
    }

    async updateTeamBalloonCount(roomId, team, count) {
        try {
            if (db.mongoose.connection.readyState === 1) {
                const gameState = await db.models.GameState.findOne({ roomId });
                if (!gameState) return;
                gameState.teams[team].balloonCount = (gameState.teams[team].balloonCount || 0) + count;
                await gameState.save();
            } else if (db.sqliteDb) {
                // SQLite alternative not implemented
            }
        } catch (error) {
            console.error('Update team balloon count error:', error);
        }
    }

    async getFlag(roomId, flagId) {
        try {
            if (db.mongoose.connection.readyState === 1) {
                const gameState = await db.models.GameState.findOne({ roomId });
                if (!gameState) return null;
                return gameState.flags.find(f => f.id === flagId);
            } else {
                return null;
            }
        } catch (error) {
            console.error('Get flag error:', error);
            return null;
        }
    }

    async captureFlag(roomId, flagId, userId) {
        try {
            if (db.mongoose.connection.readyState === 1) {
                const gameState = await db.models.GameState.findOne({ roomId });
                if (!gameState) return;
                const flag = gameState.flags.find(f => f.id === flagId);
                if (flag) {
                    flag.isAtBase = false;
                    flag.carrier = userId;
                    await gameState.save();
                }
            } else if (db.sqliteDb) {
                // SQLite alternative not implemented
            }
        } catch (error) {
            console.error('Capture flag error:', error);
        }
    }

    async updateTeamFlagCaptures(roomId, team, count) {
        try {
            if (db.mongoose.connection.readyState === 1) {
                const gameState = await db.models.GameState.findOne({ roomId });
                if (!gameState) return;
                gameState.teams[team].flagCaptures = (gameState.teams[team].flagCaptures || 0) + count;
                await gameState.save();
            } else if (db.sqliteDb) {
                // SQLite alternative not implemented
            }
        } catch (error) {
            console.error('Update team flag captures error:', error);
        }
    }

    async getGameState(roomId) {
        try {
            if (db.mongoose.connection.readyState === 1) {
                return await db.models.GameState.findOne({ roomId });
            } else {
                return null;
            }
        } catch (error) {
            console.error('Get game state error:', error);
            return null;
        }
    }

    async startGame(roomId) {
        try {
            if (db.mongoose.connection.readyState === 1) {
                const gameState = await db.models.GameState.findOneAndUpdate(
                    { roomId },
                    { status: 'playing', startedAt: new Date() },
                    { new: true }
                );
                return gameState;
            } else if (db.sqliteDb) {
                // SQLite alternative not implemented
                return null;
            }
        } catch (error) {
            console.error('Start game error:', error);
            return null;
        }
    }

    async endGame(roomId, winner = null) {
        try {
            if (db.mongoose.connection.readyState === 1) {
                const gameState = await db.models.GameState.findOneAndUpdate(
                    { roomId },
                    { status: 'ended', endedAt: new Date(), winner },
                    { new: true }
                );
                return gameState;
            } else if (db.sqliteDb) {
                // SQLite alternative not implemented
                return null;
            }
        } catch (error) {
            console.error('End game error:', error);
            return null;
        }
    }
}

module.exports = GameController; 