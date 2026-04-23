import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { useSkinTone } from '@/contexts/skin-tone-context';
import { getGenderEmoji } from '@/constants/skin-tone';

type Gender = 'boy' | 'girl' | 'unisex';
type Size = 'small' | 'large';

interface GenderBadgeProps {
  gender: Gender;
  size?: Size;
}

const GENDER_CONFIG: Record<Gender, { bg: string; text: string; label: string }> = {
  boy: {
    bg: '#E3F0FF',
    text: '#7CB9E8',
    label: 'Boy',
  },
  girl: {
    bg: '#FFE4EC',
    text: '#FF8FAB',
    label: 'Girl',
  },
  unisex: {
    bg: '#f3e8ff',
    text: '#C4A7E7',
    label: 'Unisex',
  },
};

export function GenderBadge({ gender, size = 'large' }: GenderBadgeProps) {
  const { colors } = useTheme();
  const { skinTone } = useSkinTone();
  const config = GENDER_CONFIG[gender] ?? GENDER_CONFIG.unisex;
  const isLarge = size === 'large';

  const bgColor = gender === 'unisex' ? colors.secondaryLight : config.bg;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, isLarge && styles.badgeLarge]}>
      <Text style={[styles.emoji, isLarge && styles.emojiLarge]}>
        {getGenderEmoji(gender, skinTone)}
      </Text>
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
    alignSelf: 'flex-start',
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
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  labelLarge: {
    fontSize: 16,
  },
});
