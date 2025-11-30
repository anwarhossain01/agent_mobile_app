import React, { useState } from 'react';
import { View, Text, Button, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { lightdark, textColor, theme } from '../../colors';
import { getDBConnection } from '../database/db';
import { clearDatabase } from '../sync/cached';
import { setCustomerSyncStatus, setLastCutomerSyncDate, setSyncStatusText } from '../store/slices/databaseStatusSlice';
import { setIsTreeSaved, setSavedAt } from '../store/slices/categoryTreeSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await clearDatabase();
    dispatch(setCustomerSyncStatus({ current_customer_length: 0, last_customer_id: 0, last_customer_page_synced: 0 }));
    dispatch(setLastCutomerSyncDate(''));
    dispatch(setSyncStatusText(''));
    dispatch(setIsTreeSaved(false));
    dispatch(setSavedAt(''));
    await AsyncStorage.clear();
    dispatch(logout())
    setLoading(false);
  }

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
        disabled={loading}
        onPress={handleLogout }
      >
        {loading ? <ActivityIndicator color={lightdark} /> : <Text style={{ color: 'white', fontWeight: 800 }}>Logout</Text>}
      </TouchableOpacity>
    </View>
  );
}
