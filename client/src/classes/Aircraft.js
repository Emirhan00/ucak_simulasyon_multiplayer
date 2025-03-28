/**
 * Aircraft.js
 * Uçak sınıfı, uçak fiziği ve kontrollerini yönetir
 * Optimize edilmiş versiyon
 */
import { GameConstants } from '../constants/GameConstants.js';
import { EngineSystem } from './EngineSystem.js';

export class Aircraft {
    constructor(options) {
        try {
            // Varsayılan değerler
            this.id = options.id || `aircraft_${Date.now()}`;
            this.name = options.name || 'Aircraft';
            this.type = options.type || 'fighter';
            this.isRemote = options.isRemote || false;
            
            // Uçak tipi verilerini al
            this.aircraftData = GameConstants.AIRCRAFT_TYPES[this.type.toUpperCase()] || GameConstants.AIRCRAFT_TYPES.FIGHTER;
            
            // Fizik parametreleri
            this.mass = this.aircraftData.mass || GameConstants.PHYSICS.AIRCRAFT.MASS;
            this.maxSpeed = this.aircraftData.maxSpeed || GameConstants.PHYSICS.AIRCRAFT.MAX_SPEED;
            this.acceleration = this.aircraftData.acceleration || GameConstants.PHYSICS.AIRCRAFT.ACCELERATION;
            this.rotationSpeed = this.aircraftData.rotationSpeed || GameConstants.PHYSICS.AIRCRAFT.ROTATION_SPEED;
            
            // Uçak durumu
            this.speed = 0;
            this.verticalSpeed = 0;
            this.lastPosition = new THREE.Vector3();
            this.alive = true;
            this.health = 100;
            this.maxHealth = 100;
            this.ammo = 100;
            this.maxAmmo = 100;
            this.damage = 10;
            this.score = 0;
            this.kills = 0;
            this.deaths = 0;
            
            // Owner ve kontrol
            this.ownerId = options.ownerId || null;
            this.scene = options.scene || null;
            this.physics = options.physics || null;
            this.position = options.position || new THREE.Vector3(0, 100, 0);
            this.rotation = new THREE.Euler();
            this.quaternion = new THREE.Quaternion();
            this.velocity = new THREE.Vector3();
            this.angularVelocity = new THREE.Vector3();
            this.modelRotation = options.modelRotation || new THREE.Euler(0, 0, 0);
            
            // Gövde ve görünüm
            this.body = null;
            this.mesh = null;
            this.collisionMesh = null;
            this.modelScale = options.modelScale || new THREE.Vector3(1, 1, 1);
            this.color = options.color || 0x3333ff;
            this.team = options.team || 'blue';
            this.engineSystem = new EngineSystem(this);
            
            // Input ve kontroller
            this.inputs = {
                pitch: 0,
                roll: 0,
                yaw: 0,
                throttle: 0,
                brake: false,
                boost: false,
                fire: false
            };
            
            // Efekt yöneticisi
            this.effects = options.effects || null;
            
            // Performans optimizasyonu ayarları
            this.useSimpleGeometry = options.useSimpleGeometry || false;
            this.enableShadows = options.enableShadows !== undefined ? options.enableShadows : true;
            this.lowPolygonModel = options.lowPolygonModel || false;
            this.updateFrequency = options.updateFrequency || 1;
            this.updateCounter = 0;
            this.renderDistance = options.renderDistance || 2000;
            this.isVisible = true;
            this.lodLevel = 0; // 0: Tam detay, 1: Orta detay, 2: Düşük detay
            this.lastLodUpdateTime = 0;
            this.lodUpdateInterval = 500; // ms
            
            // Fizik ve görsel öğeleri başlat
            this.initialize(options);
            
            // Debug modu
            this.debug = false;
        } catch (error) {
            console.error('Error initializing aircraft:', error);
        }
    }
    
