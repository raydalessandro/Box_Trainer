# BoxTrainer Test Suite

Comprehensive test templates for BoxTrainer Phase 1-3 features.

## Overview

This directory contains test templates for all planned BoxTrainer features. Tests are marked with `TODO` comments and should be implemented as corresponding features are developed.

## Test Organization

### Phase 1: Session Tracking
- **`SessionManager.test.ts`** - Session lifecycle, metrics tracking, recovery

### Phase 2: Analytics Dashboard
- **`analytics.test.ts`** - Streak calculation, calendar heatmap, stats aggregation, pattern analysis

### Phase 3: Engagement Features
- **`TemplateManager.test.ts`** - Template creation, library management, import/export
- **`AchievementManager.test.ts`** - Achievement unlocking, progress tracking, notifications
- **`ExportService.test.ts`** - CSV/JSON export, batch operations, data validation

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test SessionManager

# Run tests with coverage
npm test -- --coverage
```

## Test Development Workflow

### 1. Feature Implementation
When implementing a new feature:

1. Locate the corresponding test file
2. Find the relevant `describe` block
3. Uncomment the imports and setup code
4. Implement the test cases marked with TODO
5. Remove TODO comments as tests are completed

### 2. Example: Implementing SessionManager

```typescript
// Before implementation:
// import { SessionManager } from '@/core/SessionManager';
describe('SessionManager', () => {
  // let sessionManager: SessionManager;

  it('should generate unique session ID', () => {
    // TODO: Implement when SessionManager is created
  });
});

// After implementation:
import { SessionManager } from '@/core/SessionManager';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  it('should generate unique session ID', () => {
    const session1 = sessionManager.startSession();
    const session2 = sessionManager.startSession();

    expect(session1.id).toBeDefined();
    expect(session2.id).toBeDefined();
    expect(session1.id).not.toBe(session2.id);
  });
});
```

### 3. Test-Driven Development (TDD)

For critical features, consider TDD approach:

1. Write the test first (uncomment and complete a TODO test)
2. Run the test (it should fail - feature not implemented yet)
3. Implement minimal code to make test pass
4. Refactor code while keeping tests green
5. Repeat for next test case

## Test Coverage Goals

### Target Coverage by Phase

- **Phase 1**: 85%+ coverage for SessionManager
- **Phase 2**: 80%+ coverage for analytics modules
- **Phase 3**: 75%+ coverage for engagement features

### Priority Test Categories

1. **Critical Path** (must have 95%+ coverage):
   - Session lifecycle (start/pause/end)
   - Data persistence
   - Achievement unlock logic

2. **Important** (must have 85%+ coverage):
   - Metrics calculation
   - Template management
   - Export functionality

3. **Nice to Have** (70%+ coverage):
   - Edge cases
   - UI integration
   - Performance tests

## Test Patterns

### Testing Async Operations

```typescript
it('should save session to storage', async () => {
  const session = await sessionManager.endSession();

  expect(session.status).toBe('completed');
  expect(mockStorage.saveSession).toHaveBeenCalledWith(session);
});
```

### Mocking Storage

```typescript
beforeEach(() => {
  vi.mock('@/storage/SessionStorage', () => ({
    saveSession: vi.fn().mockResolvedValue(true),
    loadSession: vi.fn().mockResolvedValue(mockSession),
  }));
});
```

### Testing Event Emissions

```typescript
it('should emit achievement-unlocked event', () => {
  const listener = vi.fn();
  achievementManager.on('achievement-unlocked', listener);

  achievementManager.checkAchievements();

  expect(listener).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'first-workout',
      name: 'First Workout',
    })
  );
});
```

### Testing Time-Based Logic

```typescript
it('should calculate correct streak', () => {
  vi.setSystemTime(new Date('2024-01-15'));

  const sessions = [
    { startedAt: '2024-01-13T10:00:00Z' },
    { startedAt: '2024-01-14T10:00:00Z' },
    { startedAt: '2024-01-15T10:00:00Z' },
  ];

  const streak = calculateStreak(sessions);

  expect(streak.current).toBe(3);
});
```

## Common Test Scenarios

### 1. Happy Path
Test normal, expected usage:
```typescript
it('should complete session successfully', () => {
  sessionManager.startSession();
  sessionManager.updateMetrics({ rounds: 5, punches: 250 });
  const session = sessionManager.endSession();

  expect(session.status).toBe('completed');
  expect(session.completedRounds).toBe(5);
});
```

### 2. Error Handling
Test invalid input and error states:
```typescript
it('should throw error if session already active', () => {
  sessionManager.startSession();

  expect(() => {
    sessionManager.startSession();
  }).toThrow('Session already active');
});
```

### 3. Edge Cases
Test boundary conditions:
```typescript
it('should handle zero-duration sessions', () => {
  sessionManager.startSession();
  const session = sessionManager.endSession();

  expect(session.duration).toBe(0);
  expect(session.intensity).toBe(0);
});
```

### 4. Integration
Test interaction between modules:
```typescript
it('should unlock achievement when session completes', () => {
  const session = sessionManager.endSession();

  const achievements = achievementManager.checkAchievements(session);

  expect(achievements).toContainEqual(
    expect.objectContaining({ id: 'first-workout' })
  );
});
```

## Debugging Tests

### Running Single Test
```bash
# Run single test by name
npm test -- -t "should generate unique session ID"

