import { useState } from 'react';
import { cn, fileProxyUrl } from '../lib/api';

export function BatchImage({
  src,
  alt,
  className,
  contain = true,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  contain?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const proxied = src ? fileProxyUrl(src) : null;
  const finalSrc = !proxied || failed ? '/logo-256.png' : proxied;

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      {finalSrc && (
        <img
          src={finalSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-20"
          onError={() => setFailed(true)}
        />
      )}
      <img
        src={finalSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        className={cn(
          'relative w-full h-full z-10 transition-transform duration-700 group-hover:scale-[1.03]',
          contain ? 'object-contain p-2' : 'object-cover'
        )}
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-white/40 via-transparent to-transparent opacity-70 pointer-events-none" />
    </div>
  );
}
