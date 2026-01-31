import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UndoButtonProps {
  onUndo: () => void;
}

export function UndoButton({ onUndo }: UndoButtonProps) {
  return (
    <Pressable
      onPress={onUndo}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Ionicons name="arrow-undo" size={18} color="#6b7280" />
      <Text style={styles.text}>Undo</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'absolute',
    bottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.7,
    backgroundColor: '#f9fafb',
  },
  text: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
});
