/**
 * Enemy.js
 * Düşman uçaklar ve AI davranışlarını yöneten sınıf
 * Optimize edilmiş versiyon
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
        
        // AI Durumu - Basitleştirilmiş
        this.state = 'patrol';  // 'patrol', 'chase', 'attack', 'evade'
        this.targetPlayer = null;
        this.lastFireTime = 0;
        this.fireRate = 500;    // ms
        this.detectionRange = 300;
        this.attackRange = 150;
        this.evadeHealth = 30;
        this.awareness = 0.7;
        
        // Performans optimizasyonu ayarları
        this.updateFrequency = 5; // Kaç frame'de bir güncelleme
        this.updateCounter = 0;
        this.isActive = true; // Aktif AI durumu
        this.distanceToPlayer = Infinity;
        this.isVisible = true; // Görünür mü?
        this.cullingDistance = 2000; // Bu mesafeden uzaktaysa güncellenmesin
        
        // Optimize edilmiş yol bulma
        this.waypoints = this.generateSimpleWaypoints();
        this.currentWaypoint = 0;
        this.waypointThreshold = 50; // Hedefe varış için mesafe eşiği
        
        // Optimize edilmiş uçak oluşturma
        this.createOptimizedAircraft();
        
        console.log(`Optimized Enemy AI created: ${this.id}`);
    }
    
    /**
     * Optimize edilmiş uçak oluştur
     */
    createOptimizedAircraft() {
        // Düşman uçağı için ayarlar - daha basit geometri ve materyal ile
        const aircraftOptions = {
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
            maxAmmo: 200,
            useSimpleGeometry: true, // Basit geometri kullan
            enableShadows: false, // Gölgeler kapalı
            lowPolygonModel: true // Düşük poligonlu model
        };
        
        this.aircraft = new Aircraft(aircraftOptions);
    }
    
    /**
     * Basitleştirilmiş yol noktaları oluştur
     * @returns {Array} - Yol noktaları dizisi
     */
    generateSimpleWaypoints() {
        const points = [];
        // Daha az yol noktası
        const count = 4; // Daha az nokta
        const radius = 500;  // Daha dar alan
        const altitude = 200; // Sabit irtifa
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            points.push(new THREE.Vector3(x, altitude, z));
        }
        
        return points;
    }
    
    /**
     * Düşman uçağını güncelle - optimize edilmiş
     * @param {number} deltaTime - Geçen süre (saniye)
     * @param {Array} players - Oyuncu uçakları
     * @param {Array} projectiles - Mermiler
     */
    updateEnemy(deltaTime, players, projectiles) {
        // Uçak yok veya ölmüşse güncelleme
        if (!this.aircraft || !this.aircraft.isAlive()) {
            return;
        }
        
        // Performans için frame atlama
        this.updateCounter = (this.updateCounter + 1) % this.updateFrequency;
        if (this.updateCounter !== 0) {
            // Sadece uçak pozisyonu güncelle, AI hesaplamaları değil
            if (this.aircraft.update) {
                this.aircraft.update(deltaTime);
            }
            return;
        }
        
        // Eğer oyuncu yoksa veya uzaktaysa basitleştirilmiş davranış
        if (!players || players.length === 0) {
            this.simpleBehavior(deltaTime);
            return;
        }
        
        // En yakın oyuncu ile mesafeyi hesapla
        let nearestPlayer = null;
        let minDistance = Infinity;
        
        for (const player of players) {
            if (player && player.getPosition) {
                const playerPos = player.getPosition();
                if (playerPos) {
                    const distance = this.aircraft.getPosition().distanceTo(playerPos);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestPlayer = player;
                    }
                }
            }
        }
        
        this.distanceToPlayer = minDistance;
        
        // Çok uzaktaysa ve görünür değilse güncelleme yapma
        if (minDistance > this.cullingDistance && !this.isVisible) {
            return;
        }
        
        // Oyuncu yakındaysa ve görünürse tam AI güncelle
        this.targetPlayer = nearestPlayer;
        
        // AI durumunu güncelle - basitleştirilmiş
        this.updateSimpleAIState();
        
        // Duruma göre davran - optimizasyon için sade hareketler
        switch (this.state) {
            case 'patrol':
                this.simplePatrol(deltaTime);
                break;
            case 'chase':
                this.simpleChase(deltaTime);
                break;
            case 'attack':
                this.simpleAttack(deltaTime, projectiles);
                break;
            case 'evade':
                this.simpleEvade(deltaTime);
                break;
        }
    }
    
    /**
     * Basitleştirilmiş AI durum güncelleme
     */
    updateSimpleAIState() {
        // Uçak yoksa veya ölmüşse kaç
        if (!this.aircraft || !this.targetPlayer || !this.targetPlayer.getPosition) {
            this.state = 'patrol';
            return;
        }
        
        const targetPosition = this.targetPlayer.getPosition();
        if (!targetPosition) {
            this.state = 'patrol';
            return;
        }
        
        const distanceToTarget = this.aircraft.getPosition().distanceTo(targetPosition);
        
        // Sağlık düşükse kaç
        if (this.aircraft.health < this.evadeHealth) {
            this.state = 'evade';
            return;
        }
        
        // Hedefin uzaklığına göre durum belirle - basit kural tabanlı
        if (distanceToTarget <= this.attackRange) {
            this.state = 'attack';
        } else if (distanceToTarget <= this.detectionRange) {
            // Tespit farkındalığı - basitleştirilmiş
            const aware = Math.random() < this.awareness;
            this.state = aware ? 'chase' : 'patrol';
        } else {
            this.state = 'patrol';
        }
    }
    
    /**
     * Basit devriye davranışı
     * @param {number} deltaTime - Geçen süre
     */
    simplePatrol(deltaTime) {
        // Hedef yol noktası
        const target = this.waypoints[this.currentWaypoint];
        
        // Hedefe doğru hareket et
        this.moveTowardsSimple(target, 30, deltaTime);
        
        // Hedefe ulaştı mı?
        const distance = this.aircraft.getPosition().distanceTo(target);
        if (distance < this.waypointThreshold) {
            // Bir sonraki yol noktasına ilerle
            this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
        }
    }
    
    /**
     * Basit takip davranışı
     * @param {number} deltaTime - Geçen süre
     */
    simpleChase(deltaTime) {
        if (!this.targetPlayer || !this.targetPlayer.getPosition) {
            this.state = 'patrol';
            return;
        }
        
        const targetPosition = this.targetPlayer.getPosition();
        
        // Hedefe doğru hareket et - daha hızlı
        this.moveTowardsSimple(targetPosition, 40, deltaTime);
    }
    
    /**
     * Basit saldırı davranışı
     * @param {number} deltaTime - Geçen süre
     * @param {Array} projectiles - Mermiler
     */
    simpleAttack(deltaTime, projectiles) {
        if (!this.targetPlayer || !this.targetPlayer.getPosition) {
            this.state = 'patrol';
            return;
        }
        
        const targetPosition = this.targetPlayer.getPosition();
        
        // Hedefe doğru hareket et - orta hız
        this.moveTowardsSimple(targetPosition, 35, deltaTime);
        
        // Ateş etme - basitleştirilmiş
        const now = Date.now();
        if (now - this.lastFireTime > this.fireRate) {
            this.lastFireTime = now;
            this.simpleFireAtTarget(projectiles);
        }
    }
    
    /**
     * Basit kaçma davranışı
     * @param {number} deltaTime - Geçen süre
     */
    simpleEvade(deltaTime) {
        if (!this.targetPlayer || !this.targetPlayer.getPosition) {
            this.state = 'patrol';
            return;
        }
        
        const targetPosition = this.targetPlayer.getPosition();
        const myPosition = this.aircraft.getPosition();
        
        // Oyuncudan uzaklaş
        const evadeDirection = new THREE.Vector3().subVectors(myPosition, targetPosition).normalize();
        const evadeTarget = new THREE.Vector3().addVectors(myPosition, evadeDirection.multiplyScalar(300));
        
        // Kaçış noktasına doğru hareket et - maksimum hız
        this.moveTowardsSimple(evadeTarget, 50, deltaTime);
    }
    
    /**
     * Basitleştirilmiş hareket fonksiyonu
     * @param {THREE.Vector3} targetPosition - Hedef pozisyon
     * @param {number} speed - Hız
     * @param {number} deltaTime - Geçen süre
     */
    moveTowardsSimple(targetPosition, speed, deltaTime) {
        if (!this.aircraft || !this.aircraft.body) {
            return;
        }
        
        const myPosition = this.aircraft.getPosition();
        const direction = new THREE.Vector3().subVectors(targetPosition, myPosition).normalize();
        
        // Basit ileri hareket
        this.aircraft.body.velocity.x = direction.x * speed;
        this.aircraft.body.velocity.z = direction.z * speed;
        
        // Yükseklik ayarla - daha yumuşak
        const targetHeight = targetPosition.y;
        const currentHeight = myPosition.y;
        const heightDiff = targetHeight - currentHeight;
        this.aircraft.body.velocity.y = Math.sign(heightDiff) * Math.min(Math.abs(heightDiff), 20);
        
        // Dönüşü hesapla - basitleştirilmiş
        if (direction.length() > 0.001) {
            // Dönüş açısını hesapla - uçak genellikle x-z düzleminde hareket eder
            const targetAngle = Math.atan2(direction.x, direction.z);
            
            // Quaternion'a çevir
            const targetQuaternion = new THREE.Quaternion();
            targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
            
            // Yumuşak dönüş - SLERP kullanmadan basit interpolasyon
            const currentQuaternion = this.aircraft.getQuaternion();
            currentQuaternion.x += (targetQuaternion.x - currentQuaternion.x) * 0.05;
            currentQuaternion.y += (targetQuaternion.y - currentQuaternion.y) * 0.05;
            currentQuaternion.z += (targetQuaternion.z - currentQuaternion.z) * 0.05;
            currentQuaternion.w += (targetQuaternion.w - currentQuaternion.w) * 0.05;
            currentQuaternion.normalize();
            
            // Uçağın dönüşünü güncelle
            this.aircraft.body.quaternion.copy(currentQuaternion);
        }
    }
    
    /**
     * Basit ateş etme davranışı
     * @param {Array} projectiles - Mermiler
     */
    simpleFireAtTarget(projectiles) {
        if (!this.aircraft || !this.targetPlayer || !projectiles) {
            return;
        }
        
        try {
            const position = this.aircraft.getPosition().clone();
            
            // Yön hesapla - oyuncuya doğru
            let direction;
            
            if (this.targetPlayer.getPosition) {
                // Basit hedefleme - lead hesaplaması olmadan doğrudan oyuncuya
                const targetPos = this.targetPlayer.getPosition();
                direction = new THREE.Vector3().subVectors(targetPos, position).normalize();
            } else {
                // Hedef yoksa ileri ateş et
                direction = new THREE.Vector3(0, 0, 1).applyQuaternion(this.aircraft.getQuaternion());
            }
            
            // Uçağın ön tarafına offset ekle
            position.add(direction.clone().multiplyScalar(3));
            
            // Basit mermi oluştur
            const projectile = new Projectile({
                id: `projectile-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                ownerId: this.id,
                position: position,
                direction: direction,
                speed: 80,
                damage: 5,
                scene: this.scene,
                lifeTime: 2, // Daha kısa ömür
                ownerObject: this.aircraft,
                team: 'red',
                color: 0xff0000,
                createTrail: false, // Trail efekti kapalı
                addLight: false, // Işık efekti kapalı
                useSimpleGeometry: true // Basit geometri
            });
            
            projectiles.push(projectile);
            
            // Ses efektini sadece yakındayken oynat - performans için
            if (this.effects && this.distanceToPlayer < 200) {
                this.effects.playFireSound();
            }
        } catch (error) {
            console.error('Error in simpleFireAtTarget:', error);
        }
    }
    
    /**
     * Sadece uzaktayken basit devriye davranışı
     * @param {number} deltaTime - Geçen süre
     */
    simpleBehavior(deltaTime) {
        // Basit devriye
        this.simplePatrol(deltaTime);
    }
    
    /**
     * Düşman görünürlüğünü ayarla - kullanılmayan hesaplamaları atla
     * @param {boolean} visible - Görünür mü
     */
    setVisible(visible) {
        this.isVisible = visible;
        
        if (this.aircraft && this.aircraft.mesh) {
            this.aircraft.mesh.visible = visible;
        }
    }
    
    /**
     * LOD (Level of Detail) Ayarlaması
     * @param {number} distanceToCamera - Kameraya olan uzaklık
     */
    updateLOD(distanceToCamera) {
        if (!this.aircraft) return;
        
        // Mesafeye göre güncelleme sıklığını ayarla
        if (distanceToCamera > 2000) {
            this.updateFrequency = 15; // Çok seyrek güncelle
            this.setVisible(false);
        } else if (distanceToCamera > 1000) {
            this.updateFrequency = 10;
            this.setVisible(true);
        } else if (distanceToCamera > 500) {
            this.updateFrequency = 5;
            this.setVisible(true);
        } else {
            this.updateFrequency = 2; // Daha sık güncelle
            this.setVisible(true);
        }
    }
    
    // Skor, öldürme ve ölüm sayılarını tutan metodlar aynı kalabilir
    getScore() {
        return 0;
    }
    
    getKills() {
        return 0;
    }
    
    getDeaths() {
        return 0;
    }
} 