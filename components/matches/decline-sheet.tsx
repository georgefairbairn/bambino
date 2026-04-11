import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';
import { StyledInput } from '@/components/ui/styled-input';

interface DeclineSheetProps {
  visible: boolean;
  nameName: string;
  onDecline: (message?: string) => void;
  onClose: () => void;
}

export function DeclineSheet({ visible, nameName, onDecline, onClose }: DeclineSheetProps) {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');

  const handleDecline = () => {
    onDecline(message.trim() || undefined);
    setMessage('');
  };

  const handleClose = () => {
    setMessage('');
    onClose();
  };

  return (
    <AnimatedBottomSheet visible={visible} onClose={handleClose} maxHeight="45%">
      <View style={styles.content}>
        <View style={styles.handleBar} />

        <Text style={styles.title}>Decline "{nameName}"?</Text>
        <Text style={styles.subtitle}>
          Your partner will be notified. You can both propose again anytime.
        </Text>

        <StyledInput
          value={message}
          onChangeText={(text) => setMessage(text.slice(0, 200))}
          placeholder="Add a note..."
          multiline
          maxLength={200}
          containerStyle={styles.inputContainer}
        />
        <Text style={styles.charCount}>{message.length}/200</Text>

        <View style={styles.buttons}>
          <Pressable
            style={styles.declineButton}
            onPress={handleDecline}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={handleClose}>
            <Text style={[styles.cancelButtonText, { color: colors.primary }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </AnimatedBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingBottom: 36,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  inputContainer: {
    width: '100%',
    paddingHorizontal: 24,
  },
  charCount: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
    alignSelf: 'flex-end',
    paddingRight: 28,
    marginTop: 4,
    marginBottom: 20,
  },
  buttons: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 12,
  },
  declineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  declineButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#6B5B7B',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
});
