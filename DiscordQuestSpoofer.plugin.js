/**
 * @name DiscordQuestSpoofer
 * @author RADINMNX
 * @description A powerful, modern, and beautiful tool to auto-complete Discord Quests. Supports Video, Game, and Stream tasks with a neon aesthetic dashboard.
 * @version 2.0.5
 * @invite 
 * @authorLink https://github.com/RADINMNX2
 * @website https://github.com/RADINMNX2/DiscordQuestSpoofer
 * @source https://github.com/RADINMNX2/DiscordQuestSpoofer
 */

module.exports = class DiscordQuestSpoofer {
    constructor() {
        this.initialized = false;
        this.activeSpoofs = new Map(); // Stores active intervals/state
        this.stores = {};
    }

    getName() { return "DiscordQuestSpoofer"; }
    getDescription() { return "The ultimate tool for Discord Quests. Auto-completes tasks silently and efficiently."; }
    getVersion() { return "2.0.5"; }
    getAuthor() { return "RADINMNX"; }

    load() {
        // --- Robust Module Loading System ---
        try {
            const getModule = (filter, options = {}) => {
                if (BdApi.Webpack && BdApi.Webpack.getModule) return BdApi.Webpack.getModule(filter, { defaultExport: false, ...options });
                if (typeof BdApi.findModule === "function") return BdApi.findModule(filter);
                return null;
            };

            const byProps = (...props) => (m) => props.every(p => m[p] !== undefined || m?.Z?.[p] !== undefined || m?.ZP?.[p] !== undefined);

            // 1. Attempt Standard API
            this.stores = {
                RunningGameStore: getModule(byProps("getRunningGames")),
                FluxDispatcher: getModule(byProps("flushWaitQueue")),
                API: getModule(byProps("get", "post", "put")),
                UserStore: getModule(byProps("getCurrentUser")),
                ApplicationStreamingStore: getModule(m => m?.getStreamerActiveStreamMetadata || m?.Z?.getStreamerActiveStreamMetadata),
                QuestsStore: getModule(m => m?.getQuest || m?.Z?.getQuest),
                ChannelStore: getModule(byProps("getSortedPrivateChannels")),
                GuildChannelStore: getModule(byProps("getSFWDefaultChannel")),
            };

            // 2. Normalize Exports (Handle Z/ZP/default wrappers)
            for (const key in this.stores) {
                const mod = this.stores[key];
                if (!mod) continue;
                
                if (key === "RunningGameStore" && !mod.getRunningGames) this.stores[key] = mod.ZP || mod.Z || mod;
                if (key === "QuestsStore" && !mod.getQuest) this.stores[key] = mod.Z || mod.ZP || mod;
                if (key === "ApplicationStreamingStore" && !mod.getStreamerActiveStreamMetadata) this.stores[key] = mod.Z || mod.ZP || mod;
                if (key === "FluxDispatcher" && !mod.flushWaitQueue) this.stores[key] = mod.Z || mod.ZP || mod;
                if (key === "API" && !mod.get) this.stores[key] = mod.tn || mod;
                if (key === "ChannelStore" && !mod.getSortedPrivateChannels) this.stores[key] = mod.Z || mod.ZP || mod;
                if (key === "GuildChannelStore" && !mod.getAllGuilds) this.stores[key] = mod.ZP || mod.Z || mod;
            }

            // 3. Fallback: Manual Webpack Chunk Extraction (for resilience)
            if (!this.stores.QuestsStore || !this.stores.RunningGameStore || !this.stores.API) {
                console.log("[DQS] Standard API partial fail, using fallback extraction...");
                if (window.webpackChunkdiscord_app) {
                    const wpRequire = window.webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
                    window.webpackChunkdiscord_app.pop();
                    const modules = Object.values(wpRequire.c);

                    const findRaw = (check) => {
                        const m = modules.find(check);
                        return m?.exports?.Z || m?.exports?.ZP || m?.exports?.tn || m?.exports;
                    };

                    if (!this.stores.RunningGameStore) this.stores.RunningGameStore = findRaw(x => x?.exports?.ZP?.getRunningGames);
                    if (!this.stores.QuestsStore) this.stores.QuestsStore = findRaw(x => x?.exports?.Z?.__proto__?.getQuest);
                    if (!this.stores.ApplicationStreamingStore) this.stores.ApplicationStreamingStore = findRaw(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata);
                    if (!this.stores.FluxDispatcher) this.stores.FluxDispatcher = findRaw(x => x?.exports?.Z?.__proto__?.flushWaitQueue);
                    if (!this.stores.API) this.stores.API = findRaw(x => x?.exports?.tn?.get);
                    if (!this.stores.ChannelStore) this.stores.ChannelStore = findRaw(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent);
                    if (!this.stores.GuildChannelStore) this.stores.GuildChannelStore = findRaw(x => x?.exports?.ZP?.getSFWDefaultChannel);
                }
            }
        } catch (e) {
            console.error("[DQS] Critical Load Error:", e);
        }
    }

    start() {
        this.injectCSS();
        this.initialized = true;
        BdApi.showToast("Discord Quest Spoofer Ready", { type: "success" });
    }

    stop() {
        this.removeCSS();
        this.stopAllSpoofs();
        if (BdApi.Patcher) BdApi.Patcher.unpatchAll("DiscordQuestSpoofer");
        this.initialized = false;
    }

    stopAllSpoofs() {
        this.activeSpoofs.forEach((val, key) => this.stopSpoof(key));
    }

    injectCSS() {
        const css = `
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;800&display=swap');
            
            :root {
                --dqs-bg: #09090b;
                --dqs-card: rgba(24, 24, 27, 0.6);
                --dqs-border: rgba(255, 255, 255, 0.1);
                --dqs-accent: #f43f5e; /* Rose 500 */
                --dqs-accent-glow: rgba(244, 63, 94, 0.5);
                --dqs-success: #10b981;
                --dqs-text: #ffffff;
                --dqs-subtext: #a1a1aa;
            }

            .dqs-panel {
                background: linear-gradient(145deg, #000000, #1a0505);
                border: 1px solid #3f3f46;
                border-radius: 16px;
                padding: 24px;
                font-family: 'Inter', sans-serif;
                color: var(--dqs-text);
                position: relative;
                overflow: hidden;
            }
            
            /* Animated Background Glow */
            .dqs-panel::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(244,63,94,0.1) 0%, transparent 70%);
                animation: dqs-rotate 20s linear infinite;
                z-index: 0;
                pointer-events: none;
            }

            @keyframes dqs-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

            .dqs-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                position: relative;
                z-index: 1;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                padding-bottom: 16px;
            }

            .dqs-title {
                font-size: 20px;
                font-weight: 800;
                background: linear-gradient(to right, #fff, #f43f5e);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .dqs-badge {
                font-size: 10px;
                background: var(--dqs-accent);
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-family: 'JetBrains Mono', monospace;
            }

            .dqs-content {
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .dqs-card {
                background: var(--dqs-card);
                backdrop-filter: blur(12px);
                border: 1px solid var(--dqs-border);
                border-radius: 12px;
                padding: 20px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .dqs-card:hover {
                border-color: var(--dqs-accent);
                box-shadow: 0 0 20px rgba(244, 63, 94, 0.2);
                transform: translateY(-2px);
            }

            .dqs-info-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 16px;
            }

            .dqs-app-name {
                font-size: 18px;
                font-weight: 700;
                display: block;
            }

            .dqs-task-type {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: var(--dqs-subtext);
                margin-top: 4px;
                display: block;
            }

            .dqs-progress-track {
                height: 6px;
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
                overflow: hidden;
                margin: 16px 0;
                position: relative;
            }

            .dqs-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #f43f5e, #fb7185);
                width: 0%;
                transition: width 0.3s ease-out;
                position: relative;
                box-shadow: 0 0 10px var(--dqs-accent);
            }
            
            .dqs-progress-fill::after {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: dqs-shimmer 2s infinite;
            }

            @keyframes dqs-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

            .dqs-controls {
                display: flex;
                gap: 12px;
                align-items: center;
            }

            .dqs-btn {
                flex: 1;
                padding: 10px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 0.5px;
            }

            .dqs-btn-primary {
                background: var(--dqs-accent);
                color: white;
                box-shadow: 0 4px 12px rgba(244, 63, 94, 0.3);
            }
            
            .dqs-btn-primary:hover {
                background: #e11d48;
                box-shadow: 0 6px 16px rgba(244, 63, 94, 0.5);
            }

            .dqs-btn-danger {
                background: transparent;
                border: 1px solid var(--dqs-accent);
                color: var(--dqs-accent);
            }

            .dqs-btn-danger:hover {
                background: rgba(244, 63, 94, 0.1);
            }

            .dqs-btn:disabled {
                background: #27272a;
                color: #52525b;
                box-shadow: none;
                cursor: not-allowed;
                border: none;
            }

            .dqs-status-text {
                font-family: 'JetBrains Mono', monospace;
                font-size: 12px;
                color: var(--dqs-subtext);
                text-align: right;
            }

            .dqs-empty {
                text-align: center;
                padding: 40px;
                color: var(--dqs-subtext);
                border: 1px dashed var(--dqs-border);
                border-radius: 12px;
            }
        `;
        BdApi.DOM.addStyle("DiscordQuestSpoofer", css);
    }

    removeCSS() {
        BdApi.DOM.removeStyle("DiscordQuestSpoofer");
    }

    getSettingsPanel() {
        const panel = document.createElement("div");
        panel.className = "dqs-panel";
        
        // --- Header ---
        const header = document.createElement("div");
        header.className = "dqs-header";
        header.innerHTML = `
            <h2 class="dqs-title">QUEST SPOOFER <span class="dqs-badge">v2.0.5</span></h2>
            <button class="dqs-btn dqs-btn-danger" id="dqs-refresh" style="flex: 0 0 auto; width: auto; padding: 6px 12px;">↻ Refresh</button>
        `;
        panel.appendChild(header);

        // --- Content Container ---
        const content = document.createElement("div");
        content.className = "dqs-content";
        panel.appendChild(content);

        const render = () => {
            content.innerHTML = "";
            const refreshBtn = panel.querySelector("#dqs-refresh");
            
            // Check if active spoof exists to lock refresh
            if (this.activeSpoofs.size > 0) {
                if (refreshBtn) refreshBtn.disabled = true;
            } else {
                if (refreshBtn) refreshBtn.disabled = false;
            }

            if (!this.stores.QuestsStore) {
                content.innerHTML = `<div class="dqs-empty">Error: QuestsStore not found.<br>Please restart Discord.</div>`;
                return;
            }

            // --- QUEST FINDING LOGIC (From console.js) ---
            const quest = [...this.stores.QuestsStore.quests.values()].find(x => 
                x.id !== "1412491570820812933" && 
                x.userStatus?.enrolledAt && 
                !x.userStatus?.completedAt && 
                new Date(x.config.expiresAt).getTime() > Date.now()
            );

            if (!quest) {
                content.innerHTML = `
                    <div class="dqs-empty">
                        <div style="font-size: 24px; margin-bottom: 8px;">💤</div>
                        No active quests found.<br>
                        <span style="font-size: 12px; opacity: 0.7;">Go to User Settings > Gift Inventory to accept a quest.</span>
                    </div>`;
                return;
            }

            // Quest Data
            const appId = quest.config.application.id;
            const appName = quest.config.application.name;
            const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
            const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null);
            const target = taskConfig.tasks[taskName].target;
            const current = Math.floor(quest.userStatus?.progress?.[taskName]?.value ?? 0);
            const percent = Math.min(100, Math.floor((current / target) * 100));
            const isCompleted = percent >= 100;
            const isRunning = this.activeSpoofs.has(quest.id);

            // Create Card
            const card = document.createElement("div");
            card.className = "dqs-card";
            card.innerHTML = `
                <div class="dqs-info-row">
                    <div>
                        <span class="dqs-app-name">${appName}</span>
                        <span class="dqs-task-type">${taskName.replace(/_/g, " ")}</span>
                    </div>
                    <div class="dqs-status-text" id="status-text-${quest.id}">
                        ${isCompleted ? "COMPLETED" : `${current}s / ${target}s`}
                    </div>
                </div>
                
                <div class="dqs-progress-track">
                    <div class="dqs-progress-fill" id="bar-${quest.id}" style="width: ${percent}%"></div>
                </div>

                <div class="dqs-controls">
                    <button class="dqs-btn dqs-btn-primary" id="btn-${quest.id}">
                        ${isRunning ? "STOP OPERATION" : (isCompleted ? "CLAIM REWARD IN DISCORD" : "START SPOOFING")}
                    </button>
                </div>
            `;

            const btn = card.querySelector(`#btn-${quest.id}`);
            if (isCompleted) btn.disabled = true;

            btn.onclick = () => {
                if (this.activeSpoofs.has(quest.id)) {
                    this.stopSpoof(quest.id);
                    render(); // Re-render to update UI state
                    BdApi.showToast("Spoofing Stopped", { type: "info" });
                } else {
                    this.startSpoof(quest, taskName, target, () => {
                         // On Progress Update
                         const q = this.stores.QuestsStore.getQuest(quest.id);
                         const cur = Math.floor(q?.userStatus?.progress?.[taskName]?.value ?? 0);
                         const p = Math.min(100, (cur / target) * 100);
                         
                         const bar = card.querySelector(`#bar-${quest.id}`);
                         const txt = card.querySelector(`#status-text-${quest.id}`);
                         if (bar) bar.style.width = `${p}%`;
                         if (txt) txt.textContent = `${cur}s / ${target}s`;
                         
                         if (p >= 100) {
                             this.stopSpoof(quest.id);
                             render();
                             BdApi.showToast("Quest Completed! Claim your reward.", { type: "success" });
                         }
                    });
                    
                    btn.textContent = "STOP OPERATION";
                    btn.classList.replace("dqs-btn-primary", "dqs-btn-danger");
                    if(refreshBtn) refreshBtn.disabled = true;
                    BdApi.showToast("Spoofing Started...", { type: "success" });
                }
            };

            content.appendChild(card);
        };

        panel.querySelector("#dqs-refresh").onclick = render;
        render(); // Initial call
        
        return panel;
    }

    startSpoof(quest, taskName, secondsNeeded, onUpdate) {
        if (this.activeSpoofs.has(quest.id)) return;
        
        const { API, RunningGameStore, FluxDispatcher, ApplicationStreamingStore, ChannelStore, GuildChannelStore } = this.stores;
        const pid = Math.floor(Math.random() * 30000) + 1000;
        const appId = quest.config.application.id;
        const appName = quest.config.application.name;
        
        // Store interval/cleanup info
        const spoofState = {
            interval: null,
            cleanup: () => {}
        };
        this.activeSpoofs.set(quest.id, spoofState);

        // --- VIDEO TASK (Smart Logic) ---
        if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            // Using console.js robust logic
            const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
            const maxFuture = 10;
            const speed = 7; // Fast forward speed
            const intervalTime = 1000; // 1 second
            
            spoofState.interval = setInterval(async () => {
                const q = this.stores.QuestsStore.getQuest(quest.id);
                if (!q) return;

                let secondsDone = q.userStatus?.progress?.[taskName]?.value ?? 0;
                
                // Calculate max allowed time based on enrollment (Fast Forward)
                const maxAllowed = Math.floor((Date.now() - enrolledAt)/1000) + maxFuture;
                const diff = maxAllowed - secondsDone;
                const timestamp = secondsDone + speed;

                if (diff >= speed) {
                    try {
                        await API.post({
                            url: `/quests/${quest.id}/video-progress`, 
                            body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) }
                        });
                        onUpdate();
                    } catch (e) { console.error(e); }
                } else {
                    // If we caught up to real time, just wait
                }
            }, intervalTime);
        }

        // --- PLAY ON DESKTOP ---
        else if (taskName === "PLAY_ON_DESKTOP") {
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

            // Patch
            if (BdApi.Patcher) {
                BdApi.Patcher.after("DiscordQuestSpoofer", RunningGameStore, "getRunningGames", (_, args, res) => [...res, fakeGame]);
                BdApi.Patcher.after("DiscordQuestSpoofer", RunningGameStore, "getGameForPID", (_, [p], res) => p === pid ? fakeGame : res);
            }

            // Dispatch
            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [], added: [fakeGame], games: RunningGameStore.getRunningGames() });

            // Poll Progress
            spoofState.interval = setInterval(() => onUpdate(), 2000);
            
            spoofState.cleanup = () => {
                FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
            };
        }

        // --- STREAM ON DESKTOP ---
        else if (taskName === "STREAM_ON_DESKTOP") {
            if (BdApi.Patcher) {
                BdApi.Patcher.after("DiscordQuestSpoofer", ApplicationStreamingStore, "getStreamerActiveStreamMetadata", () => ({
                    id: appId,
                    pid: pid,
                    sourceName: null
                }));
            }
            
            BdApi.showToast("Please join a Voice Channel to progress!", {type: "warning"});
            spoofState.interval = setInterval(() => onUpdate(), 2000);
        }

        // --- PLAY ACTIVITY (Heartbeat) ---
        else if (taskName === "PLAY_ACTIVITY") {
            // Find a valid channel ID (Private or Guild)
            let channelId = ChannelStore.getSortedPrivateChannels()[0]?.id;
            if (!channelId) {
                const guilds = Object.values(GuildChannelStore.getAllGuilds() || {});
                const guildWithVoice = guilds.find(g => g.VOCAL && g.VOCAL.length > 0);
                if (guildWithVoice) channelId = guildWithVoice.VOCAL[0].channel.id;
            }

            if (!channelId) {
                BdApi.showToast("Could not find a valid Voice Channel ID. Join a server.", {type: "error"});
                this.stopSpoof(quest.id);
                return;
            }

            const streamKey = `call:${channelId}:1`;
            console.log("[DQS] Spoofing Activity on Channel ID:", channelId);

            spoofState.interval = setInterval(async () => {
                try {
                    await API.post({
                        url: `/quests/${quest.id}/heartbeat`, 
                        body: { stream_key: streamKey, terminal: false }
                    });
                    onUpdate();
                } catch(e) {
                    console.log("[DQS] Heartbeat failed", e);
                }
            }, 20000); // 20s heartbeat
        }
    }

    stopSpoof(questId) {
        if (!this.activeSpoofs.has(questId)) return;
        const state = this.activeSpoofs.get(questId);
        
        if (state.interval) clearInterval(state.interval);
        if (state.cleanup) state.cleanup();
        
        this.activeSpoofs.delete(questId);
        
        // Remove patches if no other spoofs active
        if (this.activeSpoofs.size === 0 && BdApi.Patcher) {
            BdApi.Patcher.unpatchAll("DiscordQuestSpoofer");
        }
    }
}