#!/bin/bash
# dump_db.sh: Exports the SQLite database to a text-based SQL file.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Target the root directory directly
DB_FILE="$PROJECT_ROOT/trivia.db"
DUMP_FILE="$PROJECT_ROOT/database_dump.sql"

if [ ! -f "$DB_FILE" ]; then
    echo "Error: $DB_FILE not found at $DB_FILE"
    exit 1
fi

sqlite3 "$DB_FILE" .dump > "$DUMP_FILE"
echo "Success: Database dumped to $DUMP_FILE"