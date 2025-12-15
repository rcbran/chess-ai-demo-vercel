# Feature 3: Game Mode Toggle & Side Selection

## Overview

This feature adds the ability to switch between **Demo Mode** (current interactive learning mode) and **Play Mode** (chess gameplay). It includes UI components for mode selection and side selection, but does NOT implement actual gameplay yet - that comes in later features.

## Branch

**Branch:** `feature/game-mode-toggle`

## Dependencies

- ✅ Feature 1: Game State & Chess Engine (merged)
- ✅ Feature 2: Board Square Mapping (merged)

## Implementation Details

### 1. Add Game Mode State to App.tsx

**File:** `src/App.tsx`

Add new state variables:
- `gameMode: 'demo' | 'play'` - Current mode (default: 'demo')
- `playerColor: 'white' | 'black' | null` - Which side user plays (null until selected)

**State Management:**
- Initialize `gameMode` as `'demo'` (preserves current behavior)
- `playerColor` is `null` until user selects a side
- When `gameMode === 'play'`, disable piece info modal (demo mode only)
- When `gameMode === 'demo'`, ensure `playerColor` is `null`

**Functions to Add:**
- `handlePlayButtonClick()` - Sets `gameMode` to `'play'` and shows side selection modal
- `handleSideSelection(color: 'white' | 'black')` - Sets `playerColor` and closes side selection modal
- `handleExitToDemo()` - Resets to demo mode, clears `playerColor`

### 2. Create Play Button Component

**File:** `src/components/PlayButton.tsx`

**Props:**
```typescript
interface PlayButtonProps {
  onClick: () => void
  hidden?: boolean
}
```

**Design:**
- Similar styling to `AboutButton` (glassmorphism, top-right position)
- Icon: Chess piece icon or "Play" text
- Position: Top-left (opposite of About button) or center overlay
- Hidden when:
  - `gameMode === 'play'` (already in play mode)
  - `displayedPiece !== null` (piece info modal is open)
  - `isAboutOpen === true` (about modal is open)

**File:** `src/components/PlayButton.css`

- Match `AboutButton` styling (glassmorphism, blur, transitions)
- Hover effects, scale animations
- Responsive design

### 3. Create Side Selection Modal

**File:** `src/components/SideSelectionModal.tsx`

**Props:**
```typescript
interface SideSelectionModalProps {
  isOpen: boolean
  onSelect: (color: 'white' | 'black') => void
  onClose: () => void
}
```

**Design:**
- Full-screen or centered modal overlay
- Glassmorphism styling (match `AboutModal`)
- Two large buttons/cards:
  - "Play as White" - White chess piece icon/visual
  - "Play as Black" - Black chess piece icon/visual
- Close button (X) in top-right
- Escape key to close
- Click outside to close (optional)

**Visual Elements:**
- Chess piece icons or 3D previews for each side
- Brief description: "White moves first" / "Black moves second"
- Hover effects on selection buttons

**File:** `src/components/SideSelectionModal.css`

- Match `AboutModal` styling patterns
- Large, prominent selection buttons
- Smooth animations (fade in/out)
- Responsive design

### 4. Update TitleOverlay Component

**File:** `src/components/TitleOverlay.tsx`

**Changes:**
- Update subtitle text based on `gameMode`:
  - Demo mode: "Click any piece to learn its moves" (current)
  - Play mode: "Your turn" or "AI thinking..." (placeholder for now)
- Hide when `gameMode === 'play'` (or show different content)

**Alternative:** Keep TitleOverlay hidden in play mode, show game status in GameControls (Feature 8)

### 5. Conditional Rendering in App.tsx

**File:** `src/App.tsx`

**Updates:**
- Show `InfoPanel` when `gameMode === 'demo'`
- Allow piece clicks to open info panel in demo mode
- Show `PlayButton` when `gameMode === 'demo'`
- Show `SideSelectionModal` when `gameMode === 'play' && playerColor === null`
- Pass `gameMode` to `Scene` component (for future camera locking)

**Scene Component Props:**
```typescript
interface SceneProps {
  // ... existing props
  gameMode?: 'demo' | 'play'  // Optional for now, will be used in Feature 4
}
```

### 6. Preserve Demo Mode Functionality

**Requirements:**
- All existing demo mode features must continue to work:
  - Piece clicking opens info panel
  - Hover effects
  - Auto-rotation
  - About modal
- When switching back to demo mode:
  - Restore auto-rotation (if it was disabled)
  - Clear any game state (if initialized)
  - Reset camera (if it was locked)

## File Structure

```
src/
  components/
    PlayButton.tsx          # NEW - Play button overlay
    PlayButton.css          # NEW - Play button styles
    SideSelectionModal.tsx  # NEW - Side selection UI
    SideSelectionModal.css  # NEW - Side selection styles
    TitleOverlay.tsx        # MODIFY - Update for game mode
    Scene.tsx               # MODIFY - Accept gameMode prop (no logic yet)
  App.tsx                   # MODIFY - Add game mode state and components
```

## User Flow

```
1. User sees "Play" button (top-left or center)
2. User clicks "Play" button
   → gameMode = 'play'
   → SideSelectionModal opens
3. User selects "Play as White" or "Play as Black"
   → playerColor = selected color
   → SideSelectionModal closes
   → (Future: Camera locks, gameplay begins)
4. User clicks "Exit to Demo" (future: in GameControls)
   → gameMode = 'demo'
   → playerColor = null
   → Demo mode restored
```

## Testing Checklist

- [ ] Play button appears in demo mode
- [ ] Play button hidden when piece info modal is open
- [ ] Play button hidden when about modal is open
- [ ] Clicking Play button opens side selection modal
- [ ] Side selection modal can be closed with X button
- [ ] Side selection modal can be closed with Escape key
- [ ] Selecting a side closes modal and sets playerColor
- [ ] Demo mode functionality still works (piece clicking, hover, etc.)
- [ ] Switching back to demo mode restores all demo features
- [ ] No gameplay logic is triggered (that's Feature 5+)
- [ ] Responsive design works on mobile/tablet

## Implementation Steps

1. **Create PlayButton component**
   - Component file + CSS
   - Match AboutButton styling
   - Add to App.tsx with proper visibility logic

2. **Create SideSelectionModal component**
   - Component file + CSS
   - Two selection buttons (white/black)
   - Modal overlay with close functionality
   - Add to App.tsx

3. **Add game mode state to App.tsx**
   - Add `gameMode` and `playerColor` state
   - Add handler functions
   - Conditional rendering logic

4. **Update TitleOverlay (optional)**
   - Update text based on game mode
   - Or hide in play mode

5. **Update Scene component**
   - Add `gameMode` prop (no logic yet, just prop passing)
   - Will be used in Feature 4 for camera locking

6. **Test all scenarios**
   - Demo mode still works
   - Mode switching works
   - No gameplay logic triggered

## Design Notes

- **Consistency:** Match existing UI patterns (glassmorphism, blur effects, animations)
- **Accessibility:** Keyboard navigation, ARIA labels, focus management
- **Responsive:** Mobile-friendly modal and buttons
- **Visual Hierarchy:** Play button should be prominent but not intrusive

## Future Integration Points

This feature sets up the foundation for:
- **Feature 4:** Camera locking (uses `gameMode` and `playerColor`)
- **Feature 5:** Move selection (uses `gameMode` to determine click behavior)
- **Feature 8:** GameControls component (shows "Exit to Demo" button)

## Notes

- This feature is **UI-only** - no chess logic or gameplay yet
- Camera remains unlocked (Feature 4)
- Piece clicks still open info panel in demo mode
- No move validation or AI yet (Features 5-7)
