import { v } from 'convex/values';
import { action } from './_generated/server';

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

    const webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const label = CATEGORY_LABELS[args.category];
    const emoji = CATEGORY_EMOJI[args.category];
    const userName = identity.name ?? 'Unknown';
    const userEmail = identity.email ?? 'No email';

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
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: trimmed,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*From:* ${userName} (${userEmail}) — ${new Date().toISOString()}`,
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
