/**
 * Mission.js
 * Görev yönetimi ve takibi için sınıf
 */
import { GameConstants } from '../constants/GameConstants.js';

export class Mission {
    constructor(ui) {
        this.ui = ui;
        this.missions = [];
        this.activeMissions = [];
        this.completedMissions = [];
        this.teamData = {
            red: { score: 0, balloonCount: 0, flagCaptures: 0 },
            blue: { score: 0, balloonCount: 0, flagCaptures: 0 }
        };
    }
    
    /**
     * Görev sistemini başlat
     */
    init() {
        // Görevleri tanımla
        this.defineMissions();
    }
    
    /**
     * Tüm görevleri tanımla
     */
    defineMissions() {
        // Görev tipleri:
        // - altitude: Belirli bir yüksekliğe ulaş
        // - speed: Belirli bir hıza ulaş
        // - kill: Belirli sayıda düşman vur
        // - balloon: Belirli sayıda balon patlat
        // - flag: Bayrak yakala
        // - defend: Bayrak taşıyıcısını koru
        // - survive: Belirli bir süre hayatta kal
        // - distance: Belirli bir mesafe uç
        
        this.missions = [
            // Yükseklik görevleri
            {
                id: 'altitude_100',
                type: 'altitude',
                title: 'Yüksek Uçuş I',
                description: '100 metre yüksekliğe ulaş',
                target: 100,
                progress: 0,
                reward: 10,
                completed: false,
                gameMode: ['free-flight', 'team-deathmatch', 'balloon-hunt', 'capture-flag']
            },
            {
                id: 'altitude_500',
                type: 'altitude',
                title: 'Yüksek Uçuş II',
                description: '500 metre yüksekliğe ulaş',
                target: 500,
                progress: 0,
                reward: 50,
                completed: false,
                gameMode: ['free-flight', 'team-deathmatch', 'balloon-hunt', 'capture-flag']
            },
            {
                id: 'altitude_1000',
                type: 'altitude',
                title: 'Stratosfer',
                description: '1000 metre yüksekliğe ulaş',
                target: 1000,
                progress: 0,
                reward: 100,
                completed: false,
                gameMode: ['free-flight', 'team-deathmatch', 'balloon-hunt', 'capture-flag']
            },
            
            // Hız görevleri
            {
                id: 'speed_100',
                type: 'speed',
                title: 'Hızlı Uçuş I',
                description: '100 km/h hıza ulaş',
                target: 100,
                progress: 0,
                reward: 10,
                completed: false,
                gameMode: ['free-flight', 'team-deathmatch', 'balloon-hunt', 'capture-flag']
            },
            {
                id: 'speed_200',
                type: 'speed',
                title: 'Hızlı Uçuş II',
                description: '200 km/h hıza ulaş',
                target: 200,
                progress: 0,
                reward: 50,
                completed: false,
                gameMode: ['free-flight', 'team-deathmatch', 'balloon-hunt', 'capture-flag']
            },
            {
                id: 'speed_300',
                type: 'speed',
                title: 'Ses Hızı',
                description: '300 km/h hıza ulaş',
                target: 300,
                progress: 0,
                reward: 100,
                completed: false,
                gameMode: ['free-flight', 'team-deathmatch', 'balloon-hunt', 'capture-flag']
            },
            
            // Öldürme görevleri
            {
                id: 'kill_1',
                type: 'kill',
                title: 'İlk Kan',
                description: 'Bir düşman vur',
                target: 1,
                progress: 0,
                reward: 20,
                completed: false,
                gameMode: ['team-deathmatch']
            },
            {
                id: 'kill_5',
                type: 'kill',
                title: 'Avcı',
                description: '5 düşman vur',
                target: 5,
                progress: 0,
                reward: 100,
                completed: false,
                gameMode: ['team-deathmatch']
            },
            {
                id: 'kill_10',
                type: 'kill',
                title: 'Hava Hakimiyeti',
                description: '10 düşman vur',
                target: 10,
                progress: 0,
                reward: 200,
                completed: false,
                gameMode: ['team-deathmatch']
            },
            
            // Balon görevleri
            {
                id: 'balloon_1',
                type: 'balloon',
                title: 'Balon Avcısı I',
                description: 'Bir balon patlat',
                target: 1,
                progress: 0,
                reward: 10,
                completed: false,
                gameMode: ['balloon-hunt']
            },
            {
                id: 'balloon_5',
                type: 'balloon',
                title: 'Balon Avcısı II',
                description: '5 balon patlat',
                target: 5,
                progress: 0,
                reward: 50,
                completed: false,
                gameMode: ['balloon-hunt']
            },
            {
                id: 'balloon_10',
                type: 'balloon',
                title: 'Balon Ustası',
                description: '10 balon patlat',
                target: 10,
                progress: 0,
                reward: 100,
                completed: false,
                gameMode: ['balloon-hunt']
            },
            
            // Bayrak görevleri
            {
                id: 'flag_1',
                type: 'flag',
                title: 'Bayrak Taşıyıcı I',
                description: 'Bir bayrak yakala',
                target: 1,
                progress: 0,
                reward: 50,
                completed: false,
                gameMode: ['capture-flag']
            },
            {
                id: 'flag_3',
                type: 'flag',
                title: 'Bayrak Taşıyıcı II',
                description: '3 bayrak yakala',
                target: 3,
                progress: 0,
                reward: 150,
                completed: false,
                gameMode: ['capture-flag']
            },
            
            // Savunma görevleri
            {
                id: 'defend_1',
                type: 'defend',
                title: 'Koruyucu I',
                description: 'Bayrak taşıyıcısını koru',
                target: 1,
                progress: 0,
                reward: 30,
                completed: false,
                gameMode: ['capture-flag']
            },
            {
                id: 'defend_3',
                type: 'defend',
                title: 'Koruyucu II',
                description: '3 kez bayrak taşıyıcısını koru',
                target: 3,
                progress: 0,
                reward: 90,
                completed: false,
                gameMode: ['capture-flag']
            },
            
            // Hayatta kalma görevleri
            {
                id: 'survive_60',
                type: 'survive',
                title: 'Hayatta Kalan I',
                description: '1 dakika hayatta kal',
                target: 60,
                progress: 0,
                reward: 20,
                completed: false,
                gameMode: ['free-flight', 'team-deathmatch', 'balloon-hunt', 'capture-flag']
            },
            {
                id: 'survive_300',
                type: 'survive',
                title: 'Hayatta Kalan II',
                description: '5 dakika hayatta kal',
                target: 300,
                progress: 0,
                reward: 100,
                completed: false,
                gameMode: ['free-flight', 'team-deathmatch', 'balloon-hunt', 'capture-flag']
            }
        ];
    }
    
