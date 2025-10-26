
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { dark, textColor } from '../../colors';

const IndirizziScreen = () => {
  return (
    <View style={styles.container}>
    
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
    color: textColor
  },
});

export default IndirizziScreen;