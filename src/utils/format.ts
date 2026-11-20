export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatTimeShort(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getElapsedMinutes(isoString: string | null, nowMs: number = Date.now()): number {
  if (!isoString) return 0;
  const start = new Date(isoString).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((nowMs - start) / 60000));
}

export function formatElapsed(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}
