import type { ArmadaMenuId } from '../../types/armada';

interface ArmadaMenuIconProps {
  id: ArmadaMenuId;
  size?: number;
  className?: string;
  onDark?: boolean;
}

/**
 * Crisp duotone-outlined spot icons matching Portal SPD's MainMenuIcons (Style 03).
 * Adapts transparently to both dark sidebar surfaces and light/dark page headers.
 */
export function ArmadaMenuIcon({
  id,
  size = 24,
  className = '',
  onDark,
}: ArmadaMenuIconProps) {
  const isDark =
    onDark ??
    (typeof document !== 'undefined' && document.body.getAttribute('data-theme') === 'dark');
  const stroke = isDark ? '#E2E8F0' : '#1E3A6E';
  const sw = 1.65;
  const surface = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.8)';
  const tint = isDark ? 'rgba(147, 197, 253, 0.26)' : 'rgba(219, 234, 254, 0.9)';
  const tintSoft = isDark ? 'rgba(191, 219, 254, 0.16)' : 'rgba(224, 231, 255, 0.8)';
  const badgeStroke = isDark ? '#0F172A' : '#1E3A6E';
  const primary = isDark ? '#60A5FA' : '#3B82F6';
  const coral = '#F4538A';
  const emerald = '#10B981';

  const renderGlyph = () => {
    switch (id) {
      case 'armada-dashboard':
        return (
          <>
            <rect x="8" y="9" width="14" height="13" rx="3" fill={tint} stroke={stroke} strokeWidth={sw} />
            <rect x="26" y="9" width="14" height="8" rx="3" fill={surface} stroke={stroke} strokeWidth={sw} />
            <rect x="8" y="26" width="14" height="13" rx="3" fill={surface} stroke={stroke} strokeWidth={sw} />
            <rect x="26" y="21" width="14" height="18" rx="3" fill={tintSoft} stroke={stroke} strokeWidth={sw} />
            <path d="M29.5 33L32.5 29L35 31.2L37.5 26.5" stroke={primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="15" cy="15.5" r="2.6" fill={primary} />
          </>
        );

      case 'armada-tugas-saya':
        return (
          <>
            <rect x="13" y="7" width="22" height="34" rx="4" fill={surface} stroke={stroke} strokeWidth={sw} />
            <rect x="16.5" y="12" width="15" height="21" rx="2" fill={tintSoft} stroke={stroke} strokeWidth="1.2" />
            <line x1="21" y1="36.5" x2="27" y2="36.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
            <path d="M19.5 18L21.5 20L25 16.5" stroke={emerald} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="26.5" y1="18.5" x2="29" y2="18.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M19.5 25L21.5 27L25 23.5" stroke={primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="26.5" y1="25.5" x2="29" y2="25.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          </>
        );

      case 'armada-perjalanan':
        return (
          <>
            <path d="M14 34C14 27 34 27 34 20" stroke={primary} strokeWidth="2.2" strokeDasharray="3 3" strokeLinecap="round" fill="none" />
            <path d="M14 22C10.7 22 8 19.3 8 16C8 12.7 10.7 10 14 10C17.3 10 20 12.7 20 16C20 19.3 14 26 14 26C14 26 8 19.3 8 16" fill={tint} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
            <circle cx="14" cy="15.5" r="2.2" fill={primary} />
            <path d="M34 38C34 38 40 31.5 40 28.5C40 25.2 37.3 22.5 34 22.5C30.7 22.5 28 25.2 28 28.5C28 31.5 34 38 34 38Z" fill={coral} stroke={badgeStroke} strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="34" cy="28.2" r="2" fill="#FFFFFF" />
          </>
        );

      case 'armada-uang-jalan':
        return (
          <>
            <rect x="8" y="14" width="27" height="21" rx="3.5" fill={surface} stroke={stroke} strokeWidth={sw} />
            <path d="M8 19H35V17C35 15.3 33.7 14 32 14H11C9.3 14 8 15.3 8 17V19Z" fill={tint} stroke={stroke} strokeWidth={sw} />
            <path d="M13 14V11.2C13 10.5 13.6 10 14.3 10H29.7C30.4 10 31 10.5 31 11.2V14" fill={tintSoft} stroke={stroke} strokeWidth={sw} />
            <rect x="27" y="22" width="11" height="6.5" rx="2" fill={primary} stroke={badgeStroke} strokeWidth={sw} />
            <circle cx="31" cy="25.2" r="1.2" fill="#FFFFFF" />
          </>
        );

      case 'armada-sewa-unit':
        return (
          <>
            <circle cx="17.5" cy="24" r="7.5" fill={tint} stroke={stroke} strokeWidth={sw} />
            <circle cx="16.5" cy="24" r="2.5" fill={surface} stroke={stroke} strokeWidth="1.4" />
            <path d="M25 24H39V29M34 24V28" stroke={stroke} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="35.5" cy="14.5" r="4.2" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path d="M33.8 14.5L35 15.7L37.4 13.3" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'armada-hasil-p2h':
        return (
          <>
            <rect x="10" y="10" width="24" height="30" rx="3.5" fill={surface} stroke={stroke} strokeWidth={sw} />
            <rect x="16" y="7" width="12" height="6" rx="2" fill={tint} stroke={stroke} strokeWidth={sw} />
            <line x1="15" y1="19" x2="29" y2="19" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="15" y1="24.5" x2="25" y2="24.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="15" y1="30" x2="23" y2="30" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="33.5" cy="31.5" r="6" fill={emerald} stroke={badgeStroke} strokeWidth="1.4" />
            <path d="M31 31.5L32.7 33.2L36.2 29.7" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'armada-maintenance':
        return (
          <>
            <path
              d="M32.8 15.2C30.2 12.6 26.2 12.3 23.3 14.3L26.5 17.5L23.5 20.5L20.3 17.3C18.3 20.2 18.6 24.2 21.2 26.8L12 36L16 40L25.2 30.8C27.8 33.4 31.8 33.7 34.7 31.7L31.5 28.5L34.5 25.5L37.7 28.7C39.7 25.8 39.4 21.8 36.8 19.2L32.8 15.2Z"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <circle cx="14.5" cy="14.5" r="4.5" fill={coral} stroke={badgeStroke} strokeWidth="1.35" />
            <path d="M14.5 12.5V16.5M12.5 14.5H16.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
          </>
        );

      case 'armada-permintaan-barang':
        return (
          <>
            <path d="M24 9L38 16V32L24 39L10 32V16L24 9Z" fill={surface} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
            <path d="M24 9L38 16L24 23L10 16L24 9Z" fill={tint} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
            <line x1="24" y1="23" x2="24" y2="39" stroke={stroke} strokeWidth={sw} />
            <path d="M17 12.5L31 19.5" stroke={primary} strokeWidth="2" strokeLinecap="round" />
          </>
        );

      case 'armada-master-unit':
        return (
          <>
            <rect x="7" y="14" width="21" height="17" rx="2.5" fill={tint} stroke={stroke} strokeWidth={sw} />
            <path d="M28 19H35.5L40 24.5V31H28V19Z" fill={surface} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
            <line x1="31" y1="23.5" x2="36.5" y2="23.5" stroke={primary} strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="14.5" cy="33" r="3.8" fill={surface} stroke={stroke} strokeWidth={sw} />
            <circle cx="33.5" cy="33" r="3.8" fill={surface} stroke={stroke} strokeWidth={sw} />
            <circle cx="14.5" cy="33" r="1.2" fill={primary} />
            <circle cx="33.5" cy="33" r="1.2" fill={primary} />
          </>
        );

      case 'armada-master-pelanggan':
        return (
          <>
            <rect x="10" y="10" width="18" height="28" rx="2.5" fill={surface} stroke={stroke} strokeWidth={sw} />
            <path d="M28 19H37C37.8 19 38.5 19.7 38.5 20.5V38H28V19Z" fill={tint} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
            <rect x="14.5" y="15" width="3.2" height="3.2" rx="0.6" fill={primary} />
            <rect x="20.5" y="15" width="3.2" height="3.2" rx="0.6" fill={primary} />
            <rect x="14.5" y="21.5" width="3.2" height="3.2" rx="0.6" fill={primary} />
            <rect x="20.5" y="21.5" width="3.2" height="3.2" rx="0.6" fill={primary} />
            <rect x="16.5" y="30" width="5" height="8" rx="1" fill={tintSoft} stroke={stroke} strokeWidth="1.3" />
          </>
        );

      case 'armada-master-lokasi':
        return (
          <>
            <path d="M24 38C24 38 35 28.5 35 20.5C35 14.4 30.1 9.5 24 9.5C17.9 9.5 13 14.4 13 20.5C13 28.5 24 38 24 38Z" fill={tint} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
            <circle cx="24" cy="20.2" r="4.5" fill={surface} stroke={stroke} strokeWidth={sw} />
            <circle cx="24" cy="20.2" r="1.8" fill={coral} />
          </>
        );

      case 'armada-master-tarif':
        return (
          <>
            <path d="M11 11H24L38 25L25 38L11 24V11Z" fill={surface} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
            <circle cx="17.5" cy="17.5" r="2.3" fill={primary} />
            <circle cx="26.5" cy="26.5" r="5" fill={tint} stroke={stroke} strokeWidth="1.4" />
            <path d="M26.5 24V29M24.8 25.5H28.2" stroke={primary} strokeWidth="1.4" strokeLinecap="round" />
          </>
        );

      case 'armada-akun':
        return (
          <>
            <circle cx="20" cy="17" r="5.5" fill={tint} stroke={stroke} strokeWidth={sw} />
            <path d="M10 35C10 29.8 14.5 26 20 26C25.5 26 30 29.8 30 35" fill={surface} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
            <path d="M33.5 19L39 21.5V26.2C39 30 36.6 33.2 33.5 34.5C30.4 33.2 28 30 28 26.2V21.5L33.5 19Z" fill={primary} stroke={badgeStroke} strokeWidth="1.35" strokeLinejoin="round" />
            <path d="M31.5 26.5L33 28L36 25" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {renderGlyph()}
    </svg>
  );
}
