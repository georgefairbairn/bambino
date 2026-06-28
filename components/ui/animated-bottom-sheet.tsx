import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Modal,
  Dimensions,
  Keyboard,
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
  // Track keyboard visibility so a tap outside the sheet collapses the keyboard
  // first (keeping the sheet open and any typed text), instead of closing the
  // sheet. Without this, with a multiline input up there's no way to dismiss
  // the keyboard to reach the action buttons it overlaps.
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    // backdropOpacity & sheetTranslateY are stable useSharedValue refs; omitted from deps.
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const animateOut = () => {
    Keyboard.dismiss();
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

  // A tap outside the sheet collapses the keyboard if it's up (keeping the
  // sheet open); only when the keyboard is already down does it close the sheet.
  const handleBackdropPress = () => {
    if (keyboardVisible) {
      Keyboard.dismiss();
    } else {
      animateOut();
    }
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
    // backdropOpacity & sheetTranslateY are stable useSharedValue refs; omitted from deps.
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} transparent statusBarTranslucent onRequestClose={animateOut}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="none" />

        <Pressable
          style={{ flex: 1 }}
          onPress={handleBackdropPress}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />

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
