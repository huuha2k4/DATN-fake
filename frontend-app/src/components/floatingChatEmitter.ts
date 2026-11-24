/**
 * In-memory Event Bus để quản lý đóng/mở FloatingChatIcons từ các màn hình khác
 */
type FloatingChatEventListener = () => void;

class FloatingChatEventEmitter {
  private listeners: Set<FloatingChatEventListener> = new Set();

  subscribe(listener: FloatingChatEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emitClose(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in floating chat listener:', err);
      }
    });
  }
}

export const floatingChatEmitter = new FloatingChatEventEmitter();
