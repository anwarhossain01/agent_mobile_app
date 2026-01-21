
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

import React, { useState, useEffect } from 'react';
import { Modal, View, TextInput, Text, Alert, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setAuth } from '../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { dark, darkBg, darkerBg, lightdark, lighterTextColor, textColor, theme } from '../../colors';
import { getCategoriesSubsAndProds, getClientsForAgent, loginEmployee } from '../api/prestashop';
import { cacheInitializer, storeAgentFromJson, syncCourierData, syncCustomersIncrementally, syncProductsAndCategoriesToDB } from '../sync/cached';
import { selectIsCategoryTreeSaved, setIsTreeSaved, setSavedAt } from '../store/slices/categoryTreeSlice';
import { selectIsSyncing, selectSyncStatusText, setStopRequested, setSyncing } from '../store/slices/databaseStatusSlice';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const is_saved = useSelector(selectIsCategoryTreeSaved);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const is_syncing = useSelector(selectIsSyncing);

  useEffect(() => {
    let interval = null;
    if (setupModalVisible) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [setupModalVisible]);

  useEffect(() => {
    if (is_syncing) {
      setElapsedSeconds(0);
      dispatch(setSyncing(false));
    }
  }, [is_syncing]);

  // const onLogin = async () => {
  //   if (email.length === 0 || password.length === 0) {
  //     Alert.alert('Please enter email and password');
  //     return;
  //   }
  //   setError(false);
  //   setLoading(true);
  //   const res = await loginEmployee(email, password);

  //   if (res.success) {
  //     await storeAgentFromJson(res);
  //     await cacheInitializer(res.employee?.id); // this functions stores a lot of data so takes a lot of time
  //     if (!is_saved) {
  //       const categoriesTree = await getCategoriesSubsAndProds();
  //       if (categoriesTree.success) {
  //         await saveCategoryTree(categoriesTree.data); // same for this one, we need this data
  //         dispatch(setIsTreeSaved(true));
  //       }
  //     }
  //     dispatch(setAuth({ token: res.token, employeeId: res.employee?.id, isLoggedIn: true }));
  //   } else {
  //     setError(true);
  //     setLoading(false);
  //   }
  // };
  const formatTime = (seconds: any) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const onLogin = async () => {
    if (email.length === 0 || password.length === 0) {
      Alert.alert('Please enter email and password');
      return;
    }
    setError(false);
    setLoading(true);

    const res = await loginEmployee(email, password);

    if (res.success) {
      dispatch(setStopRequested(false));
      await storeAgentFromJson(res);

      // Show modal BEFORE heavy work starts
      setSetupModalVisible(true);
      try {

        if (!is_saved) {
            await syncProductsAndCategoriesToDB();
            dispatch(setIsTreeSaved(true));
            dispatch(setSavedAt(new Date().toISOString()));
     
        }
        await syncCourierData();
        await syncCustomersIncrementally(res.employee?.id);
      //  await cacheInitializer(res.employee?.id); // initializes all the data, the huge as function

        dispatch(setAuth({ token: res.token, employeeId: res.employee?.id, isLoggedIn: true }));
      } catch (err) {
        console.error('Setup failed:', err);
        Alert.alert('Setup Error', 'Failed to initialize app data. Please try again.');
      } finally {
        setSetupModalVisible(false);
        setLoading(false);
      }
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

      {/* Setup Progress Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={setupModalVisible}
        onRequestClose={() => { }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color={theme} />
            <Text style={styles.modalTitle}>Configurazione del tuo account</Text>
            <Text style={styles.modalMessage}>
              Attendi mentre prepariamo i tuoi dati per l'uso offline...
            </Text>
            <Text style={[styles.modalMessage, { fontWeight: '500', color: textColor }]}>
              {useSelector(selectSyncStatusText)}
            </Text>
            <Text style={styles.timerText}>
              Tempo trascorso: {formatTime(elapsedSeconds)}
            </Text>
          </View>
        </View>
      </Modal>
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: darkBg,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: textColor,
    marginVertical: 16,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: lighterTextColor,
    textAlign: 'center',
    marginBottom: 12,
  },
  timerText: {
    fontSize: 14,
    color: theme,
    marginTop: 8,
    fontWeight: '500',
  },
});
