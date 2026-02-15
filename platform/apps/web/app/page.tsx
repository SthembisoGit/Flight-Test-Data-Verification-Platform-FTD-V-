import Link from 'next/link';
import { MetricCard } from '@/components/metric-card';
import { StatusPill } from '@/components/status-pill';
import { fetchJson, Job, PaginationResponse, Session } from '@/lib/api';

export default async function DashboardPage() {
  const [jobsData, sessionsData] = await Promise.all([
    fetchJson<PaginationResponse<Job>>('/jobs?limit=8'),
    fetchJson<PaginationResponse<Session>>('/sessions?limit=8')
  ]);

  const jobs = jobsData?.items ?? [];
  const sessions = sessionsData?.items ?? [];
  const completedJobs = jobs.filter((job) => job.status === 'COMPLETED').length;
  const failedJobs = jobs.filter((job) => job.status === 'FAILED').length;
  const criticalSessions = sessions.filter((session) => session.riskClassification === 'CRITICAL').length;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Jobs Observed" value={jobsData?.total ?? 0} hint="Latest queue snapshot" />
        <MetricCard label="Completed" value={completedJobs} hint="Recent successful jobs" />
        <MetricCard label="Failed" value={failedJobs} hint="Needs investigation" />
        <MetricCard label="Critical Sessions" value={criticalSessions} hint="Risk class from imported metrics" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cyan-100">Recent Jobs</h2>
            <Link href="/runs/new" className="text-sm text-cyan-300 hover:text-cyan-100">
              + New run
            </Link>
          </div>
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <p className="text-sm text-slate-400">No jobs found yet.</p>
            ) : (
              jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block rounded-lg border border-cyan-900/40 bg-panelAlt/90 p-3 transition hover:border-cyan-300/60"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs text-slate-300">{job.id}</p>
                    <StatusPill label={job.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-200">
                    {job.mode} | mission={job.missionId} | aircraft={job.aircraft}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cyan-100">Recent Sessions</h2>
            <Link href="/sessions" className="text-sm text-cyan-300 hover:text-cyan-100">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-400">No sessions imported yet.</p>
            ) : (
              sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="block rounded-lg border border-cyan-900/40 bg-panelAlt/90 p-3 transition hover:border-cyan-300/60"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs text-slate-300">{session.id}</p>
                    <StatusPill label={session.riskClassification} />
                  </div>
                  <p className="mt-2 text-sm text-slate-200">
                    mission={session.missionId} | anomalies={session.anomalyCount}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
