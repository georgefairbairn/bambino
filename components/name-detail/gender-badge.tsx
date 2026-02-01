import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';

type Gender = 'boy' | 'girl' | 'unisex';
type Size = 'small' | 'large';

interface GenderBadgeProps {
  gender: Gender;
  size?: Size;
}

const GENDER_CONFIG: Record<Gender, { emoji: string; bg: string; text: string; label: string }> = {
  boy: {
    emoji: '👦',
    bg: '#dbeafe',
    text: '#2563eb',
    label: 'Boy',
  },
  girl: {
    emoji: '👧',
    bg: '#fce7f3',
    text: '#db2777',
    label: 'Girl',
  },
  unisex: {
    emoji: '👶',
    bg: '#f3e8ff',
    text: '#9333ea',
    label: 'Unisex',
  },
};

export function GenderBadge({ gender, size = 'large' }: GenderBadgeProps) {
  const config = GENDER_CONFIG[gender] ?? GENDER_CONFIG.unisex;
  const isLarge = size === 'large';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isLarge && styles.badgeLarge]}>
      <Text style={[styles.emoji, isLarge && styles.emojiLarge]}>{config.emoji}</Text>
      <Text style={[styles.label, { color: config.text }, isLarge && styles.labelLarge]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  emoji: {
    fontSize: 14,
  },
  emojiLarge: {
    fontSize: 20,
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    fontWeight: '600',
  },
  labelLarge: {
    fontSize: 16,
  },
});
