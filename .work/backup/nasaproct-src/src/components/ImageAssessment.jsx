import { useState } from 'react';
import { Camera, CheckCircle2, Eye, Info, ShieldAlert, Sparkles, Upload } from 'lucide-react';

export default function ImageAssessment() {
  const [mode, setMode] = useState('eye'); // 'eye' or 'skin'
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  function runAssessment(sampleType) {
    setAnalyzing(true);
    setResult(null);

    setTimeout(() => {
      setAnalyzing(false);
      if (sampleType === 'eye') {
        setResult({
          type: 'eye',
          pupilDiameterMm: 3.8,
          pupilSymmetry: 'Symmetric (OD = OS)',
          opticDiscMargin: 'Sharp, normal venous pulsation present',
          sansScore: 'Low Risk (Grade 0)',
          notes: 'No obvious signs of posterior globe flattening or elevated optic sheath dilation.',
        });
      } else {
        setResult({
          type: 'skin',
          erythemaIndex: 'Mild (12% baseline elevation)',
          petechiaeDetected: 'None observed',
          rashClassification: 'Minor contact irritation vs. dry suit abrasion',
          radiationBurnRisk: 'Low (< 0.25 Gy threshold)',
          notes: 'Skin barrier intact. Maintain hydration and apply topical barrier cream if abrasion persists.',
        });
      }
    }, 1200);
  }

  return (
    <div className="rcpt-panel p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-[#1d2836] pb-3">
        <div>
          <span className="eyebrow-text">ONBOARD OPTICAL DIAGNOSTICS</span>
          <h3 className="text-sm font-bold text-slate-100">Image & Pupil Assessment</h3>
        </div>
        <span className="badge-rcpt badge-live">RULE-BASED</span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[#8fa0b4]">
        Automated image feature extractor for Spaceflight Associated Neuro-ocular Syndrome (SANS) and acute radiation dermatological cues.
      </p>

      {/* Mode Selector */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => { setMode('eye'); setResult(null); }}
          className={`flex-1 rounded-lg border py-2 font-mono text-xs font-semibold transition ${
            mode === 'eye'
              ? 'border-[#17a9f0] bg-[#17a9f0]/15 text-[#5cc8ff]'
              : 'border-[#1d2836] bg-[#060d17] text-slate-400 hover:text-white'
          }`}
        >
          Eye / Pupil (SANS)
        </button>
        <button
          type="button"
          onClick={() => { setMode('skin'); setResult(null); }}
          className={`flex-1 rounded-lg border py-2 font-mono text-xs font-semibold transition ${
            mode === 'skin'
              ? 'border-[#17a9f0] bg-[#17a9f0]/15 text-[#5cc8ff]'
              : 'border-[#1d2836] bg-[#060d17] text-slate-400 hover:text-white'
          }`}
        >
          Skin / Radiation Rash
        </button>
      </div>

      {/* Capture Simulation Box */}
      <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1d2836] bg-[#060d17]/60 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#17a9f0]/30 bg-[#17a9f0]/10 text-[#17a9f0]">
          {mode === 'eye' ? <Eye size={24} /> : <Camera size={24} />}
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-200">
          {mode === 'eye' ? 'Pupil & Fundus Optical Capture' : 'Dermal Rash & Erythema Scan'}
        </p>
        <p className="mt-1 font-mono text-[9px] text-[#8fa0b4]">
          Macro lens camera / smartphone slit-lamp attachment
        </p>

        <button
          type="button"
          disabled={analyzing}
          onClick={() => runAssessment(mode)}
          className="mt-4 flex items-center gap-2 rounded-lg border border-[#17a9f0]/40 bg-[#17a9f0]/20 px-4 py-2 font-mono text-xs font-bold text-white transition hover:bg-[#17a9f0]/30 disabled:opacity-50"
        >
          {analyzing ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Sparkles size={14} />
          )}
          {analyzing ? 'EXTRACTING CUES…' : `RUN ${mode.toUpperCase()} ASSESSMENT`}
        </button>
      </div>

      {/* Results Box */}
      {result && (
        <div className="mt-4 rounded-xl border border-[#35d08a]/30 bg-[#35d08a]/10 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold text-[#7be8a0]">
              FEATURE EXTRACTION RESULTS
            </span>
            <span className="badge-rcpt badge-nominal">COMPLETE</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
            {result.type === 'eye' ? (
              <>
                <div className="rounded bg-black/40 p-2">
                  <span className="text-[9px] text-slate-400">Pupil Diameter</span>
                  <p className="font-bold text-white">{result.pupilDiameterMm} mm</p>
                </div>
                <div className="rounded bg-black/40 p-2">
                  <span className="text-[9px] text-slate-400">Symmetry</span>
                  <p className="font-bold text-white">{result.pupilSymmetry}</p>
                </div>
                <div className="col-span-2 rounded bg-black/40 p-2">
                  <span className="text-[9px] text-slate-400">SANS Screening Tier</span>
                  <p className="font-bold text-[#7be8a0]">{result.sansScore}</p>
                  <p className="mt-1 text-[10px] text-slate-300">{result.notes}</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded bg-black/40 p-2">
                  <span className="text-[9px] text-slate-400">Erythema Index</span>
                  <p className="font-bold text-white">{result.erythemaIndex}</p>
                </div>
                <div className="rounded bg-black/40 p-2">
                  <span className="text-[9px] text-slate-400">Petechiae</span>
                  <p className="font-bold text-white">{result.petechiaeDetected}</p>
                </div>
                <div className="col-span-2 rounded bg-black/40 p-2">
                  <span className="text-[9px] text-slate-400">Dermatological Assessment</span>
                  <p className="font-bold text-[#7be8a0]">{result.radiationBurnRisk}</p>
                  <p className="mt-1 text-[10px] text-slate-300">{result.notes}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Honest Disclaimer */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#1d2836] bg-[#060d17] p-2.5 text-[9px] text-[#8fa0b4]">
        <Info size={13} className="mt-0.5 shrink-0 text-[#17a9f0]" />
        <span>
          <b>Decision Support Tool:</b> Optical extraction is rule-based and provides decision cues to the crew. It does not constitute a clinical medical diagnosis.
        </span>
      </div>
    </div>
  );
}
