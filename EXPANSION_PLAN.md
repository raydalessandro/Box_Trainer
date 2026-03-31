# BoxTrainer — Expansion Roadmap

## Synthesis from Research Agents

**Current State**: Production-ready boxing timer PWA with:
- State machine timer (idle → work → rest → done)
- 6 punch combinations with Italian TTS
- Web Audio API bells + beeps
- Settings persistence (localStorage)
- StorageService (IndexedDB) with WorkoutSession schema
- Callback-driven architecture (onTick, onStateChange, onPunchDisplay, onComplete)

**Extension Points Identified**:
- TimerEngine callbacks (add listeners without modifying core)
- StorageService (add queries/indexes easily)
- WorkoutSession schema (extensible fields)
- Component overlay pattern (conditional render)
- AudioManager (add sound types via config toggles)

---

## PHASE 1: Session Tracking & History (1-2 weeks)

**Goal**: Create engagement loop via workout logging and progress visibility

### 1.1 Enhanced Session Tracking
**Implementation**:
- Add "Start Session" explicit button (optional pre-workout screen)
- Capture session metadata:
  ```typescript
  WorkoutSession {
    id, date, createdAt,           // existing
    completedRounds, totalDuration, punchesShown,  // existing
    config,                         // existing
    sessionName?: string,           // NEW: "Morning Heavy Bag"
    difficulty?: 1-5,               // NEW: user-rated difficulty
    notes?: string,                 // NEW: post-workout notes
    mood?: 'energized' | 'tired' | 'focused' | 'neutral',  // NEW
    tags?: string[]                 // NEW: ["cardio", "technique"]
  }
  ```
- Auto-save on workout completion (already implemented)
- Add optional post-workout quick log screen (difficulty rating + notes)

**Extension Points**:
- Use existing `onComplete` callback to trigger post-workout modal
- Extend WorkoutSession schema (no DB version bump needed if optional fields)
- Create new `PostWorkoutModal.tsx` component (follows overlay pattern)

**Complexity**: Low-Medium (2-3 days)

---

### 1.2 Workout History & Calendar View
**Implementation**:
- Create `HistoryView` component with dual tabs:
  - **Calendar heatmap**: Green dots on active days (like GitHub contributions)
  - **List view**: Sortable sessions (date desc, duration, rounds)
- Session detail modal on click:
  - Show config snapshot, duration, rounds, punches
  - Display notes, difficulty, mood
  - Edit/delete options
- Filter by date range, tags, difficulty
- Search by session name

**UI Pattern**:
- Bottom navigation: Timer → History → Stats → Settings
- Use existing conditional render pattern for view switching
- Calendar: simple grid with CSS (no heavy library needed)

**StorageService Extensions**:
```typescript
// Add query methods
getSessionsByDateRange(startDate, endDate): WorkoutSession[]
getSessionsByTag(tag: string): WorkoutSession[]
getSessionStats(timePeriod: 'week' | 'month' | 'year'): Stats
```

**Complexity**: Medium (3-4 days)

---

### 1.3 Basic Analytics Dashboard
**Implementation**:
- Create `StatsView` component with overview cards:
  - Total sessions this week/month
  - Total time trained (cumulative hours)
  - Total rounds completed
  - Current streak (consecutive days with session)
  - Average session duration
  - Favorite time of day (morning/afternoon/evening)
- Simple line chart: sessions per week (last 4 weeks)
- Card layout (no heavy charting library initially)

**Data Calculation**:
- Leverage existing `StorageService.getStats()` method
- Add streak calculation:
  ```typescript
  calculateStreak(): { current: number, longest: number }
  // Check for session gaps (if gap >1 day, reset streak)
  ```

**Complexity**: Low-Medium (2-3 days)

---

## PHASE 2: Workout Customization & Templates (2-3 weeks)

**Goal**: Reduce friction for repeat users, enable workout variety

### 2.1 Custom Workout Templates
**Implementation**:
- Create `TemplateManager` class (localStorage-based, like ConfigManager):
  ```typescript
  WorkoutTemplate {
    id: string,
    name: string,
    description?: string,
    config: WorkoutConfig,  // rounds, duration, rest, interval, audio
    tags?: string[],
    isFavorite: boolean,
    createdAt: number,
    lastUsed?: number
  }
  ```
- CRUD operations: create, read, update, delete, list
- Template library in SettingsModal or separate TemplateView:
  - Grid of template cards
  - Quick-load button (applies config to timer)
  - Star/pin favorites to top
  - Duplicate template (copy + edit)

**Pre-Built Templates**:
- Beginner: 3 rounds × 2min work, 1min rest, 5s interval
- HIIT: 6 rounds × 3min work, 30s rest, 3s interval
- Technique: 5 rounds × 4min work, 90s rest, 4s interval
- Endurance: 10 rounds × 3min work, 1min rest, 3s interval

**UX Pattern**:
- "Save as Template" button in SettingsModal
- Template browser: swipeable cards or list view
- Quick actions: Load, Edit, Delete, Duplicate

**Complexity**: Medium (3-4 days)

---

### 2.2 Custom Punch Combinations (Advanced)
**Implementation**:
- Extend `PUNCH_COMBOS` to accept user-defined combos
- Create `ComboManager` class:
  ```typescript
  CustomCombo {
    number: 7-12,  // extend beyond default 1-6
    name: string,  // "UPPERCUT COMBO"
    voiceText: string,  // "Montante destro, gancio sinistro"
    sequence: PunchType[],  // ["uppercut-right", "hook-left"]
  }
  ```
- ComboBuilder UI component:
  - Drag-and-drop punch builder
  - Voice preview (test TTS)
  - Save/load custom combos
- Store in localStorage via ComboManager
- Merge with PUNCH_COMBOS at runtime

