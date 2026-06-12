#!/bin/bash
# dump_db.sh: Exports the SQLite database to a text-based SQL file.

DB_FILE="trivia.db"
DUMP_FILE="database_dump.sql"

if [ ! -f "$DB_FILE" ]; then
    echo "Error: $DB_FILE not found."
    exit 1
fi

sqlite3 "$DB_FILE" .dump > "$DUMP_FILE"
echo "Success: Database dumped to $DUMP_FILE"
