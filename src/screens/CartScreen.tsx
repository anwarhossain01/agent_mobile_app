import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { dark } from '../../colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const CartScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Carrello della spesa</Text>
        <Text style={{ fontSize: 21, marginBottom: 8, color: '#fff', textAlign: 'center' }}>IN DEVELOPMENT</Text>
    </SafeAreaView>
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

export default CartScreen;