import { Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface ExploreHeaderProps {
  liked: number;
  onFilterPress: () => void;
}

export function ExploreHeader({ liked, onFilterPress }: ExploreHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.container}>
      <Pressable
        style={[styles.filterPill, { shadowColor: colors.secondary }]}
        onPress={onFilterPress}
      >
        <Ionicons name="options-outline" size={16} color="#2D1B4E" />
        <Text style={styles.filterLabel}>Filters</Text>
      </Pressable>

      <Pressable
        style={[styles.likedButton, { shadowColor: colors.secondary }]}
        onPress={() => router.push('/(tabs)/dashboard')}
      >
        <Text style={styles.likedText}>{liked}</Text>
        <Ionicons name="heart" size={16} color={colors.primary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  likedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  likedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5B7B',
  },
});
