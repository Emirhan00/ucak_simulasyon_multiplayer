/**
 * PerformanceManager.js
 * Oyun performansını yöneten ve optimizasyon ayarlarını yapan sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class PerformanceManager {
    constructor(options) {
        // options parametresi ile gelen değerleri al
        this.scene = options.scene || null;
        this.physics = options.physics || null;
        this.renderer = options.renderer || null;
        this.world = options.world || null;
        this.camera = options.camera || null;
        this.ui = options.ui || null;
        
        // Performans ayarları ve metrikleri
        this.settings = {
            quality: 'medium', // 'low', 'medium', 'high', 'ultra'
            renderScale: 1.0,
            shadowsEnabled: true,
            effectsEnabled: true,
            maxParticles: 1000,
            lodEnabled: true,
            maxEnemies: 10,
            maxProjectiles: 100,
            physicsQuality: 'medium',
            physicsUpdateFrequency: 1,
            enableCollisionDetection: true,
            enableDebug: false,
            useSimpleGeometry: false,
            cameraFarDistance: 5000,
            fogDensity: 0.00025,
            maxLoadDistance: 2000,
            maxUpdateDistance: 3000
        };
        
        // Performans metrikleri
        this.metrics = {
            fps: 0,
            frameTime: 0,
            physicsTime: 0,
            renderTime: 0,
            updateTime: 0,
            activeObjects: 0,
            visibleObjects: 0,
            drawCalls: 0,
            triangles: 0,
            physicsObjects: 0,
            lastUpdate: Date.now()
        };
        
        // FPS ölçümü için değişkenler
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fpsUpdateInterval = 1000; // 1 saniyede bir FPS güncelle
        
        // Performans kalite presetleri
        this.qualityPresets = {
            // Düşük kalite - eski veya zayıf bilgisayarlar için
            low: {
                renderScale: 0.5,
                shadowsEnabled: false,
                effectsEnabled: false,
                maxParticles: 100,
                lodEnabled: true,
                maxEnemies: 5,
                maxProjectiles: 50,
                physicsQuality: 'low',
                physicsUpdateFrequency: 3, // Her 3 karede bir fizik güncellemesi
                enableCollisionDetection: false,
                useSimpleGeometry: true,
                cameraFarDistance: 2000,
                fogDensity: 0.0005,
                maxLoadDistance: 1000,
                maxUpdateDistance: 1500
            },
            
            // Orta kalite - çoğu sistem için
            medium: {
                renderScale: 0.75,
                shadowsEnabled: true,
                effectsEnabled: true,
                maxParticles: 500,
                lodEnabled: true,
                maxEnemies: 10,
                maxProjectiles: 100,
                physicsQuality: 'medium',
                physicsUpdateFrequency: 2, // Her 2 karede bir fizik güncellemesi
                enableCollisionDetection: true,
                useSimpleGeometry: false,
                cameraFarDistance: 3000,
                fogDensity: 0.00035,
                maxLoadDistance: 1500,
                maxUpdateDistance: 2000
            },
            
            // Yüksek kalite - modern sistemler için
            high: {
                renderScale: 1.0,
                shadowsEnabled: true,
                effectsEnabled: true,
                maxParticles: 1000,
                lodEnabled: true,
                maxEnemies: 15,
                maxProjectiles: 200,
                physicsQuality: 'high',
                physicsUpdateFrequency: 1, // Her karede fizik güncellemesi
                enableCollisionDetection: true,
                useSimpleGeometry: false,
                cameraFarDistance: 4000,
                fogDensity: 0.00025,
                maxLoadDistance: 2000,
                maxUpdateDistance: 3000
            },
            
            // Ultra kalite - güçlü sistemler için
            ultra: {
                renderScale: 1.0,
                shadowsEnabled: true,
                effectsEnabled: true,
                maxParticles: 2000,
                lodEnabled: true,
                maxEnemies: 20,
                maxProjectiles: 300,
                physicsQuality: 'ultra',
                physicsUpdateFrequency: 1,
                enableCollisionDetection: true,
                useSimpleGeometry: false,
                cameraFarDistance: 5000,
                fogDensity: 0.0002,
                maxLoadDistance: 3000,
                maxUpdateDistance: 4000
            }
        };
        
        // Otomatik performans adaptasyonu için değişkenler
        this.isAutoAdaptEnabled = true;
        this.adaptationCheckInterval = 5000; // 5 saniyede bir kontrol
        this.lastAdaptationCheck = 0;
        this.targetFps = 60;
        this.fpsHistory = [];
        this.fpsHistoryMaxLength = 10;
        
        console.log('Performance Manager initialized');
    }
    
    /**
     * Performans yöneticisini başlat
     */
    init() {
        // Tarayıcı özellikleri ve donanım bilgilerini tespit et
        this.detectCapabilities();
        
        // Varsayılan kaliteyi ayarla
        this.setQualityPreset(this.settings.quality);
        
        // Tüm bileşenlere performans ayarlarını uygula
        this.applySettings();
        
        console.log(`Game initialized with ${this.settings.quality} quality preset`);
    }
    
    /**
     * Tarayıcı ve donanım özelliklerini tespit et
     */
    detectCapabilities() {
        // Tarayıcı performansını ölç ve ona göre otomatik kalite seç
        const gl = document.createElement('canvas').getContext('webgl');
        if (!gl) {
            // WebGL yok, en düşük performans ayarlarını kullan
            this.settings.quality = 'low';
            return;
        }
        
        // GPU bilgisi
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        let gpuInfo = 'unknown';
        
        if (debugInfo) {
            gpuInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            console.log('GPU:', gpuInfo);
        }
        
        // Mobil cihaz kontrolü
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Ekran çözünürlüğü
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Donanım özelliklerine göre kalite presetini belirle
        if (isMobile) {
            this.settings.quality = 'low';
        } else if (screenWidth <= 1366 || gpuInfo.includes('Intel')) {
            this.settings.quality = 'medium';
        } else if (gpuInfo.includes('NVIDIA') || gpuInfo.includes('AMD') || gpuInfo.includes('Radeon')) {
            this.settings.quality = 'high';
        } else {
            this.settings.quality = 'medium'; // Varsayılan
        }
        
        console.log(`Auto-detected quality preset: ${this.settings.quality}`);
    }
    
    /**
     * Belirli bir kalite presetini ayarla
     * @param {string} presetName - Kalite preset adı ('low', 'medium', 'high', 'ultra')
     */
    setQualityPreset(presetName) {
        if (!this.qualityPresets[presetName]) {
            console.error(`Quality preset '${presetName}' not found`);
            return;
        }
        
        // Kalite ayarlarını güncelle
        this.settings = {
            ...this.settings,
            ...this.qualityPresets[presetName],
            quality: presetName
        };
        
        console.log(`Quality preset changed to: ${presetName}`);
        
        // Ayarları uygula
        this.applySettings();
    }
    
    /**
     * Performans ayarlarını tüm bileşenlere uygula
     */
    applySettings() {
        // Gerekli bileşenlerin varlığını kontrol et
        if (!this.scene || !this.renderer) {
            console.warn('Required game components not available, settings not applied');
            return;
        }
        
        // Renderer ayarları
        if (this.renderer) {
            // Render ölçeği
            this.renderer.setPixelRatio(window.devicePixelRatio * this.settings.renderScale);
            
            // Gölgeler
            this.renderer.shadowMap.enabled = this.settings.shadowsEnabled;
            
            // Antialiasing
            if (this.settings.quality === 'low') {
                this.renderer.antialias = false;
            }
        }
        
        // Sahne ayarları
        if (this.scene) {
            // Sis ayarları
            if (this.scene.fog) {
                this.scene.fog.density = this.settings.fogDensity;
            } else {
                this.scene.fog = new THREE.FogExp2(0xBFE3DD, this.settings.fogDensity);
            }
            
            // Kamera
            if (this.camera) {
                this.camera.far = this.settings.cameraFarDistance;
                this.camera.updateProjectionMatrix();
            }
        }
        
        // Fizik motoru ayarları
        if (this.physics) {
            this.physics.updatePerformanceSettings({
                physicsUpdateFrequency: this.settings.physicsUpdateFrequency,
                enableCollisionDetection: this.settings.enableCollisionDetection,
                debugMode: this.settings.enableDebug
            });
        }
        
        // Dünya ayarları
        if (this.world) {
            // Dünya parametrelerini güncelle
            this.world.updatePerformanceSettings({
                maxEnemies: this.settings.maxEnemies,
                maxParticles: this.settings.maxParticles,
                effectsEnabled: this.settings.effectsEnabled,
                lodEnabled: this.settings.lodEnabled,
                maxLoadDistance: this.settings.maxLoadDistance,
                maxUpdateDistance: this.settings.maxUpdateDistance,
                useSimpleGeometry: this.settings.useSimpleGeometry
            });
        }
        
        console.log('Performance settings applied to all game components');
    }
    
    /**
     * Her kare performans metriklerini güncelle
     * @param {number} deltaTime - Bu kare için geçen süre
     */
    update(deltaTime) {
        const now = Date.now();
        
        // FPS hesapla
        this.frameCount++;
        
        if (now > this.lastFpsUpdate + this.fpsUpdateInterval) {
            // FPS hesapla
            const elapsedTime = (now - this.lastFpsUpdate) / 1000;
            this.metrics.fps = Math.round(this.frameCount / elapsedTime);
            
            // FPS geçmişine ekle (otomatik adaptasyon için)
            this.fpsHistory.push(this.metrics.fps);
            if (this.fpsHistory.length > this.fpsHistoryMaxLength) {
                this.fpsHistory.shift();
            }
            
            // Metrikleri güncelle
            if (this.renderer) {
                this.metrics.drawCalls = this.renderer.info.render.calls;
                this.metrics.triangles = this.renderer.info.render.triangles;
            }
            
            if (this.physics) {
                this.metrics.physicsObjects = this.physics.bodies ? this.physics.bodies.size : 0;
            }
            
            // Metrik sayaçlarını sıfırla
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            
            // Debug modunda konsola yazdır
            if (this.settings.enableDebug) {
                console.log(`FPS: ${this.metrics.fps}, Physics Objects: ${this.metrics.physicsObjects}, Draw Calls: ${this.metrics.drawCalls}`);
            }
            
            // Otomatik performans adaptasyonu
            if (this.isAutoAdaptEnabled && now > this.lastAdaptationCheck + this.adaptationCheckInterval) {
                this.autoAdaptPerformance();
                this.lastAdaptationCheck = now;
            }
        }
        
        // Kare süresini hesapla
        this.metrics.frameTime = deltaTime * 1000; // ms cinsinden
    }
    
    /**
     * Performans metriklerine göre otomatik kalite ayarı
     */
    autoAdaptPerformance() {
        if (this.fpsHistory.length === 0) return;
        
        // Ortalama FPS hesapla
        const avgFps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
        
        // Mevcut kalite presetini al
        const currentQuality = this.settings.quality;
        let newQuality = currentQuality;
        
        // FPS'e göre kaliteyi artır veya azalt
        if (avgFps < 30 && currentQuality !== 'low') {
            // FPS çok düşük, kaliteyi düşür
            const qualities = ['ultra', 'high', 'medium', 'low'];
            const currentIndex = qualities.indexOf(currentQuality);
            if (currentIndex > 0) {
                newQuality = qualities[currentIndex + 1];
            }
        } else if (avgFps > 55 && currentQuality !== 'ultra') {
            // FPS yüksek, kaliteyi artırabilir miyiz?
            const qualities = ['low', 'medium', 'high', 'ultra'];
            const currentIndex = qualities.indexOf(currentQuality);
            if (currentIndex < qualities.length - 1) {
                newQuality = qualities[currentIndex + 1];
            }
        }
        
        // Kaliteyi değiştir
        if (newQuality !== currentQuality) {
            console.log(`Auto-adapting quality from ${currentQuality} to ${newQuality} (Avg FPS: ${avgFps.toFixed(1)})`);
            this.setQualityPreset(newQuality);
            
            // FPS geçmişini temizle
            this.fpsHistory = [];
        }
    }
    
    /**
     * UI için performans metriklerini formatla ve getir
     * @returns {Object} - Formatlı performans metrikleri
     */
    getMetricsForDisplay() {
        return {
            fps: `FPS: ${this.metrics.fps}`,
            quality: `Quality: ${this.settings.quality}`,
            objects: `Objects: ${this.metrics.physicsObjects}`,
            draws: `Draw Calls: ${this.metrics.drawCalls}`,
            triangles: `Triangles: ${this.metrics.triangles.toLocaleString()}`
        };
    }
    
    /**
     * Performans göstergelerini ekranda göster/gizle
     * @param {boolean} show - Göster/gizle
     */
    togglePerformanceDisplay(show) {
        this.settings.enableDebug = show;
        
        // PerformanceDisplay UI'ı göster/gizle
        const perfDisplay = document.getElementById('performance-display');
        if (perfDisplay) {
            perfDisplay.style.display = show ? 'block' : 'none';
        } else if (show) {
            // Eğer element yoksa oluştur
            this.createPerformanceDisplay();
        }
    }
    
    /**
     * Ekran üzerinde performans göstergesi oluştur
     */
    createPerformanceDisplay() {
        const display = document.createElement('div');
        display.id = 'performance-display';
        display.style.position = 'absolute';
        display.style.top = '10px';
        display.style.right = '10px';
        display.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        display.style.color = 'white';
        display.style.padding = '10px';
        display.style.borderRadius = '5px';
        display.style.fontFamily = 'monospace';
        display.style.fontSize = '12px';
        display.style.zIndex = '1000';
        
        // İçerik
        display.innerHTML = `
            <div id="perf-fps">FPS: --</div>
            <div id="perf-quality">Quality: ${this.settings.quality}</div>
            <div id="perf-objects">Objects: --</div>
            <div id="perf-draws">Draw Calls: --</div>
            <div id="perf-triangles">Triangles: --</div>
        `;
        
        document.body.appendChild(display);
        
        // Düzenli güncelleme için interval başlat
        setInterval(() => {
            if (!this.settings.enableDebug) return;
            
            const metrics = this.getMetricsForDisplay();
            document.getElementById('perf-fps').textContent = metrics.fps;
            document.getElementById('perf-quality').textContent = metrics.quality;
            document.getElementById('perf-objects').textContent = metrics.objects;
            document.getElementById('perf-draws').textContent = metrics.draws;
            document.getElementById('perf-triangles').textContent = metrics.triangles;
        }, 500);
    }
    
    /**
     * Oyun kalitesini manuel olarak değiştir
     * @param {string} quality - Kalite seviyesi ('low', 'medium', 'high', 'ultra')
     */
    changeQuality(quality) {
        if (!this.qualityPresets[quality]) {
            console.error(`Invalid quality level: ${quality}`);
            return;
        }
        
        // Otomatik adaptasyonu devre dışı bırak
        this.isAutoAdaptEnabled = false;
        
        // Kaliteyi ayarla
        this.setQualityPreset(quality);
        
        // Kullanıcıya bildir
        const message = `Graphics quality set to ${quality.toUpperCase()}`;
        console.log(message);
        
        // UI'da göster
        if (this.ui) {
            this.ui.showNotification(message);
        }
    }
    
    /**
     * Belirli bir nesne için Level of Detail (LOD) seviyesini belirle
     * @param {Object} object - Kontrol edilecek 3D nesne
     * @param {THREE.Vector3} cameraPosition - Kamera pozisyonu
     * @returns {number} - LOD seviyesi (0: Tam detay, 1: Orta, 2: Düşük, 3: Görünmez)
     */
    getLODLevel(object, cameraPosition) {
        if (!object || !object.position || !cameraPosition) return 0;
        
        // Mesafeyi hesapla
        const distance = object.position.distanceTo(cameraPosition);
        
        // LOD seviyesi belirle
        if (distance > this.settings.maxLoadDistance) {
            return 3; // Görünmez, devre dışı bırak
        } else if (distance > this.settings.maxLoadDistance * 0.7) {
            return 2; // Çok düşük detay
        } else if (distance > this.settings.maxLoadDistance * 0.4) {
            return 1; // Orta detay
        } else {
            return 0; // Tam detay
        }
    }
} 