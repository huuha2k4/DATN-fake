/**
 * Event bus for notifying screens about data mutation across the application
 * (e.g. after FinAI action execution completed).
 */

import { invalidateQueryCache } from './queryCache';

export type FinAiDataSyncEventDetail = {
  toolName?: string;
  actionId?: string;
  result?: any;
};

export const FINAI_SYNC_EVENT = 'finai:action_completed';

export function notifyFinAiActionCompleted(detail?: FinAiDataSyncEventDetail): void {
  invalidateQueryCache(['accounts:', 'transactions:', 'categories:', 'budgets:', 'debts:', 'reports:', 'goals:', 'schedules:']);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FINAI_SYNC_EVENT, { detail }));
    // Also trigger general focus/refresh events
    window.dispatchEvent(new Event('focus'));
  }
}

export function subscribeFinAiActionCompleted(callback: (detail?: FinAiDataSyncEventDetail) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<FinAiDataSyncEventDetail>;
    callback(customEvent.detail);
  };
  window.addEventListener(FINAI_SYNC_EVENT, handler);
  return () => {
    window.removeEventListener(FINAI_SYNC_EVENT, handler);
  };
}