# Run single test file
npm test SessionManager.test.ts
```

### Verbose Output
```bash
# Show console.log output
npm test -- --reporter=verbose

# Show detailed error messages
npm test -- --reporter=verbose --bail
```

### Interactive Debugging
```bash
# Use Vitest UI
npm test -- --ui

# Debug specific test
npm test -- --inspect-brk -t "should calculate streak"
```

## Test Maintenance

### When to Update Tests

1. **Feature Changes**: Update tests when feature behavior changes
2. **Bug Fixes**: Add test case that reproduces bug, then fix
3. **Refactoring**: Tests should still pass after refactoring (if behavior unchanged)
4. **New Edge Cases**: Add tests for newly discovered edge cases

### Test Hygiene

- Keep tests focused (one assertion per test when possible)
- Use descriptive test names (should do X when Y)
- Clean up resources in afterEach
- Mock external dependencies
- Don't test implementation details, test behavior

## Test Data

### Mock Session Example
```typescript
const mockSession: WorkoutSession = {
  id: 'session_123',
  startedAt: '2024-01-15T10:00:00Z',
  endedAt: '2024-01-15T10:30:00Z',
  duration: 1800000, // 30 minutes
  activeDuration: 1680000, // 28 minutes
  pausedDuration: 120000, // 2 minutes
  completedRounds: 10,
  totalPunches: 500,
  avgPunchesPerRound: 50,
  intensity: 75,
  status: 'completed',
  comboTypeCounts: { basic: 8, advanced: 2 },
  combosUsed: ['jab-cross', 'hook-uppercut'],
};
```

### Creating Test Data Factories

```typescript
// testUtils.ts
export function createMockSession(overrides = {}) {
  return {
    id: `session_${Date.now()}`,
    startedAt: new Date().toISOString(),
    status: 'completed',
    completedRounds: 5,
    totalPunches: 250,
    // ... defaults
    ...overrides,
  };
}

// Usage in tests
const session = createMockSession({ totalPunches: 1000 });
```

## CI/CD Integration

Tests will run automatically on:
- Pull request creation
- Push to main branch
- Pre-commit hook (optional)

### GitHub Actions Example
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Test-Driven Development Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

## Questions?

If you're unsure how to test a specific feature:
1. Check existing test templates for similar patterns
2. Look at test examples in this README
3. Consult Vitest documentation
4. Ask for code review feedback

---

**Remember**: Tests are living documentation. Keep them clear, focused, and up-to-date.