    /**
     * Uçağı başlat - Optimize edilmiş versiyon
     * @param {Object} options - Başlatma seçenekleri
     */
    initialize(options) {
        // Scene ve physics kontrolü
        if (!this.scene) {
            console.error('Scene is required for aircraft initialization');
            return;
        }
        
        if (!this.physics) {
            console.error('Physics is required for aircraft initialization');
            return;
        }
        
        try {
            // Fizik gövdesini oluştur
            this.createPhysicsBody(options);
            
            // Görsel modelini oluştur
            this.createVisualModel(options);
            
            // Çarpışma callback'ini ekle
            if (this.physics && !this.isRemote) {
                this.physics.addCollisionCallback(this.id, this.handleCollision.bind(this));
            }
        } catch (error) {
            console.error('Error in aircraft initialization:', error);
        }
    }
    
    /**
     * Fizik gövdesini oluştur - Optimize edilmiş versiyon
     * @param {Object} options - Gövde oluşturma seçenekleri
     */
    createPhysicsBody(options) {
        try {
            // Fizik sistemi yüklü değilse atlayalım
            if (!this.physics || !this.physics.createAircraftBody) {
                console.error('Physics system not available');
                return;
            }
            
            // Eğer basit geometri kullanılacaksa, daha basit bir fizik gövdesi oluştur
            const createOptions = {
                id: this.id,
                mass: this.mass,
                position: new CANNON.Vec3(
                    this.position.x,
                    this.position.y,
                    this.position.z
                ),
                size: new CANNON.Vec3(3, 1, 6),
                useSimpleShape: this.useSimpleGeometry || this.lowPolygonModel
            };
            
            // Uzaktan kontrol edilen uçaklar için daha basit fizik
            if (this.isRemote) {
                createOptions.linearDamping = 0.1; // Daha yüksek sönümleme
                createOptions.updateFrequency = 2; // Daha seyrek güncelleme
            }
            
            // Aircraft fiziği oluştur
            this.body = this.physics.createAircraftBody(createOptions);
            
            if (!this.body) {
                throw new Error('Failed to create aircraft physics body');
            }
            
            // Başlangıç pozisyonunu eşitle
            this.syncPositionWithBody();
        } catch (error) {
            console.error('Error creating aircraft physics body:', error);
        }
    }
    
    /**
     * Görsel modeli oluştur - Optimize edilmiş versiyon
     * @param {Object} options - Model oluşturma seçenekleri 
     */
    createVisualModel(options) {
        try {
            // Ekran kartını yormayacak basit bir model oluştur
            let geometry;
            
            if (this.useSimpleGeometry || this.lowPolygonModel) {
                // Basit geometri: Sadece bir kutu
                geometry = new THREE.BoxGeometry(3, 1, 6);
            } else {
                // Normal detaylı uçak modeli
                geometry = this.createBasicAircraftGeometry();
            }
            
            // Materyal - takıma göre renk
            const material = new THREE.MeshLambertMaterial({ 
                color: this.color,
                flatShading: true, // Daha hızlı render
                emissive: 0x000000,
                specular: 0x111111,
                shininess: 30
            });
            
            // Mesh oluştur
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.name = `aircraft_${this.id}`;
            this.mesh.userData.id = this.id;
            this.mesh.userData.type = 'aircraft';
            this.mesh.userData.ownerId = this.ownerId;
            
            // Gölgeler - performans için opsiyonel
            if (this.enableShadows) {
                this.mesh.castShadow = true;
                this.mesh.receiveShadow = false;
            } else {
                this.mesh.castShadow = false;
                this.mesh.receiveShadow = false;
            }
            
            // Pozisyon ve rotasyonu ayarla
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
            this.mesh.scale.copy(this.modelScale);
            
            // Sahneye ekle
            this.scene.add(this.mesh);
            
            // Mesh'in görünür olduğundan emin ol
            this.mesh.visible = true;
            
            // Motor ve egzoz efektleri
            if (this.effects && !this.isRemote) {
                this.engineSystem.createEngineEffects(this.effects);
            }
            
            // Takım rengine göre ışık ekle - opsiyonel
            if (!this.useSimpleGeometry && !this.lowPolygonModel) {
                this.addTeamLight();
            }
        } catch (error) {
            console.error('Error creating aircraft visual model:', error);
        }
    }
    
