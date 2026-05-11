// Custom useColorScheme that reads from the app's dark mode toggle
// instead of the system theme, so the in-app toggle actually works
import { useAppStore } from '@/src/store/appStore';

export function useColorScheme(): 'light' | 'dark' {
  const darkMode = useAppStore((s) => s.darkMode);
  return darkMode ? 'dark' : 'light';
}
