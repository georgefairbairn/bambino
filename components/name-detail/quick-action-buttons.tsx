import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';

type Context = 'swipe' | 'liked' | 'rejected';

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

  if (context === 'swipe') {
    return (
      <View style={styles.container}>
        <Pressable style={[styles.button, styles.rejectButton]} onPress={onReject}>
          <Ionicons name="close" size={24} color="#ef4444" />
          <Text style={[styles.buttonText, styles.rejectText]}>Reject</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.likeButton]} onPress={onLike}>
          <Ionicons name="heart" size={24} color="#22c55e" />
          <Text style={[styles.buttonText, styles.likeText]}>Like</Text>
        </Pressable>
      </View>
    );
  }

  if (context === 'liked') {
    return (
      <View style={styles.container}>
        <Pressable style={[styles.button, styles.removeButton]} onPress={handleRemove}>
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
          <Text style={[styles.buttonText, styles.removeText]}>Remove from Liked</Text>
        </Pressable>
      </View>
    );
  }

  // context === 'rejected'
  return (
    <View style={styles.container}>
      <Pressable style={[styles.button, styles.restoreButton]} onPress={handleRestore}>
        <Ionicons name="refresh-outline" size={24} color="#0a7ea4" />
        <Text style={[styles.buttonText, styles.restoreText]}>Restore</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.hideButton]} onPress={handleHide}>
        <Ionicons name="eye-off-outline" size={24} color="#ef4444" />
        <Text style={[styles.buttonText, styles.hideText]}>Hide</Text>
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
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    fontWeight: '600',
  },
  // Swipe context buttons
  likeButton: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  likeText: {
    color: '#22c55e',
  },
  rejectButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  rejectText: {
    color: '#ef4444',
  },
  // Liked context button
  removeButton: {
    backgroundColor: '#ffffff',
    borderColor: '#ef4444',
  },
  removeText: {
    color: '#ef4444',
  },
  // Rejected context buttons
  restoreButton: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0a7ea4',
  },
  restoreText: {
    color: '#0a7ea4',
  },
  hideButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  hideText: {
    color: '#ef4444',
  },
});
