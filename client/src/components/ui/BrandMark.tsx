interface BrandMarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[9px]',
  md: 'h-9 w-9 text-[11px]',
  lg: 'h-12 w-12 text-sm',
};

export function BrandMark({ className = '', size = 'md' }: BrandMarkProps) {
  return (
    <span
      aria-label="FinPilot AI"
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#101720] font-mono font-bold tracking-[-0.08em] text-white shadow-sm ${sizeClasses[size]} ${className}`}
    >
      FI
    </span>
  );
}
