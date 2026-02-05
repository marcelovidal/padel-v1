# Release Notes - Stage H

## Version: v1.2.0-player-actions

### New Features

#### H1: Assessment from Dashboard
- **Pending Assessments Section**: Players can now see matches requiring their feedback directly on the dashboard.
- **Direct Action**: "Completar" button opens the assessment form inline (or via modal logic) to submit feedback immediately.
- **Stats Update**: Completing an assessment instantly updates player stats.

#### H2: Create Match (MVP)
- **New Page**: `/player/matches/new` for scheduling matches.
- **Functionality**:
    - Select Date, Time, and Club.
    - Choose Partner and Opponents from active player list.
    - **Server-Side Validation**: Prevents duplicate players in the same match.
    - **RLS Secured**: Players can only create matches where they are the owner, and insert players only into those matches.

### Technical Improvements

#### RLS & Security
- **Strict Policies**:
    - `matches`: `INSERT` allowed only if `created_by` matches authenticated user.
    - `match_players`: `INSERT` allowed only for matches created by the authenticated user.
- **Migration**: `20260204_stage_h_player_actions.sql` handles policy creation safely.

### How to Verify
1.  **Dashboard**: Check for "Evaluaciones Pendientes" alert (if applicable).
2.  **Create Match**:
    - Navigate to `/player/matches/new`.
    - Create a match.
    - Verify it appears in your match list.
    - Verify you cannot add the same player twice (form validation).
