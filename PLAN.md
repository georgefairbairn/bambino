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
| 1 | Create sessions table schema | Complete |
| 2 | Create sessionMembers table schema | Complete |
| 3 | Create generateShareCode helper | Complete |
| 4 | Create createSession mutation | Complete |
| 5 | Create getUserSessions query | Complete |
| 6 | Create getSessionById query | Complete |
| 7 | Create updateSession mutation | Complete |
| 8 | Create deleteSession mutation | Complete |
| 9 | Auto-create default session on first login | Complete |

---

### Phase 4: Swipe Selection Backend
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create selections table schema | Complete |
| 2 | Add indexes to selections table | Complete |
| 3 | Create getSwipeQueue query | Complete |
| 4 | Apply filters in swipe queue | Complete |
| 5 | Create recordSelection mutation | Complete |
| 6 | Create undoLastSelection mutation | Complete |
| 7 | Create getSelectionStats query | Complete |
| 8 | Test selection persistence | Complete |

---

### Phase 5: Swipe Card UI
| Priority | Task | Status |
|----------|------|--------|
| 1 | Install gesture handler dependencies | Complete |
| 2 | Create SwipeCard component | Complete |
| 3 | Add name display to card | Complete |
| 4 | Add swipe gesture detection | Complete |
| 5 | Add swipe animation | Complete |
| 6 | Create swipe action buttons | Complete |
| 7 | Add haptic feedback on swipe | Complete |
| 8 | Create card stack component | Complete |
| 9 | Add undo button | Complete |
| 10 | Add empty state UI | Complete |

---

### Phase 6: Main Swipe Screen
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create swipe screen layout | Complete |
| 2 | Connect swipe queue query | Complete |
| 3 | Wire up swipe to mutation | Complete |
| 4 | Add loading state | Complete |
| 5 | Add error handling | Complete |
| 6 | Show progress indicator | Complete |
| 7 | Add session name header | Complete |
| 8 | Test end-to-end swipe flow | Complete |

---

### Phase 7: Session Management UI
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create session list screen | Complete |
| 2 | Display user's sessions | Complete |
| 3 | Add create session button | Complete |
| 4 | Create new session modal | Complete |
| 5 | Add session card component | Complete |
| 6 | Add switch session action | Complete |
| 7 | Add session menu (edit/delete) | Complete |
| 8 | Add session to tab navigation | Complete |

---

### Phase 8: Filter System
| Priority | Task | Status |
|----------|------|--------|
| 1 | Add origin filter to session form modal | Complete |
| 2 | Create OriginPicker multi-select component | Complete |
| 3 | Add originFilter field to sessions schema | Complete |
| 4 | Create getAvailableOrigins query | Complete |
| 5 | Apply origin filter in getSwipeQueue | Complete |
| 6 | Reset swipe queue when filters change | Complete |

---

### Phase 9: Admin Dashboard - Liked Names
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create dashboard screen | Complete |
| 2 | Create liked names tab | Complete |
| 3 | Create getLikedNames query | Complete |
| 4 | Add liked name list item | Complete |
| 5 | Add remove from liked action | Complete |
| 6 | Add search/filter in liked list | Complete |
| 7 | Add sort options | Complete |
| 8 | Show liked count in header | Complete |

---

### Phase 10: Admin Dashboard - Rejected Names
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create rejected names tab | Complete |
| 2 | Create getRejectedNames query | Complete |
| 3 | Add restore to queue action | Complete |
| 4 | Add hide permanently option | Complete |
| 5 | Add search in rejected list | Complete |
| 6 | Show rejected count | Complete |

---

### Phase 11: Name Detail View
| Priority | Task | Status |
|----------|------|--------|
| 1 | Create name detail modal | Complete |
| 2 | Display full name info | Complete |
| 3 | Show gender badge | Complete |
| 4 | Show origin tags | Complete |
| 5 | Add quick action buttons | Complete |
| 6 | Link from dashboard lists | Complete |

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
- [x] Sign in with Clerk
- [x] See swipe cards with names
- [x] Swipe to like/reject/skip
- [x] Reload app - selections persist
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
| 3 | Session System | 9 | 9 |
| 4 | Swipe Backend | 8 | 8 |
| 5 | Swipe Card UI | 10 | 10 |
| 6 | Main Swipe Screen | 8 | 8 |
| 7 | Session Management | 8 | 8 |
| 8 | Filter System | 6 | 6 |
| 9 | Dashboard Liked | 8 | 8 |
| 10 | Dashboard Rejected | 6 | 6 |
| 11 | Name Detail | 6 | 6 |
| 12 | Popularity Backend | 7 | 0 |
| 13 | Popularity Charts | 7 | 0 |
| 14 | Share Code | 9 | 0 |
| 15 | Match Detection | 7 | 0 |
| 16 | Matches View | 8 | 0 |
| 17 | Polish & Launch | 10 | 0 |
| **Total** | | **135** | **97** |
