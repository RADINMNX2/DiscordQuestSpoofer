/**
 * @name DiscordQuestSpoofer
 * @author RADINMNX
 * @description A powerful, modern, and beautiful tool to auto-complete Discord Quests. Supports Video, Game, and Stream tasks with a neon aesthetic dashboard.
 * @version 2.0.5
 * @invite 
 * @authorLink https://github.com/RADINMNX2
 * @website https://github.com/RADINMNX2
 * @source https://github.com/RADINMNX2/DiscordQuestSpoofer
 */

module.exports = class DiscordQuestSpoofer {
    constructor() {
        this.initialized = false;
        this.activeSpoofs = new Set();
        this.stores = {};
        this.api = null;
    }

    getName() { return "DiscordQuestSpoofer"; }
    getDescription() { return "A powerful tool to auto-complete Discord Quests with a modern UI."; }
    getVersion() { return "2.0.5"; }
    getAuthor() { return "RADINMNX"; }

    load() {
        // --- Robust Module Loading ---
        try {
            const getModule = (filter, legacyProps) => {
                // 1. Modern BdApi
                if (BdApi.Webpack && BdApi.Webpack.getModule) {
                    return BdApi.Webpack.getModule(filter, { defaultExport: false });
                }
                // 2. Legacy BdApi.findModule
                if (typeof BdApi.findModule === "function") {
                    return BdApi.findModule(filter);
                }
                // 3. Legacy BdApi.findModuleByProps
                if (legacyProps && typeof BdApi.findModuleByProps === "function") {
                    return BdApi.findModuleByProps(...legacyProps);
                }
                return null;
            };

            const byProps = (...props) => (m) => props.every(p => m[p] !== undefined || m?.Z?.[p] !== undefined || m?.ZP?.[p] !== undefined);

            // Attempt 1: Standard API
            this.stores = {
                RunningGameStore: getModule(byProps("getRunningGames"), ["getRunningGames"]),
                FluxDispatcher: getModule(byProps("flushWaitQueue"), ["flushWaitQueue"]),
                API: getModule(byProps("get", "post", "put"), ["get", "post", "put"]),
                UserStore: getModule(byProps("getCurrentUser"), ["getCurrentUser"]),
                ApplicationStreamingStore: getModule(m => m?.getStreamerActiveStreamMetadata || m?.Z?.getStreamerActiveStreamMetadata || m?.__proto__?.getStreamerActiveStreamMetadata),
                QuestsStore: getModule(m => m?.getQuest || m?.Z?.getQuest || m?.__proto__?.getQuest),
            };

            // Attempt 2: Manual Webpack Fallback (Like console.js)
            // If essential stores are missing, try raw webpack extraction
            if (!this.stores.QuestsStore || !this.stores.RunningGameStore || !this.stores.API) {
                console.log("[DiscordQuestSpoofer] Standard API failed, trying manual webpack fallback...");
                
                if (window.webpackChunkdiscord_app) {
                    const wpRequire = window.webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
                    window.webpackChunkdiscord_app.pop();
                    
                    const modules = Object.values(wpRequire.c);

                    const findRaw = (check) => {
                        const m = modules.find(check);
                        // Handle various export styles (Z, ZP, tn for api, or direct)
                        return m?.exports?.Z || m?.exports?.ZP || m?.exports?.tn || m?.exports;
                    };

                    if (!this.stores.RunningGameStore) 
                        this.stores.RunningGameStore = findRaw(x => x?.exports?.ZP?.getRunningGames);
                    
                    if (!this.stores.QuestsStore) 
                        this.stores.QuestsStore = findRaw(x => x?.exports?.Z?.__proto__?.getQuest);

                    if (!this.stores.ApplicationStreamingStore) 
                        this.stores.ApplicationStreamingStore = findRaw(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata);

                    if (!this.stores.FluxDispatcher) 
                        this.stores.FluxDispatcher = findRaw(x => x?.exports?.Z?.__proto__?.flushWaitQueue);

                    if (!this.stores.API) 
                        this.stores.API = findRaw(x => x?.exports?.tn?.get);
                }
            }

            // Normalization (Ensure we have the object with methods)
            for (const key in this.stores) {
                const mod = this.stores[key];
                if (!mod) continue;
                // If it's wrapped in default/Z/ZP, unwrap it if the target method isn't on the root
                if (key === "RunningGameStore" && !mod.getRunningGames) {
                    if (mod.ZP) this.stores[key] = mod.ZP;
                    else if (mod.Z) this.stores[key] = mod.Z;
                }
                if (key === "QuestsStore" && !mod.getQuest) {
                     if (mod.Z) this.stores[key] = mod.Z;
                }
            }

            if (!this.stores.QuestsStore) console.warn("DiscordQuestSpoofer: QuestsStore not found.");
            if (!this.stores.RunningGameStore) console.warn("DiscordQuestSpoofer: RunningGameStore not found.");

        } catch (e) {
            console.error("DiscordQuestSpoofer: Error loading modules", e);
        }
    }

    safeShowToast(content, options) {
        if (typeof BdApi.showToast === "function") {
            BdApi.showToast(content, options);
        } else if (BdApi.UI && typeof BdApi.UI.showToast === "function") {
            BdApi.UI.showToast(content, options);
        } else {
            console.log(`%c[DiscordQuestSpoofer] %c${content}`, "color: #ef4444; font-weight: bold;", "color: inherit;");
        }
    }

    start() {
        this.injectCSS();
        this.initialized = true;
        this.safeShowToast("Discord Quest Spoofer Loaded", { type: "success" });
    }

    stop() {
        this.removeCSS();
        this.stopAllSpoofs();
        if (BdApi.Patcher) BdApi.Patcher.unpatchAll("DiscordQuestSpoofer");
        this.initialized = false;
        this.safeShowToast("Discord Quest Spoofer Stopped", { type: "info" });
    }

    stopAllSpoofs() {
        this.activeSpoofs.forEach(id => this.stopSpoof(id));
    }

    injectCSS() {
        const css = `
            :root {
                --dqs-primary: #ef4444;
                --dqs-secondary: #ec4899;
                --dqs-bg: #000000;
                --dqs-card: #111827;
                --dqs-text: #ffffff;
                --dqs-text-muted: #9ca3af;
            }

            .dqs-panel {
                background: linear-gradient(135deg, var(--dqs-bg) 0%, #1a1a1a 100%);
                color: var(--dqs-text);
                padding: 20px;
                border-radius: 12px;
                font-family: 'gg sans', sans-serif;
            }

            .dqs-header {
                display: flex;
                align-items: center;
                margin-bottom: 24px;
                border-bottom: 1px solid rgba(239, 68, 68, 0.3);
                padding-bottom: 16px;
            }

            .dqs-title {
                font-size: 24px;
                font-weight: 800;
                background: linear-gradient(to right, var(--dqs-primary), var(--dqs-secondary));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin: 0;
            }

            .dqs-list {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .dqs-card {
                background: rgba(17, 24, 39, 0.6);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(239, 68, 68, 0.2);
                border-radius: 12px;
                padding: 16px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .dqs-card:hover {
                transform: translateY(-2px);
                border-color: var(--dqs-primary);
                box-shadow: 0 4px 20px rgba(239, 68, 68, 0.15);
            }

            .dqs-quest-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .dqs-quest-name {
                font-weight: bold;
                font-size: 18px;
            }

            .dqs-progress-container {
                height: 8px;
                background: #374151;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 12px;
            }

            .dqs-progress-bar {
                height: 100%;
                background: linear-gradient(to right, var(--dqs-primary), var(--dqs-secondary));
                width: 0%;
                transition: width 0.5s ease;
                box-shadow: 0 0 10px var(--dqs-primary);
            }

            .dqs-btn {
                background: linear-gradient(to right, var(--dqs-primary), var(--dqs-secondary));
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: opacity 0.2s;
                width: 100%;
                text-align: center;
            }

            .dqs-btn:hover {
                opacity: 0.9;
            }

            .dqs-btn:disabled {
                background: #374151;
                cursor: not-allowed;
                opacity: 0.7;
            }

            .dqs-status {
                font-size: 12px;
                color: var(--dqs-text-muted);
                margin-top: 8px;
                display: block;
            }

            .dqs-empty {
                text-align: center;
                color: var(--dqs-text-muted);
                padding: 40px;
                border: 2px dashed #374151;
                border-radius: 12px;
            }
        `;

        if (typeof BdApi.injectCSS === "function") {
            BdApi.injectCSS("DiscordQuestSpoofer", css);
        } else if (BdApi.DOM && typeof BdApi.DOM.addStyle === "function") {
            BdApi.DOM.addStyle("DiscordQuestSpoofer", css);
        } else {
            const style = document.createElement("style");
            style.id = "DiscordQuestSpoofer-style";
            style.innerHTML = css;
            document.head.appendChild(style);
        }
    }

    removeCSS() {
        if (typeof BdApi.clearCSS === "function") {
            BdApi.clearCSS("DiscordQuestSpoofer");
        } else if (BdApi.DOM && typeof BdApi.DOM.removeStyle === "function") {
            BdApi.DOM.removeStyle("DiscordQuestSpoofer");
        } else {
            const style = document.getElementById("DiscordQuestSpoofer-style");
            if (style) style.remove();
        }
    }

    getSettingsPanel() {
        const panel = document.createElement("div");
        panel.className = "dqs-panel";

        const header = document.createElement("div");
        header.className = "dqs-header";
        header.innerHTML = `
            <div>
                <h2 class="dqs-title">Quest Spoofer</h2>
                <span style="color: #9ca3af; font-size: 12px;">By RADINMNX</span>
            </div>
            <button class="dqs-btn" style="width: auto; margin-left: auto;" id="dqs-refresh">Refresh Quest</button>
        `;
        panel.appendChild(header);

        const list = document.createElement("div");
        list.className = "dqs-list";
        panel.appendChild(list);

        const renderQuest = () => {
            // Prevent refresh if spoofing is active
            const refreshBtn = panel.querySelector("#dqs-refresh");
            if (this.activeSpoofs.size > 0) {
                if (refreshBtn) refreshBtn.disabled = true;
                return; // Do not re-render list if active
            } else {
                if (refreshBtn) refreshBtn.disabled = false;
            }

            list.innerHTML = "";
            if (!this.stores.QuestsStore) {
                 list.innerHTML = `<div class="dqs-empty" style="border-color: red;">Error: QuestsStore module not found.</div>`;
                 return;
            }

            // EXACT LOGIC FROM CONSOLE.JS
            const quest = [...this.stores.QuestsStore.quests.values()].find(x => 
                x.id !== "1412491570820812933" && 
                x.userStatus?.enrolledAt && 
                !x.userStatus?.completedAt && 
                new Date(x.config.expiresAt).getTime() > Date.now()
            );

            if (!quest) {
                list.innerHTML = `<div class="dqs-empty">No active uncompleted quests found.<br>Accept a quest in User Settings > Gift Inventory first!</div>`;
                return;
            }

            // Render Single Quest Card
            const card = document.createElement("div");
            card.className = "dqs-card";

            const appName = quest.config.application.name;
            const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
            const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null);
            const target = taskConfig.tasks[taskName].target;
            const current = quest.userStatus?.progress?.[taskName]?.value ?? 0;
            const percent = Math.min(100, Math.floor((current / target) * 100));

            const isRunning = this.activeSpoofs.has(quest.id);

            card.innerHTML = `
                <div class="dqs-quest-info">
                    <span class="dqs-quest-name">${appName}</span>
                    <span style="font-size: 12px; color: var(--dqs-secondary);">${taskName.replace(/_/g, " ")}</span>
                </div>
                <div class="dqs-progress-container">
                    <div class="dqs-progress-bar" style="width: ${percent}%"></div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="dqs-btn" id="btn-${quest.id}">
                        ${isRunning ? 'STOP SPOOFING' : (percent >= 100 ? 'COMPLETED' : 'START SPOOFING')}
                    </button>
                </div>
                <span class="dqs-status" id="status-${quest.id}">
                    ${percent >= 100 ? 'Quest Completed!' : `${Math.floor(current)} / ${target} seconds`}
                </span>
            `;

            const btn = card.querySelector(`#btn-${quest.id}`);
            if (percent >= 100) btn.disabled = true;

            btn.onclick = () => {
                if (this.activeSpoofs.has(quest.id)) {
                    this.stopSpoof(quest.id);
                    btn.textContent = "START SPOOFING";
                    this.safeShowToast(`Stopped spoofing for ${appName}`, { type: "info" });
                    // Re-enable refresh button
                    if(refreshBtn) refreshBtn.disabled = false;
                } else {
                    this.startSpoof(quest, taskName, target);
                    btn.textContent = "STOP SPOOFING";
                    this.safeShowToast(`Started spoofing ${appName}`, { type: "success" });
                    // Disable refresh button
                    if(refreshBtn) refreshBtn.disabled = true;
                }
            };

            list.appendChild(card);
        };

        panel.querySelector("#dqs-refresh").onclick = renderQuest;
        
        // Initial render
        renderQuest();

        return panel;
    }

    async startSpoof(quest, taskName, secondsNeeded) {
        if (this.activeSpoofs.has(quest.id)) return;
        this.activeSpoofs.add(quest.id);

        // UI Update: Disable refresh button immediately
        const refreshBtn = document.getElementById("dqs-refresh");
        if(refreshBtn) refreshBtn.disabled = true;

        const { API, RunningGameStore, FluxDispatcher, ApplicationStreamingStore } = this.stores;
        const pid = Math.floor(Math.random() * 30000) + 1000;
        const appId = quest.config.application.id;
        const appName = quest.config.application.name;

        // --- Helper to update UI ---
        const updateUI = (progress) => {
            const statusEl = document.getElementById(`status-${quest.id}`);
            const barEl = document.querySelector(`#btn-${quest.id}`)?.parentElement?.parentElement?.querySelector('.dqs-progress-bar');
            
            if (statusEl) statusEl.textContent = `Progress: ${progress} / ${secondsNeeded} seconds`;
            if (barEl) barEl.style.width = `${Math.min(100, (progress / secondsNeeded) * 100)}%`;

            if (progress >= secondsNeeded) {
                this.stopSpoof(quest.id);
                const btn = document.getElementById(`btn-${quest.id}`);
                if (btn) {
                    btn.textContent = "COMPLETED";
                    btn.disabled = true;
                }
                this.safeShowToast(`${appName} Quest Completed!`, { type: "success" });
            }
        };

        // --- HANDLERS ---

        if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
            const speed = 30; // Discord checks every 30s approx
            
            const interval = setInterval(async () => {
                if (!this.activeSpoofs.has(quest.id)) {
                    clearInterval(interval);
                    return;
                }

                // Simulate watching
                secondsDone += speed;
                try {
                     await API.post({
                        url: `/quests/${quest.id}/video-progress`, 
                        body: { timestamp: secondsDone }
                    });
                    updateUI(secondsDone);
                } catch (e) {
                    console.error("DQS: Video update failed", e);
                }

                if (secondsDone >= secondsNeeded) clearInterval(interval);

            }, 30000); 
            
            // Initial bump
            API.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsDone } });
            this.stores[`interval_${quest.id}`] = interval;
        } 
        
        else if (taskName === "PLAY_ON_DESKTOP") {
            // Patch RunningGameStore
            const fakeGame = {
                cmdLine: `C:\\Program Files\\${appName}\\game.exe`,
                exeName: "game.exe",
                exePath: `c:/program files/${appName.toLowerCase()}/game.exe`,
                hidden: false,
                isLauncher: false,
                id: appId,
                name: appName,
                pid: pid,
                pidPath: [pid],
                processName: appName,
                start: Date.now(),
            };

            // Using BdApi.Patcher
            if (BdApi.Patcher) {
                BdApi.Patcher.after("DiscordQuestSpoofer", RunningGameStore, "getRunningGames", (_, args, res) => {
                    return [...res, fakeGame];
                });

                BdApi.Patcher.after("DiscordQuestSpoofer", RunningGameStore, "getGameForPID", (_, [p], res) => {
                    if (p === pid) return fakeGame;
                    return res;
                });
            }

            // Force update
            FluxDispatcher.dispatch({
                type: "RUNNING_GAMES_CHANGE", 
                removed: [], 
                added: [fakeGame], 
                games: RunningGameStore.getRunningGames()
            });

            // Poll for progress
            const interval = setInterval(() => {
                if (!this.activeSpoofs.has(quest.id)) {
                    clearInterval(interval);
                    return;
                }
                const q = this.stores.QuestsStore.getQuest(quest.id);
                const progress = Math.floor(q?.userStatus?.progress?.PLAY_ON_DESKTOP?.value ?? 0);
                updateUI(progress);
            }, 5000);
            this.stores[`interval_${quest.id}`] = interval;
        }

        else if (taskName === "STREAM_ON_DESKTOP") {
            // Patch Streaming Store
            if (BdApi.Patcher) {
                BdApi.Patcher.after("DiscordQuestSpoofer", ApplicationStreamingStore, "getStreamerActiveStreamMetadata", () => {
                    return {
                        id: appId,
                        pid: pid,
                        sourceName: null
                    };
                });
            }
            
            this.safeShowToast("Please join a Voice Channel to progress Streaming tasks!", {type: "warning"});

            const interval = setInterval(() => {
                 if (!this.activeSpoofs.has(quest.id)) {
                    clearInterval(interval);
                    return;
                }
                const q = this.stores.QuestsStore.getQuest(quest.id);
                const progress = Math.floor(q?.userStatus?.progress?.STREAM_ON_DESKTOP?.value ?? 0);
                updateUI(progress);
            }, 5000);
            this.stores[`interval_${quest.id}`] = interval;
        }
        
        else if (taskName === "PLAY_ACTIVITY") {
             this.safeShowToast("Automating Activity Heartbeat...", {type: "info"});
             
             const interval = setInterval(async () => {
                 if (!this.activeSpoofs.has(quest.id)) {
                    clearInterval(interval);
                    return;
                }
                
                try {
                     const res = await API.post({
                         url: `/quests/${quest.id}/heartbeat`, 
                         body: { stream_key: "fake_stream_key_bd_spoof", terminal: false }
                     });
                     const progress = res.body.progress.PLAY_ACTIVITY.value;
                     updateUI(progress);
                } catch(e) {
                    console.log("Heartbeat failed, might require active connection.");
                }

             }, 20000);
             this.stores[`interval_${quest.id}`] = interval;
        }
    }

    stopSpoof(questId) {
        if (!this.activeSpoofs.has(questId)) return;
        this.activeSpoofs.delete(questId);

        // Re-enable refresh button
        const refreshBtn = document.getElementById("dqs-refresh");
        if(refreshBtn) refreshBtn.disabled = false;

        if (this.stores[`interval_${questId}`]) {
            clearInterval(this.stores[`interval_${questId}`]);
            delete this.stores[`interval_${questId}`];
        }

        if (BdApi.Patcher) BdApi.Patcher.unpatchAll("DiscordQuestSpoofer");
        
        const { FluxDispatcher, RunningGameStore } = this.stores;
        if (FluxDispatcher && RunningGameStore) {
            FluxDispatcher.dispatch({
                type: "RUNNING_GAMES_CHANGE", 
                removed: [], 
                added: [], 
                games: RunningGameStore.getRunningGames().filter(g => !g.exeName?.includes("game.exe"))
            });
        }
    }
}