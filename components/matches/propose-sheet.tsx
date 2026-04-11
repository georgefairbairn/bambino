import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';
import { StyledInput } from '@/components/ui/styled-input';
import { Doc } from '@/convex/_generated/dataModel';

interface ProposeSheetProps {
  visible: boolean;
  name: Doc<'names'> | null;
  onPropose: (message?: string) => void;
  onClose: () => void;
}

export function ProposeSheet({ visible, name, onPropose, onClose }: ProposeSheetProps) {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');

  const handlePropose = () => {
    onPropose(message.trim() || undefined);
    setMessage('');
  };

  const handleClose = () => {
    setMessage('');
    onClose();
  };

  if (!name) return null;

  return (
    <AnimatedBottomSheet visible={visible} onClose={handleClose} maxHeight="50%">
      <View style={styles.content}>
        <View style={styles.handleBar} />

        <Text style={styles.title}>Propose This Name?</Text>
        <Text style={styles.name}>{name.name}</Text>
        <Text style={styles.subtitle}>
          Your partner will be asked to accept or decline.
        </Text>

        <StyledInput
          value={message}
          onChangeText={(text) => setMessage(text.slice(0, 200))}
          placeholder="Add a note for your partner..."
          multiline
          maxLength={200}
          containerStyle={styles.inputContainer}
        />
        <Text style={styles.charCount}>{message.length}/200</Text>

        <View style={styles.buttons}>
          <Pressable
            style={[styles.proposeButton, { backgroundColor: colors.primary }]}
            onPress={handlePropose}
          >
            <Text style={styles.proposeButtonText}>Propose</Text>
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
  name: {
    fontSize: 36,
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
  proposeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  proposeButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
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
