# TriviaNight Project TODOs

## Infrastructure & Setup
- [x] Create a singular command to run both server and client (`npm run dev`).
- [x] Add `initDb()` call to the application bootstrap.
- [x] Configure for ES Modules (ESM) and fixed pathing issues.

## Phase 1: Data Entry & CRUD (Current)
- [x] Initialize Vite + React project structure.
- [x] Implement **Events** CRUD (Edit, Manage Sets).
- [x] Implement **Sets** CRUD (Edit, Manage Questions).
- [x] Refactor to **Question Bank** model (Many-to-Many).
- [x] Implement **Categories** for Sets and Questions.
- [ ] Implement **Media Support** (Image/Audio uploads).
- [ ] Implement **Bulk Import** (CSV/JSON).
- [ ] Finalize **Questions** Editor UI for all types.

## Phase 2: Presentation UI
- [x] Slide-based navigation engine.
- [x] Event/Set selection flow.
- [x] Question display logic for all types.
- [x] Keyboard/Mouse navigation listeners.
- [x] Normalized layout and fixed title positioning.

## Phase 3: Teams & Live Scoring (Current)
- [x] Implement **Event Dashboard** UI.
- [x] Implement **Team Registration** (Add/Remove teams per event).
- [x] Build **Live Scoring** interface (Checkbox grid).
- [ ] Implement **Remote Control** Infrastructure (WebSockets).
    - [ ] Add `socket.io` to backend with Room-based isolation.
    - [ ] Create "Audience View" (Listener) vs "Scorekeeper View" (Controller).
    - [ ] Auto-sync slide positions and leaderboard states.
- [ ] Implement **Leaderboard** calculation logic for mid-round display.

## Phase 4: Analytics & Insights
- [ ] Difficulty calculation logic (100% vs 0%).
- [ ] Reporting dashboard.

## Deployment & Hosting
- [ ] Raspberry Pi setup guide (Node.js, SQLite).
- [ ] Web deployment strategy (VPS/Cloud).
