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
  const prevFormatted = useRef(formatted);
  const digitHeight = fontSize * 1.3;

  const maxLen = Math.max(formatted.length, prevFormatted.current.length);
  const chars = formatted.padStart(maxLen).split('');
  const prevChars = prevFormatted.current.padStart(maxLen).split('');

  useEffect(() => {
    prevFormatted.current = formatted;
  }, [formatted]);

  return (
    <View style={styles.row}>
      {chars.map((char, i) => {
        const isDigit = DIGITS.includes(char);
        const changed = prevChars[i] !== char;

        if (!isDigit || !changed) {
          return (
            <Text key={`${i}-${char}`} style={[styles.char, textStyle]}>
              {char === ' ' ? '' : char}
            </Text>
          );
        }

        return (
          <SlotDigit
            key={`${i}-slot`}
            digit={char}
            prevDigit={prevChars[i]}
            digitHeight={digitHeight}
            textStyle={textStyle}
          />
        );
      })}
    </View>
  );
}

interface SlotDigitProps {
  digit: string;
  prevDigit: string;
  digitHeight: number;
  textStyle?: StyleProp<TextStyle>;
}

function SlotDigit({ digit, prevDigit, digitHeight, textStyle }: SlotDigitProps) {
  const fromIndex = DIGITS.indexOf(prevDigit);
  const toIndex = DIGITS.indexOf(digit);

  const translateY = useSharedValue(
    fromIndex >= 0 ? -fromIndex * digitHeight : -toIndex * digitHeight,
  );

  useEffect(() => {
    translateY.value = withTiming(-toIndex * digitHeight, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [toIndex, digitHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[styles.digitContainer, { height: digitHeight }]}>
      <Animated.View style={animatedStyle}>
        {DIGITS.map((d) => (
          <Text
            key={d}
            style={[styles.char, textStyle, { height: digitHeight, lineHeight: digitHeight }]}
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
    overflow: 'hidden',
  },
  digitContainer: {
    overflow: 'hidden',
  },
  char: {
    fontSize: 28,
    textAlign: 'center',
  },
});
