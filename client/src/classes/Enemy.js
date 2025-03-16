/**
 * Enemy.js
 * Düşman uçaklar ve AI davranışlarını yöneten sınıf
 */
import { Aircraft } from './Aircraft.js';
import { GameConstants } from '../constants/GameConstants.js';
import { Projectile } from './Projectile.js';

export class Enemy {
    /**
     * Düşman uçağı oluştur
     * @param {Object} options - Düşman seçenekleri
     */
    constructor(options) {
        this.id = options.id || `enemy-${Date.now()}`;
        this.name = options.name || 'Enemy Aircraft';
        this.team = options.team || 'red';
        this.scene = options.scene;
        this.physics = options.physics;
        this.effects = options.effects;
        this.position = options.position || new THREE.Vector3(0, 100, 0);
        this.color = options.color || 0xff0000;
        
        // AI Durumu
        this.state = 'patrol';  // 'patrol', 'chase', 'attack', 'evade', 'return'
        this.targetPlayer = null;
        this.lastFireTime = 0;
        this.fireRate = 500;    // ms
        this.detectionRange = 300;
        this.attackRange = 150;
        this.evadeHealth = 30;  // Bu sağlık seviyesinin altında kaçmaya başlar
        this.awareness = 0.8;   // Oyuncuyu görme olasılığı (0-1)
        this.aggressiveness = 0.7; // Saldırı agresifliği (0-1)
        this.skill = Math.random() * 0.5 + 0.5; // Pilot becerisi (0.5-1.0)
        
        // Hareket parametreleri
        this.maxSpeed = 50 + Math.random() * 20;  // Maksimum hız (m/s)
        this.turnRate = 1.5 + Math.random() * 0.5; // Dönüş hızı (radyan/s)
        this.maxAcceleration = 10; // Maksimum ivme (m/s²)
        
        // Devriye noktaları
        this.waypoints = this.generateRandomWaypoints();
        this.currentWaypoint = 0;
        
        // Düşman uçağını oluştur
        this.aircraft = new Aircraft({
            id: `aircraft-${this.id}`,
            ownerId: this.id,
            name: this.name,
            scene: this.scene,
            physics: this.physics,
            position: this.position,
            color: this.color,
            team: this.team,
            effects: this.effects,
            maxHealth: 100,
            maxAmmo: 200
        });
        
        console.log(`Enemy AI created: ${this.id}`);
    }
    
    /**
     * Rastgele devriye noktaları oluştur
     * @returns {Array} - Devriye noktaları dizisi
     */
    generateRandomWaypoints() {
        const points = [];
        const count = 5 + Math.floor(Math.random() * 5); // 5-9 arası nokta
        const radius = 300 + Math.random() * 500;  // 300-800 birim yarıçaplı alan
        const minAltitude = 50;
        const maxAltitude = 400;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const x = Math.cos(angle) * radius * (0.8 + Math.random() * 0.4);
            const z = Math.sin(angle) * radius * (0.8 + Math.random() * 0.4);
            const y = minAltitude + Math.random() * (maxAltitude - minAltitude);
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        return points;
    }
    
    /**
     * Düşman uçağını güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     * @param {Array} players - Oyuncu uçakları
     * @param {Array} projectiles - Mermiler
     */
    updateEnemy(deltaTime, players, projectiles) {
        if (!this.aircraft || !this.aircraft.isAlive()) {
            return;
        }
        
        // AI durumunu güncelle
        this.updateAIState(players);
        
        // Duruma göre davran
        switch (this.state) {
            case 'patrol':
                this.patrol(deltaTime);
                break;
                
            case 'chase':
                this.chase(deltaTime);
                break;
                
            case 'attack':
                this.attack(deltaTime, projectiles);
                break;
                
            case 'evade':
                this.evade(deltaTime);
                break;
                
            case 'return':
                this.returnToPatrol(deltaTime);
                break;
        }
    }
    
