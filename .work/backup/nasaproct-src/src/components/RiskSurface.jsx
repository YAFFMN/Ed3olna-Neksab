import { useEffect, useRef } from 'react';
import { riskModel } from '../lib/risk.js';
import { useI18n } from '../lib/i18n.jsx';

const STOPS = [
  [0, [12, 40, 90]],
  [35, [40, 160, 200]],
  [55, [255, 196, 60]],
  [70, [255, 110, 60]],
  [100, [190, 20, 40]],
];

function colorFor(R) {
  for (let i = 1; i < STOPS.length; i += 1) {
    if (R <= STOPS[i][0]) {
      const [r0, c0] = STOPS[i - 1];
      const [r1, c1] = STOPS[i];
      const u = (R - r0) / (r1 - r0);
      return c0.map((v, k) => v + (c1[k] - v) * u);
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export default function RiskSurface({ model }) {
  const { t } = useI18n();
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !model) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const ml = 34;
    const mb = 32;
    const mt = 6;
    const mr = 6;
    const pw = W - ml - mr;
    const ph = H - mb - mt;
    const sleep = model.s;

    ctx.clearRect(0, 0, W, H);
    const img = ctx.createImageData(pw, ph);
    for (let j = 0; j < ph; j += 1) {
      for (let i = 0; i < pw; i += 1) {
        const d = (i / (pw - 1)) * 50;
        const h = 100 - (j / (ph - 1)) * 90;
        const R = riskModel(d, h, sleep).R;
        const c = colorFor(R);
        const k = (j * pw + i) * 4;
        img.data[k] = c[0];
        img.data[k + 1] = c[1];
        img.data[k + 2] = c[2];
        img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, ml, mt);

    // threshold contours
    [35, 70].forEach((level) => {
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash(level === 35 ? [4, 3] : []);
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < pw; i += 1) {
        const d = (i / (pw - 1)) * 50;
        let found = null;
        for (let h = 100; h >= 10; h -= 0.5) {
          if (riskModel(d, h, sleep).R >= level) {
            found = h;
            break;
          }
        }
        if (found !== null) {
          const py = mt + ((100 - found) / 90) * (ph - 1);
          if (started) ctx.lineTo(ml + i, py);
          else ctx.moveTo(ml + i, py);
          started = true;
        } else {
          started = false;
        }
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // axes
    ctx.fillStyle = '#a3a8b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    [10, 40, 70, 100].forEach((h) => {
      ctx.fillText(h, ml - 4, mt + ((100 - h) / 90) * (ph - 1) + 3);
    });
    ctx.textAlign = 'center';
    [0, 10, 25, 50].forEach((d) => {
      ctx.fillText(d, ml + (d / 50) * (pw - 1), H - 20);
    });
    ctx.fillText('Dose rate (mSv/hr)', ml + pw / 2, H - 6);
    ctx.save();
    ctx.translate(9, mt + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('HRV (ms)', 0, 0);
    ctx.restore();

    // current state dot
    const px = ml + (model.d / 50) * (pw - 1);
    const py = mt + ((100 - model.h) / 90) * (ph - 1);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
  }, [model]);

  if (!model) return null;

  return (
    <div className="rcpt-panel p-3.5" data-tour="surface">
      <div className="flex items-center justify-between border-b border-[#1d2836] pb-2">
        <div>
          <span className="eyebrow-text">SENSITIVITY MAP</span>
          <h3 className="text-xs font-bold text-slate-100">{t('surface')}</h3>
        </div>
        <span className="font-mono text-[9px] text-[#8fa0b4]">sleep {model.s.toFixed(1)} h</span>
      </div>
      <canvas ref={ref} width={320} height={300} className="mx-auto mt-2 w-full max-w-[360px]" />
      <p className="mt-1 text-[9px] leading-relaxed text-[#8fa0b4]">{t('surface_note')}</p>
    </div>
  );
}
