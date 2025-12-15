/**
 * @name DiscordQuestSpoofer
 * @author RADINMNX
 * @description The Ultimate Quest Completer. Features: Auto-Queue, Mini-Player, Themes, Custom Keybinds, and Smart Error Handling.
 * @version 3.2.0
 * @invite 
 * @authorLink https://github.com/RADINMNX2
 * @website https://github.com/RADINMNX2
 * @source https://github.com/RADINMNX2/DiscordQuestSpoofer
 */

module.exports = class DiscordQuestSpoofer {
    constructor() {
        this.initialized = false;
        this.activeSpoofs = new Map(); // Store cleanup functions
        this.queue = []; // Queue of Quest IDs
        this.currentQuestId = null;
        this.miniPlayerOpen = false;
        
        // Settings Default
        this.settings = {
            theme: 'default',
            sound: true,
            notifications: true,
            keybind: {
                code: 'KeyQ',
                ctrl: true,
                shift: false,
                alt: false,
                meta: false
            }
        };

        // Themes Configuration
        this.themes = {
            default: {
                name: 'Neon Red',
                vars: {
                    '--dqs-accent': '#ff0055',
                    '--dqs-accent-gradient': 'linear-gradient(135deg, #ff2a5d, #ff0055)',
                    '--dqs-accent-glow': 'rgba(255, 42, 93, 0.5)',
                    '--dqs-bg-panel': '#0a0a0c',
                    '--dqs-text-highlight': '#fff'
                }
            },
            cyberpunk: {
                name: 'Cyberpunk',
                vars: {
                    '--dqs-accent': '#fcee0a',
                    '--dqs-accent-gradient': 'linear-gradient(135deg, #00f3ff, #fcee0a)',
                    '--dqs-accent-glow': 'rgba(0, 243, 255, 0.5)',
                    '--dqs-bg-panel': '#050a14',
                    '--dqs-text-highlight': '#00f3ff'
                }
            },
            matrix: {
                name: 'Matrix',
                vars: {
                    '--dqs-accent': '#00ff41',
                    '--dqs-accent-gradient': 'linear-gradient(135deg, #008f11, #00ff41)',
                    '--dqs-accent-glow': 'rgba(0, 255, 65, 0.4)',
                    '--dqs-bg-panel': '#000000',
                    '--dqs-text-highlight': '#00ff41'
                }
            },
            discord: {
                name: 'Discord Blurple',
                vars: {
                    '--dqs-accent': '#5865F2',
                    '--dqs-accent-gradient': 'linear-gradient(135deg, #5865F2, #4752C4)',
                    '--dqs-accent-glow': 'rgba(88, 101, 242, 0.5)',
                    '--dqs-bg-panel': '#313338',
                    '--dqs-text-highlight': '#fff'
                }
            },
            rgb: {
                name: 'RGB Gamer',
                vars: {
                    '--dqs-accent': '#ff0000',
                    '--dqs-accent-gradient': 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)',
                    '--dqs-accent-glow': 'rgba(255, 255, 255, 0.5)',
                    '--dqs-bg-panel': '#000000',
                    '--dqs-text-highlight': '#fff'
                },
                extraCSS: `.dqs-progress-fill { animation: dqsRainbow 5s linear infinite; }`
            }
        };

        this.modules = {
            ApplicationStreamingStore: null,
            RunningGameStore: null,
            QuestsStore: null,
            FluxDispatcher: null,
            API: null,
            ChannelStore: null,
            GuildChannelStore: null
        };
        
        this.successSound = "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; 
        this.handleKeydown = this.handleKeydown.bind(this);
    }

    getName() { return "DiscordQuestSpoofer"; }
    getDescription() { return "The Ultimate Quest Completer. Features: Auto-Queue, Mini-Player, Themes. Press " + this.getKeyString() + " to open."; }
    getVersion() { return "3.2.0"; }
    getAuthor() { return "RADINMNX"; }

    load() {
        this.findModules();
    }

    start() {
        if (!this.modules.QuestsStore) this.findModules();
        this.loadSettings();
        this.injectCSS();
        this.applyTheme();
        document.removeEventListener("keydown", this.handleKeydown);
        document.addEventListener("keydown", this.handleKeydown);
        this.initialized = true;
        this.log(`Started v3.2.0. Press ${this.getKeyString()}.`, "success");
    }

    stop() {
        this.removeCSS();
        document.removeEventListener("keydown", this.handleKeydown);
        this.closeModal();
        this.removeMiniPlayer();
        this.stopAllSpoofs();
        this.initialized = false;
    }

    loadSettings() {
        if (typeof BdApi !== "undefined" && typeof BdApi.loadData === "function") {
            try {
                const saved = BdApi.loadData("DiscordQuestSpoofer", "settings");
                if (saved) {
                    this.settings = { ...this.settings, ...saved };
                    // Migration for older versions
                    if (!this.settings.keybind) {
                         this.settings.keybind = { code: 'KeyQ', ctrl: true, shift: false, alt: false, meta: false };
                    }
                }
            } catch (e) {
                console.error("[DQS] Failed to load settings:", e);
            }
        }
    }

    saveSettings() {
        if (typeof BdApi !== "undefined" && typeof BdApi.saveData === "function") {
            BdApi.saveData("DiscordQuestSpoofer", "settings", this.settings);
        }
        this.applyTheme();
    }

    findModules() {
        try {
            let wpRequire = window.webpackChunkdiscord_app?.push([[Symbol()], {}, r => r]);
            window.webpackChunkdiscord_app?.pop();

            if (wpRequire) {
                const modules = Object.values(wpRequire.c);
                this.modules.ApplicationStreamingStore = modules.find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.Z;
                this.modules.RunningGameStore = modules.find(x => x?.exports?.ZP?.getRunningGames)?.exports?.ZP;
                this.modules.QuestsStore = modules.find(x => x?.exports?.Z?.__proto__?.getQuest)?.exports?.Z;
                this.modules.ChannelStore = modules.find(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent)?.exports?.Z;
                this.modules.GuildChannelStore = modules.find(x => x?.exports?.ZP?.getSFWDefaultChannel)?.exports?.ZP;
                this.modules.FluxDispatcher = modules.find(x => x?.exports?.Z?.__proto__?.flushWaitQueue)?.exports?.Z;
                this.modules.API = modules.find(x => x?.exports?.tn?.get)?.exports?.tn;
            }
        } catch (e) {}

        if (!this.modules.QuestsStore && typeof BdApi !== "undefined" && BdApi.Webpack) {
            const get = BdApi.Webpack.getModule;
            this.modules.ApplicationStreamingStore = get(m => m?.getStreamerActiveStreamMetadata);
            this.modules.RunningGameStore = get(m => m?.getRunningGames);
            this.modules.QuestsStore = get(m => m?.getQuest && typeof m.getQuest === "function");
            this.modules.FluxDispatcher = get(m => m?.flushWaitQueue);
            this.modules.API = get(m => m?.get && m?.post);
            this.modules.ChannelStore = get(m => m?.getSortedPrivateChannels);
            this.modules.GuildChannelStore = get(m => m?.getSFWDefaultChannel);
        }
    }

    log(message, type = "info") {
        console.log(`[QuestSpoofer] ${message}`);
        if (typeof BdApi !== "undefined" && BdApi.showToast) {
            BdApi.showToast(message, { type });
        }
    }

    playSound() {
        if (!this.settings.sound) return;
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"); 
            audio.volume = 0.5;
            audio.play();
        } catch(e) {}
    }

    notify(title, body) {
        if (!this.settings.notifications) return;
        try {
            new Notification(title, { body, icon: "https://cdn.discordapp.com/emojis/123456789.png" });
        } catch(e) {}
    }

    handleKeydown(e) {
        const k = this.settings.keybind;
        if (e.code === k.code && 
            e.ctrlKey === k.ctrl && 
            e.shiftKey === k.shift && 
            e.altKey === k.alt && 
            e.metaKey === k.meta) {
            e.preventDefault();
            this.toggleModal();
        }
    }

    getKeyString() {
        const k = this.settings.keybind;
        let parts = [];
        if (k.ctrl) parts.push("CTRL");
        if (k.shift) parts.push("SHIFT");
        if (k.alt) parts.push("ALT");
        if (k.meta) parts.push("META");
        parts.push(k.code.replace("Key", "").replace("Digit", ""));
        return parts.join(" + ");
    }

    toggleModal() {
        const existing = document.getElementById("dqs-overlay");
        if (existing) {
            this.closeModal();
        } else {
            this.openModal();
        }
    }

    closeModal() {
        const overlay = document.getElementById("dqs-overlay");
        if (overlay) {
            overlay.classList.add("dqs-closing");
            setTimeout(() => {
                if(overlay) overlay.remove();
            }, 300);
        }
        if (this.currentQuestId) {
            this.renderMiniPlayer();
        }
    }

    openModal() {
        this.removeMiniPlayer();
        if (document.getElementById("dqs-overlay")) return;
        
        const overlay = document.createElement("div");
        overlay.id = "dqs-overlay";
        overlay.className = "dqs-overlay";
        
        overlay.onclick = (e) => {
            if (e.target === overlay) this.closeModal();
        };

        const content = this.renderDashboard();
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        this.applyTheme();
    }

    removeMiniPlayer() {
        const mini = document.getElementById("dqs-mini-player");
        if (mini) mini.remove();
        this.miniPlayerOpen = false;
    }

    stopAllSpoofs() {
        for (const [questId, cleanup] of this.activeSpoofs.entries()) {
            if (typeof cleanup === 'function') cleanup();
        }
        this.activeSpoofs.clear();
        this.queue = [];
        this.currentQuestId = null;

        if (this.modules.RunningGameStore && this.originalGetRunningGames) {
            this.modules.RunningGameStore.getRunningGames = this.originalGetRunningGames;
            this.modules.RunningGameStore.getGameForPID = this.originalGetGameForPID;
        }
        if (this.modules.ApplicationStreamingStore && this.originalGetStreamerActiveStreamMetadata) {
            this.modules.ApplicationStreamingStore.getStreamerActiveStreamMetadata = this.originalGetStreamerActiveStreamMetadata;
        }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    }

    applyTheme() {
        const theme = this.themes[this.settings.theme] || this.themes.default;
        const root = document.querySelector(':root');
        if (!root) return;

        for (const [key, value] of Object.entries(theme.vars)) {
            root.style.setProperty(key, value);
        }
        
        const oldStyle = document.getElementById("dqs-extra-theme");
        if (oldStyle) oldStyle.remove();

        if (theme.extraCSS) {
            const style = document.createElement("style");
            style.id = "dqs-extra-theme";
            style.textContent = theme.extraCSS;
            document.head.appendChild(style);
        }
    }

    injectCSS() {
        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');
            :root {
                --dqs-bg-overlay: rgba(0, 0, 0, 0.85);
                --dqs-bg-panel: #0a0a0c;
                --dqs-bg-card: rgba(255, 255, 255, 0.03);
                --dqs-border: rgba(255, 255, 255, 0.08);
                --dqs-accent: #ff0055;
                --dqs-accent-gradient: linear-gradient(135deg, #ff2a5d, #ff0055);
                --dqs-accent-glow: rgba(255, 42, 93, 0.5);
                --dqs-success: #00ff9d;
                --dqs-success-glow: rgba(0, 255, 157, 0.4);
                --dqs-text-main: #ffffff;
                --dqs-text-muted: #8a8a90;
                --dqs-text-highlight: #ffffff;
            }
            @keyframes dqsFadeIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(12px); } }
            @keyframes dqsScaleUp { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            @keyframes dqsSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes dqsRainbow { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
            @keyframes dqsPulse { 0% { box-shadow: 0 0 0 0 var(--dqs-accent-glow); } 70% { box-shadow: 0 0 0 10px rgba(0,0,0,0); } 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); } }
            
            /* Settings Panel CSS */
            @keyframes dqsFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            @keyframes dqsNeonPulse { 0% { box-shadow: 0 0 5px rgba(0, 255, 157, 0.2), inset 0 0 5px rgba(0, 255, 157, 0.1); } 50% { box-shadow: 0 0 20px rgba(0, 255, 157, 0.5), inset 0 0 10px rgba(0, 255, 157, 0.2); } 100% { box-shadow: 0 0 5px rgba(0, 255, 157, 0.2), inset 0 0 5px rgba(0, 255, 157, 0.1); } }
            
            .dqs-settings-wrapper { width: 100%; height: 100%; min-height: 300px; display: flex; justify-content: center; align-items: center; background: radial-gradient(circle at center, rgba(0, 255, 157, 0.05) 0%, transparent 70%); font-family: 'Inter', system-ui, sans-serif; }
            .dqs-settings-card { background: rgba(10, 20, 15, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(0, 255, 157, 0.3); padding: 40px; border-radius: 24px; text-align: center; max-width: 450px; width: 100%; position: relative; overflow: hidden; animation: dqsScaleUp 0.5s ease; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
            .dqs-settings-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, #00ff9d, transparent); }
            .dqs-icon-large { font-size: 48px; margin-bottom: 20px; display: inline-block; animation: dqsFloat 3s ease-in-out infinite; filter: drop-shadow(0 0 15px rgba(0, 255, 157, 0.4)); }
            .dqs-settings-title { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 8px; text-transform: uppercase; letter-spacing: -0.5px; }
            .dqs-settings-desc { color: #8a8a90; font-size: 14px; margin-bottom: 32px; line-height: 1.5; font-weight: 500; }
            .dqs-key-display { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
            .dqs-key { background: rgba(0, 255, 157, 0.05); border: 1px solid #00ff9d; color: #00ff9d; padding: 12px 20px; border-radius: 12px; font-weight: 900; font-size: 18px; box-shadow: 0 0 15px rgba(0, 255, 157, 0.15); text-shadow: 0 0 10px rgba(0, 255, 157, 0.5); animation: dqsNeonPulse 3s infinite; }
            .dqs-plus { color: #555; font-weight: 700; font-size: 20px; }
            .dqs-instruction { font-size: 12px; font-weight: 700; color: #00ff9d; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.8; }

            /* Recorder UI */
            .dqs-recorder-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 100000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(15px); animation: dqsFadeIn 0.2s ease; }
            .dqs-recorder-box { background: #0a0a0c; border: 1px solid var(--dqs-accent); border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 0 50px var(--dqs-accent-glow); transform: scale(0.9); animation: dqsScaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            .dqs-rec-title { font-size: 20px; color: #fff; font-weight: 700; margin-bottom: 20px; }
            .dqs-rec-keys { display: flex; gap: 10px; justify-content: center; margin-bottom: 30px; min-height: 50px; }
            .dqs-rec-key { padding: 10px 15px; background: rgba(255,255,255,0.1); border-radius: 8px; font-weight: 600; color: var(--dqs-text-highlight); border: 1px solid rgba(255,255,255,0.2); }
            .dqs-rec-anim { width: 10px; height: 10px; background: #ff0055; border-radius: 50%; margin: 0 auto 20px; animation: dqsPulse 1s infinite; }
            .dqs-btn-outline { background: transparent; border: 1px solid var(--dqs-border); color: var(--dqs-text-muted); padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 12px; font-weight: 600; }
            .dqs-btn-outline:hover { border-color: var(--dqs-accent); color: var(--dqs-text-highlight); }

            /* Main UI styles */
            .dqs-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: var(--dqs-bg-overlay); z-index: 99999; display: flex; justify-content: center; align-items: center; animation: dqsFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; backdrop-filter: blur(12px); }
            .dqs-overlay.dqs-closing { animation: dqsFadeIn 0.3s reverse forwards; }
            .dqs-panel { width: 500px; max-width: 90vw; max-height: 85vh; display: flex; flex-direction: column; background: var(--dqs-bg-panel); border: 1px solid var(--dqs-border); border-radius: 24px; font-family: 'Inter', system-ui, sans-serif; color: var(--dqs-text-main); box-shadow: 0 0 0 1px rgba(0,0,0,1), 0 40px 80px -20px rgba(0,0,0,0.8); animation: dqsScaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; position: relative; overflow: hidden; }
            .dqs-content { position: relative; z-index: 2; padding: 32px; display: flex; flex-direction: column; height: 100%; overflow: hidden; }
            .dqs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-shrink: 0; }
            .dqs-brand { display: flex; align-items: center; gap: 16px; }
            .dqs-logo-box { width: 48px; height: 48px; background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid var(--dqs-border); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px -5px rgba(0,0,0,0.5); }
            .dqs-logo-box svg { stroke: var(--dqs-accent); filter: drop-shadow(0 0 8px var(--dqs-accent)); transition: stroke 0.3s; }
            .dqs-title-wrap h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: var(--dqs-text-main); }
            .dqs-title-wrap p { margin: 0; font-size: 11px; font-weight: 600; color: var(--dqs-text-muted); text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; display: flex; align-items: center; gap: 6px; }
            .dqs-status-dot { width: 6px; height: 6px; background: var(--dqs-success); border-radius: 50%; box-shadow: 0 0 10px var(--dqs-success); }
            .dqs-controls { display: flex; gap: 8px; }
            .dqs-icon-btn { background: rgba(255,255,255,0.03); border: 1px solid transparent; color: var(--dqs-text-muted); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
            .dqs-icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; transform: translateY(-2px); }
            .dqs-close-btn:hover { background: var(--dqs-accent); border-color: var(--dqs-accent); box-shadow: 0 4px 15px var(--dqs-accent-glow); }
            #dqs-list { flex-grow: 1; overflow-y: auto; padding-right: 8px; margin-right: -8px; }
            #dqs-list::-webkit-scrollbar { width: 4px; }
            #dqs-list::-webkit-scrollbar-track { background: transparent; }
            #dqs-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
            .dqs-card { background: var(--dqs-bg-card); border: 1px solid var(--dqs-border); border-radius: 18px; padding: 24px; margin-bottom: 16px; position: relative; transition: all 0.3s; opacity: 0; animation: dqsScaleUp 0.5s forwards; }
            .dqs-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); }
            .dqs-card.error { border-color: #ff3333; box-shadow: 0 0 20px rgba(255,51,51,0.2); }
            .dqs-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .dqs-app-icon { width: 40px; height: 40px; border-radius: 10px; background: #222; margin-right: 12px; }
            .dqs-app-name { font-size: 16px; font-weight: 700; color: var(--dqs-text-highlight); }
            .dqs-task-name { font-size: 12px; color: var(--dqs-text-muted); margin-top: 2px; }
            .dqs-badge { font-size: 10px; font-weight: 800; padding: 6px 10px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(255,255,255,0.05); color: var(--dqs-text-muted); border: 1px solid rgba(255,255,255,0.1); }
            .dqs-card.completed .dqs-badge { background: rgba(0, 255, 157, 0.1); color: #00ff9d; border-color: rgba(0, 255, 157, 0.2); }
            .dqs-card.running .dqs-badge { background: rgba(255, 42, 93, 0.1); color: var(--dqs-accent); border-color: var(--dqs-accent); }
            .dqs-card.queued .dqs-badge { background: rgba(255, 179, 0, 0.1); color: #ffb300; border-color: #ffb300; }
            .dqs-progress-track { height: 6px; background: rgba(255,255,255,0.05); border-radius: 100px; overflow: hidden; margin-bottom: 20px; }
            .dqs-progress-fill { height: 100%; background: var(--dqs-accent-gradient); width: 0%; box-shadow: 0 0 15px var(--dqs-accent-glow); transition: width 0.3s linear; }
            .dqs-card.completed .dqs-progress-fill { background: var(--dqs-success); box-shadow: 0 0 15px var(--dqs-success-glow); }
            .dqs-stats { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 12px; font-weight: 600; color: var(--dqs-text-muted); }
            .dqs-stat-val { color: var(--dqs-text-highlight); margin-left: 4px; }
            .dqs-btn { width: 100%; padding: 12px; background: var(--dqs-accent-gradient); border: none; color: #fff; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13px; border-radius: 12px; cursor: pointer; transition: all 0.3s; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 20px var(--dqs-accent-glow); }
            .dqs-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px var(--dqs-accent-glow); }
            .dqs-btn.active { animation: dqsPulse 2s infinite; }
            .dqs-btn.secondary { background: rgba(255,255,255,0.1); box-shadow: none; }
            .dqs-btn.secondary:hover { background: rgba(255,255,255,0.15); }
            .dqs-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
            .dqs-mini { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); width: 400px; padding: 16px; border-radius: 16px; background: var(--dqs-bg-panel); border: 1px solid var(--dqs-border); box-shadow: 0 10px 40px rgba(0,0,0,0.5); z-index: 99990; display: flex; align-items: center; gap: 16px; animation: dqsSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
            .dqs-mini-icon { width: 32px; height: 32px; border-radius: 8px; background: #222; }
            .dqs-mini-info { flex: 1; }
            .dqs-mini-title { font-size: 12px; font-weight: 700; color: var(--dqs-text-highlight); margin-bottom: 4px; }
            .dqs-mini-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
            .dqs-mini-fill { height: 100%; background: var(--dqs-accent-gradient); width: 0%; transition: width 0.3s linear; }
            .dqs-mini-eta { font-size: 10px; color: var(--dqs-text-muted); margin-left: 8px; min-width: 50px; text-align: right; }
            .dqs-mini-close { width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(255,255,255,0.1); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
            .dqs-mini-close:hover { background: #ff3333; }
            .dqs-settings-overlay { position: absolute; inset: 0; background: var(--dqs-bg-panel); z-index: 10; padding: 32px; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            .dqs-settings-overlay.open { transform: translateX(0); }
            .dqs-setting-row { margin-bottom: 20px; }
            .dqs-setting-label { display: block; font-size: 12px; font-weight: 600; color: var(--dqs-text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
            .dqs-theme-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
            .dqs-theme-btn { padding: 10px; border: 1px solid var(--dqs-border); border-radius: 8px; background: rgba(255,255,255,0.03); color: var(--dqs-text-muted); cursor: pointer; font-size: 11px; font-weight: 600; }
            .dqs-theme-btn:hover { background: rgba(255,255,255,0.05); }
            .dqs-theme-btn.active { border-color: var(--dqs-accent); color: var(--dqs-accent); background: rgba(255,255,255,0.05); }
            .dqs-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--dqs-text-main); font-size: 13px; font-weight: 500; }
        `;
        if (typeof BdApi !== "undefined" && BdApi.DOM) BdApi.DOM.addStyle("DiscordQuestSpoofer", css);
    }

    getSettingsPanel() {
        const wrap = document.createElement("div");
        wrap.className = "dqs-settings-wrapper";
        
        const keys = this.getKeyString().split(' + ');
        let keysHtml = '';
        keys.forEach((k, i) => {
             keysHtml += `<div class="dqs-key">${k}</div>`;
             if (i < keys.length - 1) keysHtml += `<span class="dqs-plus">+</span>`;
        });

        wrap.innerHTML = `
            <div class="dqs-settings-card">
                <div class="dqs-icon-large">⚙️</div>
                <h2 class="dqs-settings-title">Quest Spoofer Ready</h2>
                <p class="dqs-settings-desc">The main interface is hidden to keep your workspace clean and professional.</p>
                <div class="dqs-key-display">${keysHtml}</div>
                <p class="dqs-instruction">Press shortcut anywhere to open</p>
            </div>
        `;
        return wrap;
    }

    openKeybindRecorder() {
        const overlay = document.createElement("div");
        overlay.className = "dqs-recorder-overlay";
        overlay.innerHTML = `
            <div class="dqs-recorder-box">
                <div class="dqs-rec-anim"></div>
                <div class="dqs-rec-title">Press New Keybind</div>
                <div class="dqs-rec-keys" id="dqs-rec-display">
                    <span style="color:#666; font-size:14px; margin-top:10px;">Waiting for input...</span>
                </div>
                <button class="dqs-btn-outline" id="dqs-rec-cancel">Cancel</button>
            </div>
        `;

        document.body.appendChild(overlay);

        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore standalone modifiers
            if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

            const newBind = {
                code: e.code,
                ctrl: e.ctrlKey,
                shift: e.shiftKey,
                alt: e.altKey,
                meta: e.metaKey
            };

            this.settings.keybind = newBind;
            this.saveSettings();
            
            // Clean up
            document.removeEventListener("keydown", handler);
            overlay.remove();
            
            // Refresh UIs
            this.closeModal();
            this.openModal();
            const panel = document.getElementById("dqs-settings-panel");
            if(panel) panel.classList.add("open");
        };

        document.addEventListener("keydown", handler);

        overlay.querySelector("#dqs-rec-cancel").onclick = () => {
            document.removeEventListener("keydown", handler);
            overlay.remove();
        };
    }

    renderDashboard() {
        const self = this;
        if (!self.modules.QuestsStore) self.findModules();

        const container = document.createElement("div");
        container.className = "dqs-panel";
        
        container.innerHTML = `
            <div class="dqs-content">
                <div class="dqs-header">
                    <div class="dqs-brand">
                        <div class="dqs-logo-box">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                            </svg>
                        </div>
                        <div class="dqs-title-wrap">
                            <h1>Quest Spoofer</h1>
                            <p><span class="dqs-status-dot"></span> V3.2 • READY</p>
                        </div>
                    </div>
                    <div class="dqs-controls">
                        <button class="dqs-icon-btn" id="dqs-settings-btn" title="Settings">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </button>
                        <button class="dqs-icon-btn dqs-close-btn" id="dqs-close" title="Close">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                
                <div class="dqs-settings-overlay" id="dqs-settings-panel">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                        <h2 style="font-size:16px; font-weight:700; margin:0;">Settings</h2>
                        <button class="dqs-icon-btn" id="dqs-settings-back"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
                    </div>
                    
                    <div class="dqs-setting-row">
                        <label class="dqs-setting-label">Shortcut</label>
                        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid var(--dqs-border); padding:12px; border-radius:12px;">
                            <div style="font-family:monospace; color:var(--dqs-accent); font-weight:bold;">${this.getKeyString()}</div>
                            <button class="dqs-btn-outline" id="dqs-change-key">Change</button>
                        </div>
                    </div>

                    <div class="dqs-setting-row">
                        <label class="dqs-setting-label">Theme</label>
                        <div class="dqs-theme-grid" id="dqs-theme-grid"></div>
                    </div>

                    <div class="dqs-setting-row">
                        <label class="dqs-setting-label">Behavior</label>
                        <label class="dqs-checkbox">
                            <input type="checkbox" id="dqs-chk-sound" ${this.settings.sound ? 'checked' : ''}> Play Sound on Complete
                        </label>
                        <div style="height:8px"></div>
                        <label class="dqs-checkbox">
                            <input type="checkbox" id="dqs-chk-notify" ${this.settings.notifications ? 'checked' : ''}> Desktop Notifications
                        </label>
                    </div>
                </div>

                <div id="dqs-list"></div>
                
                <div style="font-size: 11px; color: var(--dqs-text-muted); text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--dqs-border);">
                    Made with <span style="color: var(--dqs-accent)">♥</span> by RADINMNX
                </div>
            </div>
        `;

        container.querySelector("#dqs-close").onclick = () => this.closeModal();
        container.querySelector("#dqs-change-key").onclick = () => this.openKeybindRecorder();
        
        const settingsPanel = container.querySelector("#dqs-settings-panel");
        container.querySelector("#dqs-settings-btn").onclick = () => settingsPanel.classList.add("open");
        container.querySelector("#dqs-settings-back").onclick = () => settingsPanel.classList.remove("open");
        
        const themeGrid = container.querySelector("#dqs-theme-grid");
        Object.entries(this.themes).forEach(([key, theme]) => {
            const btn = document.createElement("div");
            btn.className = `dqs-theme-btn ${this.settings.theme === key ? 'active' : ''}`;
            btn.textContent = theme.name;
            btn.onclick = () => {
                this.settings.theme = key;
                this.saveSettings();
                themeGrid.querySelectorAll(".dqs-theme-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.applyTheme();
            };
            themeGrid.appendChild(btn);
        });

        container.querySelector("#dqs-chk-sound").onchange = (e) => { this.settings.sound = e.target.checked; this.saveSettings(); };
        container.querySelector("#dqs-chk-notify").onchange = (e) => { this.settings.notifications = e.target.checked; this.saveSettings(); };

        this.renderQuestsList(container.querySelector("#dqs-list"));
        return container;
    }

    renderQuestsList(list) {
        list.addEventListener("wheel", (e) => e.stopPropagation());
        list.innerHTML = "";

        if (!this.modules.QuestsStore) {
            list.innerHTML = `<div style="padding:40px; text-align:center; color:var(--dqs-text-muted)">Modules not loaded.<br>Restart Discord.</div>`;
            return;
        }

        const quests = this.getQuests();
        if (quests.length === 0) {
            list.innerHTML = `<div style="padding:40px; text-align:center; color:var(--dqs-text-muted); border:1px dashed var(--dqs-border); border-radius:12px;">No active quests found.<br>Accept one in User Settings.</div>`;
            return;
        }

        quests.forEach((quest, index) => {
            const appId = quest.config.application.id;
            const appName = quest.config.application.name;
            const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
            const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null);
            
            if (!taskName) return;

            const targetSeconds = taskConfig.tasks[taskName].target;
            const currentProgress = quest.userStatus?.progress?.[taskName]?.value ?? 0;
            const percent = Math.min(100, Math.floor((currentProgress / targetSeconds) * 100));
            
            const isRunning = this.currentQuestId === quest.id;
            const isQueued = this.queue.includes(quest.id);
            const isCompleted = percent >= 100;

            const card = document.createElement("div");
            card.className = `dqs-card ${isCompleted ? 'completed' : (isRunning ? 'running' : (isQueued ? 'queued' : ''))}`;
            card.id = `card-${quest.id}`;
            card.style.animationDelay = `${index * 100}ms`;

            let badgeText = 'READY';
            if (isCompleted) badgeText = 'COMPLETED';
            else if (isRunning) badgeText = 'RUNNING';
            else if (isQueued) badgeText = `QUEUED #${this.queue.indexOf(quest.id) + 1}`;

            card.innerHTML = `
                <div class="dqs-card-header">
                    <div style="display:flex; align-items:center;">
                        <img src="https://cdn.discordapp.com/app-icons/${appId}/${quest.config.application.icon}.png?size=64" class="dqs-app-icon" onerror="this.style.display='none'">
                        <div>
                            <div class="dqs-app-name">${appName}</div>
                            <div class="dqs-task-name">${taskName.replace(/_/g, " ")}</div>
                        </div>
                    </div>
                    <div class="dqs-badge" id="badge-${quest.id}">${badgeText}</div>
                </div>
                
                <div class="dqs-progress-track">
                    <div class="dqs-progress-fill" style="width: ${percent}%" id="bar-${quest.id}"></div>
                </div>
                
                <div class="dqs-stats">
                    <span><span id="percent-${quest.id}">${percent}%</span> COMPLETE</span>
                    <span id="eta-${quest.id}">${this.formatTime(Math.max(0, targetSeconds - currentProgress))} left</span>
                </div>

                <button class="dqs-btn ${isCompleted ? 'secondary' : (isRunning ? 'active' : (isQueued ? 'secondary' : ''))}" id="btn-${quest.id}" ${isCompleted ? 'disabled' : ''}>
                    ${isCompleted ? 'COMPLETED' : (isRunning ? 'STOP' : (isQueued ? 'REMOVE FROM QUEUE' : (this.currentQuestId ? 'ADD TO QUEUE' : 'START SPOOFING')))}
                </button>
            `;

            const btn = card.querySelector(`#btn-${quest.id}`);
            
            if (!isCompleted) {
                btn.onclick = () => {
                    if (this.currentQuestId === quest.id) {
                        this.stopSpoof(quest.id);
                        // Do not auto-process queue if manually stopped by user
                    } else if (this.queue.includes(quest.id)) {
                        this.queue = this.queue.filter(id => id !== quest.id);
                        this.updateCardUI(quest.id, false, false, currentProgress, targetSeconds);
                    } else if (this.currentQuestId) {
                        this.queue.push(quest.id);
                        this.updateCardUI(quest.id, false, true, currentProgress, targetSeconds);
                    } else {
                        this.startSpoof(quest, taskName, targetSeconds);
                    }
                };
            }

            list.appendChild(card);
        });
    }

    renderMiniPlayer() {
        if (this.miniPlayerOpen || !this.currentQuestId) return;

        const quest = this.getQuests().find(q => q.id === this.currentQuestId);
        if (!quest) return;

        const appId = quest.config.application.id;
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const taskName = Object.keys(taskConfig.tasks)[0];
        const targetSeconds = taskConfig.tasks[taskName].target;
        const currentProgress = quest.userStatus?.progress?.[taskName]?.value ?? 0;
        const percent = Math.min(100, Math.floor((currentProgress / targetSeconds) * 100));

        const mini = document.createElement("div");
        mini.id = "dqs-mini-player";
        mini.className = "dqs-mini";
        mini.innerHTML = `
            <img src="https://cdn.discordapp.com/app-icons/${appId}/${quest.config.application.icon}.png?size=64" class="dqs-mini-icon">
            <div class="dqs-mini-info">
                <div class="dqs-mini-title">Spoofing: ${quest.config.application.name}</div>
                <div class="dqs-mini-bar">
                    <div class="dqs-mini-fill" style="width: ${percent}%"></div>
                </div>
            </div>
            <div class="dqs-mini-eta">${this.formatTime(targetSeconds - currentProgress)}</div>
            <button class="dqs-mini-close" title="Open Menu">⇪</button>
        `;

        mini.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') {
                this.toggleModal();
            }
        };
        mini.querySelector("button").onclick = () => this.toggleModal();

        document.body.appendChild(mini);
        this.applyTheme();
    }

    updateCardUI(questId, isRunning, isQueued, progress, target) {
        const card = document.getElementById(`card-${questId}`);
        if (card) {
            const btn = card.querySelector(`#btn-${questId}`);
            const badge = card.querySelector(`#badge-${questId}`);
            const bar = card.querySelector(`#bar-${questId}`);
            const eta = card.querySelector(`#eta-${questId}`);
            const per = card.querySelector(`#percent-${questId}`);
            
            const percent = Math.min(100, Math.floor((progress / target) * 100));
            const completed = percent >= 100;

            if (bar) bar.style.width = `${percent}%`;
            if (per) per.textContent = `${percent}%`;
            if (eta) eta.textContent = completed ? 'DONE' : `${this.formatTime(Math.max(0, target - progress))} left`;

            card.className = `dqs-card ${completed ? 'completed' : (isRunning ? 'running' : (isQueued ? 'queued' : ''))}`;

            if (completed) {
                badge.textContent = 'COMPLETED';
                btn.textContent = 'COMPLETED';
                btn.className = 'dqs-btn secondary';
                btn.disabled = true;
            } else if (isRunning) {
                badge.textContent = 'RUNNING';
                btn.textContent = 'STOP';
                btn.className = 'dqs-btn active';
            } else if (isQueued) {
                badge.textContent = `QUEUED #${this.queue.indexOf(questId) + 1}`;
                btn.textContent = 'REMOVE FROM QUEUE';
                btn.className = 'dqs-btn secondary';
            } else {
                badge.textContent = 'READY';
                btn.textContent = this.currentQuestId ? 'ADD TO QUEUE' : 'START SPOOFING';
                btn.className = 'dqs-btn';
            }
        }

        if (this.miniPlayerOpen && isRunning) {
            const mini = document.getElementById("dqs-mini-player");
            if (mini) {
                const percent = Math.min(100, Math.floor((progress / target) * 100));
                mini.querySelector(".dqs-mini-fill").style.width = `${percent}%`;
                mini.querySelector(".dqs-mini-eta").textContent = this.formatTime(Math.max(0, target - progress));
            }
        }
    }

    processQueue() {
        if (this.currentQuestId) return; // Busy
        if (this.queue.length === 0) return; // Empty

        const nextId = this.queue.shift();
        const quest = this.getQuests().find(q => q.id === nextId);
        
        if (quest) {
            this.queue.forEach(qid => {
                const q = this.getQuests().find(x => x.id === qid);
                const t = q.config.taskConfig?.tasks ? Object.values(q.config.taskConfig.tasks)[0].target : 100;
                this.updateCardUI(qid, false, true, q.userStatus?.progress ? Object.values(q.userStatus.progress)[0].value : 0, t);
            });

            const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
            const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null);
            this.startSpoof(quest, taskName, taskConfig.tasks[taskName].target);
        }
    }

    getQuests() {
        if (!this.modules.QuestsStore) return [];
        try {
            const collection = this.modules.QuestsStore.quests;
            const allQuests = (collection instanceof Map) ? Array.from(collection.values()) : Object.values(collection);
            return allQuests.filter(x => 
                x.id !== "1412491570820812933" && 
                x.userStatus?.enrolledAt && 
                !x.userStatus?.completedAt && 
                new Date(x.config.expiresAt).getTime() > Date.now()
            );
        } catch(e) { return []; }
    }

    stopSpoof(questId) {
        if (this.activeSpoofs.has(questId)) {
            this.activeSpoofs.get(questId)();
            this.activeSpoofs.delete(questId);
        }
        if (this.currentQuestId === questId) {
            this.currentQuestId = null;
            
            if (this.modules.RunningGameStore && this.originalGetRunningGames) {
                this.modules.RunningGameStore.getRunningGames = this.originalGetRunningGames;
                this.modules.RunningGameStore.getGameForPID = this.originalGetGameForPID;
            }
            if (this.modules.ApplicationStreamingStore && this.originalGetStreamerActiveStreamMetadata) {
                this.modules.ApplicationStreamingStore.getStreamerActiveStreamMetadata = this.originalGetStreamerActiveStreamMetadata;
            }

            const quest = this.getQuests().find(q => q.id === questId);
            if(quest) {
                const t = quest.config.taskConfig?.tasks ? Object.values(quest.config.taskConfig.tasks)[0].target : 100;
                const p = quest.userStatus?.progress ? Object.values(quest.userStatus.progress)[0].value : 0;
                this.updateCardUI(questId, false, false, p, t);
            }
            
            this.removeMiniPlayer();
        }
    }

    async startSpoof(quest, taskName, secondsNeeded) {
        if (this.currentQuestId) return; // Prevent concurrent
        this.currentQuestId = quest.id;
        this.updateCardUI(quest.id, true, false, 0, secondsNeeded);

        const { API, RunningGameStore, FluxDispatcher, ApplicationStreamingStore } = this.modules;
        
        const onProgress = (current) => {
            this.updateCardUI(quest.id, true, false, current, secondsNeeded);
            if (current >= secondsNeeded) {
                this.stopSpoof(quest.id);
                this.playSound();
                this.notify("Quest Completed!", `You finished ${quest.config.application.name}`);
                this.processQueue(); // Auto-start next
            }
        };

        // --- Video Tasks ---
        if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            const speed = 7;
            let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
            
            const interval = setInterval(async () => {
                const timestamp = secondsDone + speed;
                try {
                    await API.post({
                        url: `/quests/${quest.id}/video-progress`, 
                        body: {timestamp: Math.min(secondsNeeded, timestamp + Math.random())}
                    });
                    secondsDone = Math.min(secondsNeeded, timestamp);
                    onProgress(secondsDone);
                } catch(e) {}
            }, 1000);
            this.activeSpoofs.set(quest.id, () => clearInterval(interval));
        }
        
        // --- Game Tasks ---
        else if (taskName === "PLAY_ON_DESKTOP") {
            const pid = Math.floor(Math.random() * 30000) + 1000;
            const appId = quest.config.application.id;
            const appName = quest.config.application.name;

            let exeName = "game.exe";
            try {
                const res = await API.get({url: `/applications/public?application_ids=${appId}`});
                if (res.body?.[0]?.executables) {
                    const winExe = res.body[0].executables.find(x => x.os === "win32");
                    if (winExe) exeName = winExe.name.replace(">","");
                }
            } catch(e) {}

            const fakeGame = {
                cmdLine: `C:\\Program Files\\${appName}\\${exeName}`,
                exeName: exeName,
                exePath: `c:/program files/${appName.toLowerCase()}/${exeName}`,
                hidden: false,
                isLauncher: false,
                id: appId,
                name: appName,
                pid: pid,
                pidPath: [pid],
                processName: appName,
                start: Date.now(),
            };

            this.originalGetRunningGames = RunningGameStore.getRunningGames;
            this.originalGetGameForPID = RunningGameStore.getGameForPID;
            RunningGameStore.getRunningGames = () => [fakeGame];
            RunningGameStore.getGameForPID = (id) => id === pid ? fakeGame : null;
            
            FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [], added: [fakeGame], games: [fakeGame]});
            
            const tracker = (data) => {
                let progress = 0;
                if (quest.config.configVersion === 1) progress = data.userStatus.streamProgressSeconds;
                else if (data.userStatus?.progress?.PLAY_ON_DESKTOP) progress = Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
                onProgress(progress);
            };
            
            const heartbeat = setInterval(() => {
                const currentGames = RunningGameStore.getRunningGames();
                if (!currentGames.find(g => g.pid === pid)) {
                    FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [], added: [fakeGame], games: [fakeGame]});
                }
            }, 5000);

            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", tracker);

            this.activeSpoofs.set(quest.id, () => {
                clearInterval(heartbeat);
                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", tracker);
                RunningGameStore.getRunningGames = this.originalGetRunningGames;
                RunningGameStore.getGameForPID = this.originalGetGameForPID;
                FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: []});
            });
        }
        
        // --- Stream Tasks ---
        else if (taskName === "STREAM_ON_DESKTOP") {
            const pid = Math.floor(Math.random() * 30000) + 1000;
            const appId = quest.config.application.id;

            this.originalGetStreamerActiveStreamMetadata = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                id: appId,
                pid,
                sourceName: null
            });

            const tracker = (data) => {
                let progress = 0;
                if (quest.config.configVersion === 1) progress = data.userStatus.streamProgressSeconds;
                else if (data.userStatus?.progress?.STREAM_ON_DESKTOP) progress = Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
                onProgress(progress);
            };

            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", tracker);

            this.activeSpoofs.set(quest.id, () => {
                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", tracker);
                ApplicationStreamingStore.getStreamerActiveStreamMetadata = this.originalGetStreamerActiveStreamMetadata;
            });
        }
        
        // --- Activity Tasks ---
        else if (taskName === "PLAY_ACTIVITY") {
            const { ChannelStore, GuildChannelStore } = this.modules;
            if (!ChannelStore || !GuildChannelStore) {
                this.notify("Error", "Modules for Activity spoofing not found.");
                this.stopSpoof(quest.id);
                return;
            }

            const voiceChannel = ChannelStore.getSortedPrivateChannels()?.[0] 
                ?? Object.values(GuildChannelStore.getAllGuilds?.() || {}).find(g => g?.VOCAL?.length > 0)?.VOCAL?.[0]?.channel;

            if (!voiceChannel) {
                this.notify("Error", "Please join a server/DM with voice channels to use this feature.");
                this.stopSpoof(quest.id);
                return;
            }

            const streamKey = `call:${voiceChannel.id}:1`;
            const heartbeat = async () => {
                try {
                    const res = await API.post({
                        url: `/quests/${quest.id}/heartbeat`, 
                        body: {stream_key: streamKey, terminal: false}
                    });
                    const progress = res.body?.progress?.PLAY_ACTIVITY?.value ?? 0;
                    onProgress(progress);
                } catch(e) {}
            };

            heartbeat();
            const timer = setInterval(heartbeat, 20000);
            
            this.activeSpoofs.set(quest.id, () => {
                clearInterval(timer);
                API.post({url: `/quests/${quest.id}/heartbeat`, body: {stream_key: streamKey, terminal: true}}).catch(()=>{});
            });
        }
    }
}