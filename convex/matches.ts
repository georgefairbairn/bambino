import { v } from 'convex/values';
import { mutation, query, QueryCtx, MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { Doc, Id } from './_generated/dataModel';

async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }

  // #164: tolerant read — a stray duplicate clerkId row shouldn't throw and
  // break match screens. createOrUpdateUser self-heals duplicates.
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // #164: tolerant read — see getCurrentUserOrThrow.
  return await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .first();
}

/**
 * Defense in depth (#159): every match-write mutation must confirm both
 *   1. the caller is one of the two users on the match, AND
 *   2. the OTHER user on the match is the caller's CURRENT partner.
 *
 * Without (2), an ex-partner can keep editing notes / proposing / etc on
 * stale match rows after an unlink (orphan rows from data corruption,
 * a missed delete in unlinkPartner, or the brief window during the
 * unlink itself). Cheap to enforce, hardens the system.
 */
function getOtherUserId(match: Doc<'matches'>, userId: Id<'users'>): Id<'users'> {
  return match.user1Id === userId ? match.user2Id : match.user1Id;
}

function assertCurrentPartner(user: Doc<'users'>, match: Doc<'matches'>) {
  if (match.user1Id !== user._id && match.user2Id !== user._id) {
    throw new Error('Not authorized to update this match');
  }
  const otherId = getOtherUserId(match, user._id);
  if (user.partnerId !== otherId) {
    throw new Error('This match is from a previous partnership');
  }
}

async function getPartnershipMatches(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  partnerId: Id<'users'>,
) {
  // Canonical ordering (user1Id < user2Id) is enforced at match creation
  const [u1, u2] = userId < partnerId ? [userId, partnerId] : [partnerId, userId];

  return await ctx.db
    .query('matches')
    .withIndex('by_user1_user2', (q) => q.eq('user1Id', u1).eq('user2Id', u2))
    .collect();
}

export const getMatches = query({
  args: {
    sortBy: v.optional(
      v.union(
        v.literal('newest'),
        v.literal('oldest'),
        v.literal('name_asc'),
        v.literal('name_desc'),
        v.literal('rank'),
      ),
    ),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    if (!user.partnerId) {
      return [];
    }

    const matches = await getPartnershipMatches(ctx, user._id, user.partnerId);

    // Batch load all name documents
    const uniqueNameIds = [...new Set(matches.map((m) => m.nameId))];
    const nameDocsArray = await Promise.all(uniqueNameIds.map((id) => ctx.db.get(id)));
    const nameMap = new Map(uniqueNameIds.map((id, i) => [id, nameDocsArray[i]]));

    const matchesWithDetails = matches.map((match) => ({
      ...match,
      name: nameMap.get(match.nameId) ?? null,
    }));

    let results = matchesWithDetails.filter(
      (m): m is typeof m & { name: NonNullable<typeof m.name> } => m.name !== null,
    );

    // Filter by search term
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter((m) => m.name.name.toLowerCase().includes(searchLower));
    }

    const sortBy = args.sortBy ?? 'newest';
    switch (sortBy) {
      case 'newest':
        results.sort((a, b) => b.matchedAt - a.matchedAt);
        break;
      case 'oldest':
        results.sort((a, b) => a.matchedAt - b.matchedAt);
        break;
      case 'name_asc':
        results.sort((a, b) => a.name.name.localeCompare(b.name.name));
        break;
      case 'name_desc':
        results.sort((a, b) => b.name.name.localeCompare(a.name.name));
        break;
      case 'rank':
        results.sort((a, b) => {
          const rankA = a.rank ?? Infinity;
          const rankB = b.rank ?? Infinity;
          return rankA - rankB;
        });
        break;
    }

    return results;
  },
});

export const getMatchCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return 0;

    if (!user.partnerId) {
      return 0;
    }

    const matches = await getPartnershipMatches(ctx, user._id, user.partnerId);
    return matches.length;
  },
});

