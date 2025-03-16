/**
 * Aircraft.js
 * Uçak sınıfı, uçak fiziği ve kontrollerini yönetir
 */
import { GameConstants } from '../constants/GameConstants.js';
import { EngineSystem } from './EngineSystem.js';

export class Aircraft {
    constructor(options) {
        try {
            // THREE yüklü mü kontrol et
            if (typeof THREE === 'undefined') {
                console.error('THREE is not defined. Make sure Three.js is loaded.');
                throw new Error('THREE is not defined');
            }
            
            // Options kontrolü
            if (!options) {
                console.error('Aircraft options not provided');
                throw new Error('Aircraft options not provided');
            }
            
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
            this.balloonCount = 0;
            this.isStalling = false;
            
            // Uçuş durumu
            this.isOnGround = true;        // Uçak yerde mi?
            this.isEngineStarted = false;  // Motor çalışıyor mu?
            this.isTakingOff = false;      // Kalkış yapıyor mu?
            this.isLanding = false;        // İniş yapıyor mu?
            this.groundContact = false;    // Yerle temas var mı?
            this.takeoffSpeed = 30;        // Kalkış hızı (m/s)
            this.landingGear = true;       // İniş takımları açık mı?
            this.flapsPosition = 0;        // Flap pozisyonu (0-1)
            
            // Kontrol durumları
            this.prevEngineToggle = false;
            this.prevGearToggle = false;
            this.prevFlapsToggle = false;
            this.prevTakeoffToggle = false;
            this.prevLandingToggle = false;
            
            // Uzak uçak için interpolasyon
            this.targetPosition = null;
            this.targetRotation = null;
            this.lerpFactor = 0.1;
            
            // Ateş etme parametreleri
            this.lastFireTime = 0;
            this.fireRate = 0.2; // saniye
            
            // Three.js mesh
            this.mesh = null;
            
            // Cannon.js body
            this.body = null;
            
            // Referanslar
            this.scene = options.scene;
            this.physics = options.physics;
            this.effects = options.effects;
            this.ui = options.ui;
            
            // Scene kontrolü
            if (!this.scene) {
                console.warn('Scene not provided to Aircraft');
            }
            
            // Uçak modelini oluştur
            const position = options.position || new THREE.Vector3(0, 0, 0);
            this.createAircraft(position);
            
            // Motor sistemini oluştur
            if (!this.isRemote) {
                try {
                    this.engine = new EngineSystem(this, {
                        enginePower: this.aircraftData.enginePower || GameConstants.PHYSICS.AIRCRAFT.TYPES.FIGHTER.ENGINE_POWER,
                        fuselageLength: 10
                    });
                    console.log('Engine system created successfully');
                } catch (error) {
                    console.error('Error creating engine system:', error);
                    // Motor sistemi oluşturulamazsa, uçak yine de çalışabilir
                    this.engine = null;
                }
            }
            
            console.log(`Aircraft created: ${this.id}, ${this.type}, position: ${position.x}, ${position.y}, ${position.z}`);
        } catch (error) {
            console.error('Error creating aircraft:', error);
            throw error; // Kritik bir hata, yeniden fırlat
        }
    }
    
    /**
     * Uçak modelini oluştur
     * @param {THREE.Vector3} position - Başlangıç pozisyonu
     */
    createAircraft(position) {
        // İlk olarak eski uçak modelini oluştur (yedek olarak)
        this.createBasicAircraft(position);
        
        // GLTF model yükle (varsa)
        this.loadAircraftModel(position);
    }
    
