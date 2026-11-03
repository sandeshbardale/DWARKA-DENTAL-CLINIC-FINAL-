import { useState, useEffect, useRef } from 'react';
import {
  Upload, Brain, CheckCircle2, AlertTriangle, FileText,
  Sparkles, Loader2, RefreshCw, XCircle, Info, ShieldAlert,
  Eye, BadgeCheck, History, Stethoscope,
} from 'lucide-react';
import { api } from '../../utils/api';
import { useDispatch, useSelector } from 'react-redux';
import { addToast } from '../../app/store';

// ── Helpers ──────────────────────────────────────────────────────────────────

const RESULT_CONFIG = {
  cavity: {
    label: 'Cavity Detected',
    color: 'red',
    icon: AlertTriangle,
    bg: 'bg-red-50 border-red-300',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-700 border border-red-300',
  },
  findings_detected: {
    label: 'Findings Detected',
    color: 'amber',
    icon: ShieldAlert,
    bg: 'bg-amber-50 border-amber-300',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-700 border border-amber-300',
  },
  uncertain: {
    label: 'Uncertain — Review Required',
    color: 'amber',
    icon: Info,
    bg: 'bg-amber-50 border-amber-300',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-700 border border-amber-300',
  },
  normal: {
    label: 'No Significant Findings',
    color: 'green',
    icon: CheckCircle2,
    bg: 'bg-emerald-50 border-emerald-300',
    text: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  },
};

function resultConfig(result) {
  return RESULT_CONFIG[result] || RESULT_CONFIG.uncertain;
}

