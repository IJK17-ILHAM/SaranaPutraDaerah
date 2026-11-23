import type { CSSProperties } from 'react';

interface SpdLogoWordmarkProps {
  variant?: 'on-dark' | 'on-light' | 'adaptive';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'invoice';
  className?: string;
}

const SIZE_MAP = {
  xs: { fontSize: 15, dot: 4.5, gap: 1.5, dotOffset: 2.5 },
  sm: { fontSize: 18, dot: 5.5, gap: 2, dotOffset: 3 },
  md: { fontSize: 22, dot: 6.5, gap: 2.5, dotOffset: 3.5 },
  lg: { fontSize: 30, dot: 8.5, gap: 3, dotOffset: 4.5 },
  invoice: { fontSize: 34, dot: 9, gap: 3, dotOffset: 5 },
} as const;

export function SpdLogoWordmark({
  variant = 'on-dark',
  size = 'md',
  className = '',
}: SpdLogoWordmarkProps) {
  const dims = SIZE_MAP[size];

  const textStyle: CSSProperties | undefined =
    variant === 'on-dark'
      ? {
          color: '#FFFFFF',
          textShadow: '0 2px 6px rgba(10, 22, 46, 0.35)',
        }
      : variant === 'on-light'
        ? {
            color: '#1E3A6E',
          }
        : undefined;

  const textClass =
    variant === 'adaptive'
      ? 'text-[#1E3A6E] dark:text-white'
      : '';

  return (
    <span
      className={`inline-flex items-baseline select-none leading-none ${className}`}
      style={{
        fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
        fontWeight: 800,
        fontSize: `${dims.fontSize}px`,
        letterSpacing: '-0.05em',
        lineHeight: 0.92,
      }}
      aria-label="spd."
    >
      <span className={textClass} style={textStyle}>
        spd
      </span>
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: `${dims.dot}px`,
          height: `${dims.dot}px`,
          marginLeft: `${dims.gap}px`,
          marginBottom: `${dims.dotOffset - 2}px`,
          borderRadius: '9999px',
          background: 'linear-gradient(145deg, #FCD34D 0%, #F59E0B 72%, #D97706 100%)',
          boxShadow:
            variant === 'on-dark'
              ? '0 2px 5px rgba(10, 22, 46, 0.45)'
              : '0 1px 2px rgba(180, 83, 9, 0.25)',
          flexShrink: 0,
        }}
      />
    </span>
  );
}

export const SPD_NAVY_GRADIENT = 'linear-gradient(135deg, #162E57 0%, #1E3F76 52%, #2B599C 100%)';
