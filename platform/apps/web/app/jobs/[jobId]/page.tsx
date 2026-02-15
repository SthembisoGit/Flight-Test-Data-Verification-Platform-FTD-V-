'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CLIENT_API_BASE, Job } from '@/lib/api';
import { StatusPill } from '@/components/status-pill';

type JobPageProps = {
  params: {
    jobId: string;
  };
};

const pollInterval = Number.parseInt(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? '3000', 10);

export default function JobDetailPage({ params }: JobPageProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endpointBase = useMemo(() => CLIENT_API_BASE, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await fetch(`${endpointBase}/jobs/${params.jobId}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Unable to load job ${params.jobId}`);
        }
        const body = (await response.json()) as Job;
        if (isMounted) setJob(body);
      } catch (err) {
        if (isMounted) setError((err as Error).message);
      }
    };

    load();
    const timer = setInterval(load, Number.isFinite(pollInterval) ? pollInterval : 3000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [endpointBase, params.jobId]);

  if (error) {
    return <p className="rounded-md border border-rose-700/40 bg-rose-950/40 p-3 text-sm">{error}</p>;
  }
  if (!job) {
    return <p className="text-sm text-slate-300">Loading job...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-cyan-200/80">Job ID</p>
            <h2 className="text-lg font-semibold text-cyan-100">{job.id}</h2>
          </div>
          <StatusPill label={job.status} />
        </div>
        <p className="mt-3 text-sm text-slate-300">
          mode={job.mode} mission={job.missionId} aircraft={job.aircraft}
        </p>
        {job.sessionId ? (
          <p className="mt-3 text-sm text-cyan-300">
            Session linked:{' '}
            <Link href={`/sessions/${job.sessionId}`} className="underline">
              {job.sessionId}
            </Link>
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h3 className="mb-3 text-lg font-semibold text-cyan-100">Logs</h3>
          <pre className="max-h-[420px] overflow-auto rounded-md bg-slate-950/80 p-3 font-mono text-xs text-slate-200">
            {job.log || job.error || 'Logs are not available yet.'}
          </pre>
        </div>
        <div className="panel p-5">
          <h3 className="mb-3 text-lg font-semibold text-cyan-100">Artifacts</h3>
          <div className="space-y-2">
            {job.artifacts && job.artifacts.length > 0 ? (
              job.artifacts.map((artifact) => (
                <a
                  key={artifact.id}
                  href={`${endpointBase}/artifacts/${job.id}/${artifact.fileName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-md border border-cyan-900/40 bg-panelAlt/90 px-3 py-2 text-sm transition hover:border-cyan-400/70"
                >
                  <span className="font-mono text-cyan-100">{artifact.fileName}</span>
                  <span className="text-xs text-slate-400">{artifact.kind}</span>
                </a>
              ))
            ) : (
              <p className="text-sm text-slate-400">No artifacts yet. Keep this page open while processing.</p>
            )}
          </div>
          {job.sessionId ? (
            <Link
              href={`/sessions/${job.sessionId}/report`}
              className="mt-4 inline-flex rounded-md border border-cyan-400/60 bg-cyan-600/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-600/30"
            >
              Open report viewer
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