    /**
     * Oyun moduna göre görevleri yükle
     * @param {string} gameMode - Oyun modu
     */
    loadMissions(gameMode) {
        // Aktif görevleri temizle
        this.activeMissions = [];
        this.completedMissions = [];
        
        // Oyun moduna uygun görevleri filtrele
        this.missions.forEach(mission => {
            // Görev ilerleme durumunu sıfırla
            mission.progress = 0;
            mission.completed = false;
            
            // Görev bu oyun modunda geçerli mi?
            if (mission.gameMode.includes(gameMode)) {
                this.activeMissions.push(mission);
            }
        });
        
        // UI'ı güncelle
        this.updateUI();
    }
    
    /**
     * Görevleri güncelle
     * @param {number} deltaTime - Geçen süre (saniye)
     * @param {Object} player - Oyuncu
     * @param {Object} teamData - Takım verileri
     */
    update(deltaTime, player, teamData) {
        if (!player || !player.isAlive()) return;
        
        // Takım verilerini güncelle
        if (teamData) {
            this.updateTeamData(teamData);
        }
        
        // Aktif görevleri kontrol et
        this.activeMissions.forEach(mission => {
            if (mission.completed) return;
            
            // Görev tipine göre ilerlemeyi güncelle
            switch (mission.type) {
                case 'altitude':
                    mission.progress = Math.max(mission.progress, player.getPosition().y);
                    break;
                case 'speed':
                    mission.progress = Math.max(mission.progress, player.getSpeed() * 3.6); // m/s -> km/h
                    break;
                case 'survive':
                    mission.progress += deltaTime;
                    break;
                // Diğer görev tipleri için özel güncellemeler
                // kill, balloon, flag, defend görevleri için özel olaylar gerekir
            }
            
            // Görev tamamlandı mı?
            if (mission.progress >= mission.target) {
                mission.completed = true;
                this.completedMissions.push(mission);
                
                // Aktif görevlerden çıkar
                const index = this.activeMissions.indexOf(mission);
                if (index > -1) {
                    this.activeMissions.splice(index, 1);
                }
                
                // Ödülü ver
                player.addScore(mission.reward);
                
                // Bildirim göster
                this.showMissionCompleteNotification(mission);
            }
        });
        
        // UI'ı güncelle
        this.updateUI();
    }
    