export const updateMatch = mutation({
  args: {
    matchId: v.id('matches'),
    isFavorite: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    rank: v.optional(v.number()),
    isChosen: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.notes !== undefined && args.notes.length > 2000) {
      throw new Error('Notes must be 2000 characters or fewer');
    }

    const user = await getCurrentUserOrThrow(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    assertCurrentPartner(user, match);

    // If marking as chosen, unmark any other chosen name for this partnership
    if (args.isChosen === true && user.partnerId) {
      const partnerMatches = await getPartnershipMatches(ctx, user._id, user.partnerId);
      for (const m of partnerMatches) {
        if (m._id !== args.matchId && m.isChosen) {
          await ctx.db.patch(m._id, {
            isChosen: false,
            updatedAt: Date.now(),
          });
        }
      }
    }

    const updates: {
      isFavorite?: boolean;
      notes?: string;
      rank?: number;
      isChosen?: boolean;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.isFavorite !== undefined) updates.isFavorite = args.isFavorite;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.rank !== undefined) updates.rank = args.rank;
    if (args.isChosen !== undefined) updates.isChosen = args.isChosen;

    await ctx.db.patch(args.matchId, updates);

    return { success: true };
  },
});

export const proposeName = mutation({
  args: {
    matchId: v.id('matches'),
    message: v.optional(v.string()),
    // When true, replace any pending proposal from the partner instead of
    // returning the PARTNER_HAS_PENDING_PROPOSAL warning. The partner is
    // notified that their proposal was replaced.
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.message !== undefined && args.message.length > 200) {
      throw new Error('Message must be 200 characters or fewer');
    }

    const user = await getCurrentUserOrThrow(ctx);

    if (!user.partnerId) {
      throw new Error('No partner linked');
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    assertCurrentPartner(user, match);

    const partnerMatches = await getPartnershipMatches(ctx, user._id, user.partnerId);

    // Check whether the partner has a pending proposal we'd be overwriting
    // (#169). If so and the caller hasn't acknowledged via force=true,
    // surface a structured warning so the UI can prompt.
    const partnerPending = partnerMatches.find(
      (m) =>
        m.proposalStatus === 'pending' &&
        m.proposedBy !== undefined &&
        m.proposedBy !== user._id,
    );

    if (partnerPending && !args.force) {
      const partnerProposalNameDoc = await ctx.db.get(partnerPending.nameId);
      return {
        error: 'PARTNER_HAS_PENDING_PROPOSAL' as const,
        partnerProposalMatchId: partnerPending._id,
        partnerProposalName: partnerProposalNameDoc?.name ?? 'a name',
      };
    }

    const now = Date.now();

    // Clear the caller's own previous pending proposal (if any) — one
    // pending proposal per side. Do NOT touch the partner's pending
    // proposal here unless force=true; #169 prevents silent destruction.
    for (const m of partnerMatches) {
      if (m.proposalStatus === 'pending' && m.proposedBy === user._id) {
        await ctx.db.patch(m._id, {
          proposedBy: undefined,
          proposedAt: undefined,
          proposalMessage: undefined,
          proposalStatus: undefined,
          updatedAt: now,
        });
      }
    }

    // If we're force-replacing, clear the partner's pending proposal too
    // and send them a notification so they aren't surprised.
    if (partnerPending && args.force) {
      await ctx.db.patch(partnerPending._id, {
        proposedBy: undefined,
        proposedAt: undefined,
        proposalMessage: undefined,
        proposalStatus: undefined,
        updatedAt: now,
      });

      const proposerName = user.name ?? 'Your partner';
      const newName = await ctx.db.get(match.nameId);
      await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
        userId: partnerPending.proposedBy as Id<'users'>,
        title: `${proposerName} replaced your proposal`,
        body: newName
          ? `They proposed ${newName.name} instead.`
          : 'They proposed a different name.',
        data: { type: 'proposal_replaced', matchId: args.matchId },
      });
    }

    await ctx.db.patch(args.matchId, {
      proposedBy: user._id,
      proposedAt: now,
      proposalMessage: args.message,
      proposalStatus: 'pending',
      respondedAt: undefined,
      declineMessage: undefined,
      updatedAt: now,
    });

    const partnerId = match.user1Id === user._id ? match.user2Id : match.user1Id;
    const name = await ctx.db.get(match.nameId);
    const proposerName = user.name ?? 'Your partner';

    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      userId: partnerId,
      title: `${proposerName} proposed a name`,
      body: name ? `What do you think about ${name.name}?` : 'They want your thoughts on a name',
      data: { type: 'proposal', matchId: args.matchId },
    });

    return { success: true as const };
  },
});

