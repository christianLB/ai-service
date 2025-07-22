#!/bin/bash
cd /home/k2600x/dev/ai-service
source .env.local
export $(grep -v '^#' .env.local | xargs)
node test-client-update.js