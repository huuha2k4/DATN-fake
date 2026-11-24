/**
 * Simple in-memory Event Bus for React Native / Expo to sync data mutations
 * across screens when FinAI Agent actions are completed.
 */

export type FinAiDataSyncEventDetail = {
  toolName?: string;
  actionId?: string;
  status?: string;
  result?: any;
};

type Listener = (detail?: FinAiDataSyncEventDetail) => void;

class FinAiSyncEventEmitter {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(detail?: FinAiDataSyncEventDetail): void {
    this.listeners.forEach((listener) => {
      try {
        listener(detail);
      } catch (err) {
        console.error('Error in FinAI sync listener:', err);
      }
    });
  }
}

export const finAiSyncEmitter = new FinAiSyncEventEmitter();
