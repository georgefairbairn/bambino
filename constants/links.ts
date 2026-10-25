/**
 * Canonical App Store listing URL. When bambinobaby.xyz ships (separate plan),
 * this becomes a Universal Link that deep-links straight into the partner-link
 * flow with the code pre-filled.
 */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6773164657';

/**
 * Single source of truth for the partner invite text. Every share goes through
 * shareInvite (lib/share-invite.ts), so the copy can't drift between screens.
 */
export function buildInviteMessage(shareCode: string): string {
  return (
    `I'm using Bambino to pick a baby name with you. Download it here: ${APP_STORE_URL}` +
    `\n\nThen enter my code to link up: ${shareCode}`
  );
}
