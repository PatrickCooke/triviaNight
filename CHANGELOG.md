# Changelog

All notable changes to the **triviaNight** project will be documented in this file.

## [2026-04-11] - Infrastructure Fixes & ESM Migration

### Fixed
- **ESM Configuration:** Migrated the root project to ES Modules (`type: module`) to satisfy Node.js 20+ requirements.
- **Path Resolution:** Updated `server/db.ts` to correctly resolve the database schema from the `server/` directory.
- **Dependency Management:** Fixed missing `client/package.json` and added necessary scripts to the root.
- **Concurrent Execution:** Configured `npm run dev` to use the correct ESM loader for TypeScript.
