import { useEffect } from 'react';
import { registerBackgroundSyncAsync } from '../sync/backgroundSync';

export default function useRegisterSync() {
  useEffect(() => {
    (async () => {
      try {
        await registerBackgroundSyncAsync();
        console.log('Background sync registered');
      } catch (e) {
        console.log('Background sync register failed', e);
      }
    })();
  }, []);
}