export const respondToProposal = mutation({
  args: {
    matchId: v.id('matches'),
    accept: v.boolean(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.message !== undefined && args.message.length > 200) {
      throw new Error('Message must be 200 characters or fewer');
    }

    const user = await getCurrentUserOrThrow(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    assertCurrentPartner(user, match);

    if (match.proposalStatus !== 'pending') {
      throw new Error('No pending proposal on this match');
    }

    if (match.proposedBy === user._id) {
      throw new Error('Cannot respond to your own proposal');
    }

    const now = Date.now();

    if (args.accept) {
      if (user.partnerId) {
        const partnerMatches = await getPartnershipMatches(ctx, user._id, user.partnerId);
        for (const m of partnerMatches) {
          if (m._id !== args.matchId && m.isChosen) {
            await ctx.db.patch(m._id, {
              isChosen: false,
              updatedAt: now,
            });
          }
        }
      }

      await ctx.db.patch(args.matchId, {
        proposalStatus: 'accepted',
        respondedAt: now,
        isChosen: true,
        updatedAt: now,
      });

      if (match.proposedBy) {
        const name = await ctx.db.get(match.nameId);
        const responderName = user.name ?? 'Your partner';

        await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
          userId: match.proposedBy,
          title: `${responderName} accepted your proposal`,
          body: name ? `${name.name} it is!` : 'You agreed on a name!',
          data: { type: 'proposal_accepted', matchId: args.matchId },
        });
      }
    } else {
      await ctx.db.patch(args.matchId, {
        proposalStatus: 'declined',
        respondedAt: now,
        declineMessage: args.message,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const withdrawProposal = mutation({
  args: {
    matchId: v.id('matches'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.proposedBy !== user._id) {
      throw new Error('Only the proposer can withdraw');
    }

    if (match.proposalStatus !== 'pending') {
      throw new Error('Proposal is not pending');
    }

    await ctx.db.patch(args.matchId, {
      proposedBy: undefined,
      proposedAt: undefined,
      proposalMessage: undefined,
      proposalStatus: undefined,
      respondedAt: undefined,
      declineMessage: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteMatch = mutation({
  args: {
    matchId: v.id('matches'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    assertCurrentPartner(user, match);

    await ctx.db.delete(args.matchId);

    return { success: true };
  },
});

export const getPendingProposal = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    if (!user.partnerId) {
      return null;
    }

    const matches = await getPartnershipMatches(ctx, user._id, user.partnerId);
    const pendingMatch = matches.find((m) => m.proposalStatus === 'pending');

    if (!pendingMatch) {
      return null;
    }

    const name = await ctx.db.get(pendingMatch.nameId);
    const proposer = pendingMatch.proposedBy ? await ctx.db.get(pendingMatch.proposedBy) : null;

    return {
      ...pendingMatch,
      name,
      proposerName: proposer?.name ?? 'Your partner',
      isCurrentUserProposer: pendingMatch.proposedBy === user._id,
    };
  },
});

export const getChosenName = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    if (!user.partnerId) {
      return null;
    }

    const matches = await getPartnershipMatches(ctx, user._id, user.partnerId);
    const chosenMatch = matches.find((m) => m.isChosen);

    if (!chosenMatch) {
      return null;
    }

    const name = await ctx.db.get(chosenMatch.nameId);

    return {
      ...chosenMatch,
      name,
    };
  },
});
