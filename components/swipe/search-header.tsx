import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/theme';

interface SearchHeaderProps {
  searchName: string;
  liked: number;
}

export function SearchHeader({ searchName, liked }: SearchHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
      </Pressable>

      <Text style={styles.title} numberOfLines={1}>
        {searchName}
      </Text>

      <Pressable style={styles.likedButton} onPress={() => router.push('/(tabs)/dashboard')}>
        <Text style={styles.likedText}>{liked}</Text>
        <Ionicons name="heart" size={16} color="#ef4444" />
      </Pressable>
    </View>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontFamily: Fonts?.display,
    fontSize: 20,
    color: '#1a1a1a',
    maxWidth: 180,
  },
  likedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  likedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
});
