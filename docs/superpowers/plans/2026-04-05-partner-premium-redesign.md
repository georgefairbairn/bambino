# Partner Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate partner linking behind premium with profile confirmation, and add three distinct Matches tab empty states.

**Architecture:** Add `nameConfirmed` field to users table, create a Name Confirmation Modal component, extract photo upload into a shared hook, add premium/name gates to profile partner actions, and differentiate Matches tab empty states by user status.

**Tech Stack:** Convex (schema + mutations), React Native, Clerk SDK, expo-image-picker, AnimatedBottomSheet

---

### Task 1: Add `nameConfirmed` field to schema and `confirmName` mutation

**Files:**
- Modify: `convex/schema.ts:5-22`
- Modify: `convex/users.ts`

- [ ] **Step 1: Add `nameConfirmed` to users schema**

In `convex/schema.ts`, add the field to the users table definition, after `purchasedAt`:

```typescript
nameConfirmed: v.optional(v.boolean()),
```

The full users block becomes:

```typescript
users: defineTable({
  clerkId: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  isPremium: v.optional(v.boolean()),
  purchasedAt: v.optional(v.number()),
  nameConfirmed: v.optional(v.boolean()),
  shareCode: v.optional(v.string()),
  partnerId: v.optional(v.id('users')),
  genderFilter: v.optional(v.union(v.literal('boy'), v.literal('girl'), v.literal('both'))),
  originFilter: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_clerk_id', ['clerkId'])
  .index('by_email', ['email'])
  .index('by_share_code', ['shareCode'])
  .index('by_partner_id', ['partnerId']),
```

- [ ] **Step 2: Add `confirmName` mutation to `convex/users.ts`**

Add this mutation after the existing `updatePremiumStatus` mutation (after line 101):

```typescript
export const confirmName = mutation({
  args: {
    firstName: v.string(),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const fullName = args.lastName
      ? `${args.firstName.trim()} ${args.lastName.trim()}`
      : args.firstName.trim();

    await ctx.db.patch(user._id, {
      name: fullName,
      nameConfirmed: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
```

- [ ] **Step 3: Verify Convex syncs without errors**

Run: `npx convex dev` (should already be running)

Verify no schema errors in the terminal output. The new optional field requires no migration.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/users.ts
git commit -m "feat: add nameConfirmed field and confirmName mutation"
```

---

### Task 2: Add `NAME_NOT_CONFIRMED` server-side check to `linkPartner`

**Files:**
- Modify: `convex/partners.ts:128-183`

- [ ] **Step 1: Add name confirmation check to `linkPartner` mutation**

In `convex/partners.ts`, inside the `linkPartner` handler, add this check after the existing `targetUser.partnerId` check (after line 159) and before the premium check:

```typescript
    // Calling user must have confirmed their name
    if (user.nameConfirmed !== true) {
      return { error: 'NAME_NOT_CONFIRMED' as const };
    }
```

- [ ] **Step 2: Verify Convex syncs without errors**

Check the `npx convex dev` terminal for any errors.

- [ ] **Step 3: Commit**

```bash
git add convex/partners.ts
git commit -m "feat: add NAME_NOT_CONFIRMED server check to linkPartner"
```

---

### Task 3: Extract photo upload into shared hook

**Files:**
- Create: `hooks/use-profile-photo.ts`
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Create `hooks/use-profile-photo.ts`**

Extract the `pickAndUploadImage` and `handleRemovePhoto` logic from `profile.tsx` into a reusable hook:

```typescript
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sentry from '@sentry/react-native';
import type { UserResource } from '@clerk/types';

