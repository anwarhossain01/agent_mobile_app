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
import { NavigationContainer, DefaultTheme, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import LoginScreen from './src/screens/LoginScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import CatalogScreen from './src/screens/CatalogScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import IndirizziScreen from './src/screens/IndirizziScreen';
import ClientsMenuModal from './src/components/modals/ClientsMenuModal';
import CatalogueMenuModal from './src/components/modals/CatalogueMenuModal';
import { dark, darkerBg, textColor } from './colors';
import OrderMenuModal from './src/components/modals/OrderMenuModal';
import ProductListScreen from './src/screens/ProductListScreen';
import NewOrderScreen from './src/screens/NewOrderScreen';
import CartScreen from './src/screens/CartScreen';
import { initDatabase } from './src/database/init';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeAllProductStock } from './src/sync/cached';
import { ClientHeader } from './src/components/headers/ClientHeader';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import SplashScreen from './src/screens/SplashScreen';
import ProductDetailPage from './src/screens/ProductDetailsPage';
import FloatingCartButton from './src/components/FloatingCartButton';
import DettagliScreen from './src/screens/DettagliScreen';
import { selectIsSyncing, selectLastCustomerPageSynced, selectLastCustomerSyncDate } from './src/store/slices/databaseStatusSlice';
import { selectSavedAt } from './src/store/slices/categoryTreeSlice';
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  } else {
    console.log('⚠️ Navigation not ready yet');
  }
}

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();
const ClientsStack = createNativeStackNavigator();
const CatalogueStack = createNativeStackNavigator();
const OrderStack = createNativeStackNavigator();

