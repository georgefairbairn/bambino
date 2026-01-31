import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';

interface SessionHeaderProps {
  sessionName: string;
  reviewed: number;
  liked: number;
}

export function SessionHeader({ sessionName, reviewed, liked }: SessionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sessionName}>{sessionName}</Text>
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>{reviewed} reviewed</Text>
        <Text style={styles.statsSeparator}>|</Text>
        <View style={styles.likedContainer}>
          <Text style={styles.statsText}>{liked}</Text>
          <Ionicons name="heart" size={14} color="#ef4444" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  sessionName: {
    fontFamily: Fonts?.display,
    fontSize: 24,
    color: '#000',
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#4b5563',
  },
  statsSeparator: {
    fontSize: 14,
    color: '#9ca3af',
  },
  likedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