export function useProfilePhoto(user: UserResource | null | undefined) {
  const [isUploading, setIsUploading] = useState(false);

  const pickAndUploadImage = useCallback(async () => {
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow photo library access in your device settings to update your profile photo.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled) return;

    setIsUploading(true);
    try {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      await user.setProfileImage({
        file: `data:${mimeType};base64,${asset.base64!}`,
      });
    } catch (error: any) {
      Sentry.captureException(error);
      console.error('Profile photo upload failed:', {
        message: error?.message,
        status: error?.status,
        code: error?.errors?.[0]?.code,
        longMessage: error?.errors?.[0]?.longMessage,
        clerkError: error?.clerkError,
        raw: JSON.stringify(error, null, 2),
      });
      Alert.alert('Error', 'Failed to update profile photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  const removePhoto = useCallback(async () => {
    if (!user) return;

    setIsUploading(true);
    try {
      await user.setProfileImage({ file: null });
    } catch (error: any) {
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to remove profile photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  return { isUploading, pickAndUploadImage, removePhoto };
}
```

- [ ] **Step 2: Update `profile.tsx` to use the shared hook**

In `app/(tabs)/profile.tsx`:

1. Add import at the top (after other hook imports):
```typescript
import { useProfilePhoto } from '@/hooks/use-profile-photo';
```

2. Replace the `isUploading` state and the `pickAndUploadImage` / `handleRemovePhoto` callbacks (lines 45, 111-168) with:
```typescript
const { isUploading, pickAndUploadImage, removePhoto: handleRemovePhoto } = useProfilePhoto(user);
```

Remove these lines:
- `const [isUploading, setIsUploading] = useState(false);` (line 45)
- The entire `pickAndUploadImage` callback (lines 111-154)
- The entire `handleRemovePhoto` callback (lines 156-168)

Also remove the `ImagePicker` import from the file since it's no longer used directly:
```typescript
// Remove this line:
import * as ImagePicker from 'expo-image-picker';
```

- [ ] **Step 3: Verify profile photo upload still works**

Run the app, go to Profile, tap avatar, verify photo picker opens and upload works.

- [ ] **Step 4: Commit**

```bash
git add hooks/use-profile-photo.ts app/\(tabs\)/profile.tsx
git commit -m "refactor: extract photo upload into useProfilePhoto hook"
```

---

### Task 4: Create Name Confirmation Modal

**Files:**
- Create: `components/partner/name-confirmation-modal.tsx`

- [ ] **Step 1: Create the modal component**

Create `components/partner/name-confirmation-modal.tsx`:

```typescript
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { api } from '@/convex/_generated/api';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { useProfilePhoto } from '@/hooks/use-profile-photo';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';

interface NameConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}

export function NameConfirmationModal({
  visible,
  onClose,
  onConfirmed,
}: NameConfirmationModalProps) {
  const { user } = useUser();
  const { colors, gradients } = useTheme();
  const confirmName = useMutation(api.users.confirmName);
  const { isUploading, pickAndUploadImage } = useProfilePhoto(user);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial values when modal opens with a new user state
  const handleOpen = useCallback(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setError(null);
    setIsConfirming(false);
  }, [user?.firstName, user?.lastName]);

  // Reset state when modal becomes visible
  if (visible && firstName === '' && user?.firstName) {
    setFirstName(user.firstName);
    setLastName(user.lastName || '');
  }

  const handleConfirm = async () => {
    const trimmedFirst = firstName.trim();
    if (!trimmedFirst) {
      setError('First name is required');
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      // Update Clerk first
      await user?.update({
        firstName: trimmedFirst,
        lastName: lastName.trim(),
      });

      // Then update Convex
      await confirmName({
        firstName: trimmedFirst,
        lastName: lastName.trim() || undefined,
      });

      onConfirmed();
    } catch (err) {
      Sentry.captureException(err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    setFirstName('');
    setLastName('');
    setError(null);
    setIsConfirming(false);
    onClose();
  };

  const initial = (firstName || user?.firstName || '')[0]?.toUpperCase() || 'B';

  return (
    <AnimatedBottomSheet visible={visible} onClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }}
      >
        <View style={styles.handleBar} />

        <Text style={styles.title}>Confirm Your Profile</Text>
        <Text style={styles.subtitle}>This is how your partner will see you</Text>

        {/* Avatar */}
        <Pressable
          style={styles.avatarContainer}
          onPress={pickAndUploadImage}
          disabled={isUploading}
        >
          {user?.hasImage ? (
            <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
              <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              )}
            </View>
          ) : (
            <LinearGradient
              colors={gradients.buttonPrimary as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              {isUploading ? (
                <ActivityIndicator color="rgba(255,255,255,0.9)" size="small" />
              ) : (
                <Text style={styles.avatarInitial}>{initial}</Text>
              )}
            </LinearGradient>
          )}
          <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="camera" size={12} color="#fff" />
          </View>
        </Pressable>
        {!user?.hasImage && (
          <Text style={[styles.photoHint, { color: colors.primary }]}>Tap to add a photo</Text>
        )}

        {/* Name fields */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>First Name</Text>
          <TextInput
            style={[
              styles.fieldInput,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: error && !firstName.trim() ? '#FF6B6B' : colors.border,
              },
            ]}
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              setError(null);
            }}
            placeholder="Enter your first name"
            placeholderTextColor="#A89BB5"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Last Name</Text>
          <TextInput
            style={[
              styles.fieldInput,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter your last name (optional)"
            placeholderTextColor="#A89BB5"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Confirm button */}
        <Pressable
          style={[
            styles.confirmButton,
            { backgroundColor: colors.primary },
            isConfirming && styles.buttonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={isConfirming || isUploading}
        >
          {isConfirming ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Looks Good!</Text>
          )}
        </Pressable>

        <Text style={styles.infoText}>You can change these later in your profile</Text>
      </KeyboardAvoidingView>
    </AnimatedBottomSheet>
  );
}

const styles = StyleSheet.create({
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  avatarGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#fff',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  photoHint: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#6B5B7B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 4,
  },
  confirmButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoText: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
    textAlign: 'center',
    marginTop: 12,
  },
});
```

- [ ] **Step 2: Add barrel export**

Check if `components/partner/index.ts` exists. If not, create it. Ensure it exports both modals:

```typescript
export { PartnerLinkModal } from './partner-link-modal';
export { NameConfirmationModal } from './name-confirmation-modal';
```

- [ ] **Step 3: Verify the component compiles**

Run the app and confirm no TypeScript errors. The modal isn't wired up yet — just verify it compiles.

- [ ] **Step 4: Commit**

```bash
git add components/partner/name-confirmation-modal.tsx components/partner/index.ts
git commit -m "feat: create NameConfirmationModal component"
```

---

### Task 5: Add premium and name confirmation gates to Profile partner section

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Add imports and state for name confirmation**

In `app/(tabs)/profile.tsx`, add the import for the new modal and for the Convex current user query:

```typescript
import { NameConfirmationModal } from '@/components/partner/name-confirmation-modal';
```

Add state variable alongside existing `showPaywall` and `showPartnerModal` states:

```typescript
const [showNameConfirmation, setShowNameConfirmation] = useState(false);
const [pendingAction, setPendingAction] = useState<'copy' | 'share' | 'link' | null>(null);
```

Add Convex user query to get `nameConfirmed` status:

```typescript
const convexUser = useQuery(api.users.getCurrentUser);
```

- [ ] **Step 2: Create the gate chain helper**

Add this callback after the existing `handleShareCode` callback (after line 109):

```typescript
const handlePartnerAction = useCallback(
  (action: 'copy' | 'share' | 'link') => {
    // Gate 1: Premium check
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }

    // Gate 2: Name confirmation check
    if (convexUser?.nameConfirmed !== true) {
      setPendingAction(action);
      setShowNameConfirmation(true);
      return;
    }

    // Gate 3: Execute action
    executePartnerAction(action);
  },
  [isPremium, convexUser?.nameConfirmed],
);

