import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from './SessionContext';
import { COLOR, FONT_BODY } from '../components/atlasTheme';

function SessionLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: COLOR.bg,
        color: COLOR.neutral300,
        fontFamily: FONT_BODY,
        fontSize: 13,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      Connecting to AI Hub…
    </div>
  );
}

/** Only role === 'admin' may pass; everyone else is sent to the chatbot. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, status } = useSession();
  if (status === 'loading') return <SessionLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/chat" replace />;
  return <>{children}</>;
}

/** Any authenticated user (admin or not) may pass. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { user, status } = useSession();
  if (status === 'loading') return <SessionLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
