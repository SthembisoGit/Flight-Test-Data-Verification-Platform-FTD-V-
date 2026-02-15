'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { CLIENT_API_BASE } from '@/lib/api';

type RunFormState = {
  missionId: string;
  aircraft: string;
  shouldGeneratePdf: boolean;
};

const initialState: RunFormState = {
  missionId: 'TEST-001',
  aircraft: 'UNKNOWN',
  shouldGeneratePdf: false
};

export default function NewRunPage() {
  const router = useRouter();
  const [simulate, setSimulate] = useState<RunFormState>(initialState);
  const [upload, setUpload] = useState<RunFormState>({ ...initialState, missionId: 'REAL-001' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const endpointBase = useMemo(() => CLIENT_API_BASE, []);

  const submitSimulate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessId(null);
    try {
      const response = await fetch(`${endpointBase}/jobs/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulate)
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message ?? 'Failed to create simulation job');
      }
      setSuccessId(body.id);
      router.push(`/jobs/${body.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Please choose a CSV file before submitting');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccessId(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('missionId', upload.missionId);
      form.append('aircraft', upload.aircraft);
      form.append('shouldGeneratePdf', String(upload.shouldGeneratePdf));

      const response = await fetch(`${endpointBase}/jobs/upload`, {
        method: 'POST',
        body: form
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message ?? 'Failed to create upload job');
      }
      setSuccessId(body.id);
      router.push(`/jobs/${body.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-cyan-100">Start Analysis Run</h2>
        <p className="mt-2 text-sm text-slate-400">
          Submit a simulation or CSV upload. Processing runs asynchronously through the worker queue.
        </p>
      </div>

      {error ? <div className="rounded-lg border border-rose-700/50 bg-rose-950/50 p-3 text-sm">{error}</div> : null}
      {successId ? (
        <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/50 p-3 text-sm">
          Job created: {successId}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={submitSimulate} className="panel space-y-4 p-5">
          <h3 className="text-lg font-semibold text-cyan-100">Simulation Run</h3>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Mission ID</span>
            <input
              className="w-full rounded-md border border-cyan-900/50 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              value={simulate.missionId}
              onChange={(e) => setSimulate((prev) => ({ ...prev, missionId: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Aircraft</span>
            <input
              className="w-full rounded-md border border-cyan-900/50 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              value={simulate.aircraft}
              onChange={(e) => setSimulate((prev) => ({ ...prev, aircraft: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={simulate.shouldGeneratePdf}
              onChange={(e) =>
                setSimulate((prev) => ({ ...prev, shouldGeneratePdf: e.target.checked }))
              }
            />
            Generate PDF (requires wkhtmltopdf in worker environment)
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border border-cyan-300/50 bg-cyan-600/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {busy ? 'Submitting...' : 'Queue Simulation'}
          </button>
        </form>

        <form onSubmit={submitUpload} className="panel space-y-4 p-5">
          <h3 className="text-lg font-semibold text-cyan-100">CSV Upload Run</h3>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">CSV File</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-cyan-900/50 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Mission ID</span>
            <input
              className="w-full rounded-md border border-cyan-900/50 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              value={upload.missionId}
              onChange={(e) => setUpload((prev) => ({ ...prev, missionId: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Aircraft</span>
            <input
              className="w-full rounded-md border border-cyan-900/50 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
              value={upload.aircraft}
              onChange={(e) => setUpload((prev) => ({ ...prev, aircraft: e.target.value }))}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border border-cyan-300/50 bg-cyan-600/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {busy ? 'Submitting...' : 'Queue CSV Analysis'}
          </button>
        </form>
      </div>
    </div>
  );
}
