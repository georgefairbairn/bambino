import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

type Context = 'swipe' | 'liked' | 'rejected' | 'match';

interface QuickActionButtonsProps {
  context: Context;
  nameName: string;
  onLike?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
  onRestore?: () => void;
  onHide?: () => void;
}

export function QuickActionButtons({
  context,
  nameName,
  onLike,
  onReject,
  onRemove,
  onRestore,
  onHide,
}: QuickActionButtonsProps) {
  const { colors } = useTheme();

  const handleRemove = () => {
    Alert.alert(
      'Remove from Liked',
      `Remove "${nameName}" from your liked names? It will reappear in your swipe queue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ],
    );
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore to Queue',
      `Restore "${nameName}" to your swipe queue? You'll be able to reconsider this name.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: onRestore },
      ],
    );
  };

  const handleHide = () => {
    Alert.alert(
      'Hide Permanently',
      `Hide "${nameName}" permanently? It will never appear in your swipe queue again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Hide', style: 'destructive', onPress: onHide },
      ],
    );
  };

  if (context === 'match') {
    return null;
  }

  if (context === 'swipe') {
    return (
      <View style={styles.container}>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primaryLight, borderColor: '#FF6B6B' }]}
          onPress={onReject}
        >
          <Ionicons name="close" size={24} color="#FF6B6B" />
          <Text style={[styles.buttonText, { color: '#FF6B6B' }]}>Reject</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.likeButton]} onPress={onLike}>
          <Ionicons name="heart" size={24} color="#6DD5A0" />
          <Text style={[styles.buttonText, styles.likeText]}>Like</Text>
        </Pressable>
      </View>
    );
  }

  if (context === 'liked') {
    return (
      <View style={styles.container}>
        <Pressable style={[styles.button, styles.removeButton]} onPress={handleRemove}>
          <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
          <Text style={[styles.buttonText, styles.removeText]}>Remove from Liked</Text>
        </Pressable>
      </View>
    );
  }

  // context === 'rejected'
  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.button,
          { backgroundColor: colors.primaryLight, borderColor: colors.primary },
        ]}
        onPress={handleRestore}
      >
        <Ionicons name="refresh-outline" size={24} color={colors.primary} />
        <Text style={[styles.buttonText, { color: colors.primary }]}>Restore</Text>
      </Pressable>
      <Pressable
        style={[styles.button, { backgroundColor: colors.primaryLight, borderColor: '#FF6B6B' }]}
        onPress={handleHide}
      >
        <Ionicons name="eye-off-outline" size={24} color="#FF6B6B" />
        <Text style={[styles.buttonText, { color: '#FF6B6B' }]}>Hide</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  // Swipe context buttons
  likeButton: {
    backgroundColor: '#E8FFF0',
    borderColor: '#6DD5A0',
  },
  likeText: {
    color: '#6DD5A0',
  },
  // Liked context button
  removeButton: {
    backgroundColor: '#ffffff',
    borderColor: '#FF6B6B',
  },
  removeText: {
    color: '#FF6B6B',
  },
});
