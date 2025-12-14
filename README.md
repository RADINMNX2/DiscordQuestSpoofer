# 🚀 Discord Quest Spoofer & Auto Completer (BetterDiscord/Vencord)

![Version](https://img.shields.io/badge/version-2.0.5-blue?style=for-the-badge)
![Stars](https://img.shields.io/github/stars/RADINMNX2/DiscordQuestSpoofer?style=for-the-badge&color=yellow)
![Repo Size](https://img.shields.io/github/repo-size/RADINMNX2/DiscordQuestSpoofer?style=for-the-badge&color=orange)

**The ultimate Discord Quest Completer.**
Automatically finish **Discord Quests**, **play games**, and **watch streams** to unlock free rewards (Avatar Decorations, Nitro offers, etc.) without actually installing the games.

This is a premium-quality plugin for **BetterDiscord** and **Vencord** users.

---

## 🌟 Why Use Discord Quest Spoofer?

If you are looking for a way to **complete Discord quests without playing**, this tool is the solution. It fakes the game activity and stream presence locally, tricking Discord into thinking you are completing the task.

*   ✅ **No Game Installation Required:** Complete "Play for 15 minutes" quests instantly.
*   ✅ **Auto Watch Streams:** Simulates watching a stream for quests that require it.
*   ✅ **Safe & undetectable:** Uses natural behavior simulation.
*   ✅ **Works on BetterDiscord & Vencord:** Fully compatible with major client mods.
*   ✅ **Beautiful Neon UI:** A modern dashboard to track your progress.

---

## ✨ Features

### 1. 🎮 Play Activity Spoofer
Automatically spoofs the process of any game required for a quest.
*   *How it works:* It injects a fake running game into Discord's `RunningGameStore`.
*   *Result:* The quest progress bar fills up while you do nothing.

### 2. 📺 Auto Watch Video
Automatically watches quest videos or streams required for rewards.
*   *Speed:* Uses a smart "Fast Forward" algorithm to complete 15-minute tasks in seconds if eligible.

### 3. 🎙️ Stream in Voice Channel
Simulates streaming a game to friends in a Voice Channel.
*   *Note:* Simply join a VC, start the spoofer, and it handles the stream metadata.

---

## 📥 Installation Guide

### For BetterDiscord:
1.  Download `DiscordQuestSpoofer.plugin.js` from the releases or code.
2.  Open Discord > **User Settings** > **BetterDiscord** > **Plugins**.
3.  Click **Open Plugins Folder**.
4.  Drop the file into that folder.

### For Vencord:
1.  Place the file in your Vencord user plugins folder (requires manual loading or Vencord plugin loader).

---

## ❓ Frequently Asked Questions (FAQ)

**Q: How to complete Discord quests without downloading the game?**
A: Simply install this plugin, accept the quest in Discord, open the plugin settings, and click "Start Spoofing".

**Q: Is Discord Quest Spoofer safe?**
A: Yes. This plugin only modifies local client values to trigger the quest completion. It does not spam the API or do anything malicious.

**Q: Does this work for the "Stream to a friend" quest?**
A: Yes! Use the "Stream on Desktop" mode. You just need to be in a voice channel (even alone or with an alt account).

**Q: Can I get banned for using a quest spoofer?**
A: While using any 3rd party client mod (BetterDiscord/Vencord) is technically against TOS, no user has ever been banned specifically for spoofing quests. Use at your own risk.

---

## 🛠️ Technical Details

This project replaces old methods like `console.js` scripts with a robust UI-based plugin.
*   **Module Resilience:** Uses a fallback Webpack extraction method if standard modules change.
*   **Logic:** Replicates the exact `QuestsStore` logic to ensure valid progress packets are sent.

---

Made with ❤️ by **RADINMNX**
[GitHub Repository](https://github.com/RADINMNX2/DiscordQuestSpoofer)
