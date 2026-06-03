import { v } from 'convex/values';
import { action, internalMutation } from './_generated/server';
import { internal } from './_generated/api';

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  general: 'General Feedback',
};

const CATEGORY_EMOJI: Record<string, string> = {
  bug: ':bug:',
  feature: ':bulb:',
  general: ':speech_balloon:',
};

// #171: minimum gap between feedback submissions per user, to stop a single
// authenticated user from flooding the Slack channel in a loop.
const FEEDBACK_RATE_WINDOW_MS = 60 * 1000;

// #171: hard cap on message length. Slack has its own block-text limits, but
// capping here keeps payloads small and bounds abuse.
const MAX_FEEDBACK_LENGTH = 2000;

/**
 * #171: Strip Slack mrkdwn control characters from user-controlled text before
 * it reaches the webhook. Slack interprets `<!channel>` / `<!here>` as mass
 * pings, `<@U123>` as user mentions, and `<url|text>` as links — all injectable
 * via the message body OR via a Clerk display name the user controls. Removing
 * angle brackets disables every one of those, and escaping `&` keeps Slack from
 * mis-parsing entities. We additionally render user text in `plain_text` blocks
 * (see below), but this defends the `context` block where only mrkdwn is
 * available.
 */
function sanitizeSlackText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/[<>]/g, '');
}

/**
 * #171: Rate-limit gate for submitFeedback. Runs as a mutation (the public
 * entry point is an action, which can't touch the DB directly). Resolves the
 * caller's user row, rejects if they submitted within the window, otherwise
 * records the submission time. Called BEFORE the Slack POST so a rejected
 * caller never reaches the webhook.
 */
export const checkAndRecordFeedbackRateLimit = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .first();
    if (!user) {
      throw new Error('User not found');
    }

    const now = Date.now();
    const record = await ctx.db
      .query('feedbackRateLimits')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    if (record && now - record.lastSubmittedAt < FEEDBACK_RATE_WINDOW_MS) {
      throw new Error('Please wait a minute before sending more feedback.');
    }

    if (record) {
      await ctx.db.patch(record._id, { lastSubmittedAt: now });
    } else {
      await ctx.db.insert('feedbackRateLimits', { userId: user._id, lastSubmittedAt: now });
    }
  },
});

export const submitFeedback = action({
  args: {
    category: v.union(v.literal('bug'), v.literal('feature'), v.literal('general')),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const trimmed = args.message.trim();
    if (!trimmed) {
      throw new Error('Message cannot be empty');
    }
    // #171: length cap.
    if (trimmed.length > MAX_FEEDBACK_LENGTH) {
      throw new Error(`Feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer.`);
    }

    const webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    // #171: enforce the per-user rate limit BEFORE hitting Slack. Throws
    // ("Please wait a minute…") if the user submitted within the window.
    // NOTE: the window is recorded here, so it's consumed even if the Slack
    // POST below fails — a deliberate flood-control trade-off (a rejected
    // caller must never reach the webhook), not a bug. A user whose delivery
    // genuinely failed waits out the window before retrying.
    await ctx.runMutation(internal.feedback.checkAndRecordFeedbackRateLimit, {
      clerkId: identity.subject,
    });

    const label = CATEGORY_LABELS[args.category];
    const emoji = CATEGORY_EMOJI[args.category];
    // #171: identity.name/email are user-controlled (Clerk profile), so they
    // are injection vectors too — sanitize alongside the message body.
    const safeMessage = sanitizeSlackText(trimmed);
    const safeName = sanitizeSlackText(identity.name ?? 'Unknown');
    const safeEmail = sanitizeSlackText(identity.email ?? 'No email');

    const payload = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} [${label}]`,
            emoji: true,
          },
        },
        {
          // #171: plain_text (not mrkdwn) for the user's message — Slack won't
          // render mentions or links inside a plain_text block, so this is the
          // primary defense; sanitizeSlackText is belt-and-suspenders.
          type: 'section',
          text: {
            type: 'plain_text',
            text: safeMessage,
            emoji: false,
          },
        },
        {
          // #171: keep the static label in mrkdwn but render the
          // Clerk-controlled name/email in plain_text. Stripping <> defeats raw
          // mention/link syntax, but mrkdwn still AUTO-LINKIFIES a bare URL
          // (e.g. a display name of "http://evil.com" becomes clickable).
          // plain_text is neither linkified nor formatted by Slack, closing
          // that residual vector.
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: '*From:*' },
            {
              type: 'plain_text',
              text: `${safeName} (${safeEmail}) — ${new Date().toISOString()}`,
              emoji: false,
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to send feedback to Slack');
    }

    return { success: true };
  },
});
