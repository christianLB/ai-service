#!/bin/bash
# Simple script to encode GitHub token for Docker/Watchtower

echo "Paste your GitHub token and press Enter:"
read -s GITHUB_TOKEN

# Encode it
ENCODED=$(echo -n "christianlb:$GITHUB_TOKEN" | base64)

echo ""
echo "Your encoded token is:"
echo "========================"
echo "$ENCODED"
echo "========================"
echo ""
echo "Now replace REPLACE_THIS_WITH_BASE64_STRING in the config with the above string"