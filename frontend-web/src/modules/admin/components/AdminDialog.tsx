import { useEffect, useRef, type ReactNode } from 'react';

export function AdminDialog({ label, onClose, pending = false, drawer = false, children }: {
  label: string; onClose: () => void; pending?: boolean; drawer?: boolean; children: ReactNode;
}) {
  const element = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = element.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  return <dialog ref={element} className={drawer ? 'admin-dialog admin-drawer' : 'admin-dialog'} aria-label={label}
    aria-busy={pending} onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    {children}
  </dialog>;
}
