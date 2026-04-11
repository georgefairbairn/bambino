import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Share } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { Confetti } from '@/components/ui/confetti';
import * as Haptics from 'expo-haptics';

interface CelebrationModalProps {
  visible: boolean;
  nameName: string;
  onClose: () => void;
}

export function CelebrationModal({ visible, nameName, onClose }: CelebrationModalProps) {
  const { colors } = useTheme();

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `We've chosen a name! ${nameName}\n\nDiscovered together on Bambino`,
        title: "We've chosen a name!",
      });
    } catch {
      // User cancelled share
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Confetti visible={visible} />
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.content}
        >
          <Animated.Text
            entering={ZoomIn.delay(200).duration(500).springify()}
            style={styles.name}
          >
            {nameName}
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.delay(500).duration(400)}
            style={styles.subtitle}
          >
            You both chose this name
          </Animated.Text>

          <Animated.View
            entering={FadeIn.delay(800).duration(400)}
            style={styles.buttons}
          >
            <Pressable
              style={[styles.shareButton, { backgroundColor: colors.primary }]}
              onPress={handleShare}
            >
              <Text style={styles.shareButtonText}>Share with Family</Text>
            </Pressable>
            <Pressable style={styles.doneButton} onPress={onClose}>
              <Text style={[styles.doneButtonText, { color: colors.primary }]}>Done</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: 52,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    marginBottom: 48,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
});
