import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { Id } from './_generated/dataModel';

// All admin utilities are internal functions.
// Run via: npx convex run admin:<functionName> '{"arg": "value"}'

export const getUser = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };

    const partnerName = user.partnerId
      ? (await ctx.db.get(user.partnerId))?.name ?? null
      : null;

    const selectionCounts = {
      likes: (
        await ctx.db
          .query('selections')
          .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'like'))
          .collect()
      ).length,
      rejects: (
        await ctx.db
          .query('selections')
          .withIndex('by_user_type', (q) =>
            q.eq('userId', user._id).eq('selectionType', 'reject'),
          )
          .collect()
      ).length,
    };

    return { ...user, partnerName, selectionCounts };
  },
});

export const resetUserToFree = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };

    await ctx.db.patch(user._id, {
      isPremium: undefined,
      purchasedAt: undefined,
      premiumRevokedAt: undefined,
      partnerId: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, userId: user._id };
  },
});

export const grantPremium = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };

    await ctx.db.patch(user._id, {
      isPremium: true,
      purchasedAt: Date.now(),
      premiumRevokedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, userId: user._id };
  },
});

export const simulateGracePeriod = internalMutation({
  args: {
    email: v.string(),
    hoursRemaining: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };

    const hours = args.hoursRemaining ?? 12;
    const gracePeriodMs = 24 * 60 * 60 * 1000;
    const revokedAt = Date.now() - (gracePeriodMs - hours * 60 * 60 * 1000);

    await ctx.db.patch(user._id, {
      isPremium: undefined,
      purchasedAt: undefined,
      premiumRevokedAt: revokedAt,
      partnerId: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, expiresIn: `${hours}h` };
  },
});

export const clearSelections = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };

    const selections = await ctx.db
      .query('selections')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    for (const sel of selections) {
      await ctx.db.delete(sel._id);
    }

    const matches = [
      ...(await ctx.db
        .query('matches')
        .withIndex('by_user1', (q) => q.eq('user1Id', user._id))
        .collect()),
      ...(await ctx.db
        .query('matches')
        .withIndex('by_user2', (q) => q.eq('user2Id', user._id))
        .collect()),
    ];

    for (const match of matches) {
      await ctx.db.delete(match._id);
    }

    return { success: true, deletedSelections: selections.length, deletedMatches: matches.length };
  },
});

export const linkUsers = internalMutation({
  args: { email1: v.string(), email2: v.string() },
  handler: async (ctx, args) => {
    const user1 = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email1))
      .unique();
    const user2 = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email2))
      .unique();

    if (!user1) return { error: `User not found: ${args.email1}` };
    if (!user2) return { error: `User not found: ${args.email2}` };

    const now = Date.now();
    await ctx.db.patch(user1._id, { partnerId: user2._id, updatedAt: now });
    await ctx.db.patch(user2._id, { partnerId: user1._id, updatedAt: now });

    return { success: true };
  },
});

