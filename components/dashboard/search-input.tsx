import { StyleSheet } from 'react-native';
import { StyledInput } from '@/components/ui/styled-input';

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
  return (
    <StyledInput
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmit}
      onClear={() => {
        onChangeText('');
        onClear?.();
      }}
      icon="search"
      returnKeyType="search"
      placeholder={placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
});
