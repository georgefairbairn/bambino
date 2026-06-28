import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Modal,
  Dimensions,
  Keyboard,
  Platform,
  View,
  type KeyboardEvent,
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
  // Lift the sheet above the keyboard manually. KeyboardAvoidingView is
  // unreliable inside a <Modal> on iOS (the modal presents in a separate view
  // controller, so KAV measures the wrong origin and applies no inset), which
  // left action buttons hidden behind the keyboard on device.
  const keyboardHeight = useSharedValue(0);
  // Track keyboard visibility so a tap outside the sheet collapses the keyboard
  // first (keeping the sheet open and any typed text), instead of closing the
  // sheet. Without this, with a multiline input up there's no way to dismiss
  // the keyboard to reach the action buttons it overlaps.
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    // iOS fires `Will*` events ahead of the keyboard animation, letting the
    // sheet rise in sync; Android only reliably reports the final frame.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setKeyboardVisible(true);
      keyboardHeight.value = withTiming(e.endCoordinates.height, {
        duration: e.duration || DURATION,
        easing: Easing.out(Easing.ease),
      });
    });
    const hideSub = Keyboard.addListener(hideEvent, (e: KeyboardEvent) => {
      setKeyboardVisible(false);
      keyboardHeight.value = withTiming(0, {
        duration: e.duration || DURATION,
        easing: Easing.out(Easing.ease),
      });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
    // keyboardHeight is a stable useSharedValue ref; omitted from deps.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    transform: [{ translateY: sheetTranslateY.value - keyboardHeight.value }],
  }));

  // Reset values when modal becomes invisible to prepare for next open
  useEffect(() => {
    if (!visible) {
      backdropOpacity.value = 0;
      sheetTranslateY.value = SCREEN_HEIGHT;
      keyboardHeight.value = 0;
    }
    // shared values are stable useSharedValue refs; omitted from deps.
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} transparent statusBarTranslucent onRequestClose={animateOut}>
      <View style={styles.overlay}>
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
      </View>
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
