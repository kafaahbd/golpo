import { useState } from 'react';
import { Users } from 'lucide-react';
import { generateAvatarColor, getInitials } from '@/utils/helpers';
import clsx from 'clsx';

interface AvatarProps {
  src?: string | null;
  name?: string;
  userId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isGroup?: boolean;
  isOnline?: boolean;
  showOnline?: boolean;
  className?: string;
}

const SIZES = {
  xs: { container: 'w-7 h-7', text: 'text-xs', indicator: 'w-2 h-2 border', icon: 'w-3.5 h-3.5' },
  sm: { container: 'w-9 h-9', text: 'text-sm', indicator: 'w-2.5 h-2.5 border', icon: 'w-4 h-4' },
  md: { container: 'w-11 h-11', text: 'text-sm', indicator: 'w-3 h-3 border-2', icon: 'w-5 h-5' },
  lg: { container: 'w-14 h-14', text: 'text-base', indicator: 'w-3.5 h-3.5 border-2', icon: 'w-6 h-6' },
  xl: { container: 'w-20 h-20', text: 'text-2xl', indicator: 'w-4 h-4 border-2', icon: 'w-8 h-8' },
};

export default function Avatar({
  src, name, userId, size = 'md', isGroup = false,
  isOnline, showOnline = false, className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { container, text, indicator, icon } = SIZES[size];
  const colorClass = userId ? generateAvatarColor(userId) : 'bg-emerald-600/20 text-emerald-300';
  const initials = name ? getInitials(name) : '?';

  return (
    <div className={clsx('relative flex-shrink-0', className)}>
      <div className={clsx('rounded-full overflow-hidden flex items-center justify-center font-semibold', container, colorClass)}>
        {src && !imgError ? (
          <img
            src={src} alt={name || 'Avatar'}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : isGroup ? (
          <Users className={clsx(icon, 'opacity-80')} />
        ) : (
          <span className={text}>{initials}</span>
        )}
      </div>

      {showOnline && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full',
            indicator,
            'border-[var(--color-bg-secondary)]',
            isOnline ? 'bg-emerald-400' : 'bg-gray-600',
          )}
        />
      )}
    </div>
  );
}
