/**
 * Enemy.js
 * Düşman uçaklar ve AI davranışlarını yöneten sınıf
 */
import { Aircraft } from './Aircraft.js';
import { GameConstants } from '../constants/GameConstants.js';

export class Enemy extends Aircraft {
    constructor(options) {
        // Aircraft sınıfından miras al
        super({
            ...options,
            isRemote: true, // Düşman uçaklar uzak olarak işaretlenir
            type: options.type || 'fighter'
        });
        
        // AI özellikleri
        this.aiType = options.aiType || 'patrol'; // patrol, chase, defend
        this.aiState = 'idle'; // idle, patrolling, chasing, attacking, returning
        this.aiTarget = null; // Hedef oyuncu
        this.aiWaypoints = options.waypoints || []; // Devriye noktaları
        this.currentWaypoint = 0; // Mevcut devriye noktası
        this.waypointThreshold = 50; // Devriye noktasına ulaşma eşiği (metre)
        this.detectionRange = options.detectionRange || 500; // Oyuncu tespit menzili (metre)
        this.attackRange = options.attackRange || 200; // Saldırı menzili (metre)
        this.lastFireTime = 0; // Son ateş zamanı
        this.fireRate = options.fireRate || 1; // Ateş hızı (saniye)
        this.patrolSpeed = options.patrolSpeed || this.maxSpeed * 0.5; // Devriye hızı
        this.chaseSpeed = options.chaseSpeed || this.maxSpeed * 0.8; // Takip hızı
        this.attackSpeed = options.attackSpeed || this.maxSpeed * 0.6; // Saldırı hızı
        this.turnRate = options.turnRate || this.rotationSpeed; // Dönüş hızı
        
        // Eğer devriye noktaları belirtilmemişse, rastgele oluştur
        if (this.aiWaypoints.length === 0) {
            this.generateRandomWaypoints();
        }
    }
    
    /**
     * Rastgele devriye noktaları oluştur
     */
    generateRandomWaypoints() {
        const waypointCount = 4 + Math.floor(Math.random() * 4); // 4-7 arası nokta
        const worldSize = GameConstants.WORLD.SIZE;
        const minHeight = 100;
        const maxHeight = 500;
        
        for (let i = 0; i < waypointCount; i++) {
            const x = (Math.random() - 0.5) * worldSize * 0.8;
            const y = minHeight + Math.random() * (maxHeight - minHeight);
            const z = (Math.random() - 0.5) * worldSize * 0.8;
            
            this.aiWaypoints.push(new THREE.Vector3(x, y, z));
        }
    }
    
    /**
     * Düşman uçağı güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     * @param {Array} players - Oyuncular
     * @param {Array} projectiles - Mermiler
     */
    updateEnemy(deltaTime, players, projectiles) {
        if (!this.alive) return;
        
        // AI durumunu güncelle
        this.updateAIState(players);
        
        // AI davranışını uygula
        switch (this.aiState) {
            case 'idle':
                this.aiState = 'patrolling';
                break;
                
            case 'patrolling':
                this.patrol(deltaTime);
                break;
                
            case 'chasing':
                this.chase(deltaTime);
                break;
                
            case 'attacking':
                this.attack(deltaTime, projectiles);
                break;
                
            case 'returning':
                this.returnToPatrol(deltaTime);
                break;
        }
        
        // Temel Aircraft güncelleme fonksiyonunu çağır
        super.update(deltaTime);
    }
    
    /**
     * AI durumunu güncelle
     * @param {Array} players - Oyuncular
     */
    updateAIState(players) {
        if (!players || players.length === 0) {
            this.aiState = 'patrolling';
            return;
        }
        
        // En yakın oyuncuyu bul
        let closestPlayer = null;
        let closestDistance = Infinity;
        
        players.forEach(player => {
            if (player.isAlive && player.id !== this.id) {
                const distance = this.getPosition().distanceTo(player.getPosition());
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPlayer = player;
                }
            }
        });
        
        // Hedef oyuncuyu güncelle
        this.aiTarget = closestPlayer;
        
