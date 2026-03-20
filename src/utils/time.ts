import { format, isToday, isYesterday, formatDistanceToNow, differenceInMinutes } from 'date-fns';

export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'HH:mm');
}

export function formatChatListTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  const diffDays = differenceInMinutes(new Date(), date) / (60 * 24);
  if (diffDays < 7) return format(date, 'EEEE'); // e.g. "Monday"
  return format(date, 'dd/MM/yy');
}

export function formatLastSeen(timestamp?: number | null): string {
  if (!timestamp) return 'last seen a long time ago';
  const date = new Date(timestamp);
  if (isToday(date)) return `last seen today at ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `last seen yesterday at ${format(date, 'HH:mm')}`;
  return `last seen ${format(date, 'dd MMM')} at ${format(date, 'HH:mm')}`;
}

export function formatCallDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatVoiceDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

export function isSameMinute(a: string, b: string): boolean {
  return differenceInMinutes(new Date(a), new Date(b)) === 0;
}
