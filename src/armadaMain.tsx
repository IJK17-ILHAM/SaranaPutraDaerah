import { createRoot } from 'react-dom/client';
import './index.css';
import { ArmadaDashboardPage } from './pages/armada/ArmadaDashboardPage';

createRoot(document.getElementById('armada-root')!).render(<ArmadaDashboardPage />);
