# Database Current State - public.players

Detailed overview of the `public.players` table structure, indexing, and behavioral model as of Stage L (Feb 2026).

## 1. Table Schema: `public.players`

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | Primary Key. |
| `first_name` | `text` | NO | Player's first name. |
| `last_name` | `text` | NO | Player's last name. |
| `display_name` | `text` | NO | Publicly visible name. |
| `normalized_name` | `text` | NO | Lowercase `display_name` for search indexing. |
| `email` | `text` | YES | Optional contact email. |
| `phone` | `text` | YES | Optional phone. **Shielded by partial index.** |
| `user_id` | `uuid` | YES | Link to `auth.users`. NULL for unclaimed guests. |
| `is_guest` | `boolean` | NO | TRUE if profile is an guest (managed by creator). |
| `created_by` | `uuid` | NO | UUID of the user who created this record. |
| `position` | `player_position` | NO | Preferred side (drive, reves, cualquiera). |
| `category` | `text` | YES | Skill level or category. |
| `status` | `player_status` | NO | active/inactive (default 'active'). |
| `country_code` | `text` | NO | ISO 3166-1 alpha-2 (default 'AR'). |
| `region_code` | `text` | YES | Official Province ID (Georef). |
| `region_name` | `text` | YES | Official Province Name. |
| `city` | `text` | YES | City/Locality Name. |
| `city_id` | `text` | YES | Official City/Locality ID (Georef). |
| `city_normalized` | `text` | YES | Lowercase `city` for legacy fallback search. |
| `created_at` | `timestamptz` | NO | Creation timestamp. |
| `updated_at` | `timestamptz` | NO | Last update timestamp. |
| `deleted_at` | `timestamptz` | YES | Soft-delete timestamp. |

## 2. Behavioral Model

### Guest vs. Claimed Profiles
- **Guest Profiles (`is_guest = TRUE`, `user_id = NULL`)**: Created by a registered user to include friends/opponents in matches. Only the user identified in `created_by` can edit this profile.
- **Claimed Profiles (`user_id NOT NULL`)**: Profiles linked to an actual authenticated user. Only the owner (`auth.uid() = user_id`) can edit their own information. Even if it was originally a guest, once `user_id` is set, edited permissions shift to the owner.

### Location Management
- Supports official **Argentinian Geodata (Georef)**.
- Fields `region_code` and `city_id` store official IDs for prioritized relevance in player searches.
- `city_normalized` acts as a fallback for records created before the Georef integration.

## 3. Relevant Indexes

### Phone Shielding
- **`uq_players_phone_not_null`**: Unique index on `phone`.
  - `WHERE phone IS NOT NULL AND TRIM(phone) <> '' AND deleted_at IS NULL`
  - **Purpose**: Prevents collisions between guest profiles without phones (NULL) while maintaining uniqueness for real contact numbers.

### Location & Search
- **`idx_players_location_ids`**: `(country_code, region_code, city_id)` - Fast filtering by Georef data.
- **`idx_players_normalized_name`**: `(normalized_name)` - Fast lookups for public names.
- **`idx_players_display_name`**: `(display_name)` - Faster ILIKE queries.

### User Identity (Clean-up Recommended)
Currently, two indices likely exist for `user_id`:
1. `players_user_id_unique`: Global unique index (Original).
2. `uq_players_user_id`: Partial unique index (`WHERE deleted_at IS NULL`).

> [!WARNING]
> **Recommendation**: Conserve only **`uq_players_user_id`**. The global index prevents re-registration of a `user_id` if a previous record was soft-deleted. The partial index correctly supports soft-delete workflows.

## 4. Release Snapshot (Tag v1.3.0)

- [x] **Geodata Integration**: Official Province/Locality selection from Georef AR.
- [x] **Player Directory**: Searchable list of all players with location-weighted ranking.
- [x] **Profile Editing**: Secure editing for own profiles and created guests.
- [x] **Schema Robustness**: `phone` marked nullable and shielded by partial uniqueness.
- [x] **Search Relevance**: Multi-level scoring based on Geodata (City > Region > Country).
