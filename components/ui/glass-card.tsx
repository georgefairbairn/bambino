import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { View } from 'react-native';

interface GlassCardProps {
  intensity?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassCard({ intensity = 40, children, style }: GlassCardProps) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint="light" style={[styles.glass, style]}>
        {children}
      </BlurView>
    );
  }

  return <View style={[styles.glass, styles.androidFallback, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
  },
  androidFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
});
