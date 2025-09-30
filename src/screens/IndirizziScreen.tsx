
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const IndirizziScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Indirizzi Cliente</Text>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff'
  },
});

export default IndirizziScreen;