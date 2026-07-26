import React from 'react';
import { motion } from 'framer-motion';

export type CardAccent = 'lime' | 'coral' | 'violet' | 'paper' | 'none';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Accent stripe — renders a 4px solid top border in the accent colour
   * and animates the matching offset shadow. Default 'none'.
   */
  accent?: CardAccent;
  /** Interactive card: enables the press-toward-shadow hover animation. */
  interactive?: boolean;
  /** @deprecated Glass-era prop — no longer applies styles; kept for API compat. */
  hoverLift?: boolean;
  /** @deprecated Glass-era prop — no longer applies styles; kept for API compat. */
  glowVariant?: 'lavender' | 'pink' | 'lime' | 'coral';
  /** @deprecated Glass-era prop — no longer applies styles; kept for API compat. */
  glassy?: boolean;
  /** @deprecated Use interactive instead. */
  asMotion?: boolean;
}

// ── Top border stripe per accent ──────────────────────────────────────────────
const accentTopBorder: Record<CardAccent, string> = {
  lime:   'border-t-4 border-t-bb-lime',
  coral:  'border-t-4 border-t-bb-coral',
  violet: 'border-t-4 border-t-bb-violet',
  paper:  'border-t-4 border-t-bb-paper',
  none:   '',
};

// ── Shadow values (Tailwind class — used for static, non-interactive cards) ───
const accentShadowClass: Record<CardAccent, string> = {
  lime:   'shadow-bb-lime',
  coral:  'shadow-bb-coral',
  violet: 'shadow-bb-violet',
  paper:  'shadow-bb-paper',
  none:   'shadow-bb',
};

// ── Inline shadow values for Framer Motion animation (interactive cards only) ─
// The shadow shrinks from 4px → 2px → 0px as the element translates
// toward it, giving the physical press-into-surface sensation.
const restShadow: Record<CardAccent, string> = {
  lime:   '0 8px 24px rgb(56 189 248 / 0.14)',
  coral:  '0 8px 24px rgb(100 116 139 / 0.14)',
  violet: '0 8px 24px rgb(56 189 248 / 0.14)',
  paper:  '0 8px 24px rgb(248 250 252 / 0.10)',
  none:   '0 8px 24px rgb(0 0 0 / 0.18)',
};

const hoverShadow: Record<CardAccent, string> = {
  lime:   '0 12px 28px rgb(56 189 248 / 0.18)',
  coral:  '0 12px 28px rgb(100 116 139 / 0.18)',
  violet: '0 12px 28px rgb(56 189 248 / 0.18)',
  paper:  '0 12px 28px rgb(248 250 252 / 0.12)',
  none:   '0 12px 28px rgb(0 0 0 / 0.22)',
};

const activeShadow: Record<CardAccent, string> = {
  lime:   '0 4px 12px rgb(56 189 248 / 0.12)',
  coral:  '0 4px 12px rgb(100 116 139 / 0.12)',
  violet: '0 4px 12px rgb(56 189 248 / 0.12)',
  paper:  '0 4px 12px rgb(248 250 252 / 0.08)',
  none:   '0 4px 12px rgb(0 0 0 / 0.12)',
};

export function Card({
  children,
  accent = 'none',
  interactive = false,
  glassy = true,
  // deprecated props — silently ignored
  hoverLift: _hoverLift,
  glowVariant: _glowVariant,
  asMotion: _asMotion,
  className = '',
  ...props
}: CardProps) {
  // Determine border and roundness based on glassy prop
  const borderClass = glassy ? 'border border-white/10' : 'border border-bb-border';
  const roundedClass = glassy ? 'rounded-2xl' : 'rounded-bb-sm';
  const bgClass = glassy ? 'bg-bb-surface/90 backdrop-blur-xl' : 'bg-bb-surface';

  // Soft glow accent borders if glassy
  const accentBorder = glassy
    ? accent === 'lime'
      ? 'border-t-2 border-t-bb-lime'
      : accent === 'coral'
      ? 'border-t-2 border-t-bb-coral'
      : accent === 'violet'
      ? 'border-t-2 border-t-bb-violet'
      : ''
    : accentTopBorder[accent];

  const base = [
    bgClass,
    borderClass,
    roundedClass,
    accentBorder,
  ].filter(Boolean).join(' ');

  // Standard shadow class
  const shadowClass = glassy
    ? accent === 'lime'
      ? 'shadow-[0_12px_28px_rgba(56,189,248,0.10)]'
      : accent === 'coral'
      ? 'shadow-[0_12px_28px_rgba(100,116,139,0.10)]'
      : accent === 'violet'
      ? 'shadow-[0_12px_28px_rgba(56,189,248,0.10)]'
      : 'shadow-bb'
    : accentShadowClass[accent];

  if (interactive) {
    if (glassy) {
      return (
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.15, ease: 'easeOut' } }}
          whileTap={{ y: 0 }}
          className={`${base} ${shadowClass} hover:shadow-2xl hover:border-white/15 transition-all duration-200 cursor-pointer ${className}`}
          {...(props as any)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ x: 0, y: 0, boxShadow: restShadow[accent] }}
        whileHover={{ x: 2, y: 2, boxShadow: hoverShadow[accent] }}
        whileTap={{ x: 4, y: 4, boxShadow: activeShadow[accent] }}
        transition={{ duration: 0.08, ease: 'easeOut' }}
        className={`${base} ${className}`}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={`${base} ${shadowClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
