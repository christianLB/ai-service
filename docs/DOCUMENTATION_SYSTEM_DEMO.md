# Documentation System Demo

This file demonstrates how the new `/docu-sync` command and `documentation-monkey` agent work together to maintain accurate documentation.

## Example Usage

### 1. Verify Documentation Accuracy

```bash
# Check if all documentation is accurate
/docu-sync verify

# Verify specific path
/docu-sync verify @docs/trading-intelligence
```

### 2. Update Outdated Documentation

```bash
# Update all outdated documentation
/docu-sync update --all

# Update with detailed report
/docu-sync update --report
```

### 3. Restructure Documentation

```bash
# Reorganize documentation hierarchy
/docu-sync structure

# Focus on specific domain
/docu-sync structure --focus trading
```

### 4. Check Documentation Coverage

```bash
# Find undocumented features
/docu-sync coverage

# Generate missing documentation
/docu-sync complete
```

### 5. Generate Health Report

```bash
# Full documentation health report
/docu-sync report

# Quick accuracy check
/docu-sync report --verify-only
```

## How It Works

### Verification Workflow

1. **Discovery Phase**
   - Scans all \*.md files in the project
   - Identifies documentation categories
   - Maps docs to code modules

2. **Validation Phase**
   - Extracts testable claims (commands, configs, APIs)
   - Tests all commands using Bash tool
   - Verifies configurations against actual files
   - Checks code examples for compilation

3. **Consultation Phase**
   - For database docs → Spawns `prisma-specialist`
   - For trading docs → Spawns `trading-specialist`
   - For deployment docs → Spawns `devops-specialist`
   - Collects expert verification results

4. **Update Phase**
   - Fixes verified inaccuracies
   - Updates version numbers
   - Corrects broken commands
   - Updates API endpoints
   - Generates change report

### Multi-Agent Collaboration

The `documentation-monkey` agent automatically collaborates with domain specialists:

```yaml
Database Documentation:
  - Consults: prisma-specialist
  - Verifies: Schema, migrations, models
  - Checks: SQL queries, Prisma commands

Trading Documentation:
  - Consults: trading-specialist
  - Verifies: Strategy descriptions, API usage
  - Checks: Exchange configurations, risk parameters

Financial Documentation:
  - Consults: financial-specialist
  - Verifies: Banking integrations, invoice systems
  - Checks: GoCardless setup, payment flows

Infrastructure Documentation:
  - Consults: devops-specialist
  - Verifies: Docker commands, deployment steps
  - Checks: Environment variables, port configurations
```

## Sample Verification Report

```markdown
## Documentation Verification Report

Date: 2025-08-17
Files Checked: 127
Issues Found: 23
Issues Fixed: 20

### Accuracy Results

- Verified Claims: 342/365 (93.7%)
- Working Commands: 89/95 (93.7%)
- Valid Examples: 45/48 (93.8%)
- Working Links: 156/162 (96.3%)

### Issues Fixed

✅ Updated Prisma migration command in setup.md
✅ Fixed incorrect port number in docker-compose docs
✅ Updated API endpoint from /v1/clients to /api/clients
✅ Corrected environment variable names in .env.template
✅ Fixed TypeScript example that didn't compile

### Remaining Issues

⚠️ 3 examples need manual review (complex trading logic)
⚠️ Missing documentation for new arbitrage feature
⚠️ Deployment guide needs NAS-specific updates

### Recommendations

1. Add documentation for arbitrage bot deployment
2. Update trading strategy examples with v3.0 changes
3. Document new Alpaca connector configuration
4. Add troubleshooting section for common Docker issues
```

## Flags and Options

### Documentation-Specific Flags

- `--docu-verify` - Verify accuracy only
- `--docu-update` - Auto-update outdated content
- `--docu-structure` - Reorganize hierarchy
- `--docu-complete` - Add missing docs
- `--docu-report` - Generate health report

### Wave Mode Support

For large documentation sets (>20 files), the system automatically enables wave mode:

- Wave 1: Discovery and categorization
- Wave 2: Validation and testing
- Wave 3: Multi-agent consultation
- Wave 4: Updates and fixes
- Wave 5: Final report generation

## Integration with CI/CD

The documentation system can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/docs-check.yml
name: Documentation Verification
on: [push, pull_request]

jobs:
  verify-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Verify Documentation
        run: |
          claude-code /docu-sync verify --ci-mode
      - name: Check Results
        run: |
          if [ -f docs-report.json ]; then
            accuracy=$(jq '.accuracy' docs-report.json)
            if [ "$accuracy" -lt 90 ]; then
              echo "Documentation accuracy below 90%"
              exit 1
            fi
          fi
```

## Benefits

1. **Accuracy**: Ensures documentation matches code reality
2. **Completeness**: Identifies missing documentation
3. **Consistency**: Maintains uniform structure
4. **Automation**: Reduces manual documentation work
5. **Quality**: Improves overall documentation quality
6. **Trust**: Users can rely on documentation accuracy

## Command Summary

```bash
# Quick verification
/docu-sync verify

# Full update cycle
/docu-sync update --all --report

# Check specific module
/docu-sync verify @docs/trading-intelligence --docu-verify

# Generate comprehensive report
/docu-sync report --wave-mode

# Fix documentation structure
/docu-sync structure --docu-structure
```

This system ensures that documentation stays accurate, up-to-date, and useful for all team members.