        // Durumu güncelle
        if (this.aiTarget) {
            if (closestDistance <= this.attackRange) {
                this.aiState = 'attacking';
            } else if (closestDistance <= this.detectionRange) {
                this.aiState = 'chasing';
            } else if (this.aiState === 'chasing' || this.aiState === 'attacking') {
                this.aiState = 'returning';
            } else {
                this.aiState = 'patrolling';
            }
        } else {
            this.aiState = 'patrolling';
        }
    }
    
    /**
     * Devriye davranışı
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    patrol(deltaTime) {
        if (this.aiWaypoints.length === 0) return;
        
        // Mevcut devriye noktasını al
        const waypoint = this.aiWaypoints[this.currentWaypoint];
        
        // Devriye noktasına doğru hareket et
        this.moveTowards(waypoint, this.patrolSpeed, deltaTime);
        
        // Devriye noktasına ulaşıldı mı?
        const distance = this.getPosition().distanceTo(waypoint);
        
        if (distance < this.waypointThreshold) {
            // Sonraki devriye noktasına geç
            this.currentWaypoint = (this.currentWaypoint + 1) % this.aiWaypoints.length;
        }
    }
    
    /**
     * Takip davranışı
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    chase(deltaTime) {
        if (!this.aiTarget) {
            this.aiState = 'patrolling';
            return;
        }
        
        // Hedef oyuncuya doğru hareket et
        this.moveTowards(this.aiTarget.getPosition(), this.chaseSpeed, deltaTime);
    }
    
    /**
     * Saldırı davranışı
     * @param {number} deltaTime - Geçen süre (saniye)
     * @param {Array} projectiles - Mermiler
     */
    attack(deltaTime, projectiles) {
        if (!this.aiTarget) {
            this.aiState = 'patrolling';
            return;
        }
        
        // Hedef oyuncuya doğru hareket et, ancak mesafeyi koru
        const targetPosition = this.aiTarget.getPosition();
        const currentPosition = this.getPosition();
        const distance = currentPosition.distanceTo(targetPosition);
        
        // İdeal saldırı mesafesi
        const idealDistance = this.attackRange * 0.7;
        
        if (distance < idealDistance * 0.8) {
            // Çok yakın, uzaklaş
            const direction = currentPosition.clone().sub(targetPosition).normalize();
            const targetPoint = currentPosition.clone().add(direction.multiplyScalar(idealDistance));
            this.moveTowards(targetPoint, this.attackSpeed, deltaTime);
        } else if (distance > idealDistance * 1.2) {
            // Çok uzak, yaklaş
            this.moveTowards(targetPosition, this.attackSpeed, deltaTime);
        } else {
            // İdeal mesafede, etrafında dön
            const orbitPoint = targetPosition.clone();
            const orbitRadius = idealDistance;
            const orbitSpeed = this.turnRate * 0.5;
            
            // Mevcut açıyı hesapla
            const currentAngle = Math.atan2(
                currentPosition.z - orbitPoint.z,
                currentPosition.x - orbitPoint.x
            );
            
            // Yeni açıyı hesapla
            const newAngle = currentAngle + orbitSpeed * deltaTime;
            
            // Yeni pozisyonu hesapla
            const newX = orbitPoint.x + Math.cos(newAngle) * orbitRadius;
            const newZ = orbitPoint.z + Math.sin(newAngle) * orbitRadius;
            const newY = orbitPoint.y + Math.sin(newAngle * 0.5) * orbitRadius * 0.2;
            
            const orbitPosition = new THREE.Vector3(newX, newY, newZ);
            this.moveTowards(orbitPosition, this.attackSpeed, deltaTime);
        }
        
        // Ateş et
        this.fireAtTarget(projectiles);
    }
    
    /**
     * Devriyeye dönüş davranışı
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    returnToPatrol(deltaTime) {
        if (this.aiWaypoints.length === 0) {
            this.aiState = 'patrolling';
            return;
        }
        
        // En yakın devriye noktasını bul
        let closestWaypoint = 0;
        let closestDistance = Infinity;
        
        for (let i = 0; i < this.aiWaypoints.length; i++) {
            const distance = this.getPosition().distanceTo(this.aiWaypoints[i]);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestWaypoint = i;
            }
        }
        
        // En yakın devriye noktasına git
        this.currentWaypoint = closestWaypoint;
        this.moveTowards(this.aiWaypoints[this.currentWaypoint], this.patrolSpeed, deltaTime);
        
        // Devriye noktasına ulaşıldı mı?
        if (closestDistance < this.waypointThreshold) {
            this.aiState = 'patrolling';
        }
    }
    
    /**
     * Belirli bir noktaya doğru hareket et
     * @param {THREE.Vector3} targetPosition - Hedef pozisyon
     * @param {number} speed - Hız
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    moveTowards(targetPosition, speed, deltaTime) {
        // Mevcut pozisyon ve rotasyon
        const currentPosition = this.getPosition();
        const currentRotation = this.getRotation();
        
        // Hedef yönü hesapla
        const direction = targetPosition.clone().sub(currentPosition).normalize();
        
        // Hedef rotasyonu hesapla
        const targetRotation = new THREE.Euler();
        
        // Pitch (X ekseni) - Yukarı/aşağı bakış
        targetRotation.x = Math.asin(-direction.y);
        
        // Yaw (Y ekseni) - Sağa/sola dönüş
        targetRotation.y = Math.atan2(direction.x, direction.z);
        
        // Roll (Z ekseni) - Yatay dönüş (hafif bir eğim ver)
        targetRotation.z = currentRotation.z * 0.95 + (Math.random() - 0.5) * 0.1;
        
        // Rotasyonu yumuşat
        const lerpFactor = this.turnRate * deltaTime;
        
        const newRotation = new THREE.Euler(
            this.lerpAngle(currentRotation.x, targetRotation.x, lerpFactor),
            this.lerpAngle(currentRotation.y, targetRotation.y, lerpFactor),
            this.lerpAngle(currentRotation.z, targetRotation.z, lerpFactor)
        );
        
        // Rotasyonu ayarla
        if (this.body) {
            this.body.quaternion.setFromEuler(
                newRotation.x,
                newRotation.y,
                newRotation.z,
                'XYZ'
            );
        }
        
        // Hızı ayarla
        this.speed = speed;
        
        // İleri hareket
        const forwardDir = new THREE.Vector3(0, 0, 1).applyEuler(newRotation);
        
        if (this.body) {
            this.body.velocity.set(
                forwardDir.x * this.speed,
                forwardDir.y * this.speed,
                forwardDir.z * this.speed
            );
        }
    }
    
    /**
     * İki açı arasında yumuşak geçiş yap
     * @param {number} a - Başlangıç açısı
     * @param {number} b - Hedef açı
     * @param {number} t - Geçiş faktörü (0-1)
     * @returns {number} - Ara açı
     */
    lerpAngle(a, b, t) {
        // Açı farkını hesapla
        let diff = b - a;
        
        // Açı farkını -PI ile PI arasına getir
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        // Yumuşak geçiş
        return a + diff * Math.min(1, t);
    }
    
    /**
     * Hedefe ateş et
     * @param {Array} projectiles - Mermiler
     */
    fireAtTarget(projectiles) {
        if (!this.aiTarget || !this.alive || this.ammo <= 0) return;
        
        const now = Date.now() / 1000; // saniye cinsinden
        
        // Ateş etme hızını kontrol et
        if (now - this.lastFireTime < this.fireRate) return;
        
        // Hedef pozisyonu
        const targetPosition = this.aiTarget.getPosition();
        
        // Mevcut pozisyon
        const currentPosition = this.getPosition();
        
        // Hedef yönü
        const direction = targetPosition.clone().sub(currentPosition).normalize();
        
        // Hedef mesafesi
        const distance = currentPosition.distanceTo(targetPosition);
        
        // Hedef hızı
        const targetVelocity = this.aiTarget.getSpeed ? this.aiTarget.getSpeed() : 0;
        
        // Öngörü faktörü (hedefin hareketini tahmin et)
        const predictionFactor = Math.min(distance * 0.01, 1.0) * targetVelocity;
        
        // Öngörülü hedef pozisyonu
        const predictedPosition = targetPosition.clone().add(
            direction.clone().multiplyScalar(predictionFactor)
        );
        
        // Düzeltilmiş hedef yönü
        const correctedDirection = predictedPosition.clone().sub(currentPosition).normalize();
        
        // Mermi oluştur
        if (projectiles && typeof projectiles.push === 'function') {
            // Mermi sayısını azalt
            this.ammo--;
            this.lastFireTime = now;
            
            // Ateş pozisyonu (uçağın önünde)
            const firePosition = currentPosition.clone().add(
                correctedDirection.clone().multiplyScalar(3)
            );
            
            // Projectile sınıfını import et ve yeni mermi oluştur
            const Projectile = require('./Projectile').Projectile;
            
            const projectile = new Projectile({
                ownerId: this.id,
                ownerName: this.name,
                team: this.team,
                position: firePosition,
                direction: correctedDirection,
                speed: 200,
                damage: this.damage,
                scene: this.scene,
                effects: this.effects
            });
            
            projectiles.push(projectile);
            
            // Ateş sesi çal
            if (this.effects) {
                this.effects.playFireSound();
            }
        }
    }
} 