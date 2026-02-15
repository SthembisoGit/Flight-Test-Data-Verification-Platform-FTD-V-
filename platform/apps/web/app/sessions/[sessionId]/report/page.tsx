import { CLIENT_API_BASE } from '@/lib/api';

interface SessionReportPageProps {
  params: {
    sessionId: string;
  };
}

export default function SessionReportPage({ params }: SessionReportPageProps) {
  const reportUrl = `${CLIENT_API_BASE}/sessions/${params.sessionId}/report`;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-cyan-100">Session Report</h2>
      <p className="text-sm text-slate-400">
        Embedded HTML report served directly from the backend artifact store.
      </p>
      <div className="panel h-[78vh] overflow-hidden">
        <iframe title="session-report" src={reportUrl} className="h-full w-full bg-white" />
      </div>
    </div>
  );
}
