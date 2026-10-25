This project is a self-hosted, real-time Trivia Night application using Node.js (Express + Socket.io) and React (Vite + TypeScript). 

Currently, I have a unified app that handles both the administration (editing questions, sets, managing events) and the backend. 
I want to split the frontend into two separate React applications served from the same monorepo backend:
1. `client` My existing management app
2. `client-participant` A new, lightweight player-facing application consisting of a welcome screen and input for some sort of Event identifier and then the current participant experience.

This participant view needs to connect to the backend via Socket.io. When the admin hits "Next Question" or "Show Leaderboard" from the admin panel, the backend should emit a socket event that the participant view captures to update its screen in real-time.

## 1. Express Server Blueprint (Dual-Static Serving)

To serve both apps from a single Node instance, we can use path-based routing. The Participant app (the primary audience) lives at the root `/`, while the Management app lives at `/admin`.

```typescript
// server/index.ts refinement
import express from 'express';
import path from 'path';

const app = express();

// 1. Serve Participant App at the root
const participantPath = path.join(__dirname, '../client-participant/dist');
app.use(express.static(participantPath));

// 2. Serve Admin App at /admin
const adminPath = path.join(__dirname, '../client/dist');
app.use('/admin', express.static(adminPath));

// 3. Handle SPA Routing (Fallbacks)
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminPath, 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(participantPath, 'index.html'));
});
```

## 2. Participant App Boilerplate (TypeScript + Socket.io)

A lightweight entry point for `client-participant/src/App.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const socket: Socket = io(window.location.origin); // Connects to same host

export default function ParticipantApp() {
  const [gameState, setGameState] = useState<any>(null);
  const [view, setView] = useState<'JOIN' | 'GAME'>('JOIN');
  const [eventId, setEventId] = useState('');

  useEffect(() => {
    socket.on('GAME_STATE_UPDATE', (state) => {
      setGameState(state);
    });

    socket.on('REVEAL_QUESTION', (question) => {
      setGameState(prev => ({ ...prev, currentQuestion: question }));
    });

    return () => {
      socket.off('GAME_STATE_UPDATE');
      socket.off('REVEAL_QUESTION');
    };
  }, []);

  const joinGame = () => {
    socket.emit('join_event', eventId);
    setView('GAME');
  };

  if (view === 'JOIN') {
    return (
      <div className="welcome">
        <h1>Trivia Night</h1>
        <input value={eventId} onChange={e => setEventId(e.target.value)} placeholder="Event ID" />
        <button onClick={joinGame}>Join Round</button>
      </div>
    );
  }

  return (
    <div className="game-view">
      {gameState?.currentQuestion ? (
        <QuestionDisplay data={gameState.currentQuestion} />
      ) : (
        <h2>Waiting for host...</h2>
      )}
    </div>
  );
}
```

## 3. Architectural Socket.io Flow

The flow follows a "Broadcast Pattern" to ensure low latency and consistent state.

1.  **Action (Admin Panel)**: The Admin clicks "Next Slide".
2.  **Request (API)**: `POST /api/events/:id/next` is sent to the Express backend.
3.  **Logic (Backend)**: The server updates the internal state in SQLite.
4.  **Broadcast (Socket.io)**: 
    *   `io.to(`event_${id}`).emit('slide_changed', nextIndex)`
    *   This is triggered immediately after the DB update completes.
5.  **Reaction (Participant)**: All phones in the room receive the event via their socket connection.
6.  **Update (UI)**: React triggers a re-render, and all participants see the new question simultaneously.

**Event Chain Example:**
`Admin Click` → `HTTP PUT` → `DB Update` → `Socket.io Emit` → `Participant State Update` → `Render`

## 4. UX/UI Specifications

### Participant App (Welcome Screen)
*   **Layout**: A mobile-first design centered vertically and horizontally.
*   **Header**: A simple, blank menu bar across the top to maintain brand consistency.
*   **Input Field**:
    *   **Label**: "Game Code"
    *   **Placeholder**: e.g., "XY1234"
*   **Action Button**:
    *   **Logic**: The button remains `disabled` until the input reaches exactly **6 characters**.
*   **Validation Flow**:
    *   When "Join" is clicked, the app sends a verification request to the backend.
    *   **On Match**: User is admitted to the live WebSocket-synced experience.
    *   **On Error**: A browser alert popup appears with the message: **"That game is not available"**.

### Admin Panel (LiveScorer Page)
*   **Header Sync**: A new read-only field or label displaying the active **Game Code** will be placed adjacent to the QR Code button.
*   **Visibility**: This allows the host to quickly read the code aloud to participants who may not be able to scan the QR code.


Answers to concerns and wrinkles
1. I think we need to add a game_code column to the events table. I want the game_code to be generated, so it's relatively random. 
2. right now I was thinking security by obscurity, but I think a simple admin password a reasonable step. Please make the password cookie. In the future I'll probably want to implement account level authentication, but that is beyond the current scope
3. This is a good concernt. At the moment I consider all participants as watchers, so the 6 character code just acts a room entry key
4. I have a raspberry pi 3, so ability and performance is a concern. I'm ok keeping this as a single app at the moment, and capturing the work in a new document to split th ecode into 2 apps once I update hardware.
5. I would like a graceful attempt at reconnecting if the phone goes to sleep or they background their browser.

My top priority is game code generation, all other things ,if they need to be worked on in the future, should be captured in a new markdown document titled futurework. feel free to capture it in multiple futurework documents if it makes sense to perform this update in phases.