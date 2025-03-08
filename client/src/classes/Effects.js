/**
 * Effects.js
 * Ses ve görsel efektleri yöneten sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class Effects {
    constructor(scene, ui = null) {
        this.scene = scene;
        this.ui = ui;
        this.sounds = {};
        this.particles = [];
        this.trails = [];
        this.listener = null;
        this.soundEnabled = true;
        this.particlesEnabled = true;
        this.maxParticles = 1000;
        this.maxTrails = 100;
    }
    
    /**
     * Efektleri başlat
     */
    init() {
        try {
            console.log('Initializing effects');
            
            // THREE yüklü mü kontrol et
            if (typeof THREE === 'undefined') {
                console.error('THREE is not defined. Make sure Three.js is loaded.');
                throw new Error('THREE is not defined');
            }
            
            // Audio listener oluştur
            this.listener = new THREE.AudioListener();
            
            // Sesleri yükle
            this.loadSounds();
            
            console.log('Effects initialized successfully');
        } catch (error) {
            console.error('Error initializing effects:', error);
            // Ses olmadan devam et
            console.warn('Continuing without audio effects');
        }
    }
    
    /**
     * Sesleri yükle
     */
    loadSounds() {
        try {
            console.log('Loading sound effects');
            
            if (!this.listener) {
                console.warn('AudioListener not initialized, skipping sound loading');
                return;
            }
            
            // Ses nesnelerini oluştur
            this.sounds = {
                engine: new THREE.Audio(this.listener),
                fire: new THREE.Audio(this.listener),
                explosion: new THREE.Audio(this.listener),
                notification: new THREE.Audio(this.listener),
                takeoff: new THREE.Audio(this.listener),
                landing: new THREE.Audio(this.listener),
                stall: new THREE.Audio(this.listener),
                hit: new THREE.Audio(this.listener),
                engineStart: new THREE.Audio(this.listener),
                engineStop: new THREE.Audio(this.listener),
                gear: new THREE.Audio(this.listener),
                flaps: new THREE.Audio(this.listener)
            };
            
            // Ses seviyelerini ayarla
            if (this.sounds.engine) this.sounds.engine.setVolume(0.5);
            if (this.sounds.fire) this.sounds.fire.setVolume(0.3);
            if (this.sounds.explosion) this.sounds.explosion.setVolume(0.8);
            if (this.sounds.notification) this.sounds.notification.setVolume(0.5);
            if (this.sounds.takeoff) this.sounds.takeoff.setVolume(0.6);
            if (this.sounds.landing) this.sounds.landing.setVolume(0.6);
            if (this.sounds.stall) this.sounds.stall.setVolume(0.7);
            if (this.sounds.hit) this.sounds.hit.setVolume(0.6);
            if (this.sounds.engineStart) this.sounds.engineStart.setVolume(0.7);
            if (this.sounds.engineStop) this.sounds.engineStop.setVolume(0.7);
            if (this.sounds.gear) this.sounds.gear.setVolume(0.5);
            if (this.sounds.flaps) this.sounds.flaps.setVolume(0.4);
            
            console.log('Sound effects loaded successfully');
        } catch (error) {
            console.error('Error loading sounds:', error);
            // Boş ses nesneleri oluştur
            this.sounds = {};
            console.warn('Continuing without sound effects');
        }
    }
    
    /**
     * Patlama efekti oluştur
     * @param {THREE.Vector3} position - Patlama pozisyonu
     * @param {number} scale - Patlama boyutu
     */
    createExplosion(position, scale = 1) {
        if (!this.particlesEnabled) return;
        
        // Parçacık sayısını kontrol et
        if (this.particles.length > this.maxParticles) {
            // En eski parçacığı kaldır
            const oldestParticle = this.particles.shift();
            if (oldestParticle.mesh) {
                this.scene.remove(oldestParticle.mesh);
                if (oldestParticle.mesh.geometry) oldestParticle.mesh.geometry.dispose();
                if (oldestParticle.mesh.material) oldestParticle.mesh.material.dispose();
            }
        }
        
        // Parçacık sayısı
        const particleCount = Math.floor(20 * scale);
        
        // Parçacık renkleri
        const colors = [0xff5500, 0xff0000, 0xffaa00];
        
        // Parçacıkları oluştur
        for (let i = 0; i < particleCount; i++) {
            // Rastgele yön
            const direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            ).normalize();
            
            // Rastgele hız
            const speed = 5 + Math.random() * 10 * scale;
            
            // Rastgele boyut
            const size = 0.2 + Math.random() * 0.8 * scale;
            
            // Rastgele renk
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // Parçacık geometrisi
            const geometry = new THREE.SphereGeometry(size, 4, 4);
            
            // Parçacık materyali
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });
            
            // Parçacık mesh'i
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(position);
            
            // Sahneye ekle
            this.scene.add(mesh);
            
            // Parçacık nesnesini oluştur
            const particle = {
                mesh: mesh,
                direction: direction,
                speed: speed,
                life: 1.0, // 1 saniye ömür
                scale: scale
            };
            
            // Parçacıklar listesine ekle
            this.particles.push(particle);
        }
        
        // Patlama sesini çal
        if (this.soundEnabled && this.sounds.explosion && !this.sounds.explosion.isPlaying) {
            this.sounds.explosion.play();
        }
    }
    
    /**
     * Vuruş efekti oluştur
     * @param {THREE.Vector3} position - Vuruş pozisyonu
     */
    createHitEffect(position) {
        if (!this.particlesEnabled) return;
        
        // Parçacık sayısını kontrol et
        if (this.particles.length > this.maxParticles) {
            // En eski parçacığı kaldır
            const oldestParticle = this.particles.shift();
            if (oldestParticle.mesh) {
                this.scene.remove(oldestParticle.mesh);
                if (oldestParticle.mesh.geometry) oldestParticle.mesh.geometry.dispose();
                if (oldestParticle.mesh.material) oldestParticle.mesh.material.dispose();
            }
        }
        
        // Parçacık sayısı
        const particleCount = 10;
        
        // Parçacık renkleri
        const colors = [0xffff00, 0xff5500];
        
        // Parçacıkları oluştur
        for (let i = 0; i < particleCount; i++) {
            // Rastgele yön
            const direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            ).normalize();
            
            // Rastgele hız
            const speed = 3 + Math.random() * 5;
            
            // Rastgele boyut
            const size = 0.1 + Math.random() * 0.3;
            
            // Rastgele renk
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // Parçacık geometrisi
            const geometry = new THREE.SphereGeometry(size, 4, 4);
            
            // Parçacık materyali
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });
            
            // Parçacık mesh'i
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(position);
            
            // Sahneye ekle
            this.scene.add(mesh);
            
            // Parçacık nesnesini oluştur
            const particle = {
                mesh: mesh,
                direction: direction,
                speed: speed,
                life: 0.5, // 0.5 saniye ömür
                scale: 0.5
            };
            
            // Parçacıklar listesine ekle
            this.particles.push(particle);
        }
    }
    
    /**
     * İz efekti oluştur
     * @param {THREE.Vector3} position - İz başlangıç pozisyonu
     * @param {THREE.Vector3} direction - İz yönü
     */
    createTrailEffect(position, direction) {
        if (!this.particlesEnabled) return;
        
        // İz sayısını kontrol et
        if (this.trails.length > this.maxTrails) {
            // En eski izi kaldır
            const oldestTrail = this.trails.shift();
            if (oldestTrail.mesh) {
                this.scene.remove(oldestTrail.mesh);
                if (oldestTrail.mesh.geometry) oldestTrail.mesh.geometry.dispose();
                if (oldestTrail.mesh.material) oldestTrail.mesh.material.dispose();
            }
        }
        
        // İz geometrisi
        const geometry = new THREE.SphereGeometry(0.1, 4, 4);
        
        // İz materyali
        const material = new THREE.MeshBasicMaterial({
            color: 0xaaaaaa,
            transparent: true,
            opacity: 0.5
        });
        
        // İz mesh'i
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        
        // Sahneye ekle
        this.scene.add(mesh);
        
        // İz nesnesini oluştur
        const trail = {
            mesh: mesh,
            life: 0.5 // 0.5 saniye ömür
        };
        
        // İzler listesine ekle
        this.trails.push(trail);
    }
    
    /**
     * Motor sesini çal
     * @param {number} throttle - Gaz değeri (0-1)
     */
    playEngineSound(throttle) {
        if (!this.soundEnabled || !this.sounds.engine) return;
        
        try {
            // Ses seviyesini gaz değerine göre ayarla
            const volume = 0.2 + throttle * 0.3;
            this.sounds.engine.setVolume(volume);
            
            // Ses hızını gaz değerine göre ayarla
            const playbackRate = 0.8 + throttle * 0.4;
            this.sounds.engine.setPlaybackRate(playbackRate);
            
            // Ses çalmıyorsa başlat
            if (this.sounds.engine.buffer && !this.sounds.engine.isPlaying) {
                this.sounds.engine.play();
            }
        } catch (error) {
            console.warn('Engine sound playback error:', error);
        }
    }
    
    /**
     * Ateş sesini çal
     */
    playFireSound() {
        if (!this.soundEnabled || !this.sounds.fire) return;
        
        try {
            // Ses çalmıyorsa ve buffer varsa çal
            if (this.sounds.fire.buffer && !this.sounds.fire.isPlaying) {
                this.sounds.fire.play();
            } else if (this.sounds.fire.buffer) {
                // Ses zaten çalıyorsa, baştan başlat
                this.sounds.fire.stop();
                this.sounds.fire.play();
            }
        } catch (error) {
            console.warn('Fire sound playback error:', error);
        }
    }
    
    /**
     * Bildirim sesini çal
     */
    playNotificationSound() {
        if (this.sounds.notification && !this.sounds.notification.isPlaying) {
            this.sounds.notification.play();
        }
    }
    
    /**
     * Kalkış sesi çal
     */
    playTakeoffSound() {
        if (this.sounds.takeoff && !this.sounds.takeoff.isPlaying) {
            this.sounds.takeoff.play();
        }
    }
    
    /**
     * İniş sesi çal
     */
    playLandingSound() {
        if (this.sounds.landing && !this.sounds.landing.isPlaying) {
            this.sounds.landing.play();
        }
    }
    
    /**
     * Mesaj göster
     * @param {string} message - Gösterilecek mesaj
     * @param {string} type - Mesaj tipi (info, success, warning, error)
     */
    showMessage(message, type = 'info') {
        // Konsola mesajı yaz
        console.log(`%c${message}`, `color: ${this.getMessageColor(type)}; font-weight: bold;`);
        
        // UI varsa mesajı göster
        if (this.ui && this.ui.showHitInfo) {
            this.ui.showHitInfo(message, type);
        }
    }
    
    /**
     * Mesaj tipi için renk döndür
     * @param {string} type - Mesaj tipi
     * @returns {string} - CSS renk kodu
     */
    getMessageColor(type) {
        switch (type) {
            case 'info': return '#0099ff';
            case 'success': return '#00cc00';
            case 'warning': return '#ffcc00';
            case 'error': return '#ff3300';
            default: return '#ffffff';
        }
    }
    
    /**
     * Efektleri güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     */
    update(deltaTime) {
        // Parçacıkları güncelle
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Parçacık ömrünü azalt
            particle.life -= deltaTime;
            
            // Parçacık ömrü bittiyse kaldır
            if (particle.life <= 0) {
                if (particle.mesh) {
                    this.scene.remove(particle.mesh);
                    if (particle.mesh.geometry) particle.mesh.geometry.dispose();
                    if (particle.mesh.material) particle.mesh.material.dispose();
                }
                this.particles.splice(i, 1);
                continue;
            }
            
            // Parçacık pozisyonunu güncelle
            if (particle.mesh) {
                particle.mesh.position.add(
                    particle.direction.clone().multiplyScalar(particle.speed * deltaTime)
                );
                
                // Parçacık boyutunu ve opaklığını ömrüne göre azalt
                const scale = particle.life * particle.scale;
                particle.mesh.scale.set(scale, scale, scale);
                
                if (particle.mesh.material) {
                    particle.mesh.material.opacity = particle.life;
                }
            }
        }
        
        // İzleri güncelle
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const trail = this.trails[i];
            
            // İz ömrünü azalt
            trail.life -= deltaTime;
            
            // İz ömrü bittiyse kaldır
            if (trail.life <= 0) {
                if (trail.mesh) {
                    this.scene.remove(trail.mesh);
                    if (trail.mesh.geometry) trail.mesh.geometry.dispose();
                    if (trail.mesh.material) trail.mesh.material.dispose();
                }
                this.trails.splice(i, 1);
                continue;
            }
            
            // İz opaklığını ömrüne göre azalt
            if (trail.mesh && trail.mesh.material) {
                trail.mesh.material.opacity = trail.life;
            }
        }
    }
    
    /**
     * Audio listener'ı al
     * @returns {THREE.AudioListener} - Audio listener
     */
    getAudioListener() {
        return this.listener;
    }
    
    /**
     * Efektleri temizle
     */
    dispose() {
        // Sesleri durdur ve temizle
        for (const key in this.sounds) {
            if (this.sounds[key]) {
                if (this.sounds[key].isPlaying) {
                    this.sounds[key].stop();
                }
                this.sounds[key].disconnect();
            }
        }
        
        // Parçacıkları temizle
        for (const particle of this.particles) {
            if (particle.mesh) {
                this.scene.remove(particle.mesh);
                if (particle.mesh.geometry) particle.mesh.geometry.dispose();
                if (particle.mesh.material) particle.mesh.material.dispose();
            }
        }
        this.particles = [];
        
        // İzleri temizle
        for (const trail of this.trails) {
            if (trail.mesh) {
                this.scene.remove(trail.mesh);
                if (trail.mesh.geometry) trail.mesh.geometry.dispose();
                if (trail.mesh.material) trail.mesh.material.dispose();
            }
        }
        this.trails = [];
    }
} 