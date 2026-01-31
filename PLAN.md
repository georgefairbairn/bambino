# Bambino - Baby Name Selection App

## Project Overview

A mobile app that helps users find suitable baby names through a swipe-based interface, with partner sync capabilities and historical popularity data.

**Tech Stack:**
- Expo SDK 54 + React Native 0.81
- Clerk authentication
- Convex backend
- NativeWind for styling

---

## Post-Phase Completion Workflow

After completing each phase, follow these steps:

1. **Create feature branch** - `git checkout -b feat/<feature-name>`
2. **Stage and commit changes** - Include all relevant files with conventional commit message
3. **Push and create PR** - `git push -u origin <branch>` then `gh pr create`
4. **Merge PR** - `gh pr merge --squash --delete-branch`
5. **Update PLAN.md** - Mark all phase tasks as Complete, update progress summary
6. **Update Notion tasks** - Set status to "Done" and add GitHub PR link

---

## Development Phases

### Phase 0: Clerk Authentication
| Priority | Task | Status |
|----------|------|--------|
| 1 | Install Clerk dependencies (@clerk/clerk-expo, expo-web-browser, expo-secure-store) | Complete |
| 2 | Configure EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY env variable | Complete |
| 3 | Create ClerkProvider wrapper in _layout.tsx | Complete |
| 4 | Create (auth) route group with _layout.tsx | Complete |
| 5 | Create sign-in screen with email/password | Complete |
| 6 | Create sign-up screen with email verification | Complete |
| 7 | Add Google SSO to sign-in | Complete |
| 8 | Create profile screen with sign-out | Complete |
| 9 | Add auth redirect logic (SignedIn/SignedOut) | Complete |
| 10 | Test authentication flow | Complete |

---

### Phase 1: Convex Setup & Integration
| Priority | Task | Status |
|----------|------|--------|
| 1 | Install Convex dependencies | Complete |
| 2 | Initialize Convex project | Complete |
| 3 | Configure Convex environment variables | Complete |
| 4 | Create Convex auth config for Clerk JWT | Complete |
| 5 | Add ConvexProviderWithClerk to app | Complete |
| 6 | Create users table schema | Complete |
| 7 | Create getCurrentUser query | Complete |
| 8 | Create createOrUpdateUser mutation | Complete |
| 9 | Test Clerk-Convex integration | Complete |

---

### Phase 2: Name Database
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create names table schema | Complete |
| 2 | Add indexes to names table | Complete |
| 3 | Source baby names dataset | Complete |
| 4 | Create name import script | Complete |
| 5 | Create seedNames mutation | Complete |
| 6 | Import names to Convex | Complete |
| 7 | Create getNameById query | Complete |
| 8 | Create searchNames query | Complete |
| 9 | Verify name data in Convex dashboard | Complete |

---

### Phase 3: Session System
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create sessions table schema | Not Started |
| 2 | Create sessionMembers table schema | Not Started |
| 3 | Create generateShareCode helper | Not Started |
| 4 | Create createSession mutation | Not Started |
| 5 | Create getUserSessions query | Not Started |
| 6 | Create getSessionById query | Not Started |
| 7 | Create updateSession mutation | Not Started |
| 8 | Create deleteSession mutation | Not Started |
| 9 | Auto-create default session on first login | Not Started |

---

### Phase 4: Swipe Selection Backend
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create selections table schema | Not Started |
| 2 | Add indexes to selections table | Not Started |
| 3 | Create getSwipeQueue query | Not Started |
| 4 | Apply filters in swipe queue | Not Started |
| 5 | Create recordSelection mutation | Not Started |
| 6 | Create undoLastSelection mutation | Not Started |
| 7 | Create getSelectionStats query | Not Started |
| 8 | Test selection persistence | Not Started |

---

### Phase 5: Swipe Card UI
| Priority | Task | Status |
|----------|------|--------|
| 1 | Install gesture handler dependencies | Not Started |
| 2 | Create SwipeCard component | Not Started |
| 3 | Add name display to card | Not Started |
| 4 | Add swipe gesture detection | Not Started |
| 5 | Add swipe animation | Not Started |
| 6 | Create swipe action buttons | Not Started |
| 7 | Add haptic feedback on swipe | Not Started |
| 8 | Create card stack component | Not Started |
| 9 | Add undo button | Not Started |
| 10 | Add empty state UI | Not Started |

