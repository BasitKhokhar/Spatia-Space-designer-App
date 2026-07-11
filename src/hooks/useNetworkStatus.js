import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

// Tracks connectivity for the offline gate. Assumes online until proven offline.
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected !== false && state.isInternetReachable !== false);
    });
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => unsub();
  }, []);

  return isConnected;
}
