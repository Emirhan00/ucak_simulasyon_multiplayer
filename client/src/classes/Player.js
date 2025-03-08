/**
 * Player.js
 * Oyuncu verilerini ve durumunu yöneten sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class Player {
    constructor(options = {}) {
        // Temel özellikler
        this.id = options.id || `player_${Date.now()}`;
        this.name = options.name || 'Player';
        this.team = options.team || 'none'; // 'none', 'red', 'blue'
        this.isLocal = options.isLocal || false;
        this.isReady = options.isReady || false;
        this.isHost = options.isHost || false;
        
        // Oyun istatistikleri
        this.score = options.score || 0;
        this.kills = options.kills || 0;
        this.deaths = options.deaths || 0;
        this.balloonCount = options.balloonCount || 0;
        this.flagCaptures = options.flagCaptures || 0;
        
        // Oyun durumu
        this.isAlive = options.isAlive !== undefined ? options.isAlive : true;
        this.health = options.health || 100;
        this.maxHealth = options.maxHealth || 100;
        this.ammo = options.ammo || 100;
        this.maxAmmo = options.maxAmmo || 100;
        this.respawnTime = options.respawnTime || 5; // saniye
        this.respawnTimer = 0;
        this.hasCapturedFlag = options.hasCapturedFlag || false;
        this.hasDefendedFlagCarrier = options.hasDefendedFlagCarrier || false;
        
        // Pozisyon ve hareket
        this.position = options.position ? options.position.clone() : new THREE.Vector3(0, 20, 0);
        this.rotation = options.rotation ? options.rotation.clone() : new THREE.Euler(0, 0, 0);
        this.quaternion = options.quaternion ? options.quaternion.clone() : new THREE.Quaternion();
        this.velocity = options.velocity ? options.velocity.clone() : new THREE.Vector3(0, 0, 0);
        this.speed = options.speed || 0;
        this.verticalSpeed = options.verticalSpeed || 0;
        
        // Uçak referansı
        this.aircraft = options.aircraft || null;
        
        // Ağ senkronizasyonu
        this.lastUpdateTime = Date.now();
        this.interpolationFactor = 0;
        this.targetPosition = this.position.clone();
        this.targetRotation = this.rotation.clone();
        this.targetQuaternion = this.quaternion.clone();
        
        // Güç artırımları
        this.powerups = {
            speedBoost: { active: false, duration: 0, factor: 1.5 },
            shield: { active: false, duration: 0, factor: 0.5 },
            doubleDamage: { active: false, duration: 0, factor: 2 }
        };
    }
    
    /**
     * Oyuncuyu güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    update(deltaTime) {
        // Oyuncu ölü ise yeniden doğma süresini kontrol et
        if (!this.isAlive) {
            this.respawnTimer += deltaTime;
            
            if (this.respawnTimer >= this.respawnTime) {
                this.respawn();
            }
            
            return;
        }
        
        // Güç artırımlarını güncelle
        this.updatePowerups(deltaTime);
        
        // Uzak oyuncular için interpolasyon
        if (!this.isLocal && this.aircraft) {
            this.interpolate(deltaTime);
        }
    }
    
    /**
     * Güç artırımlarını güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    updatePowerups(deltaTime) {
        // Hız artırımı
        if (this.powerups.speedBoost.active) {
            this.powerups.speedBoost.duration -= deltaTime;
            
            if (this.powerups.speedBoost.duration <= 0) {
                this.powerups.speedBoost.active = false;
            }
        }
        
        // Kalkan
        if (this.powerups.shield.active) {
            this.powerups.shield.duration -= deltaTime;
            
            if (this.powerups.shield.duration <= 0) {
                this.powerups.shield.active = false;
            }
        }
        
        // Çift hasar
        if (this.powerups.doubleDamage.active) {
            this.powerups.doubleDamage.duration -= deltaTime;
            
            if (this.powerups.doubleDamage.duration <= 0) {
                this.powerups.doubleDamage.active = false;
            }
        }
    }
    
    /**
     * Uzak oyuncular için interpolasyon
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    interpolate(deltaTime) {
        // Interpolasyon faktörünü güncelle
        this.interpolationFactor = Math.min(1, this.interpolationFactor + deltaTime * 10);
        
        // Pozisyonu interpole et
        this.position.lerp(this.targetPosition, this.interpolationFactor);
        
        // Rotasyonu interpole et (quaternion kullanarak)
        this.quaternion.slerp(this.targetQuaternion, this.interpolationFactor);
        
        // Uçak pozisyonunu ve rotasyonunu güncelle
        if (this.aircraft) {
            this.aircraft.setTargetPosition(this.position);
            this.aircraft.setTargetRotation(this.quaternion);
        }
    }
    
    /**
     * Oyuncuya hasar ver
     * @param {number} amount - Hasar miktarı
     * @param {string} attackerId - Saldıran oyuncu ID'si
     * @returns {boolean} - Oyuncu öldü mü?
     */
    damage(amount, attackerId) {
        // Oyuncu zaten ölü mü?
        if (!this.isAlive) return false;
        
        // Kalkan aktif mi?
        if (this.powerups.shield.active) {
            amount *= this.powerups.shield.factor;
        }
        
        // Hasarı uygula
        this.health -= amount;
        
        // Sağlık 0'ın altına düştü mü?
        if (this.health <= 0) {
            this.die(attackerId);
            return true;
        }
        
        return false;
    }
    
    /**
     * Oyuncuyu öldür
     * @param {string} killerId - Öldüren oyuncu ID'si
     */
    die(killerId) {
        this.isAlive = false;
        this.health = 0;
        this.respawnTimer = 0;
        this.deaths++;
        
        // Bayrak taşıyorsa düşür
        if (this.hasCapturedFlag) {
            this.hasCapturedFlag = false;
            // TODO: Bayrak düşürme olayını tetikle
        }
        
        // Uçağı patlat
        if (this.aircraft) {
            this.aircraft.die();
        }
    }
    
    /**
     * Oyuncuyu yeniden doğur
     */
    respawn() {
        this.isAlive = true;
        this.health = this.maxHealth;
        this.ammo = this.maxAmmo;
        this.respawnTimer = 0;
        
        // Rastgele bir konumda yeniden doğ
        const spawnRadius = 500;
        const spawnHeight = 200;
        
        this.position.set(
            (Math.random() - 0.5) * spawnRadius,
            spawnHeight,
            (Math.random() - 0.5) * spawnRadius
        );
        
        // Rastgele bir rotasyon
        this.rotation.set(0, Math.random() * Math.PI * 2, 0);
        this.quaternion.setFromEuler(this.rotation);
        
        // Hızı sıfırla
        this.velocity.set(0, 0, 0);
        this.speed = 0;
        this.verticalSpeed = 0;
        
        // Uçağı yeniden doğur
        if (this.aircraft) {
            this.aircraft.respawn();
        }
    }
    
    /**
     * Oyuncuya puan ekle
     * @param {number} amount - Puan miktarı
     */
    addScore(amount) {
        this.score += amount;
    }
    
    /**
     * Oyuncuya öldürme ekle
     * @param {string} victimId - Kurban oyuncu ID'si
     */
    addKill(victimId) {
        this.kills++;
        this.addScore(100); // Öldürme başına 100 puan
    }
    
    /**
     * Oyuncuya balon patlatma ekle
     */
    addBalloonPop() {
        this.balloonCount++;
        this.addScore(50); // Balon başına 50 puan
    }
    
    /**
     * Oyuncuya bayrak yakalama ekle
     */
    addFlagCapture() {
        this.flagCaptures++;
        this.hasCapturedFlag = true;
        this.addScore(200); // Bayrak yakalama başına 200 puan
    }
    
    /**
     * Oyuncuya bayrak taşıyıcısını koruma ekle
     */
    addFlagCarrierDefend() {
        this.hasDefendedFlagCarrier = true;
        this.addScore(100); // Bayrak taşıyıcısını koruma başına 100 puan
    }
    
    /**
     * Oyuncuya güç artırımı ekle
     * @param {string} type - Güç artırımı tipi (speedBoost, shield, doubleDamage)
     * @param {number} duration - Süre (saniye)
     */
    addPowerup(type, duration) {
        if (this.powerups[type]) {
            this.powerups[type].active = true;
            this.powerups[type].duration = duration;
        }
    }
    
    /**
     * Oyuncu verilerini ağ üzerinden güncellemek için
     * @param {Object} data - Oyuncu verileri
     */
    updateFromNetwork(data) {
        // Temel özellikler
        if (data.name) this.name = data.name;
        if (data.team) this.team = data.team;
        if (data.isReady !== undefined) this.isReady = data.isReady;
        if (data.isHost !== undefined) this.isHost = data.isHost;
        
        // Oyun istatistikleri
        if (data.score !== undefined) this.score = data.score;
        if (data.kills !== undefined) this.kills = data.kills;
        if (data.deaths !== undefined) this.deaths = data.deaths;
        if (data.balloonCount !== undefined) this.balloonCount = data.balloonCount;
        if (data.flagCaptures !== undefined) this.flagCaptures = data.flagCaptures;
        
        // Oyun durumu
        if (data.isAlive !== undefined) this.isAlive = data.isAlive;
        if (data.health !== undefined) this.health = data.health;
        if (data.ammo !== undefined) this.ammo = data.ammo;
        if (data.hasCapturedFlag !== undefined) this.hasCapturedFlag = data.hasCapturedFlag;
        
        // Pozisyon ve hareket
        if (data.position) {
            this.targetPosition.set(data.position.x, data.position.y, data.position.z);
            this.interpolationFactor = 0;
        }
        
        if (data.rotation) {
            this.targetRotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
            this.targetQuaternion.setFromEuler(this.targetRotation);
        }
        
        if (data.quaternion) {
            this.targetQuaternion.set(
                data.quaternion.x,
                data.quaternion.y,
                data.quaternion.z,
                data.quaternion.w
            );
        }
        
        if (data.velocity) {
            this.velocity.set(data.velocity.x, data.velocity.y, data.velocity.z);
        }
        
        if (data.speed !== undefined) this.speed = data.speed;
        if (data.verticalSpeed !== undefined) this.verticalSpeed = data.verticalSpeed;
        
        // Güç artırımları
        if (data.powerups) {
            for (const type in data.powerups) {
                if (this.powerups[type]) {
                    this.powerups[type].active = data.powerups[type].active;
                    this.powerups[type].duration = data.powerups[type].duration;
                }
            }
        }
        
        // Son güncelleme zamanını kaydet
        this.lastUpdateTime = Date.now();
    }
    
    /**
     * Ağ üzerinden gönderilecek oyuncu verilerini al
     * @returns {Object} - Oyuncu verileri
     */
    getNetworkData() {
        return {
            id: this.id,
            name: this.name,
            team: this.team,
            isReady: this.isReady,
            isHost: this.isHost,
            score: this.score,
            kills: this.kills,
            deaths: this.deaths,
            balloonCount: this.balloonCount,
            flagCaptures: this.flagCaptures,
            isAlive: this.isAlive,
            health: this.health,
            ammo: this.ammo,
            hasCapturedFlag: this.hasCapturedFlag,
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            rotation: {
                x: this.rotation.x,
                y: this.rotation.y,
                z: this.rotation.z
            },
            quaternion: {
                x: this.quaternion.x,
                y: this.quaternion.y,
                z: this.quaternion.z,
                w: this.quaternion.w
            },
            velocity: {
                x: this.velocity.x,
                y: this.velocity.y,
                z: this.velocity.z
            },
            speed: this.speed,
            verticalSpeed: this.verticalSpeed,
            powerups: {
                speedBoost: {
                    active: this.powerups.speedBoost.active,
                    duration: this.powerups.speedBoost.duration
                },
                shield: {
                    active: this.powerups.shield.active,
                    duration: this.powerups.shield.duration
                },
                doubleDamage: {
                    active: this.powerups.doubleDamage.active,
                    duration: this.powerups.doubleDamage.duration
                }
            }
        };
    }
    
    /**
     * Oyuncu ID'sini al
     * @returns {string} - Oyuncu ID'si
     */
    getId() {
        return this.id;
    }
    
    /**
     * Oyuncu adını al
     * @returns {string} - Oyuncu adı
     */
    getName() {
        return this.name;
    }
    
    /**
     * Oyuncu takımını al
     * @returns {string} - Oyuncu takımı
     */
    getTeam() {
        return this.team;
    }
    
    /**
     * Oyuncu skorunu al
     * @returns {number} - Oyuncu skoru
     */
    getScore() {
        return this.score;
    }
    
    /**
     * Oyuncu öldürme sayısını al
     * @returns {number} - Oyuncu öldürme sayısı
     */
    getKills() {
        return this.kills;
    }
    
    /**
     * Oyuncu ölüm sayısını al
     * @returns {number} - Oyuncu ölüm sayısı
     */
    getDeaths() {
        return this.deaths;
    }
    
    /**
     * Oyuncu balon patlatma sayısını al
     * @returns {number} - Oyuncu balon patlatma sayısı
     */
    getBalloonCount() {
        return this.balloonCount;
    }
    
    /**
     * Oyuncu bayrak yakalama sayısını al
     * @returns {number} - Oyuncu bayrak yakalama sayısı
     */
    getFlagCaptures() {
        return this.flagCaptures;
    }
    
    /**
     * Oyuncu sağlığını al
     * @returns {number} - Oyuncu sağlığı
     */
    getHealth() {
        return this.health;
    }
    
    /**
     * Oyuncu maksimum sağlığını al
     * @returns {number} - Oyuncu maksimum sağlığı
     */
    getMaxHealth() {
        return this.maxHealth;
    }
    
    /**
     * Oyuncu cephane sayısını al
     * @returns {number} - Oyuncu cephane sayısı
     */
    getAmmo() {
        return this.ammo;
    }
    
    /**
     * Oyuncu maksimum cephane sayısını al
     * @returns {number} - Oyuncu maksimum cephane sayısı
     */
    getMaxAmmo() {
        return this.maxAmmo;
    }
    
    /**
     * Oyuncu pozisyonunu al
     * @returns {THREE.Vector3} - Oyuncu pozisyonu
     */
    getPosition() {
        return this.position.clone();
    }
    
    /**
     * Oyuncu rotasyonunu al
     * @returns {THREE.Euler} - Oyuncu rotasyonu
     */
    getRotation() {
        return this.rotation.clone();
    }
    
    /**
     * Oyuncu quaternionunu al
     * @returns {THREE.Quaternion} - Oyuncu quaternionu
     */
    getQuaternion() {
        return this.quaternion.clone();
    }
    
    /**
     * Oyuncu hızını al
     * @returns {number} - Oyuncu hızı
     */
    getSpeed() {
        return this.speed;
    }
    
    /**
     * Oyuncu dikey hızını al
     * @returns {number} - Oyuncu dikey hızı
     */
    getVerticalSpeed() {
        return this.verticalSpeed;
    }
    
    /**
     * Oyuncu canlı mı?
     * @returns {boolean} - Oyuncu canlı mı?
     */
    isPlayerAlive() {
        return this.isAlive;
    }
    
    /**
     * Oyuncu bayrak taşıyor mu?
     * @returns {boolean} - Oyuncu bayrak taşıyor mu?
     */
    isCarryingFlag() {
        return this.hasCapturedFlag;
    }
    
    /**
     * Oyuncu bayrak taşıyıcısını korudu mu?
     * @returns {boolean} - Oyuncu bayrak taşıyıcısını korudu mu?
     */
    hasDefendedFlag() {
        return this.hasDefendedFlagCarrier;
    }
    
    /**
     * Oyuncu hazır mı?
     * @returns {boolean} - Oyuncu hazır mı?
     */
    isPlayerReady() {
        return this.isReady;
    }
    
    /**
     * Oyuncu oda sahibi mi?
     * @returns {boolean} - Oyuncu oda sahibi mi?
     */
    isRoomHost() {
        return this.isHost;
    }
    
    /**
     * Oyuncu yerel mi?
     * @returns {boolean} - Oyuncu yerel mi?
     */
    isLocalPlayer() {
        return this.isLocal;
    }
} 