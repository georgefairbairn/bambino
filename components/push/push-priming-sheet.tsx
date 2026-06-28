import { useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BUTTON_TEXT, Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';

interface PushPrimingSheetProps {
  visible: boolean;
  onAllow: () => Promise<void>;
  onDismiss: () => void;
}

export function PushPrimingSheet({ visible, onAllow, onDismiss }: PushPrimingSheetProps) {
  const { colors } = useTheme();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      await onAllow();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <AnimatedBottomSheet visible={visible} onClose={onDismiss} maxHeight="50%">
      <View style={styles.content}>
        <View style={styles.handleBar} />

        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="heart" size={32} color={colors.primary} />
        </View>

        <Text style={styles.title}>{"Don't miss a match"}</Text>
        <Text style={styles.subtitle}>
          Get a notification the moment you and your partner like the same name.
        </Text>

        <View style={styles.buttons}>
          <Pressable
            style={[styles.allowButton, { backgroundColor: colors.primary }]}
            onPress={handleAllow}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.allowButtonText}>Allow Notifications</Text>
            )}
          </Pressable>
          <Pressable style={styles.dismissButton} onPress={onDismiss} disabled={isRequesting}>
            <Text style={[styles.dismissButtonText, { color: colors.primary }]}>Not now</Text>
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
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  buttons: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 4,
  },
  allowButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  allowButtonText: {
    ...BUTTON_TEXT.cta,
    color: '#fff',
  },
  dismissButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  dismissButtonText: BUTTON_TEXT.cta,
});
