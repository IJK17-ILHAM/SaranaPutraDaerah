import React from 'react';
import { useApp } from '../../context/AppContext';
import { MainMenuIcon } from './MainMenuIcons';

interface PageHeaderProps {
  suiteLabel: string;
  pageLabel: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({
  suiteLabel,
  pageLabel,
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  const { activeMenu, theme } = useApp();

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
        <div className="w-16 h-16 sm:w-[74px] sm:h-[74px] rounded-2xl bg-transparent flex items-center justify-center shrink-0">
          <MainMenuIcon id={activeMenu} size={64} onDark={theme === 'dark'} />
        </div>
        <div className="min-w-0">
          <div className="text-xs t-muted mb-1 flex items-center gap-1.5">
            <span>{suiteLabel}</span>
            <span aria-hidden="true">/</span>
            <span className="t-text font-medium">{pageLabel}</span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] leading-[34px] sm:leading-[38px] font-bold tracking-[-0.025em] t-text">
            {title}
          </h1>
          {subtitle && <div className="text-sm t-muted mt-1">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
