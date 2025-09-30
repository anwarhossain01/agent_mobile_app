import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import LoginScreen from './src/screens/LoginScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import CatalogScreen from './src/screens/CatalogScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { View, Text } from 'react-native';

const Tab = createBottomTabNavigator();

export default function App() {
  // Note: in a real app you'd conditionally show Login when not authenticated
  return (
    <Provider store={store}>
      <PersistGate loading={<View><Text>Loading...</Text></View>} persistor={persistor}>
        <NavigationContainer>
          <Tab.Navigator initialRouteName="Clients">
            <Tab.Screen name="Clients" component={ClientsScreen} />
            <Tab.Screen name="Catalog" component={CatalogScreen} />
            <Tab.Screen name="Orders" component={OrdersScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
}
