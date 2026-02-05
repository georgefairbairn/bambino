import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder = 'Search names...',
}: SearchInputProps) {
  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={20} color="#9ca3af" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#1f2937',
  },
  clearButton: {
    padding: 4,
  },
});
