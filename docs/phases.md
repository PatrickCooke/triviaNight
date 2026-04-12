# Development Phases

The project is structured to prioritize data integrity and management before the visual presentation layer.

## Phase 1: Data Entry & CRUD (Priority)
- Initialize SQLite database and migrations.
- Build management UI for Questions (Multi-Part, Multiple Choice, Matching).
- Implement Set creation and Event scheduling.
- **Goal:** Be able to fully populate a trivia night's content.

## Phase 2: Presentation UI
- Implement the Slide-based interface.
- Mouse and Right-Arrow navigation logic.
- Flow: Event Title -> Set Name -> Question Sequence.
- **Goal:** A smooth, fullscreen-ready experience for the audience.

## Phase 3: Teams & Live Scoring
- Add Team registration to Events.
- Build the "Scorekeeper" interface to record answers during the event.
- **Goal:** Real-time data collection.

## Phase 4: Analytics & Insights
- Question Difficulty logic:
    - 100% correct = "Too Easy"
    - 0% correct = "Too Hard"
- Visual reports on team performance and question quality.
