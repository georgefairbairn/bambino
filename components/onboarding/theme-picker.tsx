import { View, Text, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export function ThemePicker() {
  return (
    <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Screen 3: Theme Picker</Text>
    </View>
  );
}
