
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { dark } from '../../colors';

const IndirizziScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Indirizzi Cliente</Text>
    
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: dark,
  },
  heading: {
    fontSize: 18,
    marginBottom: 8,
    color: '#fff'
  },
});

export default IndirizziScreen;