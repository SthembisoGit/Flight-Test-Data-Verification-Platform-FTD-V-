import Link from 'next/link';
import { MetricCard } from '@/components/metric-card';
import { StatusPill } from '@/components/status-pill';
import { Anomaly, fetchJson, PaginationResponse, Session } from '@/lib/api';

interface SessionDetailProps {
  params: {
    sessionId: string;
  };
  searchParams: {
    severity?: string;
  };
}

const severities = ['ALL', 'CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION'];

export default async function SessionDetailPage({ params, searchParams }: SessionDetailProps) {
  const severity = searchParams.severity?.toUpperCase();
  const severityQuery = severity && severity !== 'ALL' ? `&severity=${severity}` : '';

  const [session, anomaliesData] = await Promise.all([
    fetchJson<Session>(`/sessions/${params.sessionId}`),
    fetchJson<PaginationResponse<Anomaly>>(`/sessions/${params.sessionId}/anomalies?limit=200${severityQuery}`)
  ]);

  if (!session) {
    return <p className="rounded-md border border-rose-700/50 bg-rose-950/40 p-3">Session not found.</p>;
  }

  const anomalies = anomaliesData?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-cyan-300/90">{session.id}</p>
          <h2 className="text-2xl font-semibold text-cyan-100">
            Mission {session.missionId} | {session.aircraftType}
          </h2>
        </div>
        <StatusPill label={session.riskClassification} />
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Stability Index" value={session.stabilityIndex.toFixed(3)} />
        <MetricCard label="Sensor Reliability" value={session.sensorReliability.toFixed(3)} />
        <MetricCard label="Mission Compliance" value={session.missionCompliance.toFixed(3)} />
        <MetricCard label="Anomaly Count" value={session.anomalyCount} />
      </section>

      <section className="panel p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {severities.map((item) => {
            const active = (severity ?? 'ALL') === item;
            const href =
              item === 'ALL'
                ? `/sessions/${params.sessionId}`
                : `/sessions/${params.sessionId}?severity=${item}`;
            return (
              <Link
                key={item}
                href={href}
                className={`rounded-md border px-3 py-1 text-xs font-semibold ${
                  active
                    ? 'border-cyan-300/70 bg-cyan-500/20 text-cyan-100'
                    : 'border-cyan-900/40 bg-cyan-950/30 text-cyan-200'
                }`}
              >
                {item}
              </Link>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cyan-900/40">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-2 text-left">Timestamp</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Parameter</th>
                <th className="px-3 py-2 text-left">Severity</th>
                <th className="px-3 py-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-900/20 text-sm">
              {anomalies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                    No anomalies for selected filter.
                  </td>
                </tr>
              ) : (
                anomalies.map((anomaly) => (
                  <tr key={anomaly.id} className="bg-panelAlt/40">
                    <td className="px-3 py-2 font-mono text-xs">{anomaly.timestamp.toFixed(3)}</td>
                    <td className="px-3 py-2">{anomaly.type}</td>
                    <td className="px-3 py-2">{anomaly.paramAffected ?? '-'}</td>
                    <td className="px-3 py-2">
                      <StatusPill label={anomaly.severity} />
                    </td>
                    <td className="px-3 py-2 text-slate-300">{anomaly.details ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
