# Game Winner Badges Implementation

## Summary
Successfully implemented two new badge types for game winners with tier-based progression (Bronze → Silver → Gold → Diamond).

## Changes Made

### 1. Schema Updates (`prisma/schema.prisma`)
Added two new badge types to the `BadgeType` enum:
- `game_clicker_winner` - For winning Egg Clicker games
- `game_roulette_winner` - For winning roulette games

```prisma
enum BadgeType {
  group_creation
  voting_participation
  voting_winner
  meal_creation
  consumption_tracking
  social_engagement
  game_clicker_winner   // NEW
  game_roulette_winner  // NEW
}
```

### 2. Badge Logic (`controllers/badgesLib.js`)
Added badge award logic for both game types in `checkAndAwardBadges()`:

```javascript
case 'game_clicker_won':
  // Awards badge when player wins an Egg Clicker game
  
case 'game_roulette_won':
  // Awards badge when player's meal is selected in roulette
```

### 3. Game Completion Logic (`controllers/gamesLib.js`)
Integrated badge awards at three game completion points:

1. **Automatic Clicker Completion** (when all players submit):
   ```javascript
   await BadgesLibrary.checkAndAwardBadges(winner.profileId, 'game_clicker_won');
   ```

2. **Force Complete Clicker** (host triggers early completion):
   ```javascript
   await BadgesLibrary.checkAndAwardBadges(winner.profileId, 'game_clicker_won');
   ```

3. **Roulette Completion** (host spins the wheel):
   ```javascript
   await BadgesLibrary.checkAndAwardBadges(winner.profileId, 'game_roulette_won');
   ```

### 4. Badge Definitions

#### Egg Master (Clicker Winner)
- **Name**: Egg Master
- **Description**: Won Egg Clicker games against other players
- **Type**: `game_clicker_winner`
- **Tiers**:
  - Bronze: 1 win
  - Silver: 10 wins
  - Gold: 50 wins
  - Diamond: 100 wins

#### Lucky Spinner (Roulette Winner)
- **Name**: Lucky Spinner
- **Description**: Your meal was chosen by the wheel of fortune in roulette games
- **Type**: `game_roulette_winner`
- **Tiers**:
  - Bronze: 1 win
  - Silver: 10 wins
  - Gold: 50 wins
  - Diamond: 100 wins

## Setup Instructions

### Step 1: Update Database Schema
Run this command to push the schema changes:
```bash
cd 2025-pitlane-back
npx prisma db push
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Insert Badges into Database
Run the provided script to add the badges:
```bash
node prisma/add_game_badges.js
```

This will:
- Create the "Egg Master" badge
- Create the "Lucky Spinner" badge  
- Add all 4 tier requirements (Bronze, Silver, Gold, Diamond) for each badge
- Display a summary of what was created

## How It Works

1. **Player wins a game**: The game completion logic determines the winner
2. **Badge system triggered**: `checkAndAwardBadges()` is called with winner's profile ID
3. **Badge lookup**: System finds the appropriate badge by type
4. **Award/Upgrade**: System either:
   - Awards the badge at Bronze level (first win)
   - Increments progress toward next tier
   - Upgrades badge to next tier when threshold reached
5. **Notification**: Returns badge notification data for frontend display

## Testing

To test the implementation:

1. Create a group
2. Start an Egg Clicker game
3. Complete the game (winner determined by click count)
4. Check the winner's badge collection - should see "Egg Master" badge
5. Repeat for roulette game - should see "Lucky Spinner" badge

## Files Created/Modified

- ✅ `prisma/schema.prisma` - Added new badge types
- ✅ `controllers/badgesLib.js` - Added badge award logic
- ✅ `controllers/gamesLib.js` - Added badge triggers on game completion
- ✅ `prisma/add_game_badges.js` - Script to insert badges
- ✅ `prisma/add_game_badges.sql` - SQL alternative (if preferred)

## Notes

- Badge progression is automatic - no manual intervention needed
- Badges track wins across all games of that type
- Multiple tiers encourage repeated gameplay
- System is extensible for future game types