    createBasicAircraft(position) {
        try {
            // Uçak gövdesi
            const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.8, 4, 8);
            const bodyMaterial = new THREE.MeshPhongMaterial({
                color: this.options.color || 0x0077be,
                shininess: 100,
                specular: 0x111111
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.rotation.x = Math.PI / 2;
            body.castShadow = true;
            body.receiveShadow = true;
            
            // Kanatlar
            const wingGeometry = new THREE.BoxGeometry(7, 0.2, 1.5);
            const wingMaterial = new THREE.MeshPhongMaterial({
                color: this.options.color || 0x0077be,
                shininess: 30,
                specular: 0x222222
            });
            const wings = new THREE.Mesh(wingGeometry, wingMaterial);
            wings.position.y = 0.1;
            wings.castShadow = true;
            wings.receiveShadow = true;
            
            // Kuyruk
            const tailGeometry = new THREE.BoxGeometry(1.5, 1, 0.2);
            const tail = new THREE.Mesh(tailGeometry, wingMaterial);
            tail.position.z = -2;
            tail.position.y = 0.5;
            tail.castShadow = true;
            tail.receiveShadow = true;
            
            // Dikey kuyruk
            const verticalTailGeometry = new THREE.BoxGeometry(0.2, 1, 1);
            const verticalTail = new THREE.Mesh(verticalTailGeometry, wingMaterial);
            verticalTail.position.z = -2;
            verticalTail.position.y = 1;
            verticalTail.castShadow = true;
            verticalTail.receiveShadow = true;
            
            // Kokpit
            const cockpitGeometry = new THREE.SphereGeometry(0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const cockpitMaterial = new THREE.MeshPhongMaterial({
                color: 0x333333,
                transparent: true,
                opacity: 0.7,
                shininess: 100,
                specular: 0xffffff
            });
            const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
            cockpit.position.z = 1.2;
            cockpit.position.y = 0.3;
            cockpit.rotation.x = Math.PI;
            cockpit.castShadow = true;
            
            // İniş takımları
            const landingGearGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
            const landingGearMaterial = new THREE.MeshPhongMaterial({
                color: 0x333333
            });
            
            const leftGear = new THREE.Mesh(landingGearGeometry, landingGearMaterial);
            leftGear.position.set(-1, -0.6, 0);
            leftGear.castShadow = true;
            
            const rightGear = new THREE.Mesh(landingGearGeometry, landingGearMaterial);
            rightGear.position.set(1, -0.6, 0);
            rightGear.castShadow = true;
            
            const rearGear = new THREE.Mesh(landingGearGeometry, landingGearMaterial);
            rearGear.position.set(0, -0.6, -1.5);
            rearGear.castShadow = true;
            
            // Tekerler
            const wheelGeometry = new THREE.TorusGeometry(0.2, 0.1, 8, 16);
            const wheelMaterial = new THREE.MeshPhongMaterial({
                color: 0x222222
            });
            
            const leftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            leftWheel.position.set(-1, -1, 0);
            leftWheel.rotation.x = Math.PI / 2;
            leftWheel.castShadow = true;
            
            const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            rightWheel.position.set(1, -1, 0);
            rightWheel.rotation.x = Math.PI / 2;
            rightWheel.castShadow = true;
            
            const rearWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            rearWheel.position.set(0, -1, -1.5);
            rearWheel.rotation.x = Math.PI / 2;
            rearWheel.castShadow = true;
            
            // Pervaneler veya motorlar
            const propellerGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.1);
            const propellerMaterial = new THREE.MeshPhongMaterial({
                color: 0x333333
            });
            
            const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
            propeller.position.z = 2;
            propeller.castShadow = true;
            
            // İniş takımlarını bir grup olarak ekle (açılıp kapanabilir)
            this.landingGearGroup = new THREE.Group();
            this.landingGearGroup.add(leftGear);
            this.landingGearGroup.add(rightGear);
            this.landingGearGroup.add(rearGear);
            this.landingGearGroup.add(leftWheel);
            this.landingGearGroup.add(rightWheel);
            this.landingGearGroup.add(rearWheel);
            
            // Pervaneler için grup (dönebilir)
            this.propGroup = new THREE.Group();
            this.propGroup.add(propeller);
            
            // Tüm parçaları ana modele ekle
            this.mesh = new THREE.Group();
            this.mesh.add(body);
            this.mesh.add(wings);
            this.mesh.add(tail);
            this.mesh.add(verticalTail);
            this.mesh.add(cockpit);
            this.mesh.add(this.landingGearGroup);
            this.mesh.add(this.propGroup);
            
            // Pozisyonu ayarla
            this.mesh.position.copy(position);
            
            // Uçak ID'si ve bilgileri
            this.mesh.userData.aircraftId = this.id;
            this.mesh.userData.ownerId = this.options.ownerId;
            
            // Uçak ismi metni
            if (this.options.name) {
                this.nameSprite = this.createTextSprite(this.options.name);
                this.nameSprite.position.y = 2;
                this.mesh.add(this.nameSprite);
            }
            
            // Sahneye ekle
            if (this.options.scene) {
                this.options.scene.add(this.mesh);
            }
            
            console.log(`Basic aircraft model created with ID: ${this.id}`);
        } catch (error) {
            console.error("Error creating basic aircraft model:", error);
        }
    }
    
    loadAircraftModel(position) {
        // GLTF model yükleyici
        if (!this.options.scene) {
            console.warn("Scene not provided, skipping GLTF model loading");
            return;
        }
        
        try {
            const loader = new THREE.GLTFLoader();
            const modelUrl = 'https://threejs.org/examples/models/gltf/Parrot.glb'; // Örnek model URL (değiştirilebilir)
            
            loader.load(
                modelUrl,
                (gltf) => {
                    // Modeli başarıyla yükledi
                    const model = gltf.scene;
                    
                    // Modeli ölçeklendir ve pozisyonla
                    model.scale.set(0.01, 0.01, 0.01); // Ölçeği modele göre ayarla
                    model.position.copy(position);
                    
                    // Modele gölge ekle
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    // Mevcut basit modeli kaldır ve GLTF modeli ekle
                    if (this.mesh && this.options.scene) {
                        this.options.scene.remove(this.mesh);
                    }
                    
                    this.mesh = model;
                    
                    // Uçak ID'si ve bilgileri
                    this.mesh.userData.aircraftId = this.id;
                    this.mesh.userData.ownerId = this.options.ownerId;
                    
                    // İsim ekle
                    if (this.options.name) {
                        this.nameSprite = this.createTextSprite(this.options.name);
                        this.nameSprite.position.y = 2;
                        this.mesh.add(this.nameSprite);
                    }
                    
                    // Sahneye ekle
                    this.options.scene.add(this.mesh);
                    
                    console.log(`GLTF aircraft model loaded with ID: ${this.id}`);
                },
                (xhr) => {
                    // Yükleme ilerlemesi
                    const percentage = (xhr.loaded / xhr.total) * 100;
                    console.log(`Loading aircraft model: ${Math.round(percentage)}%`);
                },
                (error) => {
                    // Yükleme hatası
                    console.error('Error loading GLTF model:', error);
                    console.log("Continuing with basic aircraft model");
                }
            );
        } catch (error) {
            console.error("Error in GLTF loading process:", error);
            console.log("Continuing with basic aircraft model");
        }
    }
    
    /**
     * Yazı sprite'ı oluştur
     * @param {string} text - Gösterilecek yazı
     * @returns {THREE.Sprite} - Yazı sprite'ı
     */
    createTextSprite(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.font = '24px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(text, 128, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(5, 1.25, 1);
        
        return sprite;
    }
    
    /**
     * Uçağı güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     * @param {Object} inputs - Kullanıcı girişleri
     */
    update(deltaTime, inputs = {}) {
        if (!this.mesh) {
            console.error('Aircraft mesh is not initialized');
            return;
        }
        
        try {
            // Temel parametreler
            const maxSpeed = this.maxSpeed; // m/s
            const acceleration = this.acceleration; // m/s²
            const rotationSpeed = this.rotationSpeed; // radyan/saniye
            
            // 1. Motor Kontrolü
            // Motor çalıştırma/durdurma (E tuşu)
            if (inputs.engineToggle && !this.prevEngineToggle) {
                this.isEngineStarted = !this.isEngineStarted;
                console.log(`Engine ${this.isEngineStarted ? 'started' : 'stopped'}`);
                
                // Motor çalıştırma/durdurma sesi
                if (this.effects) {
                    if (this.isEngineStarted) {
                        this.effects.playEngineStartSound();
                    } else {
                        this.effects.playEngineStopSound();
                    }
                }
            }
            this.prevEngineToggle = inputs.engineToggle;
            
            // 2. İniş Takımı Kontrolü (G tuşu)
            if (inputs.gearToggle && !this.prevGearToggle) {
                // Sadece belirli bir yüksekliğin üzerindeyken iniş takımlarını kapatabilir
                if (!this.isOnGround || this.landingGear) {
                    this.landingGear = !this.landingGear;
                    console.log(`Landing gear ${this.landingGear ? 'down' : 'up'}`);
                    
                    // İniş takımı sesi
                    if (this.effects) {
                        this.effects.playGearSound();
                    }
                }
            }
            this.prevGearToggle = inputs.gearToggle;
            
            // 3. Flap Kontrolü (F tuşu)
            if (inputs.flapsToggle && !this.prevFlapsToggle) {
                // Flap pozisyonunu değiştir (0, 0.33, 0.66, 1.0)
                this.flapsPosition = (this.flapsPosition + 0.33) % 1.01;
                this.flapsPosition = Math.round(this.flapsPosition * 100) / 100; // Yuvarlama hatalarını önle
                console.log(`Flaps set to: ${this.flapsPosition}`);
                
                // Flap sesi
                if (this.effects) {
                    this.effects.playFlapsSound();
                }
            }
            this.prevFlapsToggle = inputs.flapsToggle;
            
            // 4. Kalkış/İniş Kontrolü (T/L tuşları)
            if (inputs.takeoffToggle && !this.prevTakeoffToggle) {
                this.startTakeoff();
            }
            this.prevTakeoffToggle = inputs.takeoffToggle;
            
            if (inputs.landingToggle && !this.prevLandingToggle) {
                this.startLanding();
            }
            this.prevLandingToggle = inputs.landingToggle;
            
            // 5. Uçuş Fiziği Güncelleme
            if (this.isOnGround) {
                // YERDE KONTROL SİSTEMİ
                
                // Pist üzerinde olup olmadığını kontrol et
                const onRunway = this.isOnRunway();
                
                // Motor çalışmıyorsa hareket etme
                if (!this.isEngineStarted) {
                    this.speed = Math.max(0, this.speed - acceleration * deltaTime * 2);
                } else {
                    // Gaz kontrolü
                    const targetSpeed = inputs.throttle * this.takeoffSpeed * 1.2;
                    
                    // Hızı yumuşak bir şekilde değiştir
                    if (Math.abs(this.speed - targetSpeed) > 0.1) {
                        if (this.speed < targetSpeed) {
                            // Hızlanma (pist üzerinde daha hızlı, çimde daha yavaş)
                            const accelFactor = onRunway ? 1.0 : 0.3;
                            this.speed = Math.min(this.speed + acceleration * deltaTime * accelFactor, targetSpeed);
                        } else {
                            // Yavaşlama
                            this.speed = Math.max(this.speed - acceleration * deltaTime, targetSpeed);
                        }
                    } else {
                        this.speed = targetSpeed;
                    }
                }
                
                // Yönlendirme kontrolü (sadece yerde)
                if (this.speed > 1) {
                    const steeringFactor = Math.min(1.0, this.speed / 10); // Düşük hızda daha hassas
                    const yawAmount = inputs.yaw * rotationSpeed * deltaTime * steeringFactor;
                    
                    if (Math.abs(yawAmount) > 0.001 && this.body) {
                        const yawQuat = new CANNON.Quaternion();
                        yawQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yawAmount);
                        this.body.quaternion = yawQuat.mult(this.body.quaternion);
                    }
                }
                
                // Kalkış kontrolü
                if (this.isTakingOff && onRunway) {
                    if (this.speed >= this.takeoffSpeed && inputs.pitch > 0.5) {
                        this.isOnGround = false;
                        this.isTakingOff = false; // Kalkış tamamlandı
                        console.log('Taking off!');
                        
                        // Kalkış sesi
                        if (this.effects) {
                            this.effects.playTakeoffSound();
                            this.effects.showMessage('Kalkış başarılı!', 'success');
                        }
                    } else if (this.speed >= this.takeoffSpeed * 0.8) {
                        // Kalkış hızına yaklaşıldığında bildirim
                        if (this.effects && Math.random() < 0.01) { // Çok sık gösterme
                            this.effects.showMessage('Kalkış hızına yaklaşıldı! Burnunu kaldırmak için W tuşuna basın.', 'info');
                        }
                    }
                }
            } else {
                // HAVADA KONTROL SİSTEMİ
                
                // Motor çalışmıyorsa süzülme moduna geç
                const enginePower = this.isEngineStarted ? 1.0 : 0.0;
                
                // Boost faktörü
                const boostFactor = inputs.boost ? 1.5 : 1.0;
                
                // Flap etkisi
                const flapsEffect = 1.0 + this.flapsPosition * 0.3; // Flaplar kaldırma kuvvetini artırır
                
                // İniş takımı etkisi
                const gearDragFactor = this.landingGear ? 1.2 : 1.0; // İniş takımları sürüklenmeyi artırır
                
                // İniş modu etkisi
                if (this.isLanding) {
                    // İniş modunda daha stabil uçuş
                    const runwayPosition = this.getRunwayPosition();
                    const currentPosition = this.getPosition();
                    
                    // Piste yaklaşma durumunu kontrol et
                    const distanceToRunway = currentPosition.distanceTo(runwayPosition);
                    
                    if (distanceToRunway < 200) {
                        // Piste yaklaşıldığında bildirim
                        if (this.effects && Math.random() < 0.01) { // Çok sık gösterme
                            this.effects.showMessage(`Piste yaklaşılıyor: ${Math.floor(distanceToRunway)}m`, 'info');
                        }
                        
                        // Piste çok yakınsa ve yeterince alçaktaysa, iniş tamamlandı
                        if (distanceToRunway < 20 && currentPosition.y < GameConstants.WORLD.GROUND_HEIGHT + 5) {
                            this.isLanding = false;
                            this.isOnGround = true;
                            
                            if (this.effects) {
                                this.effects.showMessage('İniş başarılı!', 'success');
                                this.effects.playLandingSound();
                            }
                        }
                    }
                }
                
                // Hedef hız hesapla
                const targetSpeed = inputs.throttle * maxSpeed * enginePower * boostFactor;
                
                // Mevcut hızı hedef hıza doğru yumuşak bir şekilde değiştir
                if (Math.abs(this.speed - targetSpeed) > 0.1) {
                    if (this.speed < targetSpeed) {
                        // Hızlanma
                        this.speed = Math.min(this.speed + acceleration * deltaTime, targetSpeed);
                    } else {
                        // Yavaşlama
                        this.speed = Math.max(this.speed - acceleration * deltaTime * 0.5, targetSpeed);
                    }
                } else {
                    this.speed = targetSpeed;
                }
                
                // Rotasyon kontrolü
                // Rotasyon miktarını hesapla
                const pitchAmount = inputs.pitch * rotationSpeed * deltaTime;
                const rollAmount = inputs.roll * rotationSpeed * deltaTime;
                const yawAmount = inputs.yaw * rotationSpeed * deltaTime;
                
                // Quaternion'ları oluştur
                if (Math.abs(pitchAmount) > 0.001) {
                    const pitchQuat = new CANNON.Quaternion();
                    pitchQuat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), pitchAmount);
                    this.body.quaternion = pitchQuat.mult(this.body.quaternion);
                }
                
                if (Math.abs(rollAmount) > 0.001) {
                    const rollQuat = new CANNON.Quaternion();
                    rollQuat.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), -rollAmount);
                    this.body.quaternion = rollQuat.mult(this.body.quaternion);
                }
                
                if (Math.abs(yawAmount) > 0.001) {
                    const yawQuat = new CANNON.Quaternion();
                    yawQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yawAmount);
                    this.body.quaternion = yawQuat.mult(this.body.quaternion);
                }
                
                // İniş kontrolü
                if (this.isLanding) {
                    // Pist üzerinde olup olmadığını kontrol et
                    const onRunway = this.isOnRunway();
                    
                    if (onRunway) {
                        // Piste yaklaşırken yavaşla
                        const position = this.getPosition();
                        const altitude = position.y - GameConstants.WORLD.GROUND_HEIGHT;
                        
                        if (altitude < 20) {
                            // Alçak irtifada yavaşla
                            this.speed = Math.max(this.speed - acceleration * deltaTime, this.takeoffSpeed * 0.8);
                            
                            // Dikey hızı kontrol et
                            if (this.verticalSpeed < -5) {
                                // Çok hızlı alçalıyorsa uyarı ver
                                if (this.effects) {
                                    this.effects.showMessage('Çok hızlı alçalıyorsunuz! Burnunu kaldırın.', 'warning');
                                }
                            }
                            
                            // Yere çok yakınsa ve dikey hız uygunsa, yere in
                            if (altitude < 2 && this.verticalSpeed > -3 && this.verticalSpeed < 0) {
                                this.isOnGround = true;
                                this.isLanding = false;
                                
                                // İniş sesi
                                if (this.effects) {
                                    this.effects.playLandingSound();
                                    this.effects.showMessage('İniş başarılı!', 'success');
                                }
                                
                                console.log('Landed successfully!');
                            }
                        }
                    } else {
                        // Pist üzerinde değilse, iniş modunu iptal et
                        if (this.effects) {
                            this.effects.showMessage('Pist bulunamadı! İniş iptal edildi.', 'warning');
                        }
                        
                        this.isLanding = false;
                    }
                }
            }
            
            // 6. Fizik Güncelleme
            if (this.body) {
                // Uçağın yönünü al
                const quaternion = this.body.quaternion;
                const rotation = new CANNON.Vec3();
                quaternion.toEuler(rotation);
                
                // Uçağın ileri vektörünü hesapla
                const forwardVec = new CANNON.Vec3(0, 0, 1);
                quaternion.vmult(forwardVec, forwardVec);
                
                // Uçağın yukarı vektörünü hesapla
                const upVec = new CANNON.Vec3(0, 1, 0);
                quaternion.vmult(upVec, upVec);
                
                // Yerçekimi ve kaldırma kuvveti
                const gravity = -9.81; // m/s²
                const liftFactor = this.speed * 0.01 * (1.0 + this.flapsPosition * 0.5);
                
                // Dikey hızı hesapla
                const currentPos = this.getPosition();
                this.verticalSpeed = (currentPos.y - this.lastPosition.y) / deltaTime;
                this.lastPosition.copy(currentPos);
                
                // Stall durumunu kontrol et
                this.isStalling = this.speed < this.aircraftData.stallSpeed && !this.isOnGround;
                
                if (this.isStalling && !this.isOnGround) {
                    // Stall durumunda kontrol kaybı
                    if (this.effects && !this.stallWarningPlayed) {
                        this.effects.playStallWarningSound();
                        this.effects.showMessage('STALL! STALL! Hızınızı artırın!', 'danger');
                        this.stallWarningPlayed = true;
                    }
                } else {
                    this.stallWarningPlayed = false;
                }
                
                // Hız vektörünü hesapla
                const velocity = forwardVec.scale(this.speed);
                
                // Yerçekimi etkisini ekle (yerde değilse)
                if (!this.isOnGround) {
                    // Kaldırma kuvveti (lift)
                    const lift = upVec.scale(liftFactor);
                    
                    // Stall durumunda kaldırma kuvveti azalır
                    const liftMultiplier = this.isStalling ? 0.3 : 1.0;
                    
                    // Yerçekimi ve kaldırma kuvvetini birleştir
                    velocity.y += gravity + (lift.y * liftMultiplier);
                } else {
                    // Yerdeyken y hızını sıfırla
                    velocity.y = 0;
                }
                
                // Hızı uygula
                this.body.velocity.copy(velocity);
                
                // Mesh pozisyonunu ve rotasyonunu güncelle
                this.mesh.position.copy(this.body.position);
                this.mesh.quaternion.copy(this.body.quaternion);
                
                // Pervaneleri döndür (eğer motor çalışıyorsa)
                if (this.propGroup && this.isEngineStarted) {
                    // Pervane dönüş hızı throttle'a bağlı
                    const propellerSpeed = 10 * inputs.throttle;
                    this.propGroup.rotation.z += propellerSpeed * deltaTime;
                }
                
                // Yerle temas kontrolü
                const position = this.getPosition();
                const altitude = position.y - GameConstants.WORLD.GROUND_HEIGHT;
                
                if (altitude <= 0.5 && !this.isOnGround) {
                    // Yere çarptı
                    this.groundContact = true;
                    
                    // İniş takımları açık değilse veya dikey hız çok yüksekse hasar al
                    if (!this.landingGear || this.verticalSpeed < -10) {
                        const damage = Math.abs(this.verticalSpeed) * 2;
                        this.takeDamage(damage);
                        
                        if (this.effects) {
                            this.effects.playCrashSound();
                            this.effects.showMessage('Sert iniş! Hasar alındı.', 'danger');
                        }
                        
                        console.log(`Crash landing! Damage: ${damage}`);
                    } else {
                        // Normal iniş
                        if (this.effects) {
                            this.effects.playLandingSound();
                        }
                    }
                    
                    this.isOnGround = true;
                    this.isLanding = false;
                } else {
                    this.groundContact = false;
                }
            }
            
            // 7. Silah Sistemi Güncelleme
            this.updateWeapons(deltaTime, inputs);
            
            // 8. Efekt Sistemi Güncelleme
            if (this.effects && this.effects.update) {
                this.effects.update(deltaTime, this);
            }
            
            // 9. Motor Sistemi Güncelleme
            if (this.engineSystem && this.engineSystem.update) {
                this.engineSystem.update(deltaTime, this.isEngineStarted, this.speed / this.maxSpeed);
            }
            
            // UI'ı güncelle
            if (this.ui && this.ui.update) {
                this.ui.update({
                    altitude: this.getPosition().y,
                    speed: this.speed,
                    verticalSpeed: this.verticalSpeed,
                    ammo: this.ammo,
                    maxAmmo: this.maxAmmo,
                    isTakingOff: this.isTakingOff,
                    isLanding: this.isLanding
                });
            }
            
        } catch (error) {
            console.error('Error in aircraft update:', error);
        }
    }
    
    /**
     * Uçağın pist üzerinde olup olmadığını kontrol et
     * @param {Object} world - Dünya nesnesi
     * @returns {boolean} - Uçak pist üzerinde mi?
     */
    isOnRunway() {
        if (!this.mesh || !this.world || !this.world.objects.runway) {
            return false;
        }
        
        // Uçağın pozisyonunu al
        const position = this.getPosition();
        
        // Pistin pozisyonunu ve boyutlarını al
        const runway = this.world.objects.runway;
        const runwayPos = runway.position.clone();
        const runwayWidth = this.world.runwayWidth;
        const runwayLength = this.world.runwayLength;
        
        // Pistin sınırlarını hesapla
        const halfWidth = runwayWidth / 2;
        const halfLength = runwayLength / 2;
        
        // Uçağın pist sınırları içinde olup olmadığını kontrol et
        const isWithinX = position.x >= runwayPos.x - halfWidth && position.x <= runwayPos.x + halfWidth;
        const isWithinZ = position.z >= runwayPos.z - halfLength && position.z <= runwayPos.z + halfLength;
        const isNearGround = position.y <= GameConstants.WORLD.GROUND_HEIGHT + 2;
        
        return isWithinX && isWithinZ && isNearGround;
    }
    
    /**
     * Kalkış prosedürünü başlat
     */
    startTakeoff() {
        if (!this.isOnGround || this.isTakingOff) {
            return;
        }
        
        console.log('Starting takeoff procedure...');
        
        // Kalkış için gerekli kontrolleri yap
        if (!this.isEngineStarted) {
            console.log('Cannot takeoff: Engine not started');
            if (this.effects && this.effects.showMessage) {
                this.effects.showMessage('Motor çalıştırılmadı! Kalkış için E tuşuna basın.', 'warning');
            }
            return;
        }
        
        if (!this.landingGear) {
            console.log('Cannot takeoff: Landing gear not deployed');
            if (this.effects && this.effects.showMessage) {
                this.effects.showMessage('İniş takımları açık değil! G tuşuna basın.', 'warning');
            }
            return;
        }
        
        // Kalkış modunu aktifleştir
        this.isTakingOff = true;
        
        // Flapları kalkış pozisyonuna getir
        this.flapsPosition = 0.33;
        
        if (this.effects && this.effects.showMessage) {
            this.effects.showMessage('Kalkış başladı! Hızlanmak için W tuşuna basın.', 'info');
        }
        
        console.log('Takeoff procedure started');
    }
    
    /**
     * İniş prosedürünü başlat
     */
    startLanding() {
        if (this.isOnGround || this.isLanding) {
            return;
        }
        
        console.log('Starting landing procedure...');
        
        // İniş için gerekli kontrolleri yap
        if (!this.landingGear) {
            console.log('Cannot land: Landing gear not deployed');
            if (this.effects && this.effects.showMessage) {
                this.effects.showMessage('İniş takımları açık değil! G tuşuna basın.', 'warning');
            }
            return;
        }
        
        // İniş modunu aktifleştir
        this.isLanding = true;
        
        // Flapları iniş pozisyonuna getir
        this.flapsPosition = 0.66;
        
        if (this.effects && this.effects.showMessage) {
            this.effects.showMessage('İniş başladı! Piste yaklaşın ve yavaşça alçalın.', 'info');
        }
        
        console.log('Landing procedure started');
    }
    
    /**
     * Uçağı piste yerleştir
     */
    placeOnRunway() {
        if (!this.world || !this.world.objects.runway) {
            console.warn('Cannot place on runway: World or runway not available');
            return;
        }
        
        // Pistin pozisyonunu al
        const runway = this.world.objects.runway;
        const runwayPos = runway.position.clone();
        
        // Uçağı pistin başlangıcına yerleştir
        const position = new THREE.Vector3(
            runwayPos.x,
            GameConstants.WORLD.GROUND_HEIGHT + 1,
            runwayPos.z - (this.world.runwayLength / 2) + 20
        );
        
        // Uçağın yönünü pist doğrultusunda ayarla
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        
        // Pozisyonu ve rotasyonu ayarla
        this.setPosition(position);
        this.setRotation(quaternion);
        
        // Fizik gövdesini güncelle
        if (this.body) {
            this.body.position.copy(position);
            this.body.quaternion.copy(quaternion);
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
        }
        
        // Uçak durumunu güncelle
        this.isOnGround = true;
        this.isTakingOff = false;
        this.isLanding = false;
        this.speed = 0;
        this.verticalSpeed = 0;
        
        // İniş takımlarını aç
        this.landingGear = true;
        
        console.log('Aircraft placed on runway');
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
            
            // 1. Sürüklenme (Drag) - Hıza ters yönde etki eder
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
            
            // 2. Stabilizasyon - Uçağın dengede kalmasını sağlar
            
            // Yatay stabilizasyon (roll)
            // Uçağın yukarı vektörü
            const upDir = new CANNON.Vec3(0, 1, 0);
            const worldUp = new CANNON.Vec3();
            this.body.quaternion.vmult(upDir, worldUp);
            
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
            
            // 3. Stall Durumu - Çok yüksek hücum açısında kaldırma kuvveti kaybı
            
            // Uçağın ileri vektörü
            const forwardDir = new CANNON.Vec3(0, 0, 1);
            const worldForward = new CANNON.Vec3();
            this.body.quaternion.vmult(forwardDir, worldForward);
            
            // Hücum açısını hesapla (uçağın ileri yönü ile yatay düzlem arasındaki açı)
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
            
            // 4. Yer Etkisi (Ground Effect) - Yere yakın uçarken kaldırma kuvveti artar
            
            // Yerden yükseklik
            const altitude = this.body.position.y;
            const wingSpan = 10; // Kanat açıklığı (m)
            
            // Yer etkisi faktörü (yükseklik kanat açıklığının yarısından azsa etki başlar)
            if (altitude < wingSpan / 2 && !this.isOnGround) {
                const groundEffectFactor = 1.0 - (altitude / (wingSpan / 2)); // 0-1 arası
                
                // Ek kaldırma kuvveti
                const liftBoost = groundEffectFactor * 10.0 * speed;
                const groundEffectForce = new CANNON.Vec3(0, liftBoost, 0);
                this.body.applyForce(groundEffectForce, new CANNON.Vec3(0, 0, 0));
            }
            
            // 5. Kalkış ve İniş Modları
            
            // Kalkış modu - Daha fazla kaldırma kuvveti ve stabilite
            if (this.isTakingOff && !this.isOnGround) {
                // Kalkış sırasında ekstra kaldırma kuvveti
                const takeoffLiftForce = new CANNON.Vec3(0, 15.0 * speed, 0);
                this.body.applyForce(takeoffLiftForce, new CANNON.Vec3(0, 0, 0));
                
                // Kalkış sırasında daha fazla stabilite
                this.body.angularDamping = 0.3;
                
                // Kalkış tamamlandıysa (belirli bir yüksekliğe ulaşıldıysa)
                if (altitude > 50) {
                    this.isTakingOff = false;
                    console.log('Takeoff completed');
                    
                    if (this.effects && this.effects.showMessage) {
                        this.effects.showMessage('Kalkış tamamlandı!', 'success');
                    }
                }
            }
            
            // İniş modu - Daha fazla sürüklenme ve stabilite
            if (this.isLanding) {
                // İniş sırasında ekstra sürüklenme
                const landingDragForce = new CANNON.Vec3(
                    -velocityDir.x * dragForce * 0.5,
                    -velocityDir.y * dragForce * 0.2, // Dikey sürüklenmeyi daha az artır
                    -velocityDir.z * dragForce * 0.5
                );
                this.body.applyForce(landingDragForce, new CANNON.Vec3(0, 0, 0));
                
                // İniş sırasında daha fazla stabilite
                this.body.angularDamping = 0.4;
                
                // Piste yaklaşırken hafif aşağı yönlendirme
                if (altitude > 10 && !this.isOnRunway()) {
                    const approachForce = new CANNON.Vec3(0, -5.0, 0);
                    this.body.applyForce(approachForce, new CANNON.Vec3(0, 0, 0));
                }
                
                // İniş tamamlandıysa (yere değdiyse)
                if (this.isOnGround) {
                    this.isLanding = false;
                    console.log('Landing completed');
                    
                    if (this.effects && this.effects.showMessage) {
                        this.effects.showMessage('İniş başarılı!', 'success');
                    }
                    
                    if (this.effects && this.effects.playLandingSound) {
                        this.effects.playLandingSound();
                    }
                }
            }
        } catch (error) {
            console.error('Error in applyAerodynamics:', error);
        }
    }
} 