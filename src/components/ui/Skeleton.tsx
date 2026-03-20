import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({ className, rounded = 'md' }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'shimmer-line',
        rounded === 'sm' && 'rounded',
        rounded === 'md' && 'rounded-lg',
        rounded === 'lg' && 'rounded-xl',
        rounded === 'full' && 'rounded-full',
        className,
      )}
    />
  );
}

export function ChatListSkeleton() {
  return (
    <div className="space-y-1 px-2">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
          <Skeleton className="w-12 h-12 flex-shrink-0" rounded="full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={clsx('flex items-end gap-2 my-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {!isOwn && <Skeleton className="w-7 h-7 flex-shrink-0" rounded="full" />}
      <div className={clsx('space-y-1', isOwn ? 'items-end' : 'items-start', 'flex flex-col')}>
        <Skeleton className={clsx('h-10 rounded-2xl', isOwn ? 'w-48' : 'w-56')} />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="px-4 py-2 space-y-1">
      <MessageSkeleton />
      <MessageSkeleton isOwn />
      <MessageSkeleton />
      <MessageSkeleton />
      <MessageSkeleton isOwn />
      <MessageSkeleton isOwn />
      <MessageSkeleton />
    </div>
  );
}
