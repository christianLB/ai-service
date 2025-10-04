# CLAUDE.md - ai-service Configuration
**CRITICAL: This file enforces BMAD method compliance. DO NOT DEVIATE.**

## Service Context
- **Service**: ai-service
- **Working Directory**: /home/k2600x/dev/ai-service
- **Tech Stack**: Node.js, OpenAI, Claude, LangChain
- **Dependencies**: OpenAI API, Claude API, memory-service
- **Port**: 3007

## ABSOLUTE RULES - NEVER VIOLATE

### 1. File Management
- **NEVER** create files without explicit permission
- **MAXIMUM** 3 new files per story/task
- **ALWAYS** check if file exists before creating
- **PREFER** modifying existing files over creating new ones
- **FORBIDDEN** to create files outside this service directory

### 2. Code Boundaries
```yaml
allowed_paths:
  - ./src/**
  - ./tests/**
  - ./package.json (only dependencies with permission)
  - ./.env.example (never .env)

forbidden_paths:
  - ../ (parent directory)
  - ./node_modules/
  - ./.env
  - ./.git/ (except for status/diff)
  - ../[other-service]/ (NEVER touch other services)
```

### 3. Testing Requirements
- **MUST** run tests before claiming completion: `npm test`
- **MUST** ensure all existing tests still pass
- **MUST** add tests for new functionality
- **NEVER** comment out failing tests
- **NEVER** modify tests to make them pass without fixing the actual code

### 4. Git Discipline
- **NEVER** commit directly without permission
- **ALWAYS** show git diff before committing
- **COMMIT MESSAGE FORMAT**: `[SERVICE-STORY-ID] Description`
- **FORBIDDEN** to push to remote without explicit permission

## Custom Commands

### /story-status
Show current story progress and remaining tasks

### /validate-changes
Run validation before claiming task complete:
```bash
npm test && \
npm run lint && \
git diff --stat && \
echo "✅ Validation complete"
```

### /check-boundaries
Verify you're not violating service boundaries:
```bash
pwd | grep -q "ai-service" && echo "✅ Correct directory" || echo "❌ WRONG DIRECTORY"
```

### /show-structure
Display current service structure:
```bash
tree -L 2 -I 'node_modules|dist|coverage' .
```

### /test-specific
Run specific test file:
```bash
npm test -- [test-file-path]
```

### /rollback-changes
Undo all uncommitted changes:
```bash
git status
read -p "Rollback all changes? (y/n): " confirm
[[ $confirm == "y" ]] && git checkout -- . && git clean -fd
```

### /story-checklist
Display story completion checklist:
```markdown
## Story Completion Checklist
- [ ] Requirements implemented
- [ ] Tests written and passing
- [ ] No console.log statements
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Git diff reviewed
- [ ] Manual testing complete
```

## Service-Specific Configuration

### API Endpoints
[List main endpoints and their purposes]

### Database Tables
[List tables this service owns]

### External Dependencies
[List external services this service calls]

### Environment Variables
```bash
# Required variables (without actual values)
NODE_ENV=
PORT=
DATABASE_URL=
[SERVICE_SPECIFIC_VARS]=
```

## Story Execution Protocol

### 1. Story Start
```bash
# ALWAYS run when starting a story
/check-boundaries
git status  # Ensure clean state
npm test    # Ensure tests pass before starting
```

### 2. During Development
- Make incremental changes
- Test after each change
- Commit logical chunks of work
- Never leave the service directory

### 3. Story Completion
```bash
# MUST run before marking complete
/validate-changes
/story-checklist
git diff  # Review all changes
```

## Anti-Patterns to AVOID

### ❌ NEVER DO THIS:
1. Create helper utilities "just in case"
2. Add abstraction layers for single use cases
3. Implement features not in the story
4. Refactor unrelated code
5. Add new dependencies without permission
6. Create configuration for future features
7. Build generic solutions without 3+ use cases

### ✅ ALWAYS DO THIS:
1. Implement ONLY what's in the story
2. Write the simplest solution that works
3. Test edge cases
4. Handle errors properly
5. Add appropriate logging (not console.log)
6. Update relevant documentation
7. Follow existing code patterns

## Integration Points

### Allowed Service Communications
```yaml
can_call:
  - [SERVICE]: [endpoint/purpose]
  
cannot_call:
  - [SERVICE]: [reason]
  
publishes_events:
  - [EVENT_NAME]: [description]
  
subscribes_to:
  - [EVENT_NAME]: from [SERVICE]
```

## Performance Constraints
- API response time: < 200ms
- Database queries: < 100ms  
- Memory usage: < 512MB
- CPU usage: < 50%

## Security Requirements
- NEVER log sensitive data
- NEVER commit secrets
- ALWAYS validate input
- ALWAYS use parameterized queries
- NEVER trust external data

## Monitoring & Logging
```javascript
// Correct logging
logger.info('Operation completed', { userId, action });

// NEVER do this
console.log(password);
console.log(apiKey);
```

## Questions to Ask Before Acting

Before ANY action, ask yourself:
1. Is this in the current story requirements?
2. Am I in the correct service directory?
3. Will this break existing tests?
4. Is this the simplest solution?
5. Have I checked if this already exists?

## Daily Limits (Autonomous Mode)
- Max files created per day: 10
- Max lines changed per day: 1000
- Max commits per day: 20
- Max test failures before stop: 3

## Emergency Procedures

### If Tests Fail
```bash
git diff HEAD~1  # See what changed
npm test -- --verbose  # Get detailed error
git checkout -- .  # Rollback if needed
```

### If Wrong Directory
```bash
cd /home/k2600x/dev/ai-service
/check-boundaries
```

### If Confused About Task
```bash
cat ~/.bmad/stories/current-story.md
/story-status
```

## Final Reminders
1. **YOU ARE A SPECIALIST** for ai-service only
2. **STAY IN YOUR LANE** - Don't touch other services
3. **QUALITY OVER QUANTITY** - Better to do less correctly
4. **WHEN IN DOUBT, ASK** - Don't assume or guess
5. **TESTS ARE TRUTH** - If tests fail, the code is wrong

---
*This configuration is mandatory. Violations will result in immediate task termination.*
*Last Updated: 2025-09-06*
*Version: 1.0*