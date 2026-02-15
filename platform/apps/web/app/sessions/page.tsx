import Link from 'next/link';
import { StatusPill } from '@/components/status-pill';
import { fetchJson, PaginationResponse, Session } from '@/lib/api';

interface SessionsPageProps {
  searchParams: {
    risk?: string;
    page?: string;
  };
}

const riskFilters = ['ALL', 'CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION'];

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const page = Math.max(Number.parseInt(searchParams.page ?? '1', 10) || 1, 1);
  const risk = searchParams.risk?.toUpperCase();
  const riskQuery = risk && risk !== 'ALL' ? `&risk=${risk}` : '';
  const data = await fetchJson<PaginationResponse<Session>>(
    `/sessions?page=${page}&limit=25${riskQuery}`
  );

  const sessions = data?.items ?? [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-cyan-100">Sessions</h2>
        <div className="flex flex-wrap gap-2">
          {riskFilters.map((label) => {
            const active = (risk ?? 'ALL') === label;
            const href = label === 'ALL' ? '/sessions' : `/sessions?risk=${label}`;
            return (
              <Link
                key={label}
                href={href}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold tracking-wide ${
                  active
                    ? 'border-cyan-300/70 bg-cyan-600/25 text-cyan-100'
                    : 'border-cyan-900/50 bg-cyan-950/25 text-cyan-200'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="min-w-full divide-y divide-cyan-900/40">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 text-left">Session</th>
              <th className="px-4 py-3 text-left">Mission</th>
              <th className="px-4 py-3 text-left">Aircraft</th>
              <th className="px-4 py-3 text-left">Risk</th>
              <th className="px-4 py-3 text-left">Anomalies</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-900/20 text-sm">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No sessions found.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="bg-panelAlt/40">
                  <td className="px-4 py-3 font-mono text-xs">{session.id}</td>
                  <td className="px-4 py-3">{session.missionId}</td>
                  <td className="px-4 py-3">{session.aircraftType}</td>
                  <td className="px-4 py-3">
                    <StatusPill label={session.riskClassification} />
                  </td>
                  <td className="px-4 py-3">{session.anomalyCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/sessions/${session.id}`} className="text-cyan-300 underline">
                        Details
                      </Link>
                      <Link href={`/sessions/${session.id}/report`} className="text-cyan-300 underline">
                        Report
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
