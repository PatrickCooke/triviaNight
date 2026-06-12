#!/bin/bash
# restore_db.sh: Rebuilds the SQLite database from the SQL dump file.

DB_FILE="trivia.db"
DUMP_FILE="database_dump.sql"

if [ ! -f "$DUMP_FILE" ]; then
    echo "Error: $DUMP_FILE not found."
    exit 1
fi

if [ -f "$DB_FILE" ]; then
    TIMESTAMP=$(date +%Y%m%d%H%M%S)
    BACKUP_FILE="${DB_FILE}.bak.${TIMESTAMP}"
    mv "$DB_FILE" "$BACKUP_FILE"
    echo "Existing database backed up to $BACKUP_FILE"
fi

sqlite3 "$DB_FILE" < "$DUMP_FILE"
echo "Success: Database restored from $DUMP_FILE"
