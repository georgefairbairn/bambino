import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTheme } from '@/contexts/theme-context';
import { Fonts } from '@/constants/theme';
import { Events, trackEvent } from '@/lib/analytics';

/**
 * In-app push-notifications toggle (#229). Writes users.pushNotificationsEnabled;
 * absent/true = on, false = off (the send path checks this). iOS-level mute still
 * applies independently — this is the in-app control.
 */
export function NotificationsSection() {
  const { colors } = useTheme();
  const user = useQuery(api.users.getCurrentUser);
  const setEnabled = useMutation(api.users.setPushNotificationsEnabled);

  const serverEnabled = user?.pushNotificationsEnabled !== false;
  // Optimistic override so the switch flips instantly instead of waiting for the
  // Convex round-trip; cleared once the server value catches up, reverted on error.
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const enabled = optimistic ?? serverEnabled;

  useEffect(() => {
    if (optimistic !== null && serverEnabled === optimistic) setOptimistic(null);
  }, [serverEnabled, optimistic]);

  const handleToggle = (value: boolean) => {
    setOptimistic(value);
    trackEvent(Events.NOTIFICATIONS_TOGGLED, { enabled: value });
    setEnabled({ enabled: value }).catch(() => setOptimistic(null));
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Ionicons
          name="notifications-outline"
          size={22}
          color="#6B5B7B"
          style={{ marginRight: 12 }}
        />
        <View style={styles.textWrap}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Partner matches & proposals</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          disabled={user === undefined}
          trackColor={{ false: '#E5DDD0', true: colors.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E5DDD0"
          accessibilityLabel="Toggle notifications"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    marginTop: 2,
  },
});