    /**
     * Basit uçak geometrisi oluştur - düşük poligon model
     * @returns {THREE.BufferGeometry} - Uçak geometrisi
     */
    createBasicAircraftGeometry() {
        // Basit uçak geometrisi oluştur
        const geometry = new THREE.BufferGeometry();
        
        // Düşük poligonlu bir uçak modeli için vertexler
        const vertices = new Float32Array([
            // Gövde - kanat - kuyruk için basit vertexler
            // Kübik değil biraz daha uçak formunda
            // Ana gövde
            0, 0, 3,    // 0: burun
            1, 0, 0,    // 1: sağ gövde orta
            -1, 0, 0,   // 2: sol gövde orta
            0, 0.5, 0,  // 3: gövde üst
            0, -0.5, 0, // 4: gövde alt
            0, 0, -3,   // 5: kuyruk
            
            // Kanatlar
            3, 0, 0,    // 6: sağ kanat ucu
            -3, 0, 0,   // 7: sol kanat ucu
            
            // Kuyruk kanatları
            1, 0.5, -2,  // 8: sağ kuyruk kanadı
            -1, 0.5, -2, // 9: sol kuyruk kanadı
            0, 1, -2     // 10: dikey kuyruk kanadı
        ]);
        
        // Yüzeyler için indeksler
        const indices = [
            // Gövde
            0, 1, 3,
            0, 3, 2,
            0, 2, 4,
            0, 4, 1,
            5, 3, 1,
            5, 2, 3,
            5, 4, 2,
            5, 1, 4,
            
            // Kanatlar
            1, 6, 3,
            1, 4, 6,
            2, 3, 7,
            2, 7, 4,
            
            // Kuyruk kanatları
            5, 8, 10,
            5, 10, 9,
            5, 9, 5
        ];
        
        // UV koordinatları - basit
        const uvs = new Float32Array([
            0.5, 1.0,  // 0
            0.75, 0.5, // 1
            0.25, 0.5, // 2
            0.5, 0.75, // 3
            0.5, 0.25, // 4
            0.5, 0.0,  // 5
            1.0, 0.5,  // 6
            0.0, 0.5,  // 7
            0.75, 0.25, // 8
            0.25, 0.25, // 9
            0.5, 0.25   // 10
        ]);
        
        // Geometriyi oluştur
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        
        // Normal hesapla
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    /**
     * Takım rengine göre ışık ekle - düşük yoğunlukta
     */
    addTeamLight() {
        // Takım rengi ışığı - performans optimizasyonu için basit
        const lightColor = this.team === 'blue' ? 0x0000ff : 0xff0000;
        const light = new THREE.PointLight(lightColor, 0.5, 10);
        light.position.set(0, 0, 0);
        this.mesh.add(light);
    }
    
    /**
     * Çarpışma olayını işle
     * @param {string} otherBodyId - Çarpışan diğer gövdenin ID'si
     * @param {Object} event - Çarpışma olayı
     */
    handleCollision(otherBodyId, event) {
        if (!this.alive) return;
        
        // Çarpışma tipine göre işlem yap
        if (otherBodyId === 'ground') {
            // Yere çarpma
            this.damage(this.health); // Ölümcül hasar
        } else if (otherBodyId.startsWith('balloon_')) {
            // Balona çarpma
            this.balloonCount++;
            this.addScore(GameConstants.MISSIONS.BALLOON_POINTS);
        } else if (otherBodyId.startsWith('aircraft_')) {
            // Diğer uçağa çarpma
            this.damage(20);
        }
    }
    
    /**
     * Hasar al
     * @param {number} amount - Hasar miktarı
     */
    damage(amount) {
        if (!this.alive) return;
        
        this.health -= amount;
        
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }
    
    /**
     * Öl
     */
    die() {
        if (!this.alive) return;
        
        this.alive = false;
        this.deaths++;
        
        // Patlama efekti
        if (this.effects) {
            this.effects.createExplosion(this.getPosition(), 2);
        }
        
        // Fizik gövdesini devre dışı bırak
        if (this.body) {
            this.body.type = CANNON.Body.STATIC;
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
        }
        
        // Mesh'i gizle
        this.mesh.visible = false;
    }
    
    /**
     * Yeniden doğ
     */
    respawn() {
        if (this.alive || this.respawning) return;
        
        this.respawning = true;
        
        // Rastgele pozisyon
        const x = (Math.random() - 0.5) * 1000;
        const y = 100 + Math.random() * 200;
        const z = (Math.random() - 0.5) * 1000;
        
        // Pozisyonu ayarla
        if (this.body) {
            this.body.position.set(x, y, z);
            this.body.quaternion.set(0, 0, 0, 1);
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            this.body.type = CANNON.Body.DYNAMIC;
        }
        
        // Mesh'i göster
        this.mesh.visible = true;
        
        // Durumu sıfırla
        this.health = this.maxHealth;
        this.ammo = this.maxAmmo;
        this.speed = 0;
        this.alive = true;
        this.respawning = false;
    }
    
    /**
     * Skor ekle
     * @param {number} amount - Skor miktarı
     */
    addScore(amount) {
        this.score += amount;
    }
    
    /**
     * Öldürme sayısını artır
     */
    addKill() {
        this.kills++;
        this.addScore(GameConstants.MISSIONS.PLAYER_KILL_POINTS);
    }
    
    /**
     * Bayrak yakala
     */
    captureFlag() {
        this.flagCaptured = true;
        this.addScore(GameConstants.MISSIONS.FLAG_CAPTURE_POINTS);
    }
    
    /**
     * Bayrak taşıyıcısını koru
     */
    defendFlagCarrier() {
        this.defendedFlagCarrier = true;
        this.addScore(50);
    }
    
    /**
     * Hedef pozisyonu ayarla (uzak oyuncular için)
     * @param {THREE.Vector3} position - Hedef pozisyon
     */
    setTargetPosition(position) {
        this.targetPosition = position;
    }
    
    /**
     * Hedef rotasyonu ayarla (uzak oyuncular için)
     * @param {THREE.Euler} rotation - Hedef rotasyon
     */
    setTargetRotation(rotation) {
        this.targetRotation = rotation;
    }
    
    /**
     * Hızı ayarla (uzak oyuncular için)
     * @param {number} speed - Hız
     */
    setSpeed(speed) {
        this.speed = speed;
    }
    
    /**
     * Pozisyonu al
     * @returns {THREE.Vector3} - Pozisyon
     */
    getPosition() {
        if (this.body) {
            return new THREE.Vector3(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z
            );
        }
        return this.mesh.position;
    }
    
    /**
     * Rotasyonu al
     * @returns {THREE.Euler} - Rotasyon
     */
    getRotation() {
        if (this.mesh) {
            return new THREE.Euler().setFromQuaternion(this.mesh.quaternion);
        }
        return new THREE.Euler();
    }
    
    /**
     * Quaternion al
     * @returns {THREE.Quaternion} - Quaternion
     */
    getQuaternion() {
        if (this.body) {
            return new THREE.Quaternion(
                this.body.quaternion.x,
                this.body.quaternion.y,
                this.body.quaternion.z,
                this.body.quaternion.w
            );
        }
        return this.mesh.quaternion;
    }
    
    /**
     * Hızı al
     * @returns {number} - Hız
     */
    getSpeed() {
        return this.speed;
    }
    
    /**
     * Dikey hızı al
     * @returns {number} - Dikey hız
     */
    getVerticalSpeed() {
        return this.verticalSpeed;
    }
    
    /**
     * Mesh'i al
     * @returns {THREE.Group} - Mesh
     */
    getMesh() {
        return this.mesh;
    }
    
    /**
     * Fizik gövdesini al
     * @returns {CANNON.Body} - Fizik gövdesi
     */
    getBody() {
        return this.body;
    }
    
    /**
     * Mermi sayısını al
     * @returns {number} - Mermi sayısı
     */
    getAmmo() {
        return this.ammo;
    }
    
    /**
     * Maksimum mermi sayısını al
     * @returns {number} - Maksimum mermi sayısı
     */
    getMaxAmmo() {
        return this.maxAmmo;
    }
    
    /**
     * Skoru al
     * @returns {number} - Skor
     */
    getScore() {
        return this.score;
    }
    
    /**
     * Öldürme sayısını al
     * @returns {number} - Öldürme sayısı
     */
    getKills() {
        return this.kills;
    }
    
    /**
     * Ölüm sayısını al
     * @returns {number} - Ölüm sayısı
     */
    getDeaths() {
        return this.deaths;
    }
    
    /**
     * Balon sayısını al
     * @returns {number} - Balon sayısı
     */
    getBalloonCount() {
        return this.balloonCount;
    }
    
    /**
     * Bayrak yakaladı mı?
     * @returns {boolean} - Bayrak yakaladı mı?
     */
    hasCapturedFlag() {
        return this.flagCaptured;
    }
    
    /**
     * Bayrak taşıyıcısını korudu mu?
     * @returns {boolean} - Bayrak taşıyıcısını korudu mu?
     */
    hasDefendedFlagCarrier() {
        return this.defendedFlagCarrier;
    }
    
    /**
     * Hayatta mı?
     * @returns {boolean} - Hayatta mı?
     */
    isAlive() {
        return this.alive;
    }
    
    /**
     * Temizle
     */
    dispose() {
        // Fizik gövdesini kaldır
        if (this.physics && this.body) {
            this.physics.removeBody(this.body);
            this.physics.removeCollisionCallback(this.id);
        }
        
        // Mesh'i kaldır
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
        
        // Geometrileri ve materyalleri temizle
        if (this.mesh) {
            this.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }
    
    /**
     * Aerodinamik kuvvetleri uygula
     * @param {number} deltaTime - Geçen süre (saniye)
     * @param {Object} inputs - Kontrol girdileri
     */
    applyAerodynamics(deltaTime, inputs) {
        if (!this.body) return;
        
        try {
            // Basitleştirilmiş aerodinamik model
            
            // 1. Yerçekimi kuvveti - Daha gerçekçi bir yerçekimi etkisi
            const gravityForce = new CANNON.Vec3(0, -9.81 * this.body.mass, 0);
            this.body.applyForce(gravityForce, new CANNON.Vec3(0, 0, 0));
            
            // 2. Sürüklenme (Drag) - Hıza ters yönde etki eder
            const velocity = this.body.velocity;
            const speed = this.speed;
            
            // Hız çok düşükse hesaplama yapma
            if (speed < 1.0) return;
            
            // Sürüklenme katsayısı
            let dragCoefficient = 0.05;
            
            // İniş takımı açıksa sürüklenmeyi artır
            if (this.landingGear) {
                dragCoefficient *= 1.5;
            }
            
            // Flap açıksa sürüklenmeyi artır
            dragCoefficient *= (1.0 + this.flapsPosition * 0.5);
            
            // Airbrake açıksa sürüklenmeyi artır
            if (inputs.brakes) {
                dragCoefficient *= 2.0;
            }
            
            // Sürüklenme kuvveti (hızın karesiyle orantılı)
            const dragForce = dragCoefficient * speed * speed;
            
            // Hız vektörünün birim vektörü
            const velocityDir = new CANNON.Vec3(
                velocity.x / speed,
                velocity.y / speed,
                velocity.z / speed
            );
            
            // Sürüklenme kuvvetini uygula (hıza ters yönde)
            const dragVector = new CANNON.Vec3(
                -velocityDir.x * dragForce,
                -velocityDir.y * dragForce,
                -velocityDir.z * dragForce
            );
            
            // Kuvveti uygula
            this.body.applyForce(dragVector, new CANNON.Vec3(0, 0, 0));
            
            // 3. Kaldırma Kuvveti (Lift) - Hıza bağlı olarak yukarı yönde etki eder
            // Kaldırma kuvveti, hızın karesiyle orantılıdır
            const liftCoefficient = 0.03; // Kaldırma katsayısı
            const liftForce = liftCoefficient * speed * speed;
            
            // Uçağın yukarı vektörü
            const upDir = new CANNON.Vec3(0, 1, 0);
            const worldUp = new CANNON.Vec3();
            this.body.quaternion.vmult(upDir, worldUp);
            
            // Kaldırma kuvvetini uygula (uçağın yukarı yönünde)
            const liftVector = new CANNON.Vec3(
                worldUp.x * liftForce,
                worldUp.y * liftForce,
                worldUp.z * liftForce
            );
            
            // Kuvveti uygula
            this.body.applyForce(liftVector, new CANNON.Vec3(0, 0, 0));
            
            // 4. İtme Kuvveti (Thrust) - Motor gücüne bağlı olarak ileri yönde etki eder
            // İtme kuvveti, throttle değeriyle orantılıdır
            const maxThrust = 100; // Maksimum itme kuvveti
            const thrustForce = maxThrust * this.throttle;
            
            // Uçağın ileri vektörü
            const forwardDir = new CANNON.Vec3(0, 0, 1);
            const worldForward = new CANNON.Vec3();
            this.body.quaternion.vmult(forwardDir, worldForward);
            
            // İtme kuvvetini uygula (uçağın ileri yönünde)
            const thrustVector = new CANNON.Vec3(
                worldForward.x * thrustForce,
                worldForward.y * thrustForce,
                worldForward.z * thrustForce
            );
            
            // Kuvveti uygula
            this.body.applyForce(thrustVector, new CANNON.Vec3(0, 0, 0));
            
            // 5. Kontrol Yüzeyleri - Kullanıcı girdilerine bağlı olarak tork uygula
            
            // Pitch kontrolü (elevator)
            const pitchTorque = new CANNON.Vec3(
                inputs.pitch * 20 * speed, // Hızla orantılı
                0,
                0
            );
            
            // Roll kontrolü (ailerons)
            const rollTorque = new CANNON.Vec3(
                0,
                0,
                inputs.roll * 15 * speed // Hızla orantılı
            );
            
            // Yaw kontrolü (rudder)
            const yawTorque = new CANNON.Vec3(
                0,
                inputs.yaw * 10 * speed, // Hızla orantılı
                0
            );
            
            // Torkları uygula
            this.body.applyTorque(pitchTorque);
            this.body.applyTorque(rollTorque);
            this.body.applyTorque(yawTorque);
            
            // 6. Stabilizasyon - Uçağın dengede kalmasını sağlar
            
            // Yatay stabilizasyon (roll)
            // Dünya yukarı vektörü ile uçağın yukarı vektörü arasındaki açı
            const dotProduct = worldUp.dot(new CANNON.Vec3(0, 1, 0));
            const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
            
            // Stabilizasyon kuvveti (açıyla orantılı)
            const stabilizationFactor = 0.5; // Stabilizasyon gücü
            const stabilizationForce = angle * stabilizationFactor * speed;
            
            // Stabilizasyon torku hesapla
            const rightDir = new CANNON.Vec3(1, 0, 0);
            const worldRight = new CANNON.Vec3();
            this.body.quaternion.vmult(rightDir, worldRight);
            
            // Düzeltme yönünü hesapla (çapraz çarpım)
            const correctionDir = new CANNON.Vec3();
            worldUp.cross(new CANNON.Vec3(0, 1, 0), correctionDir);
            
            // Stabilizasyon torkunu uygula
            if (Math.abs(angle) > 0.05 && !inputs.roll) { // Sadece roll input yoksa stabilize et
                const stabilizationTorque = new CANNON.Vec3(
                    correctionDir.x * stabilizationForce,
                    correctionDir.y * stabilizationForce,
                    correctionDir.z * stabilizationForce
                );
                
                this.body.applyTorque(stabilizationTorque);
            }
            
            // 7. Stall Durumu - Çok yüksek hücum açısında kaldırma kuvveti kaybı
            
            // Uçağın ileri vektörü
            const horizontalDir = new CANNON.Vec3(worldForward.x, 0, worldForward.z);
            horizontalDir.normalize();
            
            const forwardDotHorizontal = worldForward.dot(horizontalDir);
            const attackAngle = Math.acos(Math.max(-1, Math.min(1, forwardDotHorizontal))) * (180 / Math.PI);
            
            // Stall durumunu kontrol et
            const stallAngle = 20; // 20 derece üzerinde stall başlar
            
            if (attackAngle > stallAngle && speed > 10) {
                // Stall durumunda kontrol yüzeylerinin etkinliğini azalt
                this.body.angularDamping = 0.5; // Dönüş kontrolünü azalt
                
                // Stall'dan çıkış için burnu aşağı eğilimini artır
                const recoveryForce = new CANNON.Vec3(0, -20, 0);
                this.body.applyForce(recoveryForce, new CANNON.Vec3(0, 0, 0));
                
                // Stall uyarısı
                if (!this.isStalling) {
                    this.isStalling = true;
                    console.log('STALL WARNING!');
                    
                    // Stall sesi
                    if (this.effects && this.effects.playStallWarningSound) {
                        this.effects.playStallWarningSound();
                    }
                }
            } else {
                // Normal uçuş durumunda
                this.body.angularDamping = 0.1;
                
                if (this.isStalling) {
                    this.isStalling = false;
                    console.log('Stall recovered');
                }
            }
            
            // 8. Yer Etkisi (Ground Effect) - Yere yakın uçarken kaldırma kuvveti artar
            
            // Yerden yükseklik
            const altitude = this.body.position.y;
            const wingSpan = 10; // Kanat açıklığı (m)
            
            // Yer etkisi faktörü (yükseklik kanat açıklığının yarısından azsa etki başlar)
            if (altitude < wingSpan / 2 && speed > 10) {
                const groundEffectFactor = 1.0 - (altitude / (wingSpan / 2));
                const groundEffectForce = groundEffectFactor * 10 * speed;
                
                // Yer etkisi kuvvetini uygula (yukarı yönde)
                const groundEffectVector = new CANNON.Vec3(0, groundEffectForce, 0);
                this.body.applyForce(groundEffectVector, new CANNON.Vec3(0, 0, 0));
            }
            
        } catch (error) {
            console.error('Error in applyAerodynamics:', error);
        }
    }
    
    /**
     * Uçağı güncelle - Fizik ve görsel güncelleme
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    update(deltaTime) {
        try {
            // Eğer uçak ölüyse güncelleme yapma
            if (!this.alive) {
                return;
            }
            
            // Fizik gövdesi yoksa güncelleme yapma
            if (!this.body) {
                return;
            }
            
            // Uçağın fizik gövdesinden pozisyon ve rotasyon bilgilerini al
            this.position.set(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z
            );
            
            this.quaternion.set(
                this.body.quaternion.x,
                this.body.quaternion.y,
                this.body.quaternion.z,
                this.body.quaternion.w
            );
            
            // Euler açılarını quaternion'dan hesapla
            this.rotation.setFromQuaternion(this.quaternion);
            
            // Mesh varsa pozisyon ve rotasyonu güncelle
            if (this.mesh) {
                this.mesh.position.copy(this.position);
                this.mesh.quaternion.copy(this.quaternion);
            }
            
            // Yerçekimine karşı kaldırma kuvveti uygula
            // Bu, uçağın düşmesini engelleyecek
            if (this.body) {
                // Yerçekimi kuvvetini dengele - tam dengelemek yerine hafif bir kaldırma kuvveti uygula
                const gravity = new CANNON.Vec3(0, -9.82, 0); // Yerçekimi vektörü
                const antiGravity = gravity.scale(-0.95); // Yerçekiminin %95'ini dengele, böylece uçak sabit kalır
                
                // Uçağa kaldırma kuvveti uygula
                this.body.applyForce(antiGravity.scale(this.mass), this.body.position);
                
                // Hız sınırlaması uygula
                if (this.body.position.y > 300) {
                    // 300 birim yüksekliğin üzerine çıkmasını önle
                    this.body.position.y = 300;
                    this.body.velocity.y = Math.min(0, this.body.velocity.y);
                }
            }
            
            // Motor sistemini güncelle
            if (this.engineSystem) {
                this.engineSystem.update(deltaTime, this.inputs);
            }
        } catch (error) {
            console.error('Error updating aircraft:', error);
        }
    }
} 