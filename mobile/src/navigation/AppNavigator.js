import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, getEventTheme } from '../theme';
import { useApp } from '../context/AppContext';

import {
  SplashScreen,
  WelcomeScreen,
  CreateEventScreen,
  JoinManualScreen,
  OwnerLoginScreen,
  ScanQRScreen,
  HomeScreen,
  GalleryScreen,
  ShopScreen,
  KittyScreen,
  ShareQRScreen,
  DaresScreen,
} from '../screens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Bar Icon Component
const TabIcon = ({ icon, label, focused, activeColor = colors.primary }) => (
  <View style={styles.tabIcon}>
    <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{icon}</Text>
    <Text style={[styles.tabLabel, focused && { color: activeColor }]}>{label}</Text>
  </View>
);

// Main Tab Navigator (after login)
const MainTabs = () => {
  const { session } = useApp();
  const theme = getEventTheme(session?.event_type);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label="Home" focused={focused} activeColor={theme.accent} />
          ),
        }}
      />
      <Tab.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📸" label="Gallery" focused={focused} activeColor={theme.accent} />
          ),
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={theme.shopIcon} label="Shop" focused={focused} activeColor={theme.accent} />
          ),
        }}
      />
      <Tab.Screen
        name="Dares"
        component={DaresScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🎯" label="Dares" focused={focused} activeColor={theme.accent} />
          ),
        }}
      />
      <Tab.Screen
        name="Kitty"
        component={KittyScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💰" label="Kitty" focused={focused} activeColor={theme.accent} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { loading } = useApp();

  const screenOptions = {
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerTintColor: colors.text,
    headerTitleStyle: typography.h3,
    headerShadowVisible: false,
    contentStyle: {
      backgroundColor: colors.background,
    },
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {/* Splash Screen */}
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />

        {/* Auth Flow */}
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateEvent"
          component={CreateEventScreen}
          options={{ title: 'Create Event' }}
        />
        <Stack.Screen
          name="JoinManual"
          component={JoinManualScreen}
          options={{ title: 'Join Event' }}
        />
        <Stack.Screen
          name="OwnerLogin"
          component={OwnerLoginScreen}
          options={{ title: 'Owner Login' }}
        />
        <Stack.Screen
          name="ScanQR"
          component={ScanQRScreen}
          options={{ title: 'Scan QR Code' }}
        />

        {/* Main App (Tabs) */}
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />

        {/* Additional Screens */}
        <Stack.Screen
          name="ShareQR"
          component={ShareQRScreen}
          options={{ title: 'Share Access' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabEmoji: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.6,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  tabLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
});

export default AppNavigator;