// Audits the names table — counts total, with-rank, without-rank, plus a
// sample of 10 orphan names (names whose direct gender has zero popularity
// records). Paginated so it doesn't blow Convex's 32k document read limit.
//
// Run repeatedly with the returned `continueCursor` until isDone=true:
//   npx convex run admin:auditNamesPage --prod '{}'
//   npx convex run admin:auditNamesPage --prod '{"cursor":"<value>"}'
// Each page processes 1000 names. The script wrapper accumulates totals.
export const auditNamesPage = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pageSize = args.pageSize ?? 1000;
    const result = await ctx.db
      .query('names')
      .paginate({ numItems: pageSize, cursor: (args.cursor as string | null) ?? null });

    let withRank = 0;
    let withoutRank = 0;
    const orphanSamples: { name: string; gender: string }[] = [];

    for (const n of result.page) {
      if (n.currentRank !== undefined && n.currentRank !== null) {
        withRank++;
      } else {
        withoutRank++;
      }

      if (orphanSamples.length < 10) {
        // Use the indexed lookup to check for any popularity record (M or F).
        // Cheap: at most 2 indexed reads per name in the sample.
        const ssaGender = n.gender === 'male' ? 'M' : n.gender === 'female' ? 'F' : null;
        let hasAny = false;
        if (ssaGender) {
          const hit = await ctx.db
            .query('namePopularity')
            .withIndex('by_name_gender', (q) => q.eq('name', n.name).eq('gender', ssaGender))
            .first();
          hasAny = hit !== null;
        } else {
          const m = await ctx.db
            .query('namePopularity')
            .withIndex('by_name_gender', (q) => q.eq('name', n.name).eq('gender', 'M'))
            .first();
          const f = await ctx.db
            .query('namePopularity')
            .withIndex('by_name_gender', (q) => q.eq('name', n.name).eq('gender', 'F'))
            .first();
          hasAny = m !== null || f !== null;
        }

        if (!hasAny) {
          orphanSamples.push({ name: n.name, gender: n.gender });
        }
      }
    }

    return {
      processed: result.page.length,
      withRank,
      withoutRank,
      orphanSamples,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

// Returns popularity-table coverage stats by checking the index across
// representative years (1900, 1925, 1950, 1975, 2000, 2023). For each year,
// counts how many distinct names have at least one record (sampled via take).
// This avoids a full table scan; gives a rough but actionable picture.
export const auditPopularityYears = internalQuery({
  args: {},
  handler: async (ctx) => {
    const sampleYears = [1900, 1925, 1950, 1975, 2000, 2010, 2020, 2023];
    const perYear: { year: number; recordsTaken: number; topRank: number; bottomRank: number }[] =
      [];

    for (const year of sampleYears) {
      const records = await ctx.db
        .query('namePopularity')
        .withIndex('by_year_gender', (q) => q.eq('year', year))
        .take(20000);

      if (records.length === 0) {
        perYear.push({ year, recordsTaken: 0, topRank: 0, bottomRank: 0 });
        continue;
      }

      const ranks = records.map((r) => r.rank).sort((a, b) => a - b);
      perYear.push({
        year,
        recordsTaken: records.length,
        topRank: ranks[0],
        bottomRank: ranks[ranks.length - 1],
      });
    }

    return { perYear };
  },
});

// Seeds two demo accounts with partner link + matches + a pending proposal so
// App Review sees a fully-populated app. Idempotent: running twice will not
// double-seed or create duplicate selections.
export const seedAppReviewDemo = internalMutation({
  args: {
    reviewerEmail: v.string(),
    partnerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const reviewer = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.reviewerEmail))
      .unique();
    const partner = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.partnerEmail))
      .unique();

    if (!reviewer) return { error: `Reviewer not found: ${args.reviewerEmail}` };
    if (!partner) return { error: `Partner not found: ${args.partnerEmail}` };

    const now = Date.now();

    // 1. Link as partners, set display names, and grant premium so the
    //    reviewer can access Matches and unlimited swipes without
    //    going through IAP. (Premium on either side is shared with the
    //    partner via getEffectivePremiumStatus.)
    await ctx.db.patch(reviewer._id, {
      partnerId: partner._id,
      name: 'Sam',
      nameConfirmed: true,
      isPremium: true,
      purchasedAt: now,
      premiumRevokedAt: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(partner._id, {
      partnerId: reviewer._id,
      name: 'Alex',
      nameConfirmed: true,
      isPremium: true,
      purchasedAt: now,
      premiumRevokedAt: undefined,
      updatedAt: now,
    });

    // 2. Pick popular names from the seeded names table.
    // Mutual likes (both like → match): 8 names
    // Reviewer-only likes: 12 names (no match)
    // Partner-only likes: 12 names (no match)
    // Reviewer rejects: 8 names
    const mutualLikeNames = [
      'Olivia',
      'Emma',
      'Liam',
      'Noah',
      'Charlotte',
      'Sophia',
      'Mia',
      'Lucas',
    ];
    const reviewerOnlyLikes = [
      'Ava',
      'Isabella',
      'Amelia',
      'Harper',
      'Evelyn',
      'Abigail',
      'Emily',
      'Elizabeth',
      'Mila',
      'Ella',
      'Avery',
      'Sofia',
    ];
    const partnerOnlyLikes = [
      'Benjamin',
      'Henry',
      'Alexander',
      'William',
      'James',
      'Mason',
      'Ethan',
      'Logan',
      'Aiden',
      'Daniel',
      'Owen',
      'Samuel',
    ];
    const reviewerRejects = [
      'Aaron',
      'Adam',
      'Adrian',
      'Aidan',
      'Andrew',
      'Anthony',
      'Brandon',
      'Caleb',
    ];

    async function findName(name: string) {
      return ctx.db
        .query('names')
        .withIndex('by_name', (q) => q.eq('name', name))
        .first();
    }

    async function upsertSelection(
      userId: Id<'users'>,
      nameId: Id<'names'>,
      selectionType: 'like' | 'reject',
    ) {
      const existing = await ctx.db
        .query('selections')
        .withIndex('by_user_name', (q) => q.eq('userId', userId).eq('nameId', nameId))
        .unique();

      if (existing) {
        if (existing.selectionType === selectionType) return;
        await ctx.db.patch(existing._id, { selectionType, updatedAt: Date.now() });
        return;
      }

      const nameDoc = await ctx.db.get(nameId);
      const ts = Date.now();
      await ctx.db.insert('selections', {
        userId,
        nameId,
        selectionType,
        origin: nameDoc?.origin,
        gender: nameDoc?.gender,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    let foundMutual = 0;
    let foundReviewerOnly = 0;
    let foundPartnerOnly = 0;
    let foundRejects = 0;
    let matchesCreated = 0;

    for (const n of mutualLikeNames) {
      const name = await findName(n);
      if (!name) continue;
      foundMutual++;
      await upsertSelection(reviewer._id, name._id, 'like');
      await upsertSelection(partner._id, name._id, 'like');
    }

    for (const n of reviewerOnlyLikes) {
      const name = await findName(n);
      if (!name) continue;
      foundReviewerOnly++;
      await upsertSelection(reviewer._id, name._id, 'like');
    }

    for (const n of partnerOnlyLikes) {
      const name = await findName(n);
      if (!name) continue;
      foundPartnerOnly++;
      await upsertSelection(partner._id, name._id, 'like');
    }

    for (const n of reviewerRejects) {
      const name = await findName(n);
      if (!name) continue;
      foundRejects++;
      await upsertSelection(reviewer._id, name._id, 'reject');
    }

    // 3. Create matches for the mutual likes (canonical user ordering)
    const [u1, u2] =
      reviewer._id < partner._id ? [reviewer._id, partner._id] : [partner._id, reviewer._id];

    for (const n of mutualLikeNames) {
      const name = await findName(n);
      if (!name) continue;

      const existing = await ctx.db
        .query('matches')
        .withIndex('by_name_users', (q) =>
          q.eq('nameId', name._id).eq('user1Id', u1).eq('user2Id', u2),
        )
        .unique();
      if (existing) continue;

      const ts = Date.now();
      await ctx.db.insert('matches', {
        nameId: name._id,
        user1Id: u1,
        user2Id: u2,
        matchedAt: ts,
        createdAt: ts,
        updatedAt: ts,
      });
      matchesCreated++;
    }

    // 4. Mark first two matches as favorites with notes (visual variety)
    const allMatches = await ctx.db
      .query('matches')
      .withIndex('by_user1_user2', (q) => q.eq('user1Id', u1).eq('user2Id', u2))
      .collect();

    const sortedMatches = allMatches.sort((a, b) => a.matchedAt - b.matchedAt);
    if (sortedMatches[0]) {
      await ctx.db.patch(sortedMatches[0]._id, {
        isFavorite: true,
        notes: 'Love this one — strong and classic.',
        rank: 1,
        updatedAt: Date.now(),
      });
    }
    if (sortedMatches[1]) {
      await ctx.db.patch(sortedMatches[1]._id, {
        isFavorite: true,
        rank: 2,
        updatedAt: Date.now(),
      });
    }

    // 5. Create a pending proposal from partner → reviewer on the third match
    if (sortedMatches[2]) {
      const proposalTarget = sortedMatches[2];
      // Only set if not already proposed (idempotent)
      if (!proposalTarget.proposedBy) {
        await ctx.db.patch(proposalTarget._id, {
          proposedBy: partner._id,
          proposedAt: Date.now(),
          proposalMessage: 'What do you think about this one?',
          proposalStatus: 'pending',
          updatedAt: Date.now(),
        });
      }
    }

    return {
      success: true,
      reviewer: { id: reviewer._id, email: reviewer.email, name: reviewer.name },
      partner: { id: partner._id, email: partner.email, name: partner.name },
      counts: {
        mutualLikes: foundMutual,
        reviewerOnlyLikes: foundReviewerOnly,
        partnerOnlyLikes: foundPartnerOnly,
        reviewerRejects: foundRejects,
        matchesCreated,
        totalMatches: sortedMatches.length,
      },
    };
  },
});

export const unlinkUsers = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };
    if (!user.partnerId) return { error: 'User has no partner' };

    const partner = await ctx.db.get(user.partnerId);
    const now = Date.now();

    await ctx.db.patch(user._id, { partnerId: undefined, updatedAt: now });
    if (partner) {
      await ctx.db.patch(partner._id, { partnerId: undefined, updatedAt: now });
    }

    return { success: true };
  },
});
