'use client';

import React from 'react';

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  accentClassName?: string;
  className?: string;
};

function joinClassNames(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ');
}

export default function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  accentClassName,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={joinClassNames(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-white/10 bg-zinc-800/90 px-0.5 transition-all duration-200',
        checked && (accentClassName || 'bg-[linear-gradient(135deg,#ff6b4a,#22c7b8)]'),
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <span
        className={joinClassNames(
          'block h-[22px] w-[22px] rounded-full bg-white shadow-[0_6px_16px_rgba(0,0,0,0.28)] transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}
