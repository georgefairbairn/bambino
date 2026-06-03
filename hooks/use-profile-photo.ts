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

    setIsUploading(true);
    try {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      await user.setProfileImage({
        file: `data:${mimeType};base64,${asset.base64!}`,
      });
    } catch (error: unknown) {
      Sentry.captureException(error);
      if (__DEV__) {
        // #205: narrow with Clerk's type guard instead of `as any`, so the
        // shape we log is type-checked and Clerk API drift surfaces at compile
        // time. Non-Clerk errors fall through to the generic fields.
        if (isClerkAPIResponseError(error)) {
          console.error('Profile photo upload failed (Clerk API error):', {
            status: error.status,
            code: error.errors[0]?.code,
            longMessage: error.errors[0]?.longMessage,
          });
        } else {
          console.error('Profile photo upload failed:', error);
        }
      }
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
