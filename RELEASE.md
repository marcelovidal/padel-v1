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

#### Atomic Match Creation (RPC)
- **Problem**: Standard `INSERT` operations in Next.js Server Actions (SSR) often struggle with passing the correct authentication context to Row-Level Security (RLS) policies, especially when relying on `DEFAULT auth.uid()`.
- **Solution**: Implemented `public.player_create_match_with_players` as a **SECURITY DEFINER** function.
- **Benefits**:
    - **Atomicity**: Match creation and roster insertion (team A/B) happen in a single database transaction. 
    - **Security**: The function explicitly handles ownership via internally retrieved `auth.uid()`, bypassing SSR context inconsistencies.
    - **Reliability**: Resolves error `42501` (RLS) and `23503` (FK) errors definitively.

#### Data Model Corrections
- **FK Reference**: Fixed `matches.created_by` foreign key to correctly reference `auth.users(id)` instead of `public.profiles`.
- **RPC Hardening**: Used `public.match_status` enum types and strict `search_path` for the database function.

### SQL Migrations
- `20260205_stage_h_match_rpc.sql`: Atomic creation logic.
- `20260205_stage_h_fix_fk.sql`: Foreign key correction.
