import { v } from 'convex/values';
import { internalAction, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export const getRecipientPushToken = internalQuery({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    if (!user.pushToken) return null;
    return {
      token: user.pushToken,
      platform: user.pushTokenPlatform ?? null,
      // Absent = enabled; only an explicit false opts out (#229).
      enabled: user.pushNotificationsEnabled !== false,
    };
  },
});

export const sendPushNotification = internalAction({
  args: {
    userId: v.id('users'),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{ sent: boolean; reason?: string }> => {
    const recipient: {
      token: string;
      platform: 'ios' | 'android' | null;
      enabled: boolean;
    } | null = await ctx.runQuery(internal.notifications.getRecipientPushToken, {
      userId: args.userId as Id<'users'>,
    });

    if (!recipient) {
      return { sent: false, reason: 'no_token' };
    }

    // Respect the user's in-app notifications toggle (#229).
    if (!recipient.enabled) {
      return { sent: false, reason: 'disabled' };
    }

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipient.token,
          title: args.title,
          body: args.body,
          data: args.data ?? {},
          sound: 'default',
        }),
      });

      if (!response.ok) {
        return { sent: false, reason: `http_${response.status}` };
      }

      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      return { sent: false, reason: message };
    }
  },
});
