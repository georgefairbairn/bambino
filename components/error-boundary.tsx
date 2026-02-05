import React, { Component, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';

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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning-outline" size={64} color="#ef4444" />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Pressable style={styles.retryButton} onPress={this.handleRetry}>
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C6E7F5',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1f2937',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  retryText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
});
