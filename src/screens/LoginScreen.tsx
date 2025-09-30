
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
import { View, TextInput, Text, Alert, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useDispatch } from 'react-redux';
import { setAuth } from '../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { dark } from '../../colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const onLogin = async () => {
    if (email.length === 0 || password.length === 0) {
      Alert.alert('Please enter email and password');
      return;
    }

    if (email == 'mailbox@mondoweb.it' && password == 'Mondoweb_2025') {
      dispatch(setAuth({ token: 'token', employeeId: 24, isLoggedIn: true }));
    }
    else{
      Alert.alert("Wrong Password or Email !")
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Employee Login</Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <TouchableOpacity style={styles.button} onPress={onLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
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
    color: '#fff',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    color: '#fff',
    backgroundColor: '#222',
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
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
