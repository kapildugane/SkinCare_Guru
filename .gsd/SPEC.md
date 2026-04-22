# Specification: Phase 6 - Persistence & Personalization

**Status:** FINALIZED
**Version:** 1.0.0
**Date:** 2026-04-20

## Objective
Add user authentication, persistence for routines/consultations, and advanced personalization leveraging historical user data.

## Requirements

### 1. User Authentication
- Signup endpoint: email + password (stored as bcrypt hash)
- Login endpoint: returns JWT token for session
- Protect routine generation and history endpoints
- Guest mode: unauthenticated users can generate routines but not save them

### 2. Routine Storage
- Save generated routines linked to user accounts
- Store: user_profile (skin_type, concerns, age, experience), routine JSON (morning/evening), products, timestamp
- User can have max 10 saved routines (configurable)

### 3. Consultation History
- Save each consultation session (Q&A flow + final recommendation)
- Include: user_data snapshot, final_recommendation, timestamp
- View history endpoint: list past consultations with pagination
- View detail endpoint: get full consultation

### 4. Advanced Personalization
- On new consultation, check user's past patterns
- Boost scores for products that worked before (based on history if marked "helpful")
- Track implicitly: which products user asked about in follow-up

## Out of Scope
- OAuth providers (Google, Apple)
- Password reset flow
- Email verification

## Database Schema

### New Tables
```sql
-- users (id, email, password_hash, created_at, updated_at)
-- routines (id, user_id, user_profile_json, routine_json, products_json, created_at)
-- consultations (id, user_id, user_data_json, final_recommendation, created_at)
-- consultation_chat (id, consultation_id, role, message, created_at)
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|------------|
| POST | /api/auth/signup | No | Create account |
| POST | /api/auth/login | No | Login, returns JWT |
| GET | /api/routines | Yes | List saved routines |
| POST | /api/routines | Yes | Save current routine |
| DELETE | /api/routines/{id} | Yes | Delete routine |
| GET | /api/history | Yes | List consultations |
| GET | /api/history/{id} | Yes | Consultation detail |
| POST | /api/history/{id}/feedback | Yes | Mark helpful/not |

## Frontend Changes

- Login/Signup modal/page
- "Save Routine" button after generation
- "My Routines" page
- "History" page
- JWT stored in localStorage, sent in Authorization header

## Verification Criteria
- [ ] New user can signup and login
- [ ] Authenticated user can generate and save routine
- [ ] Unauthenticated user gets prompt to login when saving
- [ ] User can view their saved routines
- [ ] User can view consultation history
- [ ] Recommendations improve with history (products user engaged with boost score)

## GSD Protocol
- All changes commit with: `feat(auth): message` or `feat(persistence): message`
- STATE.md updated after each task
- No implementation until this spec is FINALIZED