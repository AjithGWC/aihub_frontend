import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useDashboardTiles } from '../hooks/useDashboardTiles';

const demoData = [
  { month: 'Jan', value: 42 },
  { month: 'Feb', value: 58 },
  { month: 'Mar', value: 51 },
  { month: 'Apr', value: 74 },
  { month: 'May', value: 69 },
  { month: 'Jun', value: 88 },
];

export default function SampleOverview() {
  // The connectivity probe is declared as a tile in the manifest — no SQL here.
  const { status, errors, fatalError } = useDashboardTiles('sample-overview');

  const dbStatus =
    status['db-check'] === 'ready'
      ? '✅ MySQL connection is working'
      : status['db-check'] === 'error'
        ? `⚠️ MySQL not reachable: ${errors['db-check'] ?? 'unknown error'}`
        : 'Checking database connection…';

  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }

  return (
    <div>
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Status</div>
          <div className="kpi-value small-text">{dbStatus}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Demo KPI</div>
          <div className="kpi-value">382</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Demo Growth</div>
          <div className="kpi-value">+12.4%</div>
        </div>
      </div>

      <div className="chart-card">
        <h3>Demo Monthly Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={demoData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="muted small">
          This is a static demo. AI-generated dashboards declare their queries in a tile
          manifest and receive results over the NDJSON tile stream.
        </p>
      </div>
    </div>
  );
}
