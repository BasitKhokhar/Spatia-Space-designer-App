import { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Top-level safety net so a render-phase crash anywhere outside the 3D
// canvas's own ModelBoundary (src/three/models.jsx) is logged and shown as a
// recoverable screen instead of the app going dark with no trace in the logs.
//
// Also used to fence off subtrees that can fail on their own, by passing a
// `fallback` element — the 3D canvas does this so a GL or scene-graph throw
// costs the viewer, not the whole app. `label` just tags the log line.
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error(
      `[${this.props.label || 'app'}] uncaught render error`,
      error?.message || error,
      error?.stack,
      info?.componentStack
    );
  }

  render() {
    if (this.state.failed) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>The app hit an unexpected error. Check the console log for details.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#111' },
  title: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  body: { color: '#ccc', fontSize: 14, textAlign: 'center' },
});
