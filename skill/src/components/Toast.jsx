import { useEffect, useState } from 'react';
import './Toast.css';

/**
 * Toast — simple slide-in notification.
 * Props:
 *   message   string
 *   type      'success' | 'error' | 'info'
 *   onDismiss () => void
 */
export default function Toast({ message, type = 'success', onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 350);
    }, 3500);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icons = { success: 'check_circle', error: 'error', info: 'info' };

  return (
    <div className={`toast toast-${type} ${visible ? 'toast-in' : 'toast-out'}`}>
      <span className="material-symbols-outlined toast-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
        {icons[type]}
      </span>
      <span className="toast-msg">{message}</span>
      <button className="toast-close" onClick={() => { setVisible(false); setTimeout(onDismiss, 350); }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
      </button>
    </div>
  );
}
