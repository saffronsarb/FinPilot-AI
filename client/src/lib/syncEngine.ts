import { api } from './api';

const SYNC_KEYS_PREFIX = 'breadbuddy_';

export interface SyncStateItem {
  key: string;
  payload: string;
  updated_at: string;
}

export const syncEngine = {
  /**
   * Pushes the current user's local storage state to the server.
   */
  async push(userId: number): Promise<void> {
    const suffix = `_${userId}`;
    const updates: { key: string; payload: string }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SYNC_KEYS_PREFIX) && key.endsWith(suffix)) {
        const payload = localStorage.getItem(key);
        if (payload) {
          updates.push({ key, payload });
        }
      }
    }

    if (updates.length === 0) return;

    try {
      await api.syncPush(updates);
      console.log(`[SyncEngine] Successfully pushed ${updates.length} keys to server.`);
    } catch (err) {
      console.error('[SyncEngine] Failed to push to server:', err);
    }
  },

  /**
   * Pulls the user's sync state from the server and populates local storage.
   * Typically called on fresh login or when the app mounts and localStorage is missing critical data.
   */
  async pull(userId: number): Promise<void> {
    try {
      const res = await api.syncPull();
      if (res && res.data && Array.isArray(res.data)) {
        let restoredCount = 0;
        for (const item of res.data) {
          // Double check that we only restore keys belonging to this user
          if (item.key.endsWith(`_${userId}`)) {
            localStorage.setItem(item.key, item.payload);
            restoredCount++;
          }
        }
        console.log(`[SyncEngine] Successfully pulled and restored ${restoredCount} keys from server.`);
        
        // Dispatch an event so UI can re-render if needed
        if (typeof window !== 'undefined' && restoredCount > 0) {
          window.dispatchEvent(new CustomEvent('finance-updated'));
        }
      }
    } catch (err) {
      console.error('[SyncEngine] Failed to pull from server:', err);
    }
  },

  /**
   * Initializes the background sync worker.
   * Pulls the latest state from the server, and sets up periodic pushing.
   */
  init(userId: number) {
    if (typeof window === 'undefined') return;

    // 1. Pull on init (restores state on fresh login or reload)
    this.pull(userId);

    // 2. Push periodically every 30 seconds
    const intervalId = setInterval(() => {
      this.push(userId);
    }, 30000);

    // 3. Push immediately when the app goes into the background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.push(userId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Return a cleanup function
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }
};