function ConfidenceMeter({ value }) {
  // value is 0–1 from the model
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-[var(--color-text)] w-10 text-right">{pct}%</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AiXrayPage() {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.auth.user);
  const currentRole = useSelector(state => state.auth.role);

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showAnnotated, setShowAnnotated] = useState(true);
  const [pastReports, setPastReports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const progressTimer = useRef([]);

  // Load patients list
  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await api.getPatients({ limit: 500 });
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setPatients(list);
        if (list.length > 0) setSelectedPatientId(list[0]._id || list[0].id);
      } catch (err) {
        console.error('Failed to load patients', err);
      }
    }
    loadPatients();
  }, []);

  // Load history whenever patient changes
  useEffect(() => {
    if (!selectedPatientId) return;
    setLoadingHistory(true);
    api.getAiReports(selectedPatientId)
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.data || []);
        setPastReports(list);
      })
      .catch(() => setPastReports([]))
      .finally(() => setLoadingHistory(false));
  }, [selectedPatientId]);

  function clearTimers() {
    progressTimer.current.forEach(clearTimeout);
    progressTimer.current = [];
  }

  function handleFileSelect(selectedFile) {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      dispatch(addToast({ type: 'error', title: 'Invalid File', message: 'Only JPG / PNG X-ray images are accepted.' }));
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      dispatch(addToast({ type: 'error', title: 'Too Large', message: 'Maximum file size is 10 MB.' }));
      return;
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setReport(null);
    setError('');
  }

  async function runAnalysis() {
    if (!file) {
      dispatch(addToast({ type: 'error', title: 'No Image', message: 'Please upload a dental X-ray image first.' }));
      return;
    }
    if (!selectedPatientId) {
      dispatch(addToast({ type: 'error', title: 'No Patient', message: 'Please select a patient to link the report to.' }));
      return;
    }

    clearTimers();
    setAnalyzing(true);
    setProgressStep(1);
    setReport(null);
    setError('');

    progressTimer.current.push(setTimeout(() => setProgressStep(2), 800));
    progressTimer.current.push(setTimeout(() => setProgressStep(3), 2000));

    try {
      const apiRes = await api.uploadXray(selectedPatientId, file);
      const r = apiRes?.data?.report;
      if (!r) throw new Error('Empty response from server. Is the ML service running?');

      setReport(r);
      setShowAnnotated(true);
      dispatch(addToast({ type: 'success', title: 'Analysis Complete', message: 'X-ray analyzed and saved to patient file.' }));

      // Refresh history
      api.getAiReports(selectedPatientId)
        .then(d => setPastReports(Array.isArray(d) ? d : (d?.data || [])))
        .catch(() => {});
    } catch (err) {
      const msg = err.message || 'Analysis failed. Check that the ML service is running.';
      setError(msg);
      dispatch(addToast({ type: 'error', title: 'Analysis Failed', message: msg }));
    } finally {
      clearTimers();
      setAnalyzing(false);
      setProgressStep(0);
    }
  }

  async function handleReview(reportId, doctorReview) {
    setReviewingId(reportId);
    try {
      await api.reviewAiReport(reportId, { doctorReview, doctorNotes: '' });
      dispatch(addToast({ type: 'success', title: 'Review Saved', message: `Report marked as ${doctorReview}.` }));
      // Update in local state
      if (report?.id === reportId) setReport(prev => ({ ...prev, doctorReview }));
      setPastReports(prev => prev.map(r => r.id === reportId ? { ...r, doctorReview } : r));
    } catch (err) {
      dispatch(addToast({ type: 'error', title: 'Review Failed', message: err.message }));
    } finally {
      setReviewingId(null);
    }
  }

  const isDoctor = currentRole === 'doctor' || currentRole === 'admin';

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)] flex items-center gap-2">
          <Brain className="text-[var(--color-primary-500)]" size={24} />
          AI X-ray Analysis
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Upload a dental X-ray to get YOLO11-powered detection of cavities, fillings, implants &amp; impacted teeth
        </p>
      </div>

      {/* ── Main Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Left: Upload Panel */}
        <div className="card p-6 space-y-5 bg-white border border-[var(--color-border)] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Upload size={16} className="text-[var(--color-primary-500)]" />
              Upload X-ray Image
            </h2>
            <span className="text-[11px] bg-violet-50 text-violet-700 font-semibold px-2 py-0.5 rounded-full border border-violet-200">
              YOLO11m · app.pt
            </span>
          </div>

          {/* Patient selector */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
              Link to Patient *
            </label>
            <select
              value={selectedPatientId}
              onChange={e => {
                setSelectedPatientId(e.target.value);
                setReport(null);
                setError('');
              }}
              className="form-input text-xs cursor-pointer"
            >
              {patients.length === 0 ? (
                <option value="">No patients found</option>
              ) : (
                patients.map(p => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.name} — {p.patientNumber || p.phone || ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={e => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[220px] ${
              dragActive
                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                : 'border-blue-200 bg-blue-50/30 hover:border-blue-400'
            }`}
          >
            {previewUrl ? (
              <div className="relative w-full overflow-hidden rounded-lg border border-[var(--color-border)] group">
                <img src={previewUrl} alt="X-ray preview" className="w-full max-h-52 object-contain rounded-lg bg-black" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="btn btn-primary btn-xs cursor-pointer">
                    Change Image
                    <input type="file" accept="image/jpeg,image/jpg,image/png" className="hidden"
                      onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                  </label>
                  <button
                    onClick={() => { setFile(null); setPreviewUrl(''); setReport(null); setError(''); }}
                    className="btn btn-xs bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                  >
                    <XCircle size={13} className="mr-1" /> Clear
                  </button>
                </div>
                <span className="absolute top-1.5 left-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">
                  {file?.name}
                </span>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-blue-100 text-[var(--color-primary-500)] flex items-center justify-center mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-semibold text-[var(--color-text)]">Drop your X-ray image here</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">or click to browse files</p>
                <p className="text-[10px] text-slate-400 mt-2">JPG / PNG · Max 10 MB · Grayscale panoramic X-ray</p>
                <label className="mt-4 btn btn-outline btn-xs cursor-pointer">
                  Browse Files
                  <input type="file" accept="image/jpeg,image/jpg,image/png" className="hidden"
                    onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                </label>
              </>
            )}
          </div>

          {/* Analyse button */}
          {previewUrl && (
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="w-full btn btn-primary py-2.5 flex items-center justify-center gap-2 font-semibold shadow-sm disabled:opacity-60"
            >
              {analyzing ? (
                <><Loader2 size={16} className="animate-spin" /> Analyzing with YOLO11m…</>
              ) : (
                <><Sparkles size={16} /> Run AI Diagnostic Scan</>
              )}
            </button>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <XCircle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Analysis Error</p>
                <p className="mt-0.5">{error}</p>
                <p className="mt-1 text-red-500">Make sure the ML service is running: <code className="bg-red-100 px-1 rounded">uvicorn app:app --port 8000</code></p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Results Panel */}
        <div className="card p-6 space-y-5 bg-white border border-[var(--color-border)] rounded-xl shadow-xs min-h-[480px] flex flex-col">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Brain size={16} className="text-violet-500" />
              AI Analysis Results
            </h2>
            {report && (
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                {report.modelVersion}
              </span>
            )}
          </div>

          {/* Empty state */}
          {!analyzing && !report && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Brain size={32} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--color-text)]">No Analysis Yet</h3>
                <p className="text-xs text-[var(--color-text-muted)] max-w-xs mt-1">
                  Upload a dental X-ray and click "Run AI Diagnostic Scan" to get real YOLO11 results.
                </p>
              </div>
            </div>
          )}

          {/* Progress */}
          {analyzing && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="relative">
                <Loader2 size={44} className="animate-spin text-[var(--color-primary-500)]" />
                <Sparkles size={18} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {progressStep === 1 && 'Sending image to YOLO11m model…'}
                  {progressStep === 2 && 'Running object detection on X-ray…'}
                  {progressStep === 3 && 'Scoring confidence for each finding…'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  app.pt · YOLO11m dental model
                </p>
              </div>
              <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-primary-500)] transition-all duration-700"
                  style={{ width: `${Math.min(progressStep * 33, 99)}%` }}
                />
              </div>
            </div>
          )}

          {/* Real Report */}
          {!analyzing && report && (
            <div className="space-y-4 animate-fade-in flex-1 overflow-y-auto">

              {/* Result header */}
              {(() => {
                const cfg = resultConfig(report.result);
                const Icon = cfg.icon;
                return (
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${cfg.bg}`}>
                    <div className="flex items-center gap-2.5">
                      <Icon size={20} className={cfg.text} />
                      <div>
                        <p className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</p>
                        <p className={`text-[11px] ${cfg.text} opacity-80`}>
                          {report.count} finding{report.count !== 1 ? 's' : ''} detected
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {Math.round((report.confidence || 0) * 100)}% confidence
                    </span>
                  </div>
                );
              })()}

              {/* Confidence meter */}
              <div>
                <p className="text-[11px] text-[var(--color-text-muted)] mb-1 font-medium uppercase tracking-wide">
                  Model Confidence
                </p>
                <ConfidenceMeter value={report.confidence} />
              </div>

              {/* Annotated image */}
              {report.annotatedImage && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
                      Annotated X-ray
                    </p>
                    <button
                      onClick={() => setShowAnnotated(v => !v)}
                      className="text-[11px] text-[var(--color-primary-600)] hover:underline flex items-center gap-1"
                    >
                      <Eye size={11} /> {showAnnotated ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showAnnotated && (
                    <div className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-black">
                      <img
                        src={report.annotatedImage}
                        alt="YOLO annotated X-ray with bounding boxes"
                        className="w-full object-contain max-h-64"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {report.summary && (
                <div className="p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs">
                  <p className="font-semibold text-[var(--color-text)] mb-1 flex items-center gap-1.5">
                    <FileText size={12} className="text-[var(--color-primary-500)]" />
                    AI Summary
                  </p>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">{report.summary}</p>
                </div>
              )}

              {/* Per-finding breakdown */}
              {report.findings?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-[var(--color-text)] uppercase tracking-wider">
                    Detected Findings ({report.findings.length})
                  </p>
                  {report.findings.map((f, i) => {
                    const pct = Math.round((f.confidence || 0) * 100);
                    return (
                      <div key={i} className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                            {f.label}
                          </span>
                          <span className="text-[10px] font-semibold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200">
                            {pct}% match
                          </span>
                        </div>
                        <ConfidenceMeter value={f.confidence} />
                        {f.suggestion && (
                          <p className="text-[11px] text-[var(--color-text-muted)] leading-snug">
                            <span className="font-semibold text-[var(--color-text)]">Recommendation: </span>
                            {f.suggestion}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No findings state */}
              {report.findings?.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                  <CheckCircle2 size={14} className="shrink-0" />
                  No abnormal findings detected above the confidence threshold.
                </div>
              )}

              {/* Clinical suggestions */}
              {report.suggestions?.filter(Boolean).length > 0 && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-2">
                  <p className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Stethoscope size={13} className="text-blue-600" />
                    Clinical Recommendations
                  </p>
                  <ul className="space-y-1.5">
                    {report.suggestions.filter(Boolean).map((s, i) => (
                      <li key={i} className="text-blue-800 leading-relaxed flex gap-1.5">
                        <span className="text-blue-400 mt-0.5">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Doctor review */}
              {isDoctor && (
                <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2 flex-wrap">
                  {report.doctorReview ? (
                    <span className={`text-xs font-semibold flex items-center gap-1 ${report.doctorReview === 'confirmed' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <BadgeCheck size={14} />
                      Doctor {report.doctorReview === 'confirmed' ? 'Confirmed' : 'Rejected'} this finding
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">Awaiting doctor review</span>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(report.id, 'confirmed')}
                      disabled={!!reviewingId || report.doctorReview === 'confirmed'}
                      className="btn btn-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Confirm
                    </button>
                    <button
                      onClick={() => handleReview(report.id, 'rejected')}
                      disabled={!!reviewingId || report.doctorReview === 'rejected'}
                      className="btn btn-xs bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 flex items-center gap-1"
                    >
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-[var(--color-text-subtle)] border-t border-[var(--color-border)] pt-2 leading-relaxed">
                ⚠ AI output is for decision-support only. All findings must be reviewed and confirmed by a qualified dental professional before any clinical action is taken.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Past Reports for selected patient ──────────────────────────── */}
      {selectedPatientId && (
        <div className="card p-5 bg-white border border-[var(--color-border)] rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <History size={15} className="text-[var(--color-primary-500)]" />
              Previous Reports for this Patient
            </h2>
            {loadingHistory && <RefreshCw size={13} className="animate-spin text-[var(--color-text-muted)]" />}
          </div>

          {pastReports.length === 0 && !loadingHistory ? (
            <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">No past X-ray reports for this patient.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                    {['Date', 'Result', 'Findings', 'Confidence', 'Model', 'Review'].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pastReports.map(r => {
                    const cfg = resultConfig(r.result);
                    return (
                      <tr key={r.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)] transition-colors">
                        <td className="py-2.5 px-3 font-medium whitespace-nowrap">{r.date || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--color-text-muted)]">{r.count ?? (r.findings?.length ?? '—')}</td>
                        <td className="py-2.5 px-3 text-[var(--color-text-muted)]">
                          {r.confidence != null ? `${Math.round(r.confidence * 100)}%` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[var(--color-text-subtle)]">{r.modelVersion || '—'}</td>
                        <td className="py-2.5 px-3">
                          {r.doctorReview ? (
                            <span className={`font-semibold ${r.doctorReview === 'confirmed' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {r.doctorReview === 'confirmed' ? '✓ Confirmed' : '✗ Rejected'}
                            </span>
                          ) : isDoctor ? (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleReview(r.id, 'confirmed')}
                                disabled={reviewingId === r.id}
                                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[10px] font-medium"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => handleReview(r.id, 'rejected')}
                                disabled={reviewingId === r.id}
                                className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 text-[10px] font-medium"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[var(--color-text-muted)]">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom info banner ──────────────────────────────────────────── */}
      <div className="card p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
          <Brain size={18} />
        </div>
        <div className="space-y-0.5 text-xs">
          <p className="font-bold text-blue-900">YOLO11m Dental Model — app.pt</p>
          <p className="text-blue-800 leading-relaxed">
            Detects 4 classes: <strong>Cavity</strong>, <strong>Fillings</strong>, <strong>Implant</strong>, and <strong>Impacted Tooth</strong>.
            Model trained on panoramic dental X-rays. Runs locally via FastAPI on port 8000.
            All results are for clinical decision-support only — verified by a qualified dentist before action.
          </p>
        </div>
      </div>
    </div>
  );
}