const executePartnerAction = useCallback(
  (action: 'copy' | 'share' | 'link') => {
    switch (action) {
      case 'copy':
        handleCopyCode();
        break;
      case 'share':
        handleShareCode();
        break;
      case 'link':
        setShowPartnerModal(true);
        break;
    }
  },
  [handleCopyCode, handleShareCode],
);

const handleNameConfirmed = useCallback(() => {
  setShowNameConfirmation(false);
  if (pendingAction) {
    executePartnerAction(pendingAction);
    setPendingAction(null);
  }
}, [pendingAction, executePartnerAction]);
```

- [ ] **Step 3: Update the partner section JSX to use the gate chain**

Replace the Copy button `onPress` (currently `onPress={handleCopyCode}`) with:
```typescript
onPress={() => handlePartnerAction('copy')}
```

Replace the Share button `onPress` (currently `onPress={handleShareCode}`) with:
```typescript
onPress={() => handlePartnerAction('share')}
```

Replace the Link Partner GradientButton `onPress` (currently `onPress={() => setShowPartnerModal(true)}`) with:
```typescript
onPress={() => handlePartnerAction('link')}
```

- [ ] **Step 4: Add lock icons for free users on share action buttons**

Update the Copy button to show a lock when not premium. Replace the Copy button's inner content:

```typescript
<Ionicons
  name={isPremium ? 'copy-outline' : 'lock-closed'}
  size={16}
  color={colors.primary}
/>
<Text style={[styles.shareActionText, { color: colors.primary }]}>
  Copy
</Text>
```

Similarly for the Share button:

```typescript
<Ionicons
  name={isPremium ? 'share-outline' : 'lock-closed'}
  size={16}
  color={colors.primary}
/>
<Text style={[styles.shareActionText, { color: colors.primary }]}>
  Share
</Text>
```

- [ ] **Step 5: Add the NameConfirmationModal to the JSX**

Add this alongside the existing `<Paywall>` and `<PartnerLinkModal>` at the bottom of the ScrollView (before the closing `</ScrollView>` tag):

```typescript
<NameConfirmationModal
  visible={showNameConfirmation}
  onClose={() => {
    setShowNameConfirmation(false);
    setPendingAction(null);
  }}
  onConfirmed={handleNameConfirmed}
