import React from 'react';

export function EmptyState({
  icon,
  title,
  msg,
}: {
  icon: React.ReactNode;
  title: string;
  msg: string;
}) {
  return (
    <div className="liquid-glass rounded-[2rem] p-12 flex flex-col items-center justify-center text-center gap-3 min-h-[280px]">
      {icon}
      <h3 className="text-lg font-black text-stone-900">{title}</h3>
      <p className="text-sm text-stone-600 font-medium max-w-sm">{msg}</p>
    </div>
  );
}
