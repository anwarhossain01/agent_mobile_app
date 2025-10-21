// import React from 'react';
// import { Provider } from 'react-redux';
// import { NavigationContainer } from '@react-navigation/native';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { PersistGate } from 'redux-persist/integration/react';
// import { store, persistor } from './src/store';
// import LoginScreen from './src/screens/LoginScreen';
// import ClientsScreen from './src/screens/ClientsScreen';
// import CatalogScreen from './src/screens/CatalogScreen';
// import OrdersScreen from './src/screens/OrdersScreen';
// import SettingsScreen from './src/screens/SettingsScreen';
// import { View, Text } from 'react-native';

// const Tab = createBottomTabNavigator();
// const Stack = createNativeStackNavigator();

// // put your tabs here
// function MainTabs() {
//   return (
//     <Tab.Navigator initialRouteName="Clients">
//       <Tab.Screen name="Clients" component={ClientsScreen} />
//       <Tab.Screen name="Catalog" component={CatalogScreen} />
//       <Tab.Screen name="Orders" component={OrdersScreen} />
//       <Tab.Screen name="Settings" component={SettingsScreen} />
//     </Tab.Navigator>
//   );
// }

// export default function App() {
//   const isLoggedIn = false; // 👉 replace with your redux/auth state

//   return (
//     <Provider store={store}>
//       <PersistGate loading={<View><Text>Loading...</Text></View>} persistor={persistor}>
//         <NavigationContainer>
//           <Stack.Navigator screenOptions={{ headerShown: false }}>
//             {isLoggedIn ? (
//               <Stack.Screen name="Main" component={MainTabs} />
//             ) : (
//               <Stack.Screen name="Login" component={LoginScreen} />
//             )}
//           </Stack.Navigator>
//         </NavigationContainer>
//       </PersistGate>
//     </Provider>
//   );
// }

import React, { useEffect, useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import LoginScreen from './src/screens/LoginScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import CatalogScreen from './src/screens/CatalogScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import IndirizziScreen from './src/screens/IndirizziScreen';
import ClientsMenuModal from './src/components/modals/ClientsMenuModal';
import CatalogueMenuModal from './src/components/modals/CatalogueMenuModal';
import { dark } from './colors';
import OrderMenuModal from './src/components/modals/OrderMenuModal';
import ProductListScreen from './src/screens/ProductListScreen';
import NewOrderScreen from './src/screens/NewOrderScreen';
import CartScreen from './src/screens/CartScreen';
import { initDatabase } from './src/database/init';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeAllProductStock } from './src/sync/cached';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ClientsStack = createNativeStackNavigator();
const CatalogueStack = createNativeStackNavigator();
const OrderStack = createNativeStackNavigator();

function ClientsStackNavigator() {
  return (
    <ClientsStack.Navigator screenOptions={{ headerShown: false }}>
      <ClientsStack.Screen name="Clients" component={ClientsScreen} />
      <ClientsStack.Screen name="ClientsAddresses" component={IndirizziScreen} />
    </ClientsStack.Navigator>
  );
}

function CatalogueStackNavigator() {
  return (
    <CatalogueStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <CatalogueStack.Screen name="Catalog" component={CatalogScreen} />
      <ClientsStack.Screen name="ProductList" component={ProductListScreen} />
    </CatalogueStack.Navigator>
  );
}

function OrderStackNavigator() {
  return (
    <OrderStack.Navigator screenOptions={{ headerShown: false }}>
      <OrderStack.Screen name="Orders" component={OrdersScreen} />
      <OrderStack.Screen name="NewOrders" component={NewOrderScreen} />
      <OrderStack.Screen name="CartScreen" component={CartScreen} />
    </OrderStack.Navigator>
  );
}

// Tabs
function MainTabs({ navigation }) {
  const [isClientsMenuVisible, setClientsMenuVisible] = useState(false);
  const [isCatalogueMenuVisible, setCatalogueMenuVisible] = useState(false);
  const [isOrderMenuVisible, setOrderMenuVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        initialRouteName="ClientsTab"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            marginBottom: 4
          }
        }}
      >
        {/* Clients Tab now points to the stack */}
        <Tab.Screen
          name="ClientsTab"
          component={ClientsStackNavigator}
          options={{
            tabBarLabel: 'Clienti',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" color={color} size={size} />
            ),
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={() => setClientsMenuVisible(true)}
              />
            ),
          }}
        />

        <Tab.Screen
          name="CatalogTab"
          component={CatalogueStackNavigator}
          options={{
            tabBarLabel: 'Catalogo',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="albums-outline" color={color} size={size} />
            ),
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={() => setCatalogueMenuVisible(true)}
              />
            ),
          }}
        />
        <Tab.Screen
          name="OrdersTab"
          component={OrderStackNavigator}
          options={{
            tabBarLabel: 'Ordini',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cart-outline" color={color} size={size} />
            ),
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={() => setOrderMenuVisible(true)}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Statistiche',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>

      {/* Clients submenu modal */}
      <ClientsMenuModal
        visible={isClientsMenuVisible}
        onClose={() => setClientsMenuVisible(false)}
        navigation={navigation}
      />

      {/* Catalogue submenu modal */}
      <CatalogueMenuModal
        visible={isCatalogueMenuVisible}
        onClose={() => setCatalogueMenuVisible(false)}
        navigation={navigation}
      />

      {/* Order submenu modal */}
      <OrderMenuModal
        visible={isOrderMenuVisible}
        onClose={() => setOrderMenuVisible(false)}
        navigation={navigation}
      />
    </>
  );
}

// Root navigation that actually uses Redux state
function RootNavigator() {
  const isLoggedIn = useSelector((state: any) => state.auth.isLoggedIn);
  const [dbReady, setDbReady] = useState(false);


  useEffect(() => {
    const runStockInit = async () => {
      const done = await AsyncStorage.getItem('init');

      if (!done) {
        const res = await initializeAllProductStock();
        if (res.success) {
          await AsyncStorage.setItem('init', 'true');
          console.log('✅ Product stock cached locally');
        } else {
          console.log('⚠️ Stock sync failed:', res.error);
        }
      } else {
        console.log('🟢 Product stock already initialized, skipping...');
      }
    };

    const initializeDatabase = async () => {
      try {
        console.log('Initializing database...');
        await initDatabase();
        console.log('Database initialized successfully');
        await runStockInit();
        setDbReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDbReady(true);
      }
    };

    initializeDatabase();

  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: dark, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ color: '#fff', marginTop: 16 }}>Initializing database...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          {/* <Stack.Screen name="ClientOrder" component={ClientOrderScreen} /> */}
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

// App wrapper
export default function App() {
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: dark,
      card: dark,
      text: '#fff',
      border: '#333',
    },
  };
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <View style={{ justifyContent: 'center' }}>
            <Text>Loading...</Text>
          </View>
        }
        persistor={persistor}
      >
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
}

