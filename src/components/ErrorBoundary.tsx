import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallbackColors?: {
    background: string;
    text: string;
    primary: string;
    card: string;
  };
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error caught by boundary:', error, errorInfo);
  }

  private handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  public render() {
    if (this.state.hasError) {
      const bg = this.props.fallbackColors?.background || '#F8F9FE';
      const text = this.props.fallbackColors?.text || '#1E1B4B';
      const primary = this.props.fallbackColors?.primary || '#4D44E1';
      const card = this.props.fallbackColors?.card || '#FFFFFF';

      return (
        <View style={[styles.container, { backgroundColor: bg }]}>
          <View style={[styles.card, { backgroundColor: card }]}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={36} color="#EF4444" />
            </View>
            <Text style={[styles.title, { color: text }]}>SaaS AI Brain</Text>
            <Text style={styles.subtitle}>
              An unexpected display issue occurred. You can safely refresh the application.
            </Text>
            {this.state.error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText} numberOfLines={3}>
                  {this.state.error.message || String(this.state.error)}
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.reloadButton, { backgroundColor: primary }]}
              onPress={this.handleReload}
              activeOpacity={0.85}
            >
              <RefreshCw size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.reloadButtonText}>Reload Application</Text>
            </TouchableOpacity>
          </View>
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
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