/>
```

- [ ] **Step 6: Update the Paywall trigger**

The existing `<Paywall>` at the bottom of profile uses `trigger="search_limit"`. Update it to use `trigger="partner_limit"` since it's now triggered from partner actions:

```typescript
<Paywall
  visible={showPaywall}
  onClose={() => setShowPaywall(false)}
  trigger="partner_limit"
/>
```

- [ ] **Step 7: Verify the flow works**

Run the app. On Profile:
1. As free user: tap Copy → paywall appears
2. As premium user (without name confirmed): tap Copy → name confirmation modal appears → confirm → code copies
3. As premium user (name confirmed): tap Copy → copies immediately

- [ ] **Step 8: Commit**

```bash
git add app/\(tabs\)/profile.tsx
git commit -m "feat: add premium and name confirmation gates to profile partner section"
```

---

### Task 6: Add name confirmation gate to Partner Link Modal (receiver side)

**Files:**
- Modify: `components/partner/partner-link-modal.tsx`

- [ ] **Step 1: Add imports and state**

In `components/partner/partner-link-modal.tsx`, add imports:

```typescript
import { NameConfirmationModal } from './name-confirmation-modal';
```

Add the Convex current user query and state:

```typescript
const convexUser = useQuery(api.users.getCurrentUser);
const [showNameConfirmation, setShowNameConfirmation] = useState(false);
```

- [ ] **Step 2: Modify the `handleLink` function to check name confirmation**

Replace the existing `handleLink` function (lines 98-120) with:

```typescript
const handleLink = async () => {
  // Check name confirmation before linking
  if (convexUser?.nameConfirmed !== true) {
    setShowNameConfirmation(true);
    return;
  }

  executeLinkPartner();
};

const executeLinkPartner = async () => {
  setIsLinking(true);
  setError(null);

  try {
    const result = await linkPartner({ code });

    if (result && typeof result === 'object' && 'error' in result) {
      if (result.error === 'FREE_TIER_PARTNER_LIMIT') {
        setShowPaywall(true);
      } else if (result.error === 'NAME_NOT_CONFIRMED') {
        setShowNameConfirmation(true);
      } else {
        setError('Failed to link partner');
      }
      setIsLinking(false);
      return;
    }

    handleClose();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to link partner');
    setIsLinking(false);
  }
};
```

- [ ] **Step 3: Reset name confirmation state in `handleClose`**

In the `handleClose` function, add `setShowNameConfirmation(false)`:

```typescript
const handleClose = () => {
  setCode('');
  setError(null);
  setPreview(null);
  setIsLookingUp(false);
  setIsLinking(false);
  setShowPaywall(false);
  setShowNameConfirmation(false);
  onClose();
};
```

- [ ] **Step 4: Add NameConfirmationModal to the JSX**

Add this alongside the existing `<Paywall>` at the bottom of the `<AnimatedBottomSheet>` (before the closing `</AnimatedBottomSheet>` tag):

```typescript
<NameConfirmationModal
  visible={showNameConfirmation}
  onClose={() => setShowNameConfirmation(false)}
  onConfirmed={() => {
    setShowNameConfirmation(false);
    executeLinkPartner();
  }}
