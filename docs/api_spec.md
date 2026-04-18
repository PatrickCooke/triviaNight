# triviaNight API Specification

This document defines the data structures and REST endpoints for the triviaNight backend.

## Data Types

### Event
```json
{
  "id": 1,
  "title": "Prime Winter Trivia",
  "date": "2026-01-09T19:00:00",
  "location": "Local Community Center"
}
```

### Set
```json
{
  "id": 1,
  "name": "Round 1: History",
  "category": "History",
  "description": "General historical questions"
}
```

### Question
```json
{
  "id": 1,
  "type": "multiple_choice",
  "category": "Science",
  "prompt": "What is the tallest mountain?",
  "media_url": "/uploads/image.png",
  "content": {
    "correct": "Everest",
    "distractors": ["K2", "Fuji", "Denali"]
  }
}
```
*Note: `content` varies by `type` (multi_part, multiple_choice, matching).*

---

## Endpoints

### Events
- `GET /api/events` - List all events.
- `POST /api/events` - Create an event.
- `PUT /api/events/:id` - Update an event.
- `DELETE /api/events/:id` - Delete an event.
- `GET /api/events/:id/sets` - Get sets assigned to an event.
- `POST /api/events/:id/sets` - Link a set to an event.
- `DELETE /api/events/:id/sets/:setId` - Unlink a set.

### Sets
- `GET /api/sets` - List all sets.
- `POST /api/sets` - Create a set.
- `PUT /api/sets/:id` - Update a set.
- `DELETE /api/sets/:id` - Delete a set.
- `GET /api/sets/:id/questions` - Get questions in a set.
- `POST /api/sets/:id/questions` - Link a question to a set.
- `DELETE /api/sets/:id/questions/:questionId` - Unlink a question.

### Questions (Bank)
- `GET /api/questions` - List all questions in the bank.
- `POST /api/questions` - Create a new question.
- `PUT /api/questions/:id` - Update a question.
- `DELETE /api/questions/:id` - Delete a question permanently.
- `POST /api/questions/bulk` - Import an array of questions.

### Media
- `POST /api/upload` - Upload an image/file. Returns `{ "url": "..." }`.
