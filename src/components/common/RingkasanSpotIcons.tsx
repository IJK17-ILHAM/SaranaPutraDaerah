export type RingkasanIconKind =
  | 'gaji'
  | 'lembur'
  | 'karyawan'
  | 'potongan'
  | 'chart'
  | 'potongan-detail'
  | 'periode'
  | 'divisi'
  | 'kt-kas-masuk'
  | 'kt-kas-keluar'
  | 'kt-selisih'
  | 'kt-stok-gudang'
  | 'kt-chart-7d'
  | 'kt-stok-barang'
  | 'kt-hutang-beli'
  | 'kt-piutang-jual'
  | 'kt-piutang-mitra'
  | 'kt-catatan-bayar'
  | 'kt-daftar-nota'
  | 'kt-saldo-kas'
  | 'kt-nonkas'
  | 'kt-buku-kas';

interface RingkasanSpotIconProps {
  kind: RingkasanIconKind;
  size?: number;
  onDark?: boolean;
  className?: string;
}

/**
 * Style 03: Outlined duotone spot icons for Ringkasan Finansial cards & filters.
 * Transparent backdrop adapting cleanly to light, eco, dark, and accent surfaces.
 */
export function RingkasanSpotIcon({
  kind,
  size = 36,
  onDark = false,
  className = '',
}: RingkasanSpotIconProps) {
  const stroke = onDark ? '#F1F5F9' : '#1E3A6E';
  const sw = 1.65;
  const surface = onDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.78)';
  const tint = onDark ? 'rgba(191, 219, 254, 0.28)' : 'rgba(219, 234, 254, 0.9)';
  const tintSoft = onDark ? 'rgba(224, 231, 255, 0.2)' : 'rgba(224, 231, 255, 0.8)';
  const badgeStroke = onDark ? '#1E3A8A' : '#1E3A6E';
  const primary = onDark ? '#93C5FD' : '#5B8AF5';
  const coral = '#F4538A';
  const amber = '#F5B038';

  const renderGlyph = () => {
    switch (kind) {
      case 'gaji':
        return (
          <>
            {/* Back banknote */}
            <rect
              x="11"
              y="10"
              width="27"
              height="16"
              rx="2.5"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Front banknote */}
            <rect
              x="7"
              y="16"
              width="28"
              height="18"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <circle cx="21" cy="25" r="4.2" fill={tintSoft} stroke={stroke} strokeWidth="1.4" />
            <path
              d="M21 22.8V27.2M19.6 24.3C19.6 23.6 22.4 23.6 22.4 24.4C22.4 25.1 19.6 25 19.6 25.8C19.6 26.5 22.4 26.5 22.4 25.8"
              stroke={stroke}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <circle cx="11.5" cy="25" r="1.1" fill={primary} />
            <circle cx="30.5" cy="25" r="1.1" fill={primary} />
            {/* Cobalt verified badge */}
            <circle cx="36" cy="32" r="5.5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M33.8 32L35.3 33.5L38.4 30.4"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'lembur':
        return (
          <>
            {/* Top stopwatch button */}
            <line x1="20" y1="8.5" x2="26" y2="8.5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
            <line x1="23" y1="8.5" x2="23" y2="12" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
            {/* Clock body */}
            <circle cx="23" cy="25.5" r="13.5" fill={surface} stroke={stroke} strokeWidth={sw} />
            <circle cx="23" cy="25.5" r="9.5" fill={tintSoft} />
            {/* Overtime arc */}
            <path
              d="M23 16A9.5 9.5 0 0 1 32.5 25.5"
              fill="none"
              stroke={primary}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {/* Hands */}
            <path
              d="M23 19.5V25.5L27.5 28"
              fill="none"
              stroke={stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="23" cy="25.5" r="1.6" fill={coral} />
            {/* Coral plus spark badge */}
            <circle cx="36" cy="14" r="5" fill={coral} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M36 11.7V16.3M33.7 14H38.3"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        );

      case 'karyawan':
        return (
          <>
            {/* Back member */}
            <circle cx="31.5" cy="17.5" r="4.2" fill={tint} stroke={stroke} strokeWidth={sw} />
            <path
              d="M26.5 31.5C27.2 27.6 29.3 25.8 32.2 25.8C35.2 25.8 37.5 27.7 38.2 31.5H26.5Z"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            {/* Front main member */}
            <circle cx="19" cy="17" r="5" fill={surface} stroke={stroke} strokeWidth={sw} />
            <path
              d="M10 34.5C11 29.2 14.3 26.5 19 26.5C23.7 26.5 27 29.2 28 34.5H10Z"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            {/* Highlight badge */}
            <circle cx="35.5" cy="33" r="5" fill={amber} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M33.5 33L34.9 34.4L37.8 31.5"
              fill="none"
              stroke="#1E3A6E"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'potongan':
        return (
          <>
            {/* Receipt sheet */}
            <path
              d="M12 9.5H32V36.5L28.5 34L25 36.5L22 34L19 36.5L15.5 34L12 36.5V9.5Z"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <rect x="15.5" y="13.5" width="13" height="4" rx="1" fill={tint} />
            <line
              x1="15.5"
              y1="21.5"
              x2="26.5"
              y2="21.5"
              stroke={primary}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <line
              x1="15.5"
              y1="26"
              x2="23.5"
              y2="26"
              stroke={stroke}
              strokeOpacity="0.45"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Coral deduction minus badge */}
            <circle cx="34.5" cy="30.5" r="5.5" fill={coral} stroke={badgeStroke} strokeWidth="1.35" />
            <line
              x1="31.8"
              y1="30.5"
              x2="37.2"
              y2="30.5"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        );

      case 'chart':
        return (
          <>
            {/* Chart board */}
            <rect
              x="9"
              y="10"
              width="30"
              height="26"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <line x1="13" y1="31" x2="35" y2="31" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
            {/* Bars */}
            <rect x="14.5" y="23" width="4" height="8" rx="1" fill={tint} stroke={stroke} strokeWidth="1.2" />
            <rect x="21.5" y="18.5" width="4" height="12.5" rx="1" fill={primary} stroke={badgeStroke} strokeWidth="1.2" />
            <rect x="28.5" y="14.5" width="4" height="16.5" rx="1" fill={coral} stroke={badgeStroke} strokeWidth="1.2" />
            {/* Trend arrow */}
            <path
              d="M14.5 18L21 14L27.5 12"
              fill="none"
              stroke={primary}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'potongan-detail':
        return (
          <>
            {/* Clipboard ledger */}
            <rect
              x="10"
              y="11"
              width="25"
              height="27"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <rect x="17" y="8" width="11" height="5" rx="1.5" fill={tint} stroke={stroke} strokeWidth={sw} />
            <circle cx="15.5" cy="19.5" r="1.5" fill={coral} />
            <line x1="19.5" y1="19.5" x2="30" y2="19.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="15.5" cy="25.5" r="1.5" fill={primary} />
            <line x1="19.5" y1="25.5" x2="29" y2="25.5" stroke={stroke} strokeOpacity="0.65" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="15.5" cy="31.5" r="1.5" fill={amber} />
            <line x1="19.5" y1="31.5" x2="26.5" y2="31.5" stroke={stroke} strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
            {/* Coral badge */}
            <circle cx="35" cy="31.5" r="5" fill={coral} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M33 33.5L37 29.5"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="33.4" cy="29.9" r="0.9" fill="#FFFFFF" />
            <circle cx="36.6" cy="33.1" r="0.9" fill="#FFFFFF" />
          </>
        );

      case 'periode':
        return (
          <>
            <rect
              x="8"
              y="12"
              width="32"
              height="27"
              rx="4"
              fill={surface}
              stroke={stroke}
              strokeWidth="2"
            />
            <path
              d="M8 19H40V16C40 13.8 38.2 12 36 12H12C9.8 12 8 13.8 8 16V19Z"
              fill={primary}
              stroke={stroke}
              strokeWidth="2"
            />
            <line x1="16" y1="8.5" x2="16" y2="14.5" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="32" y1="8.5" x2="32" y2="14.5" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
            <rect x="14" y="24" width="6" height="5" rx="1.2" fill={tint} />
            <rect x="23" y="24" width="6" height="5" rx="1.2" fill={coral} />
            <rect x="14" y="31.5" width="12" height="3" rx="1" fill={tint} />
          </>
        );

      case 'divisi':
        return (
          <>
            {/* Top layer */}
            <path
              d="M24 9L39 16.5L24 24L9 16.5L24 9Z"
              fill={primary}
              stroke={stroke}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Middle layer */}
            <path
              d="M9 24.5L24 32L39 24.5"
              fill="none"
              stroke={stroke}
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Bottom layer */}
            <path
              d="M9 32L24 39.5L39 32"
              fill="none"
              stroke={coral}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'kt-kas-masuk':
        return (
          <>
            {/* Cash tray / wallet */}
            <rect
              x="8"
              y="16"
              width="27"
              height="19"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <path
              d="M8 21H35V19C35 17.3 33.7 16 32 16H11C9.3 16 8 17.3 8 19V21Z"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            <circle cx="21.5" cy="28" r="3.8" fill={tintSoft} stroke={stroke} strokeWidth="1.4" />
            <circle cx="12.5" cy="28" r="1.1" fill={primary} />
            <circle cx="30.5" cy="28" r="1.1" fill={primary} />
            {/* Cobalt inflow down-left badge */}
            <circle cx="35.5" cy="14" r="5.5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M37.5 12L33.5 16M33.5 16H36.6M33.5 16V12.9"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'kt-kas-keluar':
        return (
          <>
            {/* Outgoing bill card */}
            <rect
              x="8"
              y="15"
              width="27"
              height="19"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <rect x="12" y="20" width="11" height="3.6" rx="1" fill={tint} />
            <line
              x1="12"
              y1="27.5"
              x2="25"
              y2="27.5"
              stroke={stroke}
              strokeOpacity="0.55"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="29.5" cy="27.5" r="2.2" fill={tintSoft} stroke={stroke} strokeWidth="1.2" />
            {/* Coral outflow up-right badge */}
            <circle cx="35.5" cy="14" r="5.5" fill={coral} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M33.5 16L37.5 12M37.5 12H34.4M37.5 12V15.1"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'kt-selisih':
        return (
          <>
            {/* Balance ledger card */}
            <rect
              x="9"
              y="11"
              width="28"
              height="24"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <path
              d="M14 27L19.5 21.5L24 24.5L31.5 17"
              fill="none"
              stroke={amber}
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="19.5" cy="21.5" r="1.5" fill={stroke} />
            <circle cx="31.5" cy="17" r="1.7" fill={amber} />
            <line x1="13" y1="30.5" x2="26" y2="30.5" stroke={stroke} strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" />
            {/* Amber margin badge */}
            <circle cx="35.5" cy="32.5" r="5.3" fill={amber} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M33.5 34.5L37.5 30.5"
              stroke="#1E3A6E"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="33.9" cy="30.9" r="0.95" fill="#1E3A6E" />
            <circle cx="37.1" cy="34.1" r="0.95" fill="#1E3A6E" />
          </>
        );

      case 'kt-stok-gudang':
        return (
          <>
            {/* Top stacked crate */}
            <rect
              x="14.5"
              y="9.5"
              width="17"
              height="10.5"
              rx="2"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            <line x1="20.5" y1="13.5" x2="25.5" y2="13.5" stroke={primary} strokeWidth="1.6" strokeLinecap="round" />
            {/* Bottom wide crate */}
            <rect
              x="9"
              y="20"
              width="27"
              height="15.5"
              rx="2.5"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <line x1="22.5" y1="20" x2="22.5" y2="35.5" stroke={stroke} strokeOpacity="0.35" strokeWidth="1.3" />
            <rect x="13" y="24" width="6" height="3.5" rx="0.8" fill={tintSoft} />
            {/* Cobalt verified stock badge */}
            <circle cx="35.5" cy="32.5" r="5.5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M33.3 32.5L34.8 34L37.9 30.9"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'kt-chart-7d':
        return (
          <>
            {/* Comparison chart board */}
            <rect
              x="8.5"
              y="10"
              width="31"
              height="26"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <line x1="12.5" y1="31.5" x2="35.5" y2="31.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
            {/* Paired bars (Beli vs Jual) */}
            <rect x="14" y="23" width="3.2" height="8.5" rx="0.8" fill={tint} stroke={stroke} strokeWidth="1.1" />
            <rect x="17.8" y="19" width="3.2" height="12.5" rx="0.8" fill={primary} stroke={badgeStroke} strokeWidth="1.1" />
            <rect x="24" y="21" width="3.2" height="10.5" rx="0.8" fill={tint} stroke={stroke} strokeWidth="1.1" />
            <rect x="27.8" y="15" width="3.2" height="16.5" rx="0.8" fill={coral} stroke={badgeStroke} strokeWidth="1.1" />
          </>
        );

      case 'kt-stok-barang':
        return (
          <>
            {/* Warehouse shelf / meter card */}
            <rect
              x="9.5"
              y="10"
              width="27"
              height="27"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Three stock level bars */}
            <rect x="14" y="15" width="18" height="3.6" rx="1.2" fill={tintSoft} />
            <rect x="14" y="15" width="13.5" height="3.6" rx="1.2" fill={primary} />
            <rect x="14" y="21.5" width="18" height="3.6" rx="1.2" fill={tintSoft} />
            <rect x="14" y="21.5" width="9.5" height="3.6" rx="1.2" fill={amber} />
            <rect x="14" y="28" width="18" height="3.6" rx="1.2" fill={tintSoft} />
            <rect x="14" y="28" width="15" height="3.6" rx="1.2" fill={primary} />
            {/* Coral box badge */}
            <circle cx="35.5" cy="14" r="4.8" fill={coral} stroke={badgeStroke} strokeWidth="1.35" />
            <rect x="33.5" y="12.2" width="4" height="3.6" rx="0.7" fill="#FFFFFF" />
          </>
        );

      case 'kt-hutang-beli':
        return (
          <>
            {/* Supplier invoice / payable document */}
            <rect
              x="9.5"
              y="9.5"
              width="24"
              height="27"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <rect x="13.5" y="13.5" width="16" height="4.2" rx="1.2" fill={tint} />
            <line
              x1="13.5"
              y1="22"
              x2="25.5"
              y2="22"
              stroke={stroke}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="13.5"
              y1="26.5"
              x2="22.5"
              y2="26.5"
              stroke={stroke}
              strokeOpacity="0.55"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="13.5"
              y1="31"
              x2="20"
              y2="31"
              stroke={primary}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Coral outgoing payment arrow badge */}
            <circle cx="34" cy="30.5" r="5.8" fill={coral} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M32 32.5L36 28.5M36 28.5H32.8M36 28.5V31.7"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'kt-piutang-jual':
        return (
          <>
            {/* Sales receivable receipt */}
            <path
              d="M10 9.5H32V35.8L28.5 33.4L25 35.8L21 33.4L17 35.8L13.5 33.4L10 35.8V9.5Z"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <rect x="14" y="13.5" width="14" height="4.2" rx="1.2" fill={tint} />
            <line
              x1="14"
              y1="22"
              x2="26"
              y2="22"
              stroke={primary}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <line
              x1="14"
              y1="26.5"
              x2="22.5"
              y2="26.5"
              stroke={stroke}
              strokeOpacity="0.55"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Cobalt incoming receivable arrow badge */}
            <circle cx="34.5" cy="30.5" r="5.8" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M36.5 28.5L32.5 32.5M32.5 32.5H35.7M32.5 32.5V29.3"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'kt-piutang-mitra':
        return (
          <>
            {/* Partner company (PT / Mitra) building */}
            <rect
              x="10"
              y="10.5"
              width="21"
              height="26"
              rx="2.5"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <rect x="14" y="14.5" width="4.5" height="4" rx="0.8" fill={tint} />
            <rect x="22.5" y="14.5" width="4.5" height="4" rx="0.8" fill={tint} />
            <rect x="14" y="21" width="4.5" height="4" rx="0.8" fill={tintSoft} />
            <rect x="22.5" y="21" width="4.5" height="4" rx="0.8" fill={tintSoft} />
            <rect x="17.5" y="29" width="6" height="7.5" rx="1" fill={tint} stroke={stroke} strokeWidth="1.3" />
            {/* Amber coin / receivable balance badge */}
            <circle cx="34.5" cy="30" r="5.8" fill={amber} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M34.5 27.4V32.6M32.9 29.1C32.9 28.3 36.1 28.3 36.1 29.2C36.1 30 32.9 29.9 32.9 30.8C32.9 31.6 36.1 31.6 36.1 30.8"
              fill="none"
              stroke="#1E3A6E"
              strokeWidth="1.45"
              strokeLinecap="round"
            />
          </>
        );

      case 'kt-catatan-bayar':
        return (
          <>
            {/* Payment history clipboard */}
            <rect
              x="9.5"
              y="11"
              width="24"
              height="26.5"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <rect x="16" y="8" width="11" height="5" rx="1.5" fill={tint} stroke={stroke} strokeWidth={sw} />
            <circle cx="14.8" cy="19.5" r="1.4" fill={primary} />
            <line x1="18.8" y1="19.5" x2="29" y2="19.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="14.8" cy="25" r="1.4" fill={amber} />
            <line x1="18.8" y1="25" x2="27.5" y2="25" stroke={stroke} strokeOpacity="0.65" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="14.8" cy="30.5" r="1.4" fill={coral} />
            <line x1="18.8" y1="30.5" x2="25" y2="30.5" stroke={stroke} strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
            {/* Cobalt clock history badge */}
            <circle cx="34.5" cy="30.5" r="5.8" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M34.5 27.8V30.7L36.7 31.9"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'kt-daftar-nota':
        return (
          <>
            {/* Back stacked sheet */}
            <rect
              x="14"
              y="9.5"
              width="22"
              height="24"
              rx="2.8"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Front invoice sheet */}
            <rect
              x="9.5"
              y="13.5"
              width="22.5"
              height="24"
              rx="2.8"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <rect x="13" y="17.5" width="11.5" height="3.5" rx="1" fill={tintSoft} />
            <line x1="13" y1="24.5" x2="28" y2="24.5" stroke={primary} strokeWidth="1.6" strokeLinecap="round" />
            <line x1="13" y1="29" x2="25.5" y2="29" stroke={stroke} strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="13" y1="33" x2="21.5" y2="33" stroke={stroke} strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
            {/* Amber verified ledger badge */}
            <circle cx="35.5" cy="14" r="5" fill={amber} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M33.4 14L34.9 15.5L37.8 12.6"
              fill="none"
              stroke="#1E3A6E"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'kt-saldo-kas':
        return (
          <>
            {/* Wallet / net cash balance body */}
            <rect
              x="8.5"
              y="13"
              width="27.5"
              height="21.5"
              rx="3.2"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <path
              d="M11.5 13V10.8C11.5 9.8 12.3 9 13.3 9H30.5C31.5 9 32.3 9.8 32.3 10.8V13"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Wallet clasp pocket */}
            <rect
              x="25.5"
              y="20.5"
              width="10.5"
              height="7"
              rx="2"
              fill={tint}
              stroke={stroke}
              strokeWidth="1.45"
            />
            <circle cx="29" cy="24" r="1.4" fill={amber} />
            <line
              x1="12.5"
              y1="20"
              x2="21.5"
              y2="20"
              stroke={stroke}
              strokeOpacity="0.6"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="12.5"
              y1="25"
              x2="19.5"
              y2="25"
              stroke={stroke}
              strokeOpacity="0.4"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Amber net balance verified badge */}
            <circle cx="35" cy="32" r="5.5" fill={amber} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M32.8 32L34.3 33.5L37.4 30.4"
              fill="none"
              stroke="#1E3A6E"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'kt-nonkas':
        return (
          <>
            {/* Offset document back */}
            <rect
              x="14.5"
              y="9.5"
              width="21"
              height="23"
              rx="2.8"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Offset document front */}
            <rect
              x="9"
              y="14"
              width="21.5"
              height="23"
              rx="2.8"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <rect x="12.8" y="18" width="12.5" height="3.6" rx="1" fill={tintSoft} />
            <line
              x1="12.8"
              y1="25.2"
              x2="25.5"
              y2="25.2"
              stroke={stroke}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="12.8"
              y1="29.8"
              x2="22"
              y2="29.8"
              stroke={stroke}
              strokeOpacity="0.5"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Cobalt swap / non-cash settlement badge */}
            <circle cx="34.5" cy="30.5" r="5.8" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M31.8 29.2H37.2M35.7 27.7L37.2 29.2L35.7 30.7M37.2 31.8H31.8M33.3 30.3L31.8 31.8L33.3 33.3"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'kt-buku-kas':
        return (
          <>
            {/* Bound cash ledger book */}
            <rect
              x="9.5"
              y="9.5"
              width="26"
              height="28"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Spine band */}
            <path
              d="M12.5 9.5H15.5V37.5H12.5C10.8 37.5 9.5 36.2 9.5 34.5V12.5C9.5 10.8 10.8 9.5 12.5 9.5Z"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Ledger rows */}
            <rect x="19" y="14" width="12.5" height="3.8" rx="1" fill={tintSoft} />
            <line x1="19" y1="22" x2="31" y2="22" stroke={primary} strokeWidth="1.6" strokeLinecap="round" />
            <line x1="19" y1="26.8" x2="29" y2="26.8" stroke={stroke} strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="19" y1="31.5" x2="26.5" y2="31.5" stroke={coral} strokeWidth="1.6" strokeLinecap="round" />
            {/* Amber bookmark / coin badge */}
            <circle cx="35.5" cy="14" r="5" fill={amber} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M35.5 11.7V16.3M33.2 14H37.8"
              stroke="#1E3A6E"
              strokeWidth="1.55"
              strokeLinecap="round"
            />
          </>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="4 4 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {renderGlyph()}
    </svg>
  );
}