/>
```

- [ ] **Step 5: Verify the receiver flow**

Run the app with a second user. Enter a share code, see the partner preview, tap "Link Partner":
1. If name not confirmed → name confirmation modal appears → confirm → link executes
2. If name already confirmed → link executes immediately

- [ ] **Step 6: Commit**

```bash
git add components/partner/partner-link-modal.tsx
git commit -m "feat: add name confirmation gate to partner link modal receiver flow"
```

---

### Task 7: Update Matches tab with three empty states

**Files:**
- Modify: `app/(tabs)/matches.tsx`

- [ ] **Step 1: Add imports**

In `app/(tabs)/matches.tsx`, add imports for the paywall, purchases hook, and router:

```typescript
import { usePurchases } from '@/hooks/use-purchases';
import { Paywall } from '@/components/paywall';
import { useRouter } from 'expo-router';
```

- [ ] **Step 2: Add state and hooks**

Inside the `Matches` component, add:

```typescript
const { isPremium, restorePurchases } = usePurchases();
const router = useRouter();
const [showPaywall, setShowPaywall] = useState(false);
```

- [ ] **Step 3: Replace the empty state block**

Replace the existing empty state block (lines 152-171) with the three-state logic:

```typescript
// Three empty states based on user status
if (!isPremium || !hasPartner || !matches || matches.length === 0) {
  // Determine which state to show
  const isFreeUser = !isPremium;
  const isPremiumNoPartner = isPremium && !hasPartner;
  // Third state: isPremium && hasPartner && no matches (default)

  return (
    <GradientBackground>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        <View style={styles.emptyContainer}>
          <BubblePillsBackground />

          {/* Title */}
          <Text style={styles.emptyTitle}>
            {isFreeUser
              ? 'Match With Your Partner'
              : isPremiumNoPartner
                ? 'Invite Your Partner'
                : 'No Matches Yet'}
          </Text>

          {/* Description */}
          <Text style={styles.emptyDescription}>
            {isFreeUser
              ? 'Upgrade to connect with your partner and discover the baby names you both love.'
              : isPremiumNoPartner
                ? 'Share your partner code and start discovering the names you both love. Matches appear when you both swipe right!'
                : "When you and your partner both love the same name — it's a match! Keep swiping to find your favourites."}
          </Text>

          {/* Animation */}
          <MatchAnimation />

          {/* CTAs */}
          {isFreeUser && (
            <View style={styles.ctaContainer}>
              <Pressable
                style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowPaywall(true)}
              >
                <Text style={styles.ctaButtonText}>Upgrade to Premium</Text>
              </Pressable>
              <Pressable
                style={styles.restoreButton}
                onPress={async () => {
                  const success = await restorePurchases();
                  if (success) {
                    Alert.alert('Restored', 'Your premium purchase has been restored!');
                  } else {
                    Alert.alert('No Purchase Found', 'No previous purchase was found to restore.');
                  }
                }}
              >
                <Text style={styles.restoreButtonText}>Restore Purchase</Text>
              </Pressable>
            </View>
          )}

          {isPremiumNoPartner && (
            <Pressable
              style={[styles.ctaButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.ctaButtonText}>Share Your Code</Text>
            </Pressable>
          )}
        </View>

        <Paywall
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          trigger="partner_limit"
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
```

- [ ] **Step 4: Add new styles**

Add these styles to the `StyleSheet.create` block:

```typescript
ctaContainer: {
  alignItems: 'center',
  gap: 8,
  zIndex: 10,
},
ctaButton: {
  paddingVertical: 15,
  paddingHorizontal: 40,
  borderRadius: 16,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
  zIndex: 10,
},
ctaButtonText: {
  fontSize: 15,
  fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
  color: '#fff',
},
restoreButton: {
  paddingVertical: 8,
  zIndex: 10,
},
restoreButtonText: {
  fontSize: 13,
  fontFamily: Fonts?.sans,
  color: '#A89BB5',
},
```

- [ ] **Step 5: Add `Alert` to imports if not already present**

Check that `Alert` is in the React Native import. It already is (line 2), so no change needed.

- [ ] **Step 6: Verify all three states**

Test each state:
1. Free user → shows "Match With Your Partner" + upgrade CTA + restore
2. Premium, no partner → shows "Invite Your Partner" + "Share Your Code" button
3. Premium, partner, no matches → shows "No Matches Yet"

- [ ] **Step 7: Commit**

```bash
git add app/\(tabs\)/matches.tsx
git commit -m "feat: add three empty states to matches tab based on user status"
```

---

### Task 8: Final integration testing and cleanup

**Files:**
- No new files

- [ ] **Step 1: Test the full free user flow**

1. Start as free user
2. Go to Matches tab → see premium teaser with "Upgrade to Premium" button
3. Go to Profile → Partner section → tap Copy → paywall appears
4. Tap Share → paywall appears
5. Tap Link Partner → paywall appears

- [ ] **Step 2: Test the premium user flow (name not confirmed)**

1. Upgrade to premium (or mock)
2. Go to Matches tab → see "Invite Your Partner" with "Share Your Code" CTA
3. Tap "Share Your Code" → navigates to Profile
4. In Profile → tap Copy → Name Confirmation Modal appears
5. Confirm name → code copies to clipboard
6. Tap Share → native share sheet opens (name already confirmed)
7. Tap Link Partner → Partner Link Modal opens directly

- [ ] **Step 3: Test the partner link receiver flow**

1. As premium user with name not yet confirmed
2. Open Partner Link Modal → enter a valid code → see partner preview
3. Tap "Link Partner" → Name Confirmation Modal appears
4. Confirm name → partner links successfully

- [ ] **Step 4: Test the premium user with partner flow**

1. With partner linked and no matches → Matches tab shows "No Matches Yet"
2. Create a match → Matches tab shows the match list as before

- [ ] **Step 5: Commit any fixes**

If any issues were found and fixed during testing:

```bash
git add -A
git commit -m "fix: integration fixes for partner premium flow"
```
