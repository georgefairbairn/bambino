import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sentry from '@sentry/react-native';
import { isClerkAPIResponseError } from '@clerk/clerk-expo';
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

    const asset = result.assets[0];
    // ImagePicker can return no asset (multi-pick race) or an asset with no
    // base64 — HEIC images are the common offender, where encoding fails. Bail
    // with an actionable message instead of sending `base64,undefined` to Clerk
    // and trapping the user in a retry loop (#180).
    if (!asset || !asset.base64) {
      Alert.alert(
        'Could not read image',
        'Please try a different photo. (HEIC images sometimes fail — try converting to JPG.)',
      );
      Sentry.captureMessage('Profile photo: missing asset or base64', {
        level: 'warning',
        extra: {
          hasAssets: !!result.assets,
          length: result.assets?.length,
          assetKeys: asset ? Object.keys(asset) : null,
        },
      });
      return;
    }

    const mimeType = asset.mimeType ?? 'image/jpeg';
    setIsUploading(true);
    try {
      await user.setProfileImage({
        file: `data:${mimeType};base64,${asset.base64}`,
      });
    } catch (error: unknown) {
      Sentry.captureException(error);
      // #205: narrow with Clerk's type guard instead of `as any`, so the shape
      // we read is type-checked and Clerk API drift surfaces at compile time.
      if (isClerkAPIResponseError(error)) {
        const code = error.errors[0]?.code;
        if (__DEV__) {
          console.error('Profile photo upload failed (Clerk API error):', {
            status: error.status,
            code,
            longMessage: error.errors[0]?.longMessage,
          });
        }
        Alert.alert(
          'Error',
          code === 'image_too_large'
            ? 'That photo is too large. Try a smaller one.'
            : 'Failed to update profile photo. Please try again.',
        );
      } else {
        if (__DEV__) {
          console.error('Profile photo upload failed:', error);
        }
        Alert.alert('Error', 'Failed to update profile photo. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  const removePhoto = useCallback(async () => {
    if (!user) return;

    setIsUploading(true);
    try {
      await user.setProfileImage({ file: null });
    } catch (error: unknown) {
      // #205: typed catch — the message is generic, so we only need Sentry to
      // capture the (unknown) error; no `as any` shape access required.
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to remove profile photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  return { isUploading, pickAndUploadImage, removePhoto };
}
