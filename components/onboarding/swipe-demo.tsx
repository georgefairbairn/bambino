import { View, Text, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export function SwipeDemo() {
  return (
    <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Screen 2: Swipe Demo</Text>
    </View>
  );
}
