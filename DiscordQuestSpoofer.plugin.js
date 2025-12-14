/**
 * @name DiscordQuestSpoofer
 * @author RADINMNX
 * @description A powerful, modern, and beautiful tool to auto-complete Discord Quests. Supports Video, Game, and Stream tasks with a neon aesthetic dashboard.
 * @version 2.1.4
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
    }

    getName() { return "DiscordQuestSpoofer"; }
    getDescription() { return "A powerful tool to auto-complete Discord Quests with a modern Neon UI."; }
    getVersion() { return "2.1.4"; }
    getAuthor() { return "RADINMNX"; }

    load() {
        this.findModules();
    }

    findModules() {
        // --- EXACT METHOD FROM CONSOLE.JS ---
        try {
            // 1. Get Webpack Require
            let wpRequire = window.webpackChunkdiscord_app?.push([[Symbol()], {}, r => r]);
            window.webpackChunkdiscord_app?.pop();

            if (wpRequire) {
                const modules = Object.values(wpRequire.c);

                // 2. Find modules using exact logic from console.js
                this.modules.ApplicationStreamingStore = modules.find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.Z;
                this.modules.RunningGameStore = modules.find(x => x?.exports?.ZP?.getRunningGames)?.exports?.ZP;
                this.modules.QuestsStore = modules.find(x => x?.exports?.Z?.__proto__?.getQuest)?.exports?.Z;
                this.modules.FluxDispatcher = modules.find(x => x?.exports?.Z?.__proto__?.flushWaitQueue)?.exports?.Z;
                this.modules.API = modules.find(x => x?.exports?.tn?.get)?.exports?.tn;
            }
        } catch (e) {
            console.error("[DQS] Webpack extraction failed:", e);
        }

        // Fallback for BetterDiscord internal Webpack if raw method fails (Backup)
        if (!this.modules.QuestsStore && typeof BdApi !== "undefined" && BdApi.Webpack) {
            console.log("[DQS] Using BdApi fallback...");
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

        if (!this.modules.QuestsStore) {
            this.log("Failed to load Discord modules. Please restart Discord completely (Ctrl+R).", "error");
        } else {
            this.log("Modules loaded successfully.", "success");
        }

        this.injectCSS();
        this.initialized = true;
    }

    stop() {
        this.removeCSS();
        this.stopAllSpoofs();
        this.initialized = false;
    }

    log(message, type = "info") {
        console.log(`[QuestSpoofer] ${message}`);
        if (typeof BdApi !== "undefined" && BdApi.showToast) {
            BdApi.showToast(message, { type });
        }
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
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
            :root { --dqs-primary: #ef4444; --dqs-secondary: #ec4899; }
            .dqs-panel { background: linear-gradient(135deg, #000 0%, #0a0a0a 100%); padding: 24px; border-radius: 16px; font-family: 'Outfit', sans-serif; color: #fff; min-height: 400px; border: 1px solid #222; }
            .dqs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; }
            .dqs-title { font-size: 24px; font-weight: 800; background: linear-gradient(to right, #fff, #999); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
            .dqs-card { background: rgba(20,20,25,0.6); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-bottom: 15px; position: relative; overflow: hidden; }
            .dqs-card:hover { border-color: rgba(239, 68, 68, 0.4); transform: translateY(-2px); transition: all 0.3s ease; }
            .dqs-info { display: flex; justify-content: space-between; margin-bottom: 15px; }
            .dqs-app { font-size: 18px; font-weight: 700; color: #fff; }
            .dqs-bar-bg { background: rgba(255,255,255,0.1); height: 6px; border-radius: 10px; overflow: hidden; }
            .dqs-bar-fill { height: 100%; background: linear-gradient(90deg, var(--dqs-primary), var(--dqs-secondary)); transition: width 0.3s ease; }
            .dqs-btn { background: linear-gradient(135deg, var(--dqs-primary), var(--dqs-secondary)); border: none; color: white; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-top: 15px; }
            .dqs-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }
            .dqs-btn:hover:not(:disabled) { transform: scale(1.05); }
            .dqs-empty { text-align: center; color: #666; padding: 40px; }
        `;
        if (typeof BdApi !== "undefined" && BdApi.DOM) BdApi.DOM.addStyle("DiscordQuestSpoofer", css);
    }

    removeCSS() {
        if (typeof BdApi !== "undefined" && BdApi.DOM) BdApi.DOM.removeStyle("DiscordQuestSpoofer");
    }

    getSettingsPanel() {
        if (!this.modules.QuestsStore) this.findModules();

        const panel = document.createElement("div");
        panel.className = "dqs-panel";
        panel.innerHTML = `
            <div class="dqs-header">
                <div>
                    <h2 class="dqs-title">QUEST SPOOFER</h2>
                    <span style="color: #ec4899; font-size: 12px; letter-spacing: 1px;">V2.1.4 • POWERFUL MODE</span>
                </div>
                <button class="dqs-btn" style="background: #222;" id="dqs-refresh">Refresh</button>
            </div>
            <div id="dqs-list"></div>
        `;

        const render = () => {
            const list = panel.querySelector("#dqs-list");
            list.innerHTML = "";

            if (!this.modules.QuestsStore) {
                list.innerHTML = `<div class="dqs-empty">Modules not loaded. Try restarting Discord.</div>`;
                return;
            }

            // --- QUEST FILTERING FROM CONSOLE.JS ---
            const QuestsStore = this.modules.QuestsStore;
            let quests = [];
            try {
                // Try .values() first as console.js does, fallback to Object.values if not Map
                const collection = QuestsStore.quests;
                const allQuests = (collection instanceof Map) ? Array.from(collection.values()) : Object.values(collection);
                
                quests = allQuests.filter(x => 
                    x.id !== "1412491570820812933" && 
                    x.userStatus?.enrolledAt && 
                    !x.userStatus?.completedAt && 
                    new Date(x.config.expiresAt).getTime() > Date.now()
                );
            } catch (err) {
                console.error("[DQS] Error filtering quests:", err);
                list.innerHTML = `<div class="dqs-empty">Error reading quests. check console.</div>`;
                return;
            }

            if (quests.length === 0) {
                list.innerHTML = `<div class="dqs-empty">No active uncompleted quests found.<br>Accept a quest in User Settings > Gift Inventory.</div>`;
                return;
            }

            quests.forEach(quest => {
                const appId = quest.config.application.id;
                const appName = quest.config.application.name;
                const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
                const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null);
                
                if (!taskName) return;

                const targetSeconds = taskConfig.tasks[taskName].target;
                const currentProgress = quest.userStatus?.progress?.[taskName]?.value ?? 0;
                const percent = Math.min(100, Math.floor((currentProgress / targetSeconds) * 100));
                const isRunning = this.activeSpoofs.has(quest.id);

                const card = document.createElement("div");
                card.className = "dqs-card";
                card.innerHTML = `
                    <div class="dqs-info">
                        <div>
                            <div class="dqs-app">${appName}</div>
                            <div style="color: #666; font-size: 12px; margin-top: 4px;">${taskName}</div>
                        </div>
                        <div id="stat-${quest.id}">${Math.floor(currentProgress)}/${targetSeconds}s</div>
                    </div>
                    <div class="dqs-bar-bg">
                        <div class="dqs-bar-fill" style="width: ${percent}%" id="bar-${quest.id}"></div>
                    </div>
                    <button class="dqs-btn" id="btn-${quest.id}">${isRunning ? "STOP" : "START SPOOFING"}</button>
                `;

                const btn = card.querySelector(`#btn-${quest.id}`);
                
                if (percent >= 100) {
                    btn.textContent = "COMPLETED";
                    btn.disabled = true;
                } else {
                    btn.onclick = () => {
                        if (this.activeSpoofs.has(quest.id)) {
                            this.stopSpoof(quest.id);
                            btn.textContent = "START SPOOFING";
                        } else {
                            btn.textContent = "STOP";
                            this.startSpoof(quest, taskName, targetSeconds, (prog, done) => {
                                const p = Math.min(100, Math.floor((prog / targetSeconds) * 100));
                                card.querySelector(`#bar-${quest.id}`).style.width = `${p}%`;
                                card.querySelector(`#stat-${quest.id}`).textContent = `${Math.floor(prog)}/${targetSeconds}s`;
                                if (done) {
                                    btn.textContent = "COMPLETED";
                                    btn.disabled = true;
                                    this.stopSpoof(quest.id);
                                    this.log(`Quest ${appName} completed!`, "success");
                                }
                            });
                        }
                    };
                }

                list.appendChild(card);
            });
        };

        panel.querySelector("#dqs-refresh").onclick = render;
        setTimeout(render, 100);
        return panel;
    }

    // --- LOGIC FROM CONSOLE.JS ---
    async startSpoof(quest, taskName, secondsNeeded, uiCallback) {
        if (this.activeSpoofs.has(quest.id)) return;

        const { API, RunningGameStore, FluxDispatcher, ApplicationStreamingStore } = this.modules;
        
        // 1. WATCH VIDEO (Exact logic from console.js)
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
        
        // 2. PLAY ON DESKTOP (Exact logic from console.js)
        else if (taskName === "PLAY_ON_DESKTOP") {
            const pid = Math.floor(Math.random() * 30000) + 1000;
            const appId = quest.config.application.id;
            const appName = quest.config.application.name;

            // Fetch real executable name like console.js
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

            // Monkey Patching
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
        
        // 3. STREAM ON DESKTOP (Exact logic from console.js)
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