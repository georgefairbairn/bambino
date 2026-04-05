import { useState, useEffect } from 'react';
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

  // Reset state when modal becomes visible
  useEffect(() => {
    if (visible && user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setError(null);
      setIsConfirming(false);
    }
  }, [visible, user?.firstName, user?.lastName]);

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
