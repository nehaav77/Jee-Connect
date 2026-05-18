import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, Redirect, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { TouchableOpacity, Text } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { initializeDatabase } from '@/src/db/database';
import { useAppStore } from '@/src/store/appStore';
import { connectivityService } from '@/src/services/ConnectivityService';
import { syncService } from '@/src/services/SyncService';
import XPToast from '@/src/components/XPToast';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Initialize database, connectivity listener, and sync engine on app start
  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        
        // Restore session from DB
        await useAppStore.getState().initializeAuth();
        
        setDbReady(true);

        // Sprint 6: Start connectivity monitoring
        connectivityService.initialize();

        // Sprint 5/6: Start background sync engine
        syncService.startBackgroundSync();
      } catch (e) {
        console.error('Database init failed:', e);
        setDbReady(true); // Continue even if DB fails
      }
    }
    init();

    return () => {
      connectivityService.destroy();
      syncService.stopBackgroundSync();
    };
  }, []);

  useEffect(() => {
    if (loaded && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, dbReady]);

  if (!loaded || !dbReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const router = useRouter();

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#0f172a',
      card: '#1e293b',
      text: '#f8fafc',
      border: '#334155',
      primary: '#6366f1',
    },
  };

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#f8fafc',
      card: '#ffffff',
      text: '#0f172a',
      border: '#e2e8f0',
      primary: '#6366f1',
    },
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? customDarkTheme : customLightTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <XPToast />
      {!isAuthenticated && <Redirect href="/auth" />}
      <Stack
        screenOptions={{
          headerLeft: ({ canGoBack }) => canGoBack ? (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16, padding: 8 }}>
              <Text style={{ fontSize: 22, color: colorScheme === 'dark' ? '#f8fafc' : '#0f172a', fontWeight: 'bold' }}>{'<-'}</Text>
            </TouchableOpacity>
          ) : undefined,
        }}
      >
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="subject/[subjectId]"
          options={{
            headerShown: true,
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#ffffff' },
            headerTintColor: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
          }}
        />
        <Stack.Screen
          name="chapter/[chapterId]"
          options={{
            headerShown: true,
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#ffffff' },
            headerTintColor: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
          }}
        />
        <Stack.Screen
          name="test/instructions"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="test/[testId]"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="result/[attemptId]"
          options={{
            headerShown: true,
            title: 'Test Results',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#ffffff' },
            headerTintColor: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
          }}
        />
        {/* Sprint 7: Live Sprints */}
        <Stack.Screen
          name="sprints"
          options={{
            headerShown: true,
            title: 'Live Sprints',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#ffffff' },
            headerTintColor: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
          }}
        />
        {/* Sprint 7: Doubt Marketplace */}
        <Stack.Screen
          name="doubts"
          options={{
            headerShown: true,
            title: 'Doubt Marketplace',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#ffffff' },
            headerTintColor: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
          }}
        />
        {/* Sprint 8: Analytics */}
        <Stack.Screen
          name="analytics"
          options={{
            headerShown: true,
            title: 'Performance Analytics',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#ffffff' },
            headerTintColor: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
          }}
        />
        {/* Sprint 8: Parent Dashboard */}
        <Stack.Screen
          name="parent-dashboard"
          options={{
            headerShown: true,
            title: 'Parent Dashboard',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#ffffff' },
            headerTintColor: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
          }}
        />
        {/* Sprint 9: Gamification Screens */}
        <Stack.Screen
          name="achievements"
          options={{
            headerShown: true,
            title: 'Achievements',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#ffffff' },
            headerTintColor: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
          }}
        />
        <Stack.Screen
          name="daily-spin"
          options={{
            headerShown: true,
            title: 'Daily Reward',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#ffffff' },
            headerTintColor: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