---

### Phase 6: Main Swipe Screen
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create swipe screen layout | Not Started |
| 2 | Connect swipe queue query | Not Started |
| 3 | Wire up swipe to mutation | Not Started |
| 4 | Add loading state | Not Started |
| 5 | Add error handling | Not Started |
| 6 | Show progress indicator | Not Started |
| 7 | Add session name header | Not Started |
| 8 | Test end-to-end swipe flow | Not Started |

---

### Phase 7: Session Management UI
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create session list screen | Not Started |
| 2 | Display user's sessions | Not Started |
| 3 | Add create session button | Not Started |
| 4 | Create new session modal | Not Started |
| 5 | Add session card component | Not Started |
| 6 | Add switch session action | Not Started |
| 7 | Add session menu (edit/delete) | Not Started |
| 8 | Add session to tab navigation | Not Started |

---

### Phase 8: Filter System
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create filter settings screen | Not Started |
| 2 | Add gender filter toggle | Not Started |
| 3 | Add name length slider | Not Started |
| 4 | Add starting letter picker | Not Started |
| 5 | Create updateSessionFilters mutation | Not Started |
| 6 | Apply filters in swipe queue | Not Started |
| 7 | Show active filters badge | Not Started |
| 8 | Add reset filters button | Not Started |

---

### Phase 9: Admin Dashboard - Liked Names
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create dashboard screen | Not Started |
| 2 | Create liked names tab | Not Started |
| 3 | Create getLikedNames query | Not Started |
| 4 | Add liked name list item | Not Started |
| 5 | Add remove from liked action | Not Started |
| 6 | Add search/filter in liked list | Not Started |
| 7 | Add sort options | Not Started |
| 8 | Show liked count in header | Not Started |

---

### Phase 10: Admin Dashboard - Rejected Names
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create rejected names tab | Not Started |
| 2 | Create getRejectedNames query | Not Started |
| 3 | Add restore to queue action | Not Started |
| 4 | Add hide permanently option | Not Started |
| 5 | Add search in rejected list | Not Started |
| 6 | Show rejected count | Not Started |

---

### Phase 11: Name Detail View
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create name detail modal | Not Started |
| 2 | Display full name info | Not Started |
| 3 | Show gender badge | Not Started |
| 4 | Show origin tags | Not Started |
| 5 | Add quick action buttons | Not Started |
| 6 | Add view on swipe card preview | Not Started |
| 7 | Link from dashboard lists | Not Started |

---

### Phase 12: Popularity Data Backend
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create namePopularity table | Not Started |
| 2 | Source historical popularity data | Not Started |
| 3 | Create popularity import script | Not Started |
| 4 | Import popularity data | Not Started |
| 5 | Create getNamePopularity query | Not Started |
| 6 | Create getPopularNamesForYear query | Not Started |
| 7 | Add current rank to names table | Not Started |

---

### Phase 13: Popularity Charts UI
| Priority | Task | Status |
|----------|------|--------|
| 1 | Install charting library | Not Started |
| 2 | Create popularity chart component | Not Started |
| 3 | Add chart to name detail | Not Started |
| 4 | Add mini chart to swipe card | Not Started |
| 5 | Show current rank badge | Not Started |
| 6 | Add year selector on chart | Not Started |
| 7 | Handle missing data gracefully | Not Started |

---

### Phase 14: Partner Sync - Share Code
| Priority | Task | Status |
|----------|------|--------|
| 1 | Verify shareCode in session schema | Not Started |
| 2 | Create share code display screen | Not Started |
| 3 | Add copy code button | Not Started |
| 4 | Add share button | Not Started |
| 5 | Create joinSessionByCode mutation | Not Started |
| 6 | Create join session screen | Not Started |
| 7 | Add code validation | Not Started |
| 8 | Show success/error feedback | Not Started |
| 9 | Add partner to session members | Not Started |

