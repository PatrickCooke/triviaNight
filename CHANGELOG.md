# Changelog

All notable changes to the **triviaNight** project will be documented in this file.

## [2026-04-11] - Question Refinements & Phase 3 Start

### Added
- **Sequencing Question Type:** Created a dedicated type for ordering items with a custom shuffle layout.
- **Granular Multi-Part Answers:** Refactored Multi-Part questions to support individual rows with types (Text/Number) and numerical range tolerance (±).
- **Sequencing Editor:** Added Up/Down arrangement and item deletion.
- **Phase 3 Initialization:** Started work on Teams and Live Scoring.

### Planned
- **Remote Control Pattern:** Architectural decision to use WebSockets (Socket.io) for real-time synchronization between "Audience" and "Scorekeeper" devices.
- **Multi-Session Support:** Use "Rooms" to allow one Raspberry Pi to host multiple simultaneous trivia events.
