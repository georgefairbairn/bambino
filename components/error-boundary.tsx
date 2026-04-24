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

      return <ErrorFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { colors, gradients } = useTheme();

  return (
    <LinearGradient colors={[...gradients.screenBg]} style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="heart-half-outline" size={56} color={colors.primary} />
      </View>
      <Text style={styles.title}>Oops!</Text>
      <Text style={styles.message}>
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
    color: '#2D1B4E',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
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
