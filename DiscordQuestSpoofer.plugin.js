/**
 * @name DiscordQuestSpoofer
 * @author RADINMNX
 * @description A powerful, modern, and beautiful tool to auto-complete Discord Quests. Supports Video, Game, and Stream tasks. Press Ctrl+Q to open the menu.
 * @version 2.4.0
 * @invite 
 * @authorLink https://github.com/RADINMNX2
 * @website https://github.com/RADINMNX2
 * @source https://github.com/RADINMNX2/DiscordQuestSpoofer
 */

module.exports = class DiscordQuestSpoofer {
    constructor() {
        this.initialized = false;
        this.activeSpoofs = new Map();
        this.modules = {
            ApplicationStreamingStore: null,
            RunningGameStore: null,
            QuestsStore: null,
            FluxDispatcher: null,
            API: null
        };
        this.handleKeydown = this.handleKeydown.bind(this);
    }

    getName() { return "DiscordQuestSpoofer"; }
    getDescription() { return "A powerful tool to auto-complete Discord Quests. Press Ctrl+Q to open the menu."; }
    getVersion() { return "2.4.0"; }
    getAuthor() { return "RADINMNX"; }

    load() {
        this.findModules();
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
                this.modules.FluxDispatcher = modules.find(x => x?.exports?.Z?.__proto__?.flushWaitQueue)?.exports?.Z;
                this.modules.API = modules.find(x => x?.exports?.tn?.get)?.exports?.tn;
            }
        } catch (e) {
            console.error("[DQS] Webpack extraction failed:", e);
        }

        if (!this.modules.QuestsStore && typeof BdApi !== "undefined" && BdApi.Webpack) {
            const get = BdApi.Webpack.getModule;
            this.modules.ApplicationStreamingStore = get(m => m?.getStreamerActiveStreamMetadata);
            this.modules.RunningGameStore = get(m => m?.getRunningGames);
            this.modules.QuestsStore = get(m => m?.getQuest && typeof m.getQuest === "function");
            this.modules.FluxDispatcher = get(m => m?.flushWaitQueue);
            this.modules.API = get(m => m?.get && m?.post);
        }
    }

    start() {
        if (!this.modules.QuestsStore) this.findModules();
        this.injectCSS();
        document.removeEventListener("keydown", this.handleKeydown);
        document.addEventListener("keydown", this.handleKeydown);
        this.initialized = true;
        this.log("Started. Press Ctrl+Q to open menu.", "success");
    }

    stop() {
        this.removeCSS();
        document.removeEventListener("keydown", this.handleKeydown);
        this.closeModal();
        this.stopAllSpoofs();
        this.initialized = false;
    }

    log(message, type = "info") {
        console.log(`[QuestSpoofer] ${message}`);
        if (typeof BdApi !== "undefined" && BdApi.showToast) {
            BdApi.showToast(message, { type });
        }
    }

    handleKeydown(e) {
        if (e.ctrlKey && e.code === "KeyQ") {
            e.preventDefault();
            this.toggleModal();
        }
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
    }

    openModal() {
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
    }

    stopAllSpoofs() {
        for (const [questId, cleanup] of this.activeSpoofs.entries()) {
            if (typeof cleanup === 'function') cleanup();
        }
        this.activeSpoofs.clear();

        if (this.modules.RunningGameStore && this.originalGetRunningGames) {
            this.modules.RunningGameStore.getRunningGames = this.originalGetRunningGames;
            this.modules.RunningGameStore.getGameForPID = this.originalGetGameForPID;
        }
        if (this.modules.ApplicationStreamingStore && this.originalGetStreamerActiveStreamMetadata) {
            this.modules.ApplicationStreamingStore.getStreamerActiveStreamMetadata = this.originalGetStreamerActiveStreamMetadata;
        }
    }

    injectCSS() {
        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');
            
            :root {
                --dqs-bg-overlay: rgba(0, 0, 0, 0.85);
                --dqs-bg-panel: #0a0a0c;
                --dqs-bg-card: rgba(255, 255, 255, 0.03);
                --dqs-border: rgba(255, 255, 255, 0.06);
                
                --dqs-accent: #ff0055;
                --dqs-accent-gradient: linear-gradient(135deg, #ff2a5d, #ff0055);
                --dqs-accent-glow: rgba(255, 42, 93, 0.5);
                
                --dqs-success: #00ff9d;
                --dqs-success-glow: rgba(0, 255, 157, 0.4);
                
                --dqs-text-main: #ffffff;
                --dqs-text-muted: #8a8a90;
            }

            /* Core Animations */
            @keyframes dqsFadeIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(12px); } }
            @keyframes dqsScaleUp { from { opacity: 0; transform: scale(0.92) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            @keyframes dqsExit { to { opacity: 0; transform: scale(0.95); } }
            @keyframes dqsShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
            @keyframes dqsFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
            @keyframes dqsGridMove { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
            @keyframes dqsPulseSoft { 0% { box-shadow: 0 0 0 0 var(--dqs-accent-glow); } 70% { box-shadow: 0 0 0 8px rgba(0,0,0,0); } 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); } }

            /* Overlay */
            .dqs-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: var(--dqs-bg-overlay);
                z-index: 99999;
                display: flex; justify-content: center; align-items: center;
                animation: dqsFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                backdrop-filter: blur(12px);
            }
            .dqs-overlay.dqs-closing { animation: dqsFadeIn 0.3s reverse forwards; }
            .dqs-overlay.dqs-closing .dqs-panel { animation: dqsExit 0.2s forwards; }

            /* Main Panel */
            .dqs-panel {
                width: 500px;
                max-width: 90vw;
                background: var(--dqs-bg-panel);
                border: 1px solid var(--dqs-border);
                border-radius: 24px;
                padding: 0;
                font-family: 'Inter', system-ui, sans-serif;
                color: var(--dqs-text-main);
                box-shadow: 
                    0 0 0 1px rgba(0,0,0,1), 
                    0 40px 80px -20px rgba(0,0,0,0.8),
                    inset 0 0 0 1px rgba(255,255,255,0.05);
                animation: dqsScaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                position: relative;
                overflow: hidden;
            }

            /* Cyber Background Grid */
            .dqs-panel::before {
                content: ''; position: absolute; inset: 0;
                background-image: 
                    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                background-size: 40px 40px;
                mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
                pointer-events: none;
                z-index: 0;
                animation: dqsGridMove 20s linear infinite;
            }

            .dqs-content { position: relative; z-index: 1; padding: 32px; }

            /* Header */
            .dqs-header { 
                display: flex; justify-content: space-between; align-items: center; 
                margin-bottom: 32px; 
            }
            .dqs-brand { display: flex; align-items: center; gap: 16px; }
            .dqs-logo-box {
                width: 48px; height: 48px;
                background: linear-gradient(135deg, #1a1a1e, #0f0f12);
                border: 1px solid var(--dqs-border);
                border-radius: 14px;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 8px 20px -5px rgba(0,0,0,0.5);
                position: relative;
            }
            .dqs-logo-box svg { stroke: var(--dqs-accent); filter: drop-shadow(0 0 5px var(--dqs-accent)); }
            
            .dqs-title-wrap h1 { 
                margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;
                background: linear-gradient(to right, #fff, #ccc); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            }
            .dqs-title-wrap p { 
                margin: 0; font-size: 11px; font-weight: 600; color: var(--dqs-text-muted); 
                text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; 
                display: flex; align-items: center; gap: 6px;
            }
            .dqs-status-dot { width: 6px; height: 6px; background: var(--dqs-success); border-radius: 50%; box-shadow: 0 0 10px var(--dqs-success); }

            .dqs-controls { display: flex; gap: 10px; }
            .dqs-icon-btn {
                background: rgba(255,255,255,0.03);
                border: 1px solid transparent;
                color: var(--dqs-text-muted);
                width: 36px; height: 36px;
                border-radius: 10px;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            .dqs-icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; transform: translateY(-2px); }
            .dqs-close-btn:hover { background: #ff2a5d; color: #fff; box-shadow: 0 4px 15px rgba(255, 42, 93, 0.4); }

            /* Cards */
            .dqs-card {
                background: rgba(20, 20, 23, 0.6);
                border: 1px solid var(--dqs-border);
                border-radius: 18px;
                padding: 24px;
                margin-bottom: 16px;
                position: relative;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                animation: dqsScaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                opacity: 0; /* for stagger */
            }
            .dqs-card:hover { 
                transform: translateY(-4px); 
                background: rgba(30, 30, 35, 0.8);
                border-color: rgba(255, 255, 255, 0.15);
                box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
            }

            .dqs-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .dqs-app-icon { width: 40px; height: 40px; border-radius: 10px; background: #222; margin-right: 12px; object-fit: cover; }
            .dqs-app-info { flex: 1; }
            .dqs-app-name { font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.2px; }
            .dqs-task-name { font-size: 12px; color: var(--dqs-text-muted); margin-top: 2px; }
            
            .dqs-badge { 
                font-size: 10px; font-weight: 800; padding: 6px 10px; border-radius: 8px; 
                text-transform: uppercase; letter-spacing: 0.5px;
                background: rgba(255, 42, 93, 0.1); color: #ff2a5d; border: 1px solid rgba(255, 42, 93, 0.2);
            }
            .dqs-card.completed .dqs-badge { background: rgba(0, 255, 157, 0.1); color: #00ff9d; border-color: rgba(0, 255, 157, 0.2); }

            /* Progress Bar */
            .dqs-progress-track {
                height: 8px; background: rgba(255,255,255,0.05); border-radius: 100px; 
                overflow: hidden; margin-bottom: 20px; position: relative;
            }
            .dqs-progress-fill {
                height: 100%; background: var(--dqs-accent-gradient);
                border-radius: 100px; width: 0%;
                box-shadow: 0 0 20px var(--dqs-accent-glow);
                transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
            }
            .dqs-progress-fill::after {
                content: ''; position: absolute; inset: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
                transform: translateX(-100%);
                animation: dqsShimmer 2s infinite;
            }
            .dqs-card.completed .dqs-progress-fill { background: var(--dqs-success); box-shadow: 0 0 20px var(--dqs-success-glow); }

            /* Stats Grid */
            .dqs-stats { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13px; font-weight: 600; color: var(--dqs-text-muted); }
            .dqs-stat-val { color: #fff; margin-left: 4px; }

            /* Main Button */
            .dqs-btn {
                width: 100%; padding: 14px;
                background: var(--dqs-accent-gradient);
                border: none;
                color: white;
                font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13px;
                border-radius: 12px; cursor: pointer;
                transition: all 0.3s;
                text-transform: uppercase; letter-spacing: 1px;
                box-shadow: 0 4px 20px rgba(255, 42, 93, 0.25);
                position: relative; overflow: hidden;
            }
            .dqs-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 8px 30px rgba(255, 42, 93, 0.4);
            }
            .dqs-btn:active:not(:disabled) { transform: translateY(0); }
            
            .dqs-btn.active { animation: dqsPulseSoft 2s infinite; }
            
            .dqs-btn:disabled {
                background: #1a1a1e; color: #444; cursor: default; box-shadow: none;
                border: 1px solid #333;
            }
            .dqs-btn.success {
                background: rgba(0, 255, 157, 0.1); color: #00ff9d;
                border: 1px solid rgba(0, 255, 157, 0.3);
                box-shadow: 0 0 20px rgba(0, 255, 157, 0.1);
            }

            .dqs-empty { 
                padding: 60px 20px; text-align: center; color: var(--dqs-text-muted); 
                background: rgba(255,255,255,0.02); border-radius: 18px; border: 1px dashed var(--dqs-border);
            }
            .dqs-empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; display: block; }
            
            /* Instruction Panel (The Green One) */
            .dqs-instruction-panel {
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                padding: 40px;
                background: #050a07;
                border: 1px solid rgba(0, 255, 157, 0.2);
                border-radius: 20px;
                box-shadow: 0 0 40px rgba(0, 255, 157, 0.05);
                text-align: center;
                color: #ffffff;
                margin-top: 10px;
                position: relative;
                overflow: hidden;
            }
            .dqs-instruction-panel::before {
                content: ''; position: absolute; inset: 0;
                background: radial-gradient(circle at 50% -20%, rgba(0, 255, 157, 0.1), transparent 60%);
                pointer-events: none;
            }
            .dqs-instruction-key {
                font-size: 42px; font-weight: 900;
                color: #00ff9d;
                text-shadow: 0 0 30px rgba(0, 255, 157, 0.4);
                background: rgba(0, 255, 157, 0.05);
                padding: 15px 40px;
                border-radius: 16px;
                border: 1px solid rgba(0, 255, 157, 0.2);
                margin: 20px 0;
                font-family: monospace;
            }
        `;
        if (typeof BdApi !== "undefined" && BdApi.DOM) BdApi.DOM.addStyle("DiscordQuestSpoofer", css);
    }

    removeCSS() {
        if (typeof BdApi !== "undefined" && BdApi.DOM) BdApi.DOM.removeStyle("DiscordQuestSpoofer");
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
                            <p><span class="dqs-status-dot"></span> SYSTEM ACTIVE</p>
                        </div>
                    </div>
                    <div class="dqs-controls">
                        <button class="dqs-icon-btn" id="dqs-refresh" title="Refresh">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        </button>
                        <button class="dqs-icon-btn dqs-close-btn" id="dqs-close" title="Close">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                <div id="dqs-list"></div>
            </div>
        `;

        container.querySelector("#dqs-close").onclick = () => this.closeModal();

        const renderQuests = () => {
            const list = container.querySelector("#dqs-list");
            list.innerHTML = "";

            if (!self.modules.QuestsStore) {
                list.innerHTML = `<div class="dqs-empty"><span class="dqs-empty-icon">⚠️</span>Modules not loaded. Restart Discord.</div>`;
                return;
            }

            const QuestsStore = self.modules.QuestsStore;
            let quests = [];
            
            try {
                const collection = QuestsStore.quests;
                if (!collection) throw new Error("Missing Quests");
                const allQuests = (collection instanceof Map) ? Array.from(collection.values()) : Object.values(collection);
                
                quests = allQuests.filter(x => 
                    x.id !== "1412491570820812933" && 
                    x.userStatus?.enrolledAt && 
                    !x.userStatus?.completedAt && 
                    new Date(x.config.expiresAt).getTime() > Date.now()
                );
            } catch (err) {
                list.innerHTML = `<div class="dqs-empty">Error reading quests.</div>`;
                return;
            }

            if (quests.length === 0) {
                list.innerHTML = `<div class="dqs-empty"><span class="dqs-empty-icon">🎮</span>No active quests found.<br>Accept one in User Settings.</div>`;
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
                const isRunning = self.activeSpoofs.has(quest.id);
                const isCompleted = percent >= 100;

                const card = document.createElement("div");
                card.className = `dqs-card ${isCompleted ? 'completed' : ''}`;
                card.style.animationDelay = `${index * 100}ms`; // Stagger effect
                
                card.innerHTML = `
                    <div class="dqs-card-header">
                        <div style="display:flex; align-items:center;">
                            <img src="https://cdn.discordapp.com/app-icons/${appId}/${quest.config.application.icon}.png?size=64" class="dqs-app-icon" onerror="this.style.display='none'">
                            <div class="dqs-app-info">
                                <div class="dqs-app-name">${appName}</div>
                                <div class="dqs-task-name">${taskName.replace(/_/g, " ")}</div>
                            </div>
                        </div>
                        <div class="dqs-badge">${isCompleted ? 'COMPLETED' : (isRunning ? 'RUNNING' : 'READY')}</div>
                    </div>
                    
                    <div class="dqs-progress-track">
                        <div class="dqs-progress-fill" style="width: ${percent}%" id="bar-${quest.id}"></div>
                    </div>
                    
                    <div class="dqs-stats">
                        <span>Progress: <span class="dqs-stat-val" id="percent-${quest.id}">${percent}%</span></span>
                        <span>Time: <span class="dqs-stat-val" id="stat-${quest.id}">${Math.floor(currentProgress)} / ${targetSeconds}s</span></span>
                    </div>

                    <button class="dqs-btn ${isCompleted ? 'success' : (isRunning ? 'active' : '')}" id="btn-${quest.id}" ${isCompleted ? 'disabled' : ''}>
                        ${isCompleted ? 'REWARD UNLOCKED' : (isRunning ? 'STOP SPOOFING' : 'START SPOOFING')}
                    </button>
                `;

                const btn = card.querySelector(`#btn-${quest.id}`);
                
                if (!isCompleted) {
                    btn.onclick = () => {
                        if (self.activeSpoofs.has(quest.id)) {
                            self.stopSpoof(quest.id);
                            btn.textContent = "START SPOOFING";
                            btn.classList.remove("active");
                            card.querySelector('.dqs-badge').textContent = 'READY';
                        } else {
                            btn.textContent = "SPOOFING ACTIVE...";
                            btn.classList.add("active");
                            card.querySelector('.dqs-badge').textContent = 'RUNNING';
                            
                            self.startSpoof(quest, taskName, targetSeconds, (prog, done) => {
                                const p = Math.min(100, Math.floor((prog / targetSeconds) * 100));
                                const bar = card.querySelector(`#bar-${quest.id}`);
                                const stat = card.querySelector(`#stat-${quest.id}`);
                                const per = card.querySelector(`#percent-${quest.id}`);
                                
                                if(bar) bar.style.width = `${p}%`;
                                if(stat) stat.textContent = `${Math.floor(prog)} / ${targetSeconds}s`;
                                if(per) per.textContent = `${p}%`;
                                
                                if (done) {
                                    btn.textContent = "REWARD UNLOCKED";
                                    btn.className = "dqs-btn success";
                                    btn.disabled = true;
                                    card.classList.add("completed");
                                    card.querySelector('.dqs-badge').textContent = 'COMPLETED';
                                    self.stopSpoof(quest.id);
                                    self.log(`Quest ${appName} completed!`, "success");
                                }
                            });
                        }
                    };
                }

                list.appendChild(card);
            });
        };

        container.querySelector("#dqs-refresh").onclick = renderQuests;
        setTimeout(renderQuests, 50);
        return container;
    }

    getSettingsPanel() {
        const container = document.createElement("div");
        container.className = "dqs-instruction-panel";
        
        container.innerHTML = `
            <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 24px;">Plugin Controls</div>
            <div class="dqs-instruction-key">Ctrl + Q</div>
            <div style="color: #aaa; font-size: 14px;">Press the shortcut anywhere to open the Quest Spoofer Menu</div>
        `;
        
        return container;
    }

    async startSpoof(quest, taskName, secondsNeeded, uiCallback) {
        if (this.activeSpoofs.has(quest.id)) return;

        const { API, RunningGameStore, FluxDispatcher, ApplicationStreamingStore } = this.modules;
        
        if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            const maxFuture = 10, speed = 7, intervalTime = 1;
            let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
            const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
            
            const interval = setInterval(async () => {
                const maxAllowed = Math.floor((Date.now() - enrolledAt)/1000) + maxFuture;
                const diff = maxAllowed - secondsDone;
                const timestamp = secondsDone + speed;
                
                if (diff >= speed) {
                    try {
                        const res = await API.post({
                            url: `/quests/${quest.id}/video-progress`, 
                            body: {timestamp: Math.min(secondsNeeded, timestamp + Math.random())}
                        });
                        secondsDone = Math.min(secondsNeeded, timestamp);
                        uiCallback(secondsDone, res.body.completed_at != null);
                    } catch(e) { console.error(e); }
                }

                if (secondsDone >= secondsNeeded) {
                    try { await API.post({url: `/quests/${quest.id}/video-progress`, body: {timestamp: secondsNeeded}}); } catch(e) {}
                    uiCallback(secondsNeeded, true);
                    clearInterval(interval);
                }
            }, intervalTime * 1000);

            this.activeSpoofs.set(quest.id, () => clearInterval(interval));
            this.log("Spoofing Video Task...");
        }
        else if (taskName === "PLAY_ON_DESKTOP") {
            const pid = Math.floor(Math.random() * 30000) + 1000;
            const appId = quest.config.application.id;
            const appName = quest.config.application.name;

            let exeName = "game.exe";
            try {
                const res = await API.get({url: `/applications/public?application_ids=${appId}`});
                if (res.body && res.body[0]) {
                    const winExe = res.body[0].executables.find(x => x.os === "win32");
                    if (winExe) exeName = winExe.name.replace(">","");
                }
            } catch(e) { console.log("Failed to fetch exe name, using default"); }

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
                uiCallback(progress, progress >= secondsNeeded);
            };
            
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", tracker);
            this.log(`Spoofing Game: ${appName}`);

            this.activeSpoofs.set(quest.id, () => {
                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", tracker);
                RunningGameStore.getRunningGames = this.originalGetRunningGames;
                RunningGameStore.getGameForPID = this.originalGetGameForPID;
                FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: []});
            });
        }
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
                uiCallback(progress, progress >= secondsNeeded);
            };

            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", tracker);
            this.log(`Spoofing Stream for ${quest.config.application.name}. Join a VC!`);

            this.activeSpoofs.set(quest.id, () => {
                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", tracker);
                ApplicationStreamingStore.getStreamerActiveStreamMetadata = this.originalGetStreamerActiveStreamMetadata;
            });
        }
    }
}