function ClientsStackNavigator() {

  return (
    <ClientsStack.Navigator screenOptions={{ headerShown: true }}>
      <ClientsStack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      <ClientsStack.Screen name="Clients" component={ClientsScreen} options={{
        header: ({ navigation }) => <ClientHeader navigation={navigation} />
      }} />
      <ClientsStack.Screen name="ClientsAddresses" component={IndirizziScreen} options={{
        title: "Indirizzi Cliente",
        headerStyle: { backgroundColor: dark },
        headerTintColor: '#000',
      }} />
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
function MainTabs({ navigation }: { navigation: any }) {
  const [isClientsMenuVisible, setClientsMenuVisible] = useState(false);
  const [isCatalogueMenuVisible, setCatalogueMenuVisible] = useState(false);
  const [isOrderMenuVisible, setOrderMenuVisible] = useState(false);

  const CustomTopTabBar = ({ state, descriptors, navigation, onClientsPress, onCataloguePress, onOrderPress }
    : any
  ) => {
    return (
      <View style={{
        flexDirection: 'row',
        backgroundColor: dark,
        paddingTop: 6,
        borderBottomWidth: 1,
        borderBottomColor: darkerBg,
      }}>
        {state.routes.map((route: any, index: any) => {
          const isFocused = state.index === index;
          const color = isFocused ? '#007AFF' : 'gray';
          const label =
            descriptors[route.key].options.tabBarLabel ??
            descriptors[route.key].options.title ??
            route.name;

          const onPress = () => {
            if (route.name === 'ClientsTab') return onClientsPress();
            if (route.name === 'CatalogTab') return onCataloguePress();
            if (route.name === 'OrdersTab') return onOrderPress();
            navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: isFocused ? 2 : 0,
                borderBottomColor: '#007AFF',
              }}
            >
              {route.name === 'ClientsTab' && (
                <Ionicons name="people-outline" size={20} color={color} />
              )}
              {route.name === 'CatalogTab' && (
                <Ionicons name="albums-outline" size={20} color={color} />
              )}
              {route.name === 'OrdersTab' && (
                <Ionicons name="cart-outline" size={20} color={color} />
              )}
              {route.name === 'Settings' && (
                <Ionicons name="settings-outline" size={20} color={color} />
              )}

              <Text style={{ color, fontSize: 12, marginTop: 3 }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <>
      <Tab.Navigator
        initialRouteName="ClientsTab"
        tabBarPosition="top"
        screenOptions={{
          //   headerShown: false,
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            marginBottom: 4,
            marginTop: 4,
          }
        }}
        tabBar={(props) => (
          <CustomTopTabBar
            {...props}
            onClientsPress={() => setClientsMenuVisible(true)}
            onCataloguePress={() => setCatalogueMenuVisible(true)}
            onOrderPress={() => setOrderMenuVisible(true)}
          />
        )}
      >
        {/* Clients Tab now points to the stack */}
        <Tab.Screen
          name="ClientsTab"
          component={ClientsStackNavigator}
          options={{
            tabBarLabel: 'Clienti',
            // tabBarIcon: ({ color, size }) => (
            //   <Ionicons name="people-outline" color={color} size={size} />
            // ),
            // tabBarButton: (props) => (
            //   <TouchableOpacity
            //     {...props}
            //     onPress={() => setClientsMenuVisible(true)}
            //   />
            // ),
          }}
        />

        <Tab.Screen
          name="CatalogTab"
          component={CatalogueStackNavigator}
          options={{
            tabBarLabel: 'Catalogo',
            // tabBarIcon: ({ color, size }) => (
            //   <Ionicons name="albums-outline" color={color} size={size} />
            // ),
            // tabBarButton: (props) => (
            //   <TouchableOpacity
            //     {...props}
            //     onPress={() => setCatalogueMenuVisible(true)}
            //   />
            // ),
          }}
        />
        <Tab.Screen
          name="OrdersTab"
          component={OrderStackNavigator}
          options={{
            tabBarLabel: 'Ordini',
            // tabBarIcon: ({ color, size }) => (
            //   <Ionicons name="cart-outline" color={color} size={size} />
            // ),
            // tabBarButton: (props) => (
            //   <TouchableOpacity
            //     {...props}
            //     onPress={() => setOrderMenuVisible(true)}
            //   />
            // ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Sinc',
            // tabBarIcon: ({ color, size }) => (
            //   <Ionicons name="settings-outline" color={color} size={size} />
            // ),
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
  const lastCategorySavedDate = useSelector(selectSavedAt);
  const lastCustomerSyncDate = useSelector(selectLastCustomerSyncDate);
  const is_syncing = useSelector(selectIsSyncing);

  const isOlderThan3Hours = (date?: string | null) => {
    if (!date) return true;
    const t = new Date(date).getTime();
    if (isNaN(t)) return true;
    return Date.now() - t > 3 * 60 * 60 * 1000;
  };

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

  useEffect(() => {
    if (is_syncing && !dbReady) return;
    if (!navigationRef.isReady()) return;

    const categoryStale = isOlderThan3Hours(lastCategorySavedDate);
    const customerStale = isOlderThan3Hours(lastCustomerSyncDate);

    if (categoryStale || customerStale) {
      console.log('⏱ Auto-sync stale → navigating to Settings');
      navigate('Main', { screen: 'Settings' });
    }
  }, [
    lastCategorySavedDate,
    lastCustomerSyncDate,
    is_syncing,
    dbReady
  ]);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: dark, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ color: textColor, marginTop: 16 }}>Initializing database...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="ProductDetails" component={ProductDetailPage} />
          <Stack.Screen name="Dettagli" component={DettagliScreen} options={{ headerShown: true, headerTintColor: '#000' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

function AppContent() {
  const isSyncing = useSelector(selectIsSyncing);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: dark }}>
      {isSyncing && (
        <View style={styles.syncBar}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.syncText}>Syncing… Attendere prego.</Text>
        </View>
      )}
      <NavigationContainer theme={navTheme} ref={navigationRef}>
        <RootNavigator />
        <FloatingCartButton />
      </NavigationContainer>
    </SafeAreaView>
  );
}

// App wrapper
export default function App() {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text>Loading...</Text>
          </View>
        }
        persistor={persistor}
      >
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  syncBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFA500', // amber/orange — attention-grabbing but not alarming
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 5, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    height: 75,
  },
  syncText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});