    /**
     * Görev tamamlandı bildirimini göster
     * @param {Object} mission - Tamamlanan görev
     */
    showMissionCompleteNotification(mission) {
        // UI'da bildirim göster
        if (this.ui) {
            this.ui.showHitInfo(`Görev Tamamlandı: ${mission.title} (+${mission.reward})`, 'mission');
        }
        
        // Bildirim sesi çal
        // TODO: Ses efekti ekle
    }
    
    /**
     * UI'ı güncelle
     */
    updateUI() {
        if (!this.ui) return;
        
        // Görev listesini güncelle
        const missionList = [];
        
        // Aktif görevleri ekle
        this.activeMissions.forEach(mission => {
            missionList.push({
                id: mission.id,
                title: mission.title,
                description: mission.description,
                progress: mission.progress,
                target: mission.target,
                completed: false
            });
        });
        
        // Tamamlanan görevleri ekle
        this.completedMissions.forEach(mission => {
            missionList.push({
                id: mission.id,
                title: mission.title,
                description: mission.description,
                progress: mission.target,
                target: mission.target,
                completed: true
            });
        });
        
        // UI'ı güncelle
        this.ui.updateMissionList(missionList);
    }
    
    /**
     * Görev ilerlemesini güncelle
     * @param {string} missionId - Görev ID'si
     * @param {number} progress - İlerleme değeri
     */
    updateMissionProgress(missionId, progress) {
        // Aktif görevleri kontrol et
        for (let i = 0; i < this.activeMissions.length; i++) {
            const mission = this.activeMissions[i];
            
            if (mission.id === missionId) {
                mission.progress = progress;
                
                // Görev tamamlandı mı?
                if (mission.progress >= mission.target && !mission.completed) {
                    mission.completed = true;
                    this.completedMissions.push(mission);
                    this.activeMissions.splice(i, 1);
                    this.showMissionCompleteNotification(mission);
                }
                
                break;
            }
        }
        
        // UI'ı güncelle
        this.updateUI();
    }
    
    /**
     * Takım verilerini güncelle
     * @param {Object} teamData - Takım verileri
     */
    updateTeamData(teamData) {
        if (!teamData) return;
        
        // Kırmızı takım verilerini güncelle
        if (teamData.red) {
            this.teamData.red.score = teamData.red.score || 0;
            this.teamData.red.balloonCount = teamData.red.balloonCount || 0;
            this.teamData.red.flagCaptures = teamData.red.flagCaptures || 0;
        }
        
        // Mavi takım verilerini güncelle
        if (teamData.blue) {
            this.teamData.blue.score = teamData.blue.score || 0;
            this.teamData.blue.balloonCount = teamData.blue.balloonCount || 0;
            this.teamData.blue.flagCaptures = teamData.blue.flagCaptures || 0;
        }
    }
    
    /**
     * Aktif görevleri al
     * @returns {Array} - Aktif görevler
     */
    getActiveMissions() {
        return this.activeMissions;
    }
    
    /**
     * Tamamlanan görevleri al
     * @returns {Array} - Tamamlanan görevler
     */
    getCompletedMissions() {
        return this.completedMissions;
    }
} 