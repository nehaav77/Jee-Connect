// JEE Connect - Connectivity Listener Service
// Sprint 6: Monitors network state and switches Online/Offline modes

import { Platform } from 'react-native';
import { useAppStore } from '../store/appStore';
import { syncService } from './SyncService';

export type NetworkState = {
    isConnected: boolean;
    type: 'wifi' | '4g' | '3g' | '2g' | 'none';
    isInternetReachable: boolean;
};

class ConnectivityServiceClass {
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private lastState: NetworkState = { isConnected: false, type: 'none', isInternetReachable: false };

    // Initialize connectivity monitoring
    // In production, use @react-native-community/netinfo
    initialize(): void {
        // Start with a check
        this.checkConnectivity();

        // Poll connectivity status every 30 seconds
        // In production: NetInfo.addEventListener for real-time updates
        this.pollInterval = setInterval(() => {
            this.checkConnectivity();
        }, 30000);
    }

    // Check current connectivity
    async checkConnectivity(): Promise<NetworkState> {
        const store = useAppStore.getState();

        if (Platform.OS === 'web') {
            // Web platform: use navigator.onLine
            const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
            const state: NetworkState = {
                isConnected: isOnline,
                type: isOnline ? 'wifi' : 'none',
                isInternetReachable: isOnline,
            };
            this.handleStateChange(state);
            return state;
        }

        // Native platform: In production, use NetInfo
        // import NetInfo from '@react-native-community/netinfo';
        // const netState = await NetInfo.fetch();
        // const state: NetworkState = {
        //     isConnected: netState.isConnected,
        //     type: mapConnectionType(netState.type),
        //     isInternetReachable: netState.isInternetReachable,
        // };

        // Stub: use current store state
        const state: NetworkState = {
            isConnected: store.isOnline,
            type: store.connectionType,
            isInternetReachable: store.isOnline,
        };

        return state;
    }

    // Handle state changes and trigger appropriate actions
    private handleStateChange(newState: NetworkState): void {
        const store = useAppStore.getState();
        const wasOffline = !this.lastState.isConnected;
        const isNowOnline = newState.isConnected;

        // Update store
        store.setOnline(newState.isConnected);
        store.setConnectionType(newState.type);

        // If we just came online, trigger sync
        if (wasOffline && isNowOnline) {
            console.log('[Connectivity] Back online — triggering sync...');
            this.onConnectionRestored();
        }

        // If connection quality changed, switch app mode
        if (newState.type === 'wifi' || newState.type === '4g') {
            store.setAppMode('urban');
        } else {
            store.setAppMode('lite');
        }

        this.lastState = newState;
    }

    // Actions when connectivity is restored
    private async onConnectionRestored(): Promise<void> {
        const store = useAppStore.getState();

        try {
            // 1. Process sync queue (delta sync)
            const result = await syncService.processSyncQueue();
            console.log(`[Connectivity] Synced ${result.synced} items`);

            // 2. Update last sync time
            store.setLastSyncTime(new Date().toLocaleString());

            // 3. Check for Mission Updates
            const updates = await syncService.checkForMissionUpdates();
            if (updates.length > 0) {
                console.log(`[Connectivity] ${updates.length} mission updates available`);
            }
        } catch (e) {
            console.log('[Connectivity] Sync on reconnect failed:', e);
        }
    }

    // Manual toggle for online/offline (for testing)
    toggleOnline(): void {
        const store = useAppStore.getState();
        const newOnline = !store.isOnline;
        this.handleStateChange({
            isConnected: newOnline,
            type: newOnline ? 'wifi' : 'none',
            isInternetReachable: newOnline,
        });
    }

    // Cleanup
    destroy(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
}

export const connectivityService = new ConnectivityServiceClass();
