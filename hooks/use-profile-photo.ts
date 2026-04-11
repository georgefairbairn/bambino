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
