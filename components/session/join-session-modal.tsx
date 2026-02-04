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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Fonts } from '@/constants/theme';

interface JoinSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (sessionId: string) => void;
}

type SessionPreview = {
  sessionId: string;
  name: string;
  ownerName: string;
  genderFilter: 'boy' | 'girl' | 'both';
};

export function JoinSessionModal({ visible, onClose, onSuccess }: JoinSessionModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [preview, setPreview] = useState<SessionPreview | null>(null);

  const sessionPreview = useQuery(
    api.sessions.getSessionByShareCode,
    code.length === 6 && isLookingUp ? { code } : 'skip',
  );

  const joinSession = useMutation(api.sessions.joinSessionByCode);

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
        return 'Session not found. Please check the code.';
      case 'own_session':
        return 'This is your own session';
      case 'already_member':
        return "You're already a member of this session";
      default:
        return 'An error occurred. Please try again.';
    }
  };

  // Effect to handle query result changes
  const handleQueryResult = () => {
    if (!isLookingUp) return;

    if (sessionPreview && 'error' in sessionPreview && sessionPreview.error) {
      setError(getErrorMessage(sessionPreview.error));
      setIsLookingUp(false);
    } else if (sessionPreview && 'sessionId' in sessionPreview) {
      setPreview({
        sessionId: sessionPreview.sessionId,
        name: sessionPreview.name,
        ownerName: sessionPreview.ownerName,
        genderFilter: sessionPreview.genderFilter,
      });
      setIsLookingUp(false);
    }
  };

  // Call the handler when sessionPreview changes
  if (isLookingUp && sessionPreview) {
    handleQueryResult();
  }

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    try {
      const sessionId = await joinSession({ code });
      handleClose();
      onSuccess(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join session');
      setIsJoining(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    setPreview(null);
    setIsLookingUp(false);
    setIsJoining(false);
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
                <Ionicons name="arrow-back" size={24} color="#6b7280" />
              </Pressable>
            )}
            <Text style={styles.title}>{preview ? 'Join Session' : 'Enter Code'}</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>

          {!preview ? (
            // Code Input State
            <View style={styles.content}>
              <Text style={styles.description}>
                Enter the 6-character code shared by your partner to join their session
              </Text>

              <TextInput
                style={[styles.codeInput, error && styles.inputError]}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="ABC123"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                autoFocus
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable
                style={[
                  styles.primaryButton,
                  (isLookingUp || code.length !== 6) && styles.buttonDisabled,
                ]}
                onPress={handlePreview}
                disabled={isLookingUp || code.length !== 6}
              >
                {isLookingUp ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Preview</Text>
                )}
              </Pressable>
            </View>
          ) : (
            // Preview State
            <View style={styles.content}>
              <View style={styles.previewCard}>
                <Text style={styles.previewName}>{preview.name}</Text>
                <View style={styles.previewMeta}>
                  <Ionicons name="person-outline" size={16} color="#6b7280" />
                  <Text style={styles.previewMetaText}>Created by {preview.ownerName}</Text>
                </View>
                <View style={styles.previewMeta}>
                  <Ionicons name="filter-outline" size={16} color="#6b7280" />
                  <Text style={styles.previewMetaText}>
                    {getGenderFilterLabel(preview.genderFilter)}
                  </Text>
                </View>
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.previewActions}>
                <Pressable
                  style={[styles.primaryButton, isJoining && styles.buttonDisabled]}
                  onPress={handleJoin}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Join Session</Text>
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
    backgroundColor: '#d1d5db',
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
    color: '#1a1a1a',
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
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
    textAlign: 'center',
  },
  codeInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 28,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: 8,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#ffffff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  previewCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  previewName: {
    fontSize: 20,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewMetaText: {
    fontSize: 14,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
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
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
  },
});
