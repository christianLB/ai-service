#!/bin/bash
# Security Audit Script - Check for exposed credentials

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔍 Security Audit - Checking for exposed credentials...${NC}"

# Check for potential secrets in code
echo -e "${YELLOW}📋 Scanning for potential secrets...${NC}"

FOUND_ISSUES=0

# Common secret patterns
declare -a PATTERNS=(
    "password.*=.*['\"][^'\"]{8,}"
    "secret.*=.*['\"][^'\"]{8,}"
    "token.*=.*['\"][^'\"]{8,}"
    "key.*=.*['\"][^'\"]{8,}"
    "sk-[a-zA-Z0-9]{48}"  # OpenAI
    "AIza[0-9A-Za-z_-]{35}"  # Google
    "[0-9a-f]{64}"  # Generic hex key
    "ssh-rsa AAAA"  # SSH public keys
    "ssh-ed25519 AAAA"  # SSH ed25519 keys
    "-----BEGIN.*PRIVATE KEY-----"  # Private keys
)

for pattern in "${PATTERNS[@]}"; do
    echo -e "  Checking pattern: ${pattern}"
    
    if git ls-files | xargs grep -l -E "$pattern" 2>/dev/null | grep -v ".git" | grep -v "node_modules" | grep -v "security-audit.sh"; then
        echo -e "${RED}⚠️  Potential secret found with pattern: $pattern${NC}"
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
done

# Check .env files are ignored
echo -e "${YELLOW}📋 Checking .env file protection...${NC}"

# Get .env files that are tracked, excluding safe templates
UNSAFE_ENV_FILES=$(git ls-files | grep -E "\.env" | grep -v -E "\.(example|template)$" || true)

if [[ -n "$UNSAFE_ENV_FILES" ]]; then
    echo -e "${RED}⚠️  Unsafe .env files found in git tracking!${NC}"
    echo "$UNSAFE_ENV_FILES"
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
else
    echo -e "${GREEN}✅ .env files properly protected${NC}"
fi

# Check for SSH keys in repo
echo -e "${YELLOW}📋 Checking for SSH keys...${NC}"

if git ls-files | grep -E "(id_rsa|id_ed25519|\.pem|\.key)$"; then
    echo -e "${RED}⚠️  SSH keys or certificates found in repo!${NC}"
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
else
    echo -e "${GREEN}✅ No SSH keys found in repo${NC}"
fi

# Check .gitignore effectiveness
echo -e "${YELLOW}📋 Checking .gitignore effectiveness...${NC}"

SENSITIVE_FILES=(".env.local" ".env.production" "id_rsa" "id_ed25519" "config.json")

for file in "${SENSITIVE_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        if git check-ignore "$file" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $file is properly ignored${NC}"
        else
            echo -e "${RED}⚠️  $file exists but is NOT ignored!${NC}"
            FOUND_ISSUES=$((FOUND_ISSUES + 1))
        fi
    fi
done

# Final report
echo ""
if [[ $FOUND_ISSUES -eq 0 ]]; then
    echo -e "${GREEN}🎉 Security audit passed! No credential leaks detected.${NC}"
    echo -e "${GREEN}✅ Safe to commit and push${NC}"
    exit 0
else
    echo -e "${RED}❌ Security audit failed! Found $FOUND_ISSUES potential issues.${NC}"
    echo -e "${RED}🛑 DO NOT commit until issues are resolved${NC}"
    exit 1
fi