    /**
     * AI durumunu güncelle
     * @param {Array} players - Oyuncu uçakları
     */
    updateAIState(players) {
        // Sağlık durumunu kontrol et - düşük sağlıkta kaç
        if (this.aircraft.getHealth() < this.evadeHealth) {
            this.state = 'evade';
            return;
        }
        
        // En yakın oyuncuyu bul
        let nearestPlayer = null;
        let nearestDistance = Infinity;
        
        players.forEach(player => {
            if (player && player.isAlive && player.isAlive()) {
                const distance = this.aircraft.getPosition().distanceTo(player.getPosition());
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestPlayer = player;
                }
            }
        });
        
        this.targetPlayer = nearestPlayer;
        
        // Oyuncu menzilde mi?
        if (nearestPlayer && nearestDistance < this.detectionRange) {
            // Fark edilme olasılığı (skill ve awareness'a bağlı)
            if (Math.random() < this.awareness) {
                if (nearestDistance < this.attackRange) {
                    // Saldırı menzilinde
                    if (Math.random() < this.aggressiveness) {
                        this.state = 'attack';
                    } else {
                        this.state = 'chase';
                    }
                } else {
                    // Takip menzilinde
                    this.state = 'chase';
                }
            }
        } else {
            // Savaştan sonra devriyeye dön
            if (this.state === 'attack' || this.state === 'chase' || this.state === 'evade') {
                this.state = 'return';
            }
            
            // Devriyedeysek devriyeye devam et
            if (this.state === 'return' && this.currentWaypoint < this.waypoints.length) {
                const waypointDist = this.aircraft.getPosition().distanceTo(this.waypoints[this.currentWaypoint]);
                if (waypointDist < 50) {
                    this.state = 'patrol';
                }
            }
        }
    }
    
    /**
     * Devriye davranışı
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    patrol(deltaTime) {
        // Geçerli devriye noktasına git
        if (this.currentWaypoint >= this.waypoints.length) {
            this.currentWaypoint = 0;
        }
        
        const waypoint = this.waypoints[this.currentWaypoint];
        const distance = this.moveTowards(waypoint, this.maxSpeed * 0.7, deltaTime);
        
        // Noktaya yaklaştıysak, bir sonraki noktaya geç
        if (distance < 30) {
            this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
        }
    }
    
    /**
     * Takip davranışı
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    chase(deltaTime) {
        if (!this.targetPlayer || !this.targetPlayer.isAlive()) {
            this.state = 'return';
            return;
        }
        
        // Hedef pozisyona doğru git
        const targetPosition = this.targetPlayer.getPosition();
        this.moveTowards(targetPosition, this.maxSpeed * 0.9, deltaTime);
    }
    
    /**
     * Saldırı davranışı
     * @param {number} deltaTime - Geçen süre (saniye)
     * @param {Array} projectiles - Mermiler dizisi
     */
    attack(deltaTime, projectiles) {
        if (!this.targetPlayer || !this.targetPlayer.isAlive()) {
            this.state = 'return';
            return;
        }
        
        // Hedef pozisyonu ve mesafeyi al
        const targetPosition = this.targetPlayer.getPosition();
        const distance = this.aircraft.getPosition().distanceTo(targetPosition);
        
        // Saldırı için hareket
        if (distance > this.attackRange * 0.5) {
            // Yaklaş
            this.moveTowards(targetPosition, this.maxSpeed, deltaTime);
        } else {
            // Saldırı manevrası (daire çiz)
            const myPosition = this.aircraft.getPosition();
            const targetVector = targetPosition.clone().sub(myPosition).normalize();
            const perpVector = new THREE.Vector3(-targetVector.z, 0, targetVector.x);
            
            // Hedefin etrafında daire çiz
            const circleTarget = targetPosition.clone().add(
                perpVector.multiplyScalar(this.attackRange * 0.3)
            );
            
            this.moveTowards(circleTarget, this.maxSpeed * 0.8, deltaTime);
        }
        
        // Hedefi vurmak için ateş et
        this.fireAtTarget(projectiles);
    }
    
    /**
     * Kaçış davranışı
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    evade(deltaTime) {
        // En yakın devriye noktasına kaç
        let nearestWaypoint = null;
        let nearestDistance = Infinity;
        
        for (const waypoint of this.waypoints) {
            const distance = this.aircraft.getPosition().distanceTo(waypoint);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestWaypoint = waypoint;
            }
        }
        
        if (nearestWaypoint) {
            this.moveTowards(nearestWaypoint, this.maxSpeed, deltaTime);
            
            // Sağlık iyileştirme
            if (this.aircraft.getHealth) {
                const currentHealth = this.aircraft.getHealth();
                if (currentHealth < 100) {
                    this.aircraft.damage(-0.5 * deltaTime); // Saniyede 0.5 can yenile
                }
            }
            
            // Hedeften uzaklaştığımızda devriyeye dön
            if (this.targetPlayer) {
                const distanceToTarget = this.aircraft.getPosition().distanceTo(this.targetPlayer.getPosition());
                if (distanceToTarget > this.detectionRange * 1.5) {
                    this.state = 'return';
                }
            } else {
                this.state = 'return';
            }
        } else {
            this.state = 'return';
        }
    }
    
    /**
     * Devriyeye dönüş davranışı
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    returnToPatrol(deltaTime) {
        // En yakın devriye noktasını bul
        let nearestWaypoint = null;
        let nearestDistance = Infinity;
        
        for (let i = 0; i < this.waypoints.length; i++) {
            const distance = this.aircraft.getPosition().distanceTo(this.waypoints[i]);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestWaypoint = i;
            }
        }
        
        if (nearestWaypoint !== null) {
            this.currentWaypoint = nearestWaypoint;
            const waypoint = this.waypoints[this.currentWaypoint];
            
            const distance = this.moveTowards(waypoint, this.maxSpeed * 0.8, deltaTime);
            
            // Noktaya yaklaştıysak, devriye moduna geç
            if (distance < 50) {
                this.state = 'patrol';
            }
        } else {
            this.state = 'patrol';
        }
    }
    
    /**
     * Belirtilen konuma doğru hareket et
     * @param {THREE.Vector3} targetPosition - Hedef konum
     * @param {number} speed - Hız
     * @param {number} deltaTime - Geçen süre
     * @returns {number} - Hedefe olan mesafe
     */
    moveTowards(targetPosition, speed, deltaTime) {
        if (!this.aircraft) return Infinity;
        
        const myPosition = this.aircraft.getPosition();
        const distance = myPosition.distanceTo(targetPosition);
        
        // Hedefe dönmek için yönü hesapla
        const direction = targetPosition.clone().sub(myPosition).normalize();
        
        // Şu anki yönümüzü al
        const currentRotation = this.aircraft.getRotation();
        const currentDirection = new THREE.Vector3(0, 0, 1).applyEuler(currentRotation);
        
        // Dönüş açılarını hesapla
        const horizontal = Math.atan2(direction.x, direction.z);
        const vertical = Math.atan2(direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z));
        
        // Gaz ve kontroller için değerler hesapla
        const targetSpeed = Math.min(speed, distance * 2); // Hedefe yakınken yavaşla
        const throttle = targetSpeed / this.maxSpeed;
        
        // Yaw (sağ/sol) kontrolünü hesapla
        const yawDiff = this.lerpAngle(currentRotation.y, horizontal, this.turnRate * this.skill * deltaTime);
        let yaw = yawDiff * this.turnRate * 2; // Faktör ekleyerek etkiyi artır
        yaw = Math.max(-1, Math.min(1, yaw)); // -1 ile 1 arasında sınırla
        
        // Pitch (yukarı/aşağı) kontrolünü hesapla
        const pitchTarget = -vertical; // Negatif alınır çünkü pitch aşağı olduğunda pozitif
        const pitchDiff = this.lerpAngle(currentRotation.x, pitchTarget, this.turnRate * this.skill * deltaTime);
        let pitch = pitchDiff * this.turnRate * 2;
        pitch = Math.max(-1, Math.min(1, pitch));
        
        // Roll (sağa/sola yatma) kontrolünü hesapla
        let roll = -yaw * 0.5; // Dönüş yönüne doğru yat
        roll = Math.max(-1, Math.min(1, roll));
        
        // Yapay girdileri uçağa ver
        const inputs = {
            pitch: pitch,
            roll: roll,
            yaw: yaw,
            throttle: throttle,
            brake: false,
            boost: distance > 100 && targetSpeed > this.maxSpeed * 0.8,
            fire: false
        };
        
        // Uçağı güncelle
        this.aircraft.update(deltaTime, inputs);
        
        return distance;
    }
    
    /**
     * İki açı arasında enterpolasyon yap
     * @param {number} a - Başlangıç açısı
     * @param {number} b - Hedef açısı
     * @param {number} t - Enterpolasyon miktarı (0-1)
     * @returns {number} - Enterpolasyon sonucu
     */
    lerpAngle(a, b, t) {
        // Açı farkını -PI ile PI arasında normalize et
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        // Enterpolasyon değerini hesapla
        return diff * t;
    }
    
    /**
     * Hedefe ateş et
     * @param {Array} projectiles - Mermiler dizisi
     */
    fireAtTarget(projectiles) {
        if (!this.targetPlayer || !this.aircraft || !projectiles) {
            return;
        }
        
        const now = Date.now();
        if (now - this.lastFireTime < this.fireRate) {
            return;
        }
        
        // Atış becerisi (skill'e bağlı)
        const skillFactor = this.skill * this.skill; // Beceri etkisini vurgula
        const hitChance = 0.2 + skillFactor * 0.5; // 0.2 ile 0.7 arası
        
        if (Math.random() > hitChance) {
            // Iskaladı
            this.lastFireTime = now;
            return;
        }
        
        // Hedefin pozisyonunu al
        const targetPosition = this.targetPlayer.getPosition();
        
        // Uçağın pozisyonunu ve yönünü al
        const myPosition = this.aircraft.getPosition();
        const myQuaternion = this.aircraft.getQuaternion();
        
        // İleri yönü
        const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(myQuaternion);
        
        // Hedef vektörü
        const targetDir = targetPosition.clone().sub(myPosition).normalize();
        
        // İleri yönü ile hedef yönü arasındaki açı
        const angle = forwardDir.angleTo(targetDir);
        
        // Atış menziline girdiyse ateş et (45 derece)
        if (angle < Math.PI / 4) {
            // Uçağın burnundan biraz ileride başlat
            const spawnPos = myPosition.clone().add(forwardDir.clone().multiplyScalar(3));
            
            // Mermi oluştur
            const projectile = new Projectile({
                id: `projectile-${this.id}-${now}`,
                ownerId: this.id,
                position: spawnPos,
                direction: forwardDir,
                speed: 100,
                damage: 5 + this.skill * 5, // Beceriye göre hasar
                scene: this.scene,
                lifeTime: 3,
                team: this.team,
                color: this.color,
                ownerObject: this.aircraft,
                createTrail: true,
                addLight: true
            });
            
            // Mermiler listesine ekle
            projectiles.push(projectile);
            
            // Ateş sesi
            if (this.effects && this.effects.playFireSound) {
                this.effects.playFireSound();
            }
            
            this.lastFireTime = now;
        }
    }
    
    /**
     * Score değerini döndür
     * @returns {number} - Skor
     */
    getScore() {
        return this.aircraft ? this.aircraft.getScore() : 0;
    }
    
    /**
     * Kill sayısını döndür
     * @returns {number} - Kill sayısı
     */
    getKills() {
        return this.aircraft ? this.aircraft.getKills() : 0;
    }
    
    /**
     * Ölüm sayısını döndür
     * @returns {number} - Ölüm sayısı
     */
    getDeaths() {
        return this.aircraft ? this.aircraft.getDeaths() : 0;
    }
} 