# Raspberry Pi Hosting Guide

This guide explains how to host the **triviaNight** application on a Raspberry Pi for local-first performance.

## 1. Environment Setup
- **Node.js:** Install Node.js (v18+ recommended).
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```
- **SQLite:** Pre-installed on most Raspbian versions.

## 2. Deployment Steps
1. **Transfer Code:** Clone the repository or move the files to the Pi.
2. **Install Dependencies:**
    ```bash
    npm install
    # Ensure better-sqlite3 is built for the Pi's architecture
    npm rebuild better-sqlite3
    ```
3. **Build Frontend:**
    ```bash
    cd client && npm run build
    ```
4. **Environment Variables:**
    - Create a `.env` file if needed for specific ports.

## 3. Running the App
- **Development:**
    ```bash
    # Terminal 1: Server
    npm run server
    # Terminal 2: Client
    npm run dev
    ```
- **Production (Recommended):** Use `pm2` to manage the process and ensure it starts on boot.
    ```bash
    sudo npm install -g pm2
    pm2 start server/index.ts --interpreter ./node_modules/.bin/ts-node
    pm2 save
    pm2 startup
    ```

## 4. Local Network Access
- Find your Pi's IP: `hostname -I`
- Access from other devices on the same Wi-Fi/Ethernet: `http://<pi-ip-address>:3001` (or your configured port).
