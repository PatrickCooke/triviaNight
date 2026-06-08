# 🎙️ triviaNight

A professional, local-first trivia management and presentation system designed to run on a Raspberry Pi. Built with a focus on high-impact visuals, granular scoring, and real-time remote control.

## 🚀 Getting Started

### Prerequisites
- **Node.js:** v20.x or higher
- **npm:** v10.x or higher

### Installation
1. **Clone the repository** to your local machine or Raspberry Pi.
2. **Install dependencies** from the root directory:
   ```bash
   npm install
   cd client && npm install
   ```
3. **Start the application**:
   ```bash
   # From the root directory
   npm run dev
   ```
   This will start both the Express backend (Port 3000) and the Vite frontend (Port 5173).

---

## 🏗️ Core Architecture

The system follows a hierarchical relationship model designed for maximum reusability:

- **Question Bank:** A global library of all questions. A question can exist independently and be reused in multiple Sets.
- **Sets (Rounds):** Thematic groupings of questions (e.g., "Round 1: 80s Pop Culture").
- **Events:** A specific trivia night. You link one or more **Sets** to an Event.
- **Teams:** Created per Event to track scores. They are temporary and tied to a specific trivia night.

---

## ❓ Question Types

TriviaNight supports four distinct question formats:

| Type | Presentation | Scoring |
| :--- | :--- | :--- |
| **Multiple Choice** | 2x2 grid of options (A, B, C, D). | 1 Point. |
| **Multi-Part** | Focused prompt with hidden answers. | 1 Point per answer part defined. |
| **Matching** | Two columns of shuffled values. | 1 Point per correctly paired row. |
| **Sequencing** | One column of shuffled items. | 1 Point per item in the correct order. |

> **Note on Multi-Part:** You can define answers as "Text" or "Number". Number types support a **± Range** (e.g., `1200 ± 50`), which the Scorer will display to help you validate answers instantly.

---

## 📱 Remote Control Mode

TriviaNight is designed for a **Two-Screen Experience**:

1. **Audience View:** Open the app on a computer connected to a TV/Projector. Click **Launch Presentation** and select your event.
2. **Scorekeeper (Remote):** Open the app on a Phone or Tablet. Go to **Events** and click the **Gauge Icon** to start Live Scoring.

### Real-Time Sync
- When the Scorekeeper clicks **Next** or **Back**, the Audience View updates instantly.
- **Push Leaderboard:** A switch on the Remote allows you to "flip" the Audience View from a question slide to the current standings at any time (perfect for intermissions).

---

## 🛠️ UI Symbol Guide

In the **Events** and **Sets** tables, you will see the following icons:

- **🟢 Gauge:** Open the **Event Dashboard**. This is where you register teams and launch the **Remote Control**.
- **🟠 Clipboard:** Open **Batch Score Sheets**. Use this if you collect physical paper sheets and want to input a team's entire round at once.
- **🔵 Layers:** Manage **Sets**. Add or remove themed rounds for an event.
- **❓ Question Mark:** View and manage the questions currently assigned to a Set.
- **✏️ Pencil:** Edit the metadata (Title, Date, Category) of an object.
- **🗑️ Trash:** Delete or Unlink. (Deleting a question from a Set only unlinks it; deleting it from the Question Bank removes it permanently).

---

## 📡 Deployment (Raspberry Pi)

For the best experience, host the project on a Pi and use a **Cloudflare Tunnel** to access the remote control from your phone via the internet without needing to expose ports on your router. 

### Updating Code
- Make changes locally, and test to confirm it works
- push code to github
- SSH into raspberry pi
- pull latest from github
- run `NODE_OPTIONS="--max-old-space-size=512" VITE_MAX_WORKERS=1 docker compose up -d --build` to have docker rebuild app with latest

Refer to `docs/hosting_raspberry_pi.md` for a step-by-step guide.
