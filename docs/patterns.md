# Technical Patterns

The project utilizes a modern, component-based stack optimized for local development and rapid UI iteration.

## Frontend Stack
- **Vite:** Next-generation frontend tooling for fast HMR and optimized builds.
- **React:** Component-based UI library for managing complex state (especially for the slide-based UI).
- **MaterialUI (MUI):** Professional-grade component library to ensure a polished "Management" and "Presentation" interface.

## State Management
- Local React State for UI transitions.
- Context API or TanStack Query for data fetching from the local SQLite API.

## Design Tokens
- Presentation Mode: High contrast, large typography for readability at a distance.
- Management Mode: Dense, efficient CRUD layouts using MUI DataGrid or similar.
