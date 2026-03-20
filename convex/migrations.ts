import { internalMutation } from './_generated/server';

// One-time migration: remove legacy searchId from selections and matches,
// and clean up orphaned searches/searchMembers data.
// Run via Convex dashboard: npx convex run migrations:removeSearchIds
export const removeSearchIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    let selectionCount = 0;
    const selections = await ctx.db.query('selections').collect();
    for (const sel of selections) {
      if ((sel as any).searchId !== undefined) {
        const { searchId, ...rest } = sel as any;
        await ctx.db.replace(sel._id, {
          userId: rest.userId,
          nameId: rest.nameId,
          selectionType: rest.selectionType,
          createdAt: rest.createdAt,
          updatedAt: rest.updatedAt,
        });
        selectionCount++;
      }
    }

    let matchCount = 0;
    const matches = await ctx.db.query('matches').collect();
    for (const match of matches) {
      if ((match as any).searchId !== undefined) {
        const { searchId, ...rest } = match as any;
        await ctx.db.replace(match._id, {
          nameId: rest.nameId,
          user1Id: rest.user1Id,
          user2Id: rest.user2Id,
          isFavorite: rest.isFavorite,
          notes: rest.notes,
          rank: rest.rank,
          isChosen: rest.isChosen,
          matchedAt: rest.matchedAt,
          createdAt: rest.createdAt,
          updatedAt: rest.updatedAt,
        });
        matchCount++;
      }
    }

    return { selectionCount, matchCount };
  },
});
