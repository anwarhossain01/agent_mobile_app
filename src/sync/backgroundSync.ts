import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { store } from '../store';
import { markOrderSynced } from '../store/slices/ordersSlice';
import { createOrder } from '../api/prestashop';

const TASK_NAME = 'PRESTASHOP_BACKGROUND_SYNC';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const state = store.getState();
    const unsynced = state.orders.items.filter((o:any)=>!o.synced);
    for (const o of unsynced) {
      // Transform local order to Prestashop payload here
      try {
        await createOrder(o);
        store.dispatch(markOrderSynced(o.localId));
      } catch (e) {
        console.log('createOrder err', e);
      }
    }
    return BackgroundFetch.Result.NewData;
  } catch (err) {
    return BackgroundFetch.Result.Failed;
  }
});

export async function registerBackgroundSyncAsync() {
  return await BackgroundFetch.registerTaskAsync(TASK_NAME, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
