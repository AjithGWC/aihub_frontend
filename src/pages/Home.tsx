import { useOutletContext } from 'react-router-dom';
import { DashboardMeta } from '@/api';
import HexagonHub from '../components/HexagonHub';

export default function Home() {
  const { dashboards } = useOutletContext<{ dashboards: DashboardMeta[]; loading: boolean }>();
  return <HexagonHub dashboards={dashboards} />;
}

