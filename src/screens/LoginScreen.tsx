
// navigation.reset({
//   index: 0,
//   routes: [{ name: 'Main' }],

// const res = await loginEmployee(email, password);
//  if (res.success) {
//   dispatch(setAuth({ token: res.token, employeeId: res.employee_id }));
//   // In a real app navigate to protected area
//   Alert.alert('Login successful');
// } else {
//   Alert.alert('Login failed');
// }

import React, { useState } from 'react';
import { View, TextInput, Text, Alert, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setAuth } from '../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { dark, darkBg, darkerBg, lightdark, lighterTextColor, textColor, theme } from '../../colors';
import { getCategoriesSubsAndProds, getClientsForAgent, loginEmployee } from '../api/prestashop';
import { cacheInitializer, saveCategoryTree, storeAgentFromJson } from '../sync/cached';
import { selectIsCategoryTreeSaved, setIsTreeSaved } from '../store/slices/categoryTreeSlice';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const is_saved = useSelector(selectIsCategoryTreeSaved);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const onLogin = async () => {
    if (email.length === 0 || password.length === 0) {
      Alert.alert('Please enter email and password');
      return;
    }
    setError(false);
    setLoading(true);
    const res = await loginEmployee(email, password);

    if (res.success) {
      await storeAgentFromJson(res);
      await cacheInitializer(res.employee?.id);
      if (!is_saved) {
        const categoriesTree = await getCategoriesSubsAndProds();
        if (categoriesTree.success) {
          await saveCategoryTree(categoriesTree.data);
          dispatch(setIsTreeSaved(true));
        }
      }

      dispatch(setAuth({ token: res.token, employeeId: res.employee?.id, isLoggedIn: true }));
    } else {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Login</Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor={lighterTextColor}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={lighterTextColor}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        {error ? <Text style={styles.errorTxt}>Wrong Password or Email !</Text> : null}
        {loading ? <ActivityIndicator color={theme} /> : (
          <TouchableOpacity style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        )}

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark,
    justifyContent: 'center',
    padding: 16,
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    color: textColor,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: darkerBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    color: textColor,
    backgroundColor: darkBg,
  },
  button: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  errorTxt: {
    color: 'red',
    fontSize: 14,
  }
});
