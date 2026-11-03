import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

const TOOTH_CONDITIONS = [
  { key: 'healthy',  label: 'Healthy',             color: '#10b981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  { key: 'decay',    label: 'Decay / Cavity',       color: '#ef4444', bg: 'bg-red-50 text-red-700 border-red-300' },
  { key: 'filled',   label: 'Filled',               color: '#3b82f6', bg: 'bg-blue-50 text-blue-700 border-blue-300' },
  { key: 'crown',    label: 'Crown / Bridge',        color: '#f59e0b', bg: 'bg-amber-50 text-amber-700 border-amber-300' },
  { key: 'rct',      label: 'Root Canal (RCT)',      color: '#8b5cf6', bg: 'bg-purple-50 text-purple-700 border-purple-300' },
  { key: 'missing',  label: 'Missing / Extracted',   color: '#64748b', bg: 'bg-slate-100 text-slate-700 border-slate-300' },
];

const SURFACES = [
  { key: 'O', label: 'Occlusal' },
  { key: 'M', label: 'Mesial' },
  { key: 'D', label: 'Distal' },
  { key: 'B', label: 'Buccal' },
  { key: 'L', label: 'Lingual' },
];

const UPPER_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const LOWER_TEETH = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

const TOOTH_NAMES = {
  1: 'Upper Right 3rd Molar (Wisdom)', 2: 'Upper Right 2nd Molar', 3: 'Upper Right 1st Molar',
  4: 'Upper Right 2nd Premolar', 5: 'Upper Right 1st Premolar', 6: 'Upper Right Canine',
  7: 'Upper Right Lateral Incisor', 8: 'Upper Right Central Incisor', 9: 'Upper Left Central Incisor',
  10: 'Upper Left Lateral Incisor', 11: 'Upper Left Canine', 12: 'Upper Left 1st Premolar',
  13: 'Upper Left 2nd Premolar', 14: 'Upper Left 1st Molar', 15: 'Upper Left 2nd Molar',
  16: 'Upper Left 3rd Molar (Wisdom)',
  17: 'Lower Left 3rd Molar (Wisdom)', 18: 'Lower Left 2nd Molar', 19: 'Lower Left 1st Molar',
  20: 'Lower Left 2nd Premolar', 21: 'Lower Left 1st Premolar', 22: 'Lower Left Canine',
  23: 'Lower Left Lateral Incisor', 24: 'Lower Left Central Incisor', 25: 'Lower Right Central Incisor',
  26: 'Lower Right Lateral Incisor', 27: 'Lower Right Canine', 28: 'Lower Right 1st Premolar',
  29: 'Lower Right 2nd Premolar', 30: 'Lower Right 1st Molar', 31: 'Lower Right 2nd Molar',
  32: 'Lower Right 3rd Molar (Wisdom)',
};

function ToothButton({ num, state, isSelected, onClick, isUpper = true }) {
  const cond = TOOTH_CONDITIONS.find(c => c.key === state.status) || TOOTH_CONDITIONS[0];
  return (
    <button
      type="button"
      onClick={() => onClick(num)}
      className={`flex flex-col items-center p-1.5 sm:p-2 rounded-lg border-2 transition-all cursor-pointer flex-shrink-0 ${
        isSelected
          ? 'ring-2 ring-[var(--color-primary-500)] border-[var(--color-primary-500)] scale-105 bg-[var(--color-primary-50)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary-300)]'
      }`}
      title={`${num}: ${TOOTH_NAMES[num]} (${cond.label})`}
      aria-label={`Tooth ${num}: ${TOOTH_NAMES[num]}, condition: ${cond.label}`}
      aria-pressed={isSelected}
    >
      {/* Condition label — top for lower arch */}
      {!isUpper && (
        <span className="text-[8px] font-semibold mb-1 truncate max-w-[30px]" style={{ color: cond.color }}>
          {cond.key.toUpperCase()}
        </span>
      )}

      {/* Tooth number */}
      {isUpper && (
        <span className="text-[9px] font-mono font-bold text-[var(--color-text-muted)] mb-1">{num}</span>
      )}

      {/* Tooth SVG */}
      <svg width="22" height="26" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {isUpper ? (
          <path
            d="M6 4C6 2.89543 6.89543 2 8 2H16C17.1046 2 18 2.89543 18 4V14C18 18 15 26 14 26C13 26 12.5 20 12 20C11.5 20 11 26 10 26C9 26 6 18 6 14V4Z"
            fill={state.status === 'missing' ? '#f1f5f9' : '#ffffff'}
            stroke={cond.color}
            strokeWidth="2"
          />
        ) : (
          <path
            d="M6 24C6 25.1046 6.89543 26 8 26H16C17.1046 26 18 25.1046 18 24V14C18 10 15 2 14 2C13 2 12.5 8 12 8C11.5 8 11 2 10 2C9 2 6 10 6 14V24Z"
            fill={state.status === 'missing' ? '#f1f5f9' : '#ffffff'}
            stroke={cond.color}
            strokeWidth="2"
          />
        )}
        {state.status !== 'healthy' && state.status !== 'missing' && (
          <circle cx="12" cy={isUpper ? 10 : 18} r="4" fill={cond.color} opacity="0.85" />
        )}
        {state.status === 'missing' && (
          <path d="M7 6L17 22M17 6L7 22" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>

      {/* Tooth number (lower) / condition (upper) */}
      {!isUpper && (
        <span className="text-[9px] font-mono font-bold text-[var(--color-text-muted)] mt-1">{num}</span>
      )}
      {isUpper && (
        <span className="text-[8px] font-semibold mt-1 truncate max-w-[30px]" style={{ color: cond.color }}>
          {cond.key.toUpperCase()}
        </span>
      )}
    </button>
  );
}

export default function DentalChart({ initialChart = [], onSaveChart, saving = false }) {
  const [chartData, setChartData] = useState({});
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const map = {};
    if (Array.isArray(initialChart)) {
      initialChart.forEach(item => {
        if (item.toothNumber) map[item.toothNumber] = item;
      });
    }
    setChartData(map);
  }, [initialChart]);

  function getToothState(num) {
    return chartData[num] || { toothNumber: num, status: 'healthy', surfaces: [], notes: '' };
  }

  function updateToothState(num, updates) {
    setChartData(prev => ({
      ...prev,
      [num]: { ...getToothState(num), ...updates },
    }));
  }

  async function handleSave() {
    const chartArray = Object.values(chartData).filter(t => t.status !== 'healthy' || t.surfaces?.length > 0 || t.notes);
    if (!onSaveChart || isSaving) return;
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const ok = await onSaveChart(chartArray);
      if (ok !== false) {
        setSuccessMsg('Dental chart findings saved successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg('Dental chart could not be saved. Please check the error message and try again.');
        setTimeout(() => setErrorMsg(null), 5000);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Save failed. Please try again.');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsSaving(false);
    }
  }

  const activeTooth = selectedTooth ? getToothState(selectedTooth) : null;

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 card p-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text)]">Interactive Odontogram</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Tap any tooth to record its condition or treatment notes.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || isSaving}
          className="btn btn-primary btn-sm flex items-center gap-1.5 flex-shrink-0"
        >
          <Save size={14} />
          {saving || isSaving ? 'Saving…' : 'Save Chart'}
        </button>
      </div>

      {/* Status messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2" role="status">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2" role="alert">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 card p-3 bg-[var(--color-bg-subtle)] text-xs font-medium">
        <span className="text-[var(--color-text-muted)] font-semibold mr-1 self-center">Legend:</span>
        {TOOTH_CONDITIONS.map(cond => (
          <div key={cond.key} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-[var(--color-border)] shadow-xs">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cond.color }} />
            <span>{cond.label}</span>
          </div>
        ))}
      </div>

      {/* Odontogram — horizontally scrollable on all devices */}
      <div className="card bg-white overflow-hidden" style={{ padding: '16px' }}>
        {/* Scroll hint */}
        <p className="dental-scroll-hint" style={{ marginBottom: '8px' }}>
          ← swipe left/right to see all teeth →
        </p>

        {/* Upper Arch */}
        <div style={{ marginBottom: '8px' }}>
          <p className="text-xs font-semibold text-center text-[var(--color-primary-600)] mb-2 tracking-wider uppercase">
            Upper Arch (Maxillary)
          </p>
          <div className="dental-arch-scroll">
            <div className="dental-arch-inner">
              {UPPER_TEETH.map(num => (
                <ToothButton
                  key={num}
                  num={num}
                  state={getToothState(num)}
                  isSelected={selectedTooth === num}
                  onClick={setSelectedTooth}
                  isUpper={true}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-[var(--color-border)] my-3" />

        {/* Lower Arch */}
        <div>
          <p className="text-xs font-semibold text-center text-[var(--color-primary-600)] mb-2 tracking-wider uppercase">
            Lower Arch (Mandibular)
          </p>
          <div className="dental-arch-scroll">
            <div className="dental-arch-inner">
              {LOWER_TEETH.map(num => (
                <ToothButton
                  key={num}
                  num={num}
                  state={getToothState(num)}
                  isSelected={selectedTooth === num}
                  onClick={setSelectedTooth}
                  isUpper={false}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Tooth Editor */}
      {selectedTooth && activeTooth && (
        <div className="card p-4 sm:p-5 bg-[var(--color-bg-subtle)] border-2 border-[var(--color-primary-200)] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--color-primary-500)] text-white">
                Tooth #{selectedTooth}
              </span>
              <h3 className="font-semibold text-sm text-[var(--color-text)] mt-1">{TOOTH_NAMES[selectedTooth]}</h3>
            </div>
            <button
              onClick={() => setSelectedTooth(null)}
              className="text-xs text-[var(--color-text-muted)] hover:underline"
            >
              Close Editor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Condition selector */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 block">
                Tooth Condition / Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TOOTH_CONDITIONS.map(cond => (
                  <button
                    key={cond.key}
                    type="button"
                    onClick={() => updateToothState(selectedTooth, { status: cond.key })}
                    className={`p-2 text-xs font-medium rounded-lg border text-left flex items-center gap-2 transition-all ${
                      activeTooth.status === cond.key
                        ? `${cond.bg} border-current shadow-xs`
                        : 'bg-white border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cond.color }} />
                    <span className="truncate">{cond.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Surfaces + Notes */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 block">
                Affected Surfaces
              </label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {SURFACES.map(surf => {
                  const isChecked = activeTooth.surfaces?.includes(surf.key);
                  return (
                    <button
                      key={surf.key}
                      type="button"
                      onClick={() => {
                        const current = activeTooth.surfaces || [];
                        const next = isChecked
                          ? current.filter(s => s !== surf.key)
                          : [...current, surf.key];
                        updateToothState(selectedTooth, { surfaces: next });
                      }}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-all ${
                        isChecked
                          ? 'bg-[var(--color-primary-500)] text-white border-[var(--color-primary-500)]'
                          : 'bg-white border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-slate-50'
                      }`}
                    >
                      {surf.key} <span className="hidden sm:inline">({surf.label})</span>
                    </button>
                  );
                })}
              </div>

              <label className="text-xs font-semibold text-[var(--color-text-muted)] mb-1 block">
                Clinical Notes for Tooth #{selectedTooth}
              </label>
              <input
                type="text"
                placeholder="e.g. Deep MOD decay, recommended for RCT + Crown"
                value={activeTooth.notes || ''}
                onChange={e => updateToothState(selectedTooth, { notes: e.target.value })}
                className="form-input w-full text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