---

### Phase 15: Partner Sync - Match Detection
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create matches table schema | Not Started |
| 2 | Create checkForMatch function | Not Started |
| 3 | Create match on mutual like | Not Started |
| 4 | Create getMatches query | Not Started |
| 5 | Add match notification trigger | Not Started |
| 6 | Create match celebration modal | Not Started |
| 7 | Add match sound/haptic | Not Started |

---

### Phase 16: Matches View
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create matches list screen | Not Started |
| 2 | Display matched names | Not Started |
| 3 | Add star/favorite match | Not Started |
| 4 | Add notes to match | Not Started |
| 5 | Add manual ranking | Not Started |
| 6 | Create updateMatch mutation | Not Started |
| 7 | Show match count badge | Not Started |
| 8 | Add share matches feature | Not Started |

---

### Phase 17: Final Selection & Polish
| Priority | Task | Status |
|----------|------|--------|
| 1 | Add choose this name action | Not Started |
| 2 | Create chosen name display | Not Started |
| 3 | Add archive session option | Not Started |
| 4 | Create onboarding flow | Not Started |
| 5 | Add swipe tutorial | Not Started |
| 6 | Add push notifications setup | Not Started |
| 7 | Add new match notification | Not Started |
| 8 | Add app icon and splash screen | Not Started |
| 9 | Performance optimization | Not Started |
| 10 | Error boundary setup | Not Started |

---

## Convex Schema

```typescript
// convex/schema.ts

users           // Clerk user profiles
sessions        // Baby naming sessions with filters
sessionMembers  // User-session junction (owner/partner)
names           // Master name database
namePopularity  // Historical popularity by year
selections      // User swipe decisions per session
matches         // Mutual likes between partners
```

---

## Key Files

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Add ConvexProviderWithClerk wrapper |
| `app/index.tsx` | Main swipe interface |
| `convex/schema.ts` | Define all tables |
| `convex/users.ts` | User queries/mutations |
| `convex/sessions.ts` | Session queries/mutations |
| `convex/names.ts` | Name queries/mutations |
| `convex/selections.ts` | Selection queries/mutations |
| `convex/matches.ts` | Match queries/mutations |
| `components/swipe-card.tsx` | Swipe card component |

---

## Environment Variables

```bash
# .env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  # Configured
EXPO_PUBLIC_CONVEX_URL=https://sincere-greyhound-838.convex.cloud  # Configured

# Convex Dashboard
CLERK_JWT_ISSUER_DOMAIN=https://assured-lobster-9.clerk.accounts.dev  # Configured
```

---

## Verification Checkpoints

### After Phase 6 (Core MVP)
- [ ] Sign in with Clerk
- [ ] See swipe cards with names
- [ ] Swipe to like/reject/skip
- [ ] Reload app - selections persist
- [ ] Sign in on another device - data syncs

### After Phase 16 (Partner Sync)
- [ ] Create session, get share code
- [ ] Partner joins with code
- [ ] Both like same name
- [ ] Match appears for both users in real-time

---

## Progress Summary

| Phase | Name | Tasks | Completed |
|-------|------|-------|-----------|
| 0 | Clerk Authentication | 10 | 10 |
| 1 | Convex Setup | 9 | 9 |
| 2 | Name Database | 9 | 9 |
| 3 | Session System | 9 | 0 |
| 4 | Swipe Backend | 8 | 0 |
| 5 | Swipe Card UI | 10 | 0 |
| 6 | Main Swipe Screen | 8 | 0 |
| 7 | Session Management | 8 | 0 |
| 8 | Filter System | 8 | 0 |
| 9 | Dashboard Liked | 8 | 0 |
| 10 | Dashboard Rejected | 6 | 0 |
| 11 | Name Detail | 7 | 0 |
| 12 | Popularity Backend | 7 | 0 |
| 13 | Popularity Charts | 7 | 0 |
| 14 | Share Code | 9 | 0 |
| 15 | Match Detection | 7 | 0 |
| 16 | Matches View | 8 | 0 |
| 17 | Polish & Launch | 10 | 0 |
| **Total** | | **138** | **28** |
