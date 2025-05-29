import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export const LoadingOverlay: React.FC = () => (
  <View style={styles.overlay}>
    <ActivityIndicator size="large" color="#8AA75A" />
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});