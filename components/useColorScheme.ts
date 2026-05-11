// Custom useColorScheme that reads from the app's dark mode toggle
// Falls back to system theme initially, but respects the in-app toggle
import { useColorScheme as useSystemScheme } from 'react-native';
import { useAppStore } from '@/src/store/appStore';

export function useColorScheme(): 'light' | 'dark' {
    const darkMode = useAppStore((s) => s.darkMode);
    return darkMode ? 'dark' : 'light';
}
