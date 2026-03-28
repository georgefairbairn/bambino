import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

interface SlotCounterProps {
  value: number;
  fontSize?: number;
  textStyle?: StyleProp<TextStyle>;
}

export function SlotCounter({ value, fontSize = 28, textStyle }: SlotCounterProps) {
  const formatted = value.toLocaleString();
  const digitHeight = fontSize * 1.4;

  // Pad to consistent length so digit positions stay stable
  const chars = formatted.split('');

  return (
    <View style={styles.row}>
      {chars.map((char, i) => {
        const isDigit = DIGITS.includes(char);

        if (!isDigit) {
          // Render commas and other separators as static text
          return (
            <Text key={`sep-${i}`} style={[styles.char, { fontSize }, textStyle]}>
              {char}
            </Text>
          );
        }

        // Always render an animated slot for digit positions
        return (
          <SlotDigit
            key={`digit-${chars.length}-${i}`}
            digit={Number(char)}
            digitHeight={digitHeight}
            fontSize={fontSize}
            textStyle={textStyle}
          />
        );
      })}
    </View>
  );
}

interface SlotDigitProps {
  digit: number;
  digitHeight: number;
  fontSize: number;
  textStyle?: StyleProp<TextStyle>;
}

function SlotDigit({ digit, digitHeight, fontSize, textStyle }: SlotDigitProps) {
  const translateY = useSharedValue(-digit * digitHeight);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // Jump to position on first render (no animation)
      isFirstRender.current = false;
      translateY.value = -digit * digitHeight;
      return;
    }

    translateY.value = withTiming(-digit * digitHeight, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [digit, digitHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[styles.digitContainer, { height: digitHeight }]}>
      <Animated.View style={animatedStyle}>
        {DIGITS.map((d) => (
          <Text
            key={d}
            style={[
              styles.char,
              { fontSize, height: digitHeight, lineHeight: digitHeight },
              textStyle,
            ]}
          >
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  digitContainer: {
    overflow: 'hidden',
  },
  char: {
    textAlign: 'center',
  },
});
