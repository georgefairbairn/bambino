import { useEffect, type ReactNode } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DURATION = 300;

interface AnimatedBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export function AnimatedBottomSheet({
  visible,
  onClose,
  children,
  maxHeight = '85%',
  backgroundColor = '#fff',
  style,
}: AnimatedBottomSheetProps) {
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, {
        duration: DURATION,
        easing: Easing.out(Easing.ease),
      });
      sheetTranslateY.value = withTiming(0, {
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [visible]);

  const animateOut = () => {
    backdropOpacity.value = withTiming(0, {
      duration: 200,
      easing: Easing.in(Easing.ease),
    });
    sheetTranslateY.value = withTiming(
      SCREEN_HEIGHT,
      {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      },
    );
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  // Reset values when modal becomes invisible to prepare for next open
  useEffect(() => {
    if (!visible) {
      backdropOpacity.value = 0;
      sheetTranslateY.value = SCREEN_HEIGHT;
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent statusBarTranslucent onRequestClose={animateOut}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={animateOut} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            { maxHeight: maxHeight as any, backgroundColor },
            style,
          ]}
        >
          {children}
        </Animated.View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});
