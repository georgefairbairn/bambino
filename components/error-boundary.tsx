import React, { Component, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sentry from '@sentry/react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** When true, the fallback uses the active theme via useTheme(). Only safe
   *  when this boundary is mounted INSIDE ThemeProvider. The outermost
   *  boundary must NOT set this — if ThemeProvider itself errored, useTheme
   *  would throw and the fallback would crash again. (#153) */
  themed?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return this.props.themed ? (
        <ThemedErrorFallback onRetry={this.handleRetry} />
      ) : (
        <BareErrorFallback onRetry={this.handleRetry} />
      );
    }

    return this.props.children;
  }
}

// Hardcoded styling — no provider deps. Safe to render even if Theme,
// Clerk, or Convex providers are the cause of the crash. Used as the
// outermost fallback (#153).
const FALLBACK_BG = '#FFF8E7';
const FALLBACK_PRIMARY = '#F5C84B';
const FALLBACK_PRIMARY_DARK = '#E8A93B';
const FALLBACK_ACCENT_LIGHT = '#FCE9B6';
const FALLBACK_TEXT_DARK = '#2D1B4E';
const FALLBACK_TEXT_MUTED = '#6B5B7B';

function BareErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={[styles.container, { backgroundColor: FALLBACK_BG }]}>
      <View style={[styles.iconContainer, { backgroundColor: FALLBACK_ACCENT_LIGHT }]}>
        <Ionicons name="heart-half-outline" size={56} color={FALLBACK_PRIMARY} />
      </View>
      <Text style={[styles.title, { color: FALLBACK_TEXT_DARK }]}>Oops!</Text>
      <Text style={[styles.message, { color: FALLBACK_TEXT_MUTED }]}>
        Something didn&apos;t go as planned.{'\n'}A quick refresh should fix things up.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.retryButton, { opacity: pressed ? 0.85 : 1 }]}
        onPress={onRetry}
      >
        <View style={[styles.retryButtonGradient, { backgroundColor: FALLBACK_PRIMARY_DARK }]}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
          <Text style={styles.retryText}>Refresh</Text>
        </View>
      </Pressable>
    </View>
  );
}

function ThemedErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { colors, gradients } = useTheme();

  return (
    <LinearGradient colors={[...gradients.screenBg]} style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="heart-half-outline" size={56} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: '#2D1B4E' }]}>Oops!</Text>
      <Text style={[styles.message, { color: '#6B5B7B' }]}>
        Something didn&apos;t go as planned.{'\n'}A quick refresh should fix things up.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.retryButton, { opacity: pressed ? 0.85 : 1 }]}
        onPress={onRetry}
      >
        <LinearGradient
          colors={[...gradients.buttonPrimary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.retryButtonGradient}
        >
          <Ionicons name="refresh-outline" size={20} color="#fff" />
          <Text style={styles.retryText}>Refresh</Text>
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    gap: 8,
  },
  retryText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
});
