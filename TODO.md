# TriviaNight Project TODOs

## Infrastructure & Setup
- [ ] Install dependencies: `npm install better-sqlite3 @mui/material @emotion/react @emotion/styled @mui/icons-material lucide-react`
- [ ] Add `initDb()` call to the application bootstrap (e.g., in a server entry point or a setup script).
- [ ] Ensure `better-sqlite3` is rebuilt correctly when moving from macOS to Raspberry Pi (`npm rebuild`).

## Phase 1: Data Entry & CRUD (Current)
- [ ] Initialize Vite + React project structure.
- [ ] Implement **Events** CRUD (Create, Read, Update, Delete).
- [ ] Implement **Sets** CRUD.
- [ ] Implement **Questions** Management (Multi-Part, Multiple Choice, Matching).
- [ ] Implement **Event-Set** association logic.

## Phase 2: Presentation UI
- [ ] Slide-based navigation engine.
- [ ] Event/Set selection flow.
- [ ] Question display logic for all three types.
- [ ] Keyboard/Mouse navigation listeners.

## Phase 3: Teams & Live Scoring
- [ ] Team registration for active events.
- [ ] Scoring interface for real-time answer recording.

## Phase 4: Analytics & Insights
- [ ] Difficulty calculation logic (100% vs 0%).
- [ ] Reporting dashboard.

## Deployment & Hosting
- [ ] Raspberry Pi setup guide (Node.js, SQLite).
- [ ] Web deployment strategy (VPS/Cloud).
