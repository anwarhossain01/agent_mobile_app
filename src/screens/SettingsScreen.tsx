import React from 'react';
import { View, Text, Button, TouchableOpacity, Dimensions } from 'react-native';
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { textColor } from '../../colors';
// import { LineChart } from 'react-native-chart-kit';

export default function SettingsScreen() {
  const dispatch = useDispatch();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 8, color: textColor }}>Logout</Text>
      <View style={{ marginBottom: 16 }}></View>
      
      <TouchableOpacity
        style={{
          backgroundColor: '#ff462eff',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={() => dispatch(logout())}
      >
        <Text style={{ color: 'white', fontWeight: 800 }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
