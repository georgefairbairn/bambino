import { View, Text, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export function WelcomeSplash() {
  return (
    <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Screen 1: Welcome</Text>
    </View>
  );
}
