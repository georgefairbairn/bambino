import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';

export default function AuthLayout() {
  const { gradients } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: gradients.screenBg[0] },
        animation: 'slide_from_right',
      }}
    />
  );
}