**Complexity**: High (5-7 days) — deferred to Phase 3 if needed

---

## PHASE 3: Gamification & Engagement (1-2 weeks)

**Goal**: Drive habit formation via achievements and goals

### 3.1 Streaks & Achievements
**Implementation**:
- Track daily workout streak (consecutive days with ≥1 session)
- Achievement system:
  ```typescript
  Achievement {
    id: string,
    name: string,
    description: string,
    icon: string,  // emoji or SVG
    condition: (sessions: WorkoutSession[]) => boolean,
    unlockedAt?: number
  }
  ```
- Pre-built achievements:
  - "First Fight" (complete 1 session)
  - "Week Warrior" (7-day streak)
  - "Century Club" (100 rounds total)
  - "Iron Fist" (10 hours trained)
  - "Early Riser" (5 morning sessions)
- Achievement popup on unlock (overlay modal)
- Achievements tab in HistoryView

**Complexity**: Low-Medium (2-3 days)

---

### 3.2 Workout Goals
**Implementation**:
- Set weekly/monthly goals:
  ```typescript
  WorkoutGoal {
    id: string,
    type: 'sessions' | 'rounds' | 'duration',
    target: number,  // e.g., 5 sessions/week
    period: 'week' | 'month',
    progress: number,  // calculated from sessions
    startDate: number
  }
  ```
- Goal card on StatsView dashboard
- Progress bar (% toward goal)
- Goal completion celebration (overlay + achievement)
- Goal reminder notifications (future Phase 4)

**Complexity**: Low (1-2 days)

---

## PHASE 4: Sharing & Export (1 week)

**Goal**: Enable social proof and data portability

### 4.1 Export Workout Data
**Implementation**:
- Export session history as CSV:
  - Columns: Date, Duration, Rounds, Punches, Difficulty, Notes, Tags
  - Download via blob URL
- Export session as JSON (backup/restore)
- Import sessions from JSON (migration)

**Complexity**: Low (1 day)

---

### 4.2 Share Workout Achievements
**Implementation**:
- Generate shareable session card (HTML canvas → PNG):
  - Session date, duration, rounds, punches
  - "100 Rounds Completed 🥊" milestone graphic
  - "Trained with BoxTrainer" branding
- Share via Web Share API (mobile-friendly)
- Copy link to session detail (future: public session viewer)

**Complexity**: Medium (2-3 days)

---

## PHASE 5: Advanced Features (Future)

### 5.1 Notifications & Reminders
- Daily workout reminder (customizable time)
- Streak alerts ("You're on a 5-day streak!")
- Goal progress notifications

### 5.2 Video Recording Integration
- Record workout video during session (MediaRecorder API)
- Store blob reference in WorkoutSession
- Playback in session detail view

### 5.3 Wearable Integration
- Apple Watch / Android Wear sync
- Heart rate tracking
- Calories burned estimation

### 5.4 Social Leaderboards
- Compete with friends on sessions/week
- Global leaderboard (opt-in)
- Requires backend (Firebase, Supabase, or custom API)

---

## Implementation Priority

### Week 1-2 (Phase 1.1 + 1.2)
- Enhanced session tracking (difficulty, notes, tags)
- Post-workout modal
- History calendar + list view
- Session detail view

### Week 3-4 (Phase 1.3 + 2.1)
- Basic analytics dashboard
- Workout templates (CRUD + pre-built)
- Template browser UI

### Week 5-6 (Phase 3.1 + 3.2)
- Streaks calculation
- Achievements system
- Workout goals

### Week 7-8 (Phase 4)
- Export/import functionality
- Social sharing

---

## Technical Architecture Changes

### New Components
```
src/components/
  ├── PostWorkoutModal.tsx      # Difficulty + notes input
  ├── HistoryView.tsx            # Calendar + list tabs
  ├── SessionDetailModal.tsx     # Session info overlay
  ├── StatsView.tsx              # Analytics dashboard
  ├── TemplateView.tsx           # Template browser
  ├── TemplateCard.tsx           # Template list item
  ├── AchievementPopup.tsx       # Achievement unlock
  └── ShareCard.tsx              # Social sharing graphic
```

### New Core Classes
```
src/core/
  ├── TemplateManager.ts         # localStorage CRUD for templates
  ├── ComboManager.ts            # Custom punch combinations (Phase 2.2)
  └── AchievementEngine.ts       # Achievement logic + unlocks
```

### Storage Extensions
```
src/storage/
  └── StorageService.ts
      ├── getSessionsByDateRange()
      ├── getSessionsByTag()
      ├── calculateStreak()
      └── checkAchievements()
```

### Type Additions
```
src/core/types.ts
  ├── WorkoutSession (extended)
  ├── WorkoutTemplate
  ├── Achievement
  ├── WorkoutGoal
  └── CustomCombo
```

---

## Success Metrics

**Phase 1**:
- Users can view session history (calendar + list)
- Stats dashboard shows key metrics
- Session completion triggers auto-save + optional post-workout log

**Phase 2**:
- Users can save/load workout templates
- Pre-built templates reduce setup time
- Template library accessible from home screen

**Phase 3**:
- Streak tracking visible on dashboard
- Achievements unlock and display
- Goals show progress toward targets

**Phase 4**:
- Users can export session data as CSV
- Social sharing generates shareable graphics

---

## Next Steps

1. **Review & Approve Plan**: Ray confirms Phase 1 scope
2. **Start Phase 1.1**: Extend WorkoutSession schema + PostWorkoutModal
3. **Iterate**: Build → Test → Deploy each sub-phase
4. **User Feedback**: Adjust priorities based on usage patterns

---

**Prepared by**: Claude Opus 4.6 (Explore + Plan agents)
**Date**: 2026-03-31
**Status**: Ready for implementation
