#!/bin/bash

# Migration Status Update Cron Job
# 
# Add to crontab with:
# */15 * * * * /path/to/ai-service/scripts/migration/migration-status-cron.sh
#
# This runs every 15 minutes to update the migration status

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."

# Change to project directory
cd "$PROJECT_ROOT"

# Log file
LOG_FILE="$PROJECT_ROOT/logs/migration-status-updates.log"
mkdir -p "$PROJECT_ROOT/logs"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "Starting migration status update"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log "ERROR: Node.js not found"
    exit 1
fi

# Run the update script
if node "$SCRIPT_DIR/update-migration-status.js" >> "$LOG_FILE" 2>&1; then
    log "Migration status update completed successfully"
else
    log "ERROR: Migration status update failed"
    exit 1
fi

# Keep log file size under control (keep last 1000 lines)
if [ -f "$LOG_FILE" ]; then
    tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

log "Cron job completed"