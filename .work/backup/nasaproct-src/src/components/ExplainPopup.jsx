import { Calculator, Languages, X } from 'lucide-react';
import { useEffect } from 'react';
import { useI18n } from '../lib/i18n.jsx';

function Block({ block }) {
  if (block.type === 'p') {
    return <p className="text-xs leading-relaxed text-slate-300">{block.text}</p>;
  }
  if (block.type === 'eq') {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-[#17a9f0]/30 bg-[#17a9f0]/10 p-3 font-mono text-[11px] leading-relaxed text-[#5cc8ff]">
        {block.text}
      </pre>
    );
  }
  if (block.type === 'list') {
    return (
      <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-300">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === 'table') {
    return (
      <div className="overflow-x-auto rounded-lg border border-[#1d2836]">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#060d17] font-mono text-[9px] uppercase tracking-wider text-[#8fa0b4]">
            <tr>
              {block.head.map((h) => (
                <th key={h} className="px-2.5 py-1.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1d2836] text-slate-300">
            {block.rows.map((row) => (
              <tr key={row[0]}>
                <td className="px-2.5 py-1.5 font-semibold text-slate-200">{row[0]}</td>
                <td className="px-2.5 py-1.5 font-mono text-[10px] text-[#8fa0b4]">{row[1]}</td>
                <td className="px-2.5 py-1.5 text-right font-mono font-bold text-white tabular-nums">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === 'fine') {
    return <p className="border-l-2 border-[#1d2836] pl-2.5 text-[10px] leading-relaxed text-[#8fa0b4]">{block.text}</p>;
  }
  return null;
}

export default function ExplainPopup({ content, onClose }) {
  const { t, lang } = useI18n();

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!content) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={content.title}
      onClick={onClose}
    >
      <div
        className="rcpt-panel max-h-[86vh] w-full max-w-2xl overflow-y-auto p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#1d2836] pb-3">
          <div className="flex items-start gap-2">
            <Calculator size={18} className="mt-0.5 shrink-0 text-[#17a9f0]" />
            <div>
              <span className="eyebrow-text">HOW IT IS COMPUTED</span>
              <h3 className="text-base font-bold text-white">{content.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="rounded p-1 text-slate-400 transition hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          {content.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </div>

        {lang !== 'en' && (
          <p className="mt-4 flex items-center gap-1.5 font-mono text-[9px] text-[#8fa0b4]">
            <Languages size={10} /> {t('ai_note')}
          </p>
        )}

        <div className="mt-5 flex justify-end border-t border-[#1d2836] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#17a9f0]/40 bg-[#17a9f0]/20 px-4 py-2 font-mono text-xs font-bold text-white transition hover:bg-[#17a9f0]/30"
          >
            {t('close').toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}
