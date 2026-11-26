import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-5 left-5 z-50 inline-flex items-center gap-2 rounded-md bg-amber-700 border border-amber-800 px-3.5 py-2 text-xs font-medium text-white"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Sem conexão — exibindo dados salvos</span>
    </div>
  );
}
