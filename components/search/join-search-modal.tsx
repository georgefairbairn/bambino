import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Fonts } from '@/constants/theme';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { Paywall } from '@/components/paywall';
import { useTheme } from '@/contexts/theme-context';

interface JoinSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (searchId: string) => void;
}

type SearchPreview = {
  searchId: string;
  name: string;
  ownerName: string;
  genderFilter: 'boy' | 'girl' | 'both';
};

export function JoinSearchModal({ visible, onClose, onSuccess }: JoinSearchModalProps) {
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [preview, setPreview] = useState<SearchPreview | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const searchPreview = useQuery(
    api.searches.getSearchByShareCode,
    code.length === 6 && isLookingUp ? { code } : 'skip',
  );

  const joinSearch = useMutation(api.searches.joinSearchByCode);

  const handleCodeChange = (text: string) => {
    // Only allow alphanumeric characters
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
        return 'Search not found. Please check the code.';
      case 'own_search':
        return 'This is your own search';
      case 'already_member':
        return "You're already a member of this search";
      default:
        return 'An error occurred. Please try again.';
    }
  };

  // Effect to handle query result changes
  const handleQueryResult = () => {
    if (!isLookingUp) return;

    if (searchPreview && 'error' in searchPreview && searchPreview.error) {
      setError(getErrorMessage(searchPreview.error));
      setIsLookingUp(false);
    } else if (searchPreview && 'searchId' in searchPreview) {
      setPreview({
        searchId: searchPreview.searchId,
        name: searchPreview.name,
        ownerName: searchPreview.ownerName,
        genderFilter: searchPreview.genderFilter,
      });
      setIsLookingUp(false);
    }
  };

  // Call the handler when searchPreview changes
  if (isLookingUp && searchPreview) {
    handleQueryResult();
  }

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    try {
      const result = await joinSearch({ code });

      if (result && typeof result === 'object' && 'error' in result) {
        if (result.error === 'FREE_TIER_PARTNER_LIMIT') {
          setShowPaywall(true);
        } else {
          setError('Failed to join search');
        }
        setIsJoining(false);
        return;
      }

      handleClose();
      onSuccess(result as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join search');
      setIsJoining(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    setPreview(null);
    setIsLookingUp(false);
    setIsJoining(false);
    setShowPaywall(false);
    onClose();
  };

  const handleBack = () => {
    setPreview(null);
    setError(null);
  };

  const getGenderFilterLabel = (filter: 'boy' | 'girl' | 'both') => {
    switch (filter) {
      case 'boy':
        return 'Boy names only';
      case 'girl':
        return 'Girl names only';
      case 'both':
        return 'All names';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            {preview && (
              <Pressable onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#6B5B7B" />
              </Pressable>
            )}
            <Text style={styles.title}>{preview ? 'Join Search' : 'Enter Code'}</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B5B7B" />
            </Pressable>
          </View>

          {!preview ? (
            // Code Input State
            <View style={styles.content}>
              <Text style={styles.description}>
                Enter the 6-character code shared by your partner to join their search
              </Text>

              <TextInput
                style={[
                  styles.codeInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: error ? '#FF6B6B' : colors.border,
                  },
                ]}
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
                  <Text style={styles.primaryButtonText}>Join</Text>
                )}
              </Pressable>
            </View>
          ) : (
            // Preview State
            <View style={styles.content}>
              <View
                style={[
                  styles.previewCard,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
              >
                <Text style={styles.previewName}>{preview.name}</Text>
                <View style={styles.previewMeta}>
                  <Ionicons name="person-outline" size={16} color="#6B5B7B" />
                  <Text style={styles.previewMetaText}>Created by {preview.ownerName}</Text>
                </View>
                <View style={styles.previewMeta}>
                  <Ionicons name="filter-outline" size={16} color="#6B5B7B" />
                  <Text style={styles.previewMetaText}>
                    {getGenderFilterLabel(preview.genderFilter)}
                  </Text>
                </View>
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.previewActions}>
                <Pressable
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                    isJoining && styles.buttonDisabled,
                  ]}
                  onPress={handleJoin}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <LoadingIndicator size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Join Search</Text>
                  )}
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={handleBack} disabled={isJoining}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="partner_limit"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
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
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
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
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 28,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
    textAlign: 'center',
    letterSpacing: 8,
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
    gap: 12,
  },
  previewName: {
    fontSize: 20,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewMetaText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
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
