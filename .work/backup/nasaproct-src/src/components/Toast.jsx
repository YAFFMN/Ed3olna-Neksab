import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm" role="status" aria-live="polite">
      <div className={`flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-xl ${
        isSuccess
          ? 'border-[#35d08a]/40 bg-[#071610]/95 text-[#7be8a0]'
          : 'border-[#ff5d4d]/40 bg-[#190a0f]/95 text-[#ff8a7f]'
      }`}>
        {isSuccess ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase">
            {toast.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-200">
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
