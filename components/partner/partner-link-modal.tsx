import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { Image } from 'expo-image';
import { api } from '@/convex/_generated/api';
import { Fonts } from '@/constants/theme';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { Paywall } from '@/components/paywall';
import { useTheme } from '@/contexts/theme-context';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';
import { StyledInput } from '@/components/ui/styled-input';
import { NameConfirmationModal } from './name-confirmation-modal';

interface PartnerLinkModalProps {
  visible: boolean;
  onClose: () => void;
}

type PartnerPreview = {
  userId: string;
  name: string;
  imageUrl?: string;
};

export function PartnerLinkModal({ visible, onClose }: PartnerLinkModalProps) {
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [preview, setPreview] = useState<PartnerPreview | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showNameConfirmation, setShowNameConfirmation] = useState(false);

  const convexUser = useQuery(api.users.getCurrentUser);
  const partnerPreview = useQuery(
    api.partners.getUserByShareCode,
    code.length === 6 && isLookingUp ? { code } : 'skip',
  );

  const linkPartner = useMutation(api.partners.linkPartner);

  const handleCodeChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(cleaned);
    setError(null);
    setPreview(null);
  };

  const handlePreview = () => {
    if (code.length !== 6) {
      setError('Please enter a valid 6-character code');
      return;
    }
    setIsLookingUp(true);
    setError(null);
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'invalid_format':
        return 'Please enter a valid 6-character code';
      case 'not_found':
        return 'User not found. Please check the code.';
      case 'own_code':
        return 'This is your own share code';
      case 'already_has_partner':
        return 'You already have a partner linked';
      case 'target_has_partner':
        return 'This user already has a partner linked';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  // Handle query result
  if (isLookingUp && partnerPreview) {
    if ('error' in partnerPreview && partnerPreview.error) {
      if (error === null) {
        setError(getErrorMessage(partnerPreview.error));
        setIsLookingUp(false);
      }
    } else if ('userId' in partnerPreview && preview === null) {
      setPreview({
        userId: partnerPreview.userId,
        name: partnerPreview.name,
        imageUrl: partnerPreview.imageUrl,
      });
      setIsLookingUp(false);
    }
  }

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

  const handleBack = () => {
    setPreview(null);
    setError(null);
  };

  return (
    <AnimatedBottomSheet
      visible={visible}
      onClose={handleClose}
      style={{ paddingHorizontal: 24, paddingBottom: 40 }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.handleBar} />

        <View style={styles.header}>
          {preview && (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#6B5B7B" />
            </Pressable>
          )}
          <Text style={styles.title}>{preview ? 'Link Partner' : 'Enter Code'}</Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B5B7B" />
          </Pressable>
        </View>

        {!preview ? (
          <View style={styles.content}>
            <Text style={styles.description}>
              Enter your partner&apos;s 6-character share code to link your accounts
            </Text>

            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="ABC123"
              placeholderTextColor="#A89BB5"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              autoFocus
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                (isLookingUp || code.length !== 6) && styles.buttonDisabled,
              ]}
              onPress={handlePreview}
              disabled={isLookingUp || code.length !== 6}
            >
              {isLookingUp ? (
                <LoadingIndicator size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Find Partner</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.content}>
            <View
              style={[
                styles.previewCard,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <View style={styles.previewRow}>
                {preview.imageUrl ? (
                  <Image source={{ uri: preview.imageUrl }} style={styles.previewAvatar} />
                ) : (
                  <View
                    style={[styles.previewAvatarPlaceholder, { backgroundColor: colors.border }]}
                  >
                    <Text style={styles.previewAvatarInitial}>
                      {preview.name[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={styles.previewName}>{preview.name}</Text>
                </View>
              </View>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.previewActions}>
              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  isLinking && styles.buttonDisabled,
                ]}
                onPress={handleLink}
                disabled={isLinking}
              >
                {isLinking ? (
                  <LoadingIndicator size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Link Partner</Text>
                )}
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleBack} disabled={isLinking}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="partner_limit"
      />

      <NameConfirmationModal
        visible={showNameConfirmation}
        onClose={() => setShowNameConfirmation(false)}
        onConfirmed={() => {
          setShowNameConfirmation(false);
          executeLinkPartner();
        }}
      />
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
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  closeButton: {
    padding: 4,
    width: 32,
    alignItems: 'flex-end',
  },
  content: {
    gap: 16,
  },
  description: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
  },
  codeInput: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 28,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center' as const,
    letterSpacing: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontFamily: Fonts?.sans,
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#ffffff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  previewAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarInitial: {
    fontSize: 18,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#6B5B7B',
  },
  previewName: {
    fontSize: 18,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
  },
  previewActions: {
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
});
