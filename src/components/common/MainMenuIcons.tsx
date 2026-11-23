import type { MenuId } from '../../types/auth';

export type MenuIconKey = MenuId | 'suite-payroll' | 'suite-kastonase';

interface MainMenuIconProps {
  id: MenuIconKey;
  size?: number;
  className?: string;
  onDark?: boolean;
}

/**
 * STYLE 03: OUTLINED — crisp duotone-outlined spot icons
 * Transparent backdrop adapting cleanly to both light and dark surfaces.
 */
export function MainMenuIcon({
  id,
  size = 28,
  className = '',
  onDark = false,
}: MainMenuIconProps) {
  const stroke = onDark ? '#E2E8F0' : '#1E3A6E';
  const sw = 1.6;
  const surface = onDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.72)';
  const tint = onDark ? 'rgba(147, 197, 253, 0.24)' : 'rgba(219, 234, 254, 0.85)';
  const tintSoft = onDark ? 'rgba(191, 219, 254, 0.16)' : 'rgba(224, 231, 255, 0.75)';
  const subtleLine = onDark ? 'rgba(226, 232, 240, 0.35)' : '#CBD5E1';
  const mutedLine = onDark ? 'rgba(203, 213, 225, 0.75)' : '#94A3B8';
  const badgeStroke = onDark ? '#0F172A' : '#1E3A6E';
  const primary = onDark ? '#60A5FA' : '#5B8AF5';
  const coral = '#F4538A';

  const renderGlyph = () => {
    switch (id) {
      /* ===================== SUITE SWITCHERS ===================== */
      case 'suite-payroll':
        return (
          <>
            {/* Wallet body */}
            <rect
              x="9"
              y="14"
              width="25"
              height="19"
              rx="3.5"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <path
              d="M9 18.5H34V16.5C34 15.1 32.9 14 31.5 14H11.5C10.1 14 9 15.1 9 16.5V18.5Z"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Inner bill peek */}
            <path
              d="M14 14V11.5C14 10.7 14.7 10 15.5 10H28.5C29.3 10 30 10.7 30 11.5V14"
              fill="#93C5FD"
              fillOpacity={onDark ? 0.55 : 0.9}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Clasp */}
            <rect
              x="25.5"
              y="21"
              width="9.5"
              height="6"
              rx="2"
              fill={primary}
              stroke={badgeStroke}
              strokeWidth={sw}
            />
            <circle cx="29" cy="24" r="1.1" fill="#FFFFFF" />
            {/* Coral badge */}
            <circle cx="35.5" cy="14" r="4.5" fill={coral} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M35.5 12V16M33.8 14H37.2"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </>
        );

      case 'suite-kastonase':
        return (
          <>
            {/* Scale base */}
            <path
              d="M15 36H33L31 31.5H17L15 36Z"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <line
              x1="24"
              y1="12"
              x2="24"
              y2="31.5"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinecap="round"
            />
            {/* Beam */}
            <line
              x1="12"
              y1="16"
              x2="36"
              y2="16"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinecap="round"
            />
            {/* Left pan */}
            <path
              d="M12 16L9 24.5H15L12 16Z"
              fill="none"
              stroke={stroke}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 24.5C8.5 26.7 10.1 28 12 28C13.9 28 15.5 26.7 15.5 24.5H8.5Z"
              fill={primary}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Right pan */}
            <path
              d="M36 16L33 24.5H39L36 16Z"
              fill="none"
              stroke={stroke}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path
              d="M32.5 24.5C32.5 26.7 34.1 28 36 28C37.9 28 39.5 26.7 39.5 24.5H32.5Z"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Top coral weight knob */}
            <circle cx="24" cy="12" r="3" fill={coral} stroke={badgeStroke} strokeWidth="1.35" />
          </>
        );

      /* ===================== PAYROLL MENUS ===================== */
      case 'menu-ringkasan':
        return (
          <>
            {/* Monitor */}
            <rect
              x="9"
              y="12"
              width="28"
              height="19"
              rx="2.5"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <path d="M9 16.5H37" stroke={subtleLine} strokeWidth="1.2" />
            {/* Stand */}
            <path
              d="M20 31L18.5 36H27.5L26 31"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <line
              x1="15"
              y1="36"
              x2="31"
              y2="36"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinecap="round"
            />
            {/* Line chart inside monitor */}
            <path
              d="M14 27L19 22.5L23.5 25L31 19"
              fill="none"
              stroke={primary}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="19" cy="22.5" r="1.4" fill={stroke} />
            <circle cx="31" cy="19" r="1.5" fill={coral} />
            {/* Bottom-left cobalt bar badge */}
            <circle cx="11" cy="28.5" r="5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M9 30.2V28.4M11 30.2V26.8M13 30.2V27.6"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            {/* Top-right coral pie badge */}
            <circle cx="36.5" cy="12.5" r="4.8" fill={coral} stroke={badgeStroke} strokeWidth="1.35" />
            <path d="M36.5 12.5V9.5A3 3 0 0 1 39.5 12.5Z" fill="#FFFFFF" />
          </>
        );

      case 'menu-input':
        return (
          <>
            {/* Clipboard sheet */}
            <rect
              x="12"
              y="10"
              width="21"
              height="27"
              rx="2.5"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <rect
              x="17.5"
              y="7.5"
              width="10"
              height="4.5"
              rx="1.5"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Rows */}
            <line
              x1="16"
              y1="17.5"
              x2="28.5"
              y2="17.5"
              stroke={primary}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <line
              x1="16"
              y1="22.5"
              x2="26.5"
              y2="22.5"
              stroke={mutedLine}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="16"
              y1="27.5"
              x2="23.5"
              y2="27.5"
              stroke={mutedLine}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Coral check dot top-left */}
            <circle cx="12" cy="14" r="3.6" fill={coral} stroke={badgeStroke} strokeWidth="1.3" />
            <path
              d="M10.6 14L11.6 15L13.5 13"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Cobalt pen badge bottom-right */}
            <circle cx="33.5" cy="31.5" r="5.5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M31.4 33.6L32.1 31.3L35.2 28.2L36.8 29.8L33.7 32.9L31.4 33.6Z"
              fill="#FFFFFF"
            />
          </>
        );

      case 'menu-karyawan':
        return (
          <>
            {/* ID Card */}
            <rect
              x="12"
              y="11"
              width="24"
              height="27"
              rx="2.5"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Lanyard slot */}
            <rect
              x="20"
              y="7.5"
              width="8"
              height="5"
              rx="1.5"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Portrait circle */}
            <circle cx="24" cy="20.5" r="3.6" fill={tint} stroke={stroke} strokeWidth={sw} />
            {/* Shoulders with coral accent */}
            <path
              d="M17.5 29.5C18.3 26.2 20.8 24.8 24 24.8C27.2 24.8 29.7 26.2 30.5 29.5Z"
              fill={coral}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            {/* Bottom ID lines */}
            <line
              x1="17"
              y1="33.5"
              x2="26"
              y2="33.5"
              stroke={primary}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <line
              x1="28.5"
              y1="33.5"
              x2="31"
              y2="33.5"
              stroke={mutedLine}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </>
        );

      case 'menu-slip':
        return (
          <>
            {/* Top paper */}
            <path
              d="M15 16V10.5C15 9.7 15.7 9 16.5 9H31.5C32.3 9 33 9.7 33 10.5V16"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Printer body */}
            <rect
              x="9"
              y="16"
              width="30"
              height="13"
              rx="3"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Coral indicator dot */}
            <circle cx="33.5" cy="20" r="1.5" fill={coral} />
            {/* Printed slip emerging */}
            <rect
              x="15"
              y="24"
              width="18"
              height="13"
              rx="1.5"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <line
              x1="18.5"
              y1="28.5"
              x2="29.5"
              y2="28.5"
              stroke={primary}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="18.5"
              y1="32.5"
              x2="26"
              y2="32.5"
              stroke={mutedLine}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Cobalt badge */}
            <circle cx="36" cy="31" r="5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M34 31L35.4 32.4L38.2 29.6"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'menu-laporan':
        return (
          <>
            {/* Back sheet */}
            <rect
              x="17"
              y="9"
              width="19"
              height="24"
              rx="2"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Front report sheet */}
            <rect
              x="10"
              y="13"
              width="20"
              height="24"
              rx="2"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Coral trend line */}
            <path
              d="M14 21L18 18L21.5 20L26 16.5"
              fill="none"
              stroke={coral}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Bars */}
            <rect x="14" y="27" width="2.8" height="6" rx="0.8" fill="#93C5FD" />
            <rect x="18.5" y="24.5" width="2.8" height="8.5" rx="0.8" fill={primary} />
            <rect
              x="23"
              y="26"
              width="2.8"
              height="7"
              rx="0.8"
              fill={tint}
              stroke={stroke}
              strokeWidth="1"
            />
            {/* Cobalt magnifier badge */}
            <circle cx="32.5" cy="30.5" r="5.5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <circle cx="31.8" cy="29.8" r="2.2" fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
            <line
              x1="33.5"
              y1="31.5"
              x2="35.3"
              y2="33.3"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        );

      case 'menu-akun':
        return (
          <>
            {/* Document behind shield */}
            <rect
              x="11"
              y="10"
              width="22"
              height="27"
              rx="2.5"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <line
              x1="15"
              y1="15.5"
              x2="25"
              y2="15.5"
              stroke={subtleLine}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Shield */}
            <path
              d="M24 14L33 17.5V24.2C33 29.2 29.2 33 24 35C18.8 33 15 29.2 15 24.2V17.5L24 14Z"
              fill={primary}
              stroke={badgeStroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            {/* White checkmark inside shield */}
            <path
              d="M20.5 24.5L23 27L28 21.8"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Coral spark dot */}
            <circle cx="35.5" cy="13" r="3.4" fill={coral} stroke={badgeStroke} strokeWidth="1.3" />
          </>
        );

      /* ===================== KAS & TONASE MENUS ===================== */
      case 'menu-kt-dashboard':
        return (
          <>
            {/* Dashboard window */}
            <rect
              x="9"
              y="11"
              width="29"
              height="22"
              rx="2.5"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <rect
              x="9"
              y="11"
              width="29"
              height="5"
              rx="2"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Layout blocks inside */}
            <rect
              x="12.5"
              y="19"
              width="9"
              height="10.5"
              rx="1.5"
              fill={tintSoft}
              stroke={stroke}
              strokeWidth="1.2"
            />
            <rect x="24" y="19" width="10.5" height="4.5" rx="1.2" fill="#93C5FD" />
            <rect x="24" y="25.2" width="6.5" height="4.2" rx="1.2" fill={tint} />
            {/* Circular analytics trend badge bottom-right */}
            <circle
              cx="34"
              cy="31"
              r="5.8"
              fill={primary}
              stroke={badgeStroke}
              strokeWidth="1.35"
            />
            <path
              d="M31.2 33.4V31.4M34 33.4V29.2M36.8 33.4V30.4"
              stroke="#FFFFFF"
              strokeWidth="1.55"
              strokeLinecap="round"
            />
            <circle cx="12.5" cy="13.5" r="1" fill={coral} />
            <circle cx="15.5" cy="13.5" r="1" fill={primary} />
          </>
        );

      case 'menu-kt-transaksi':
        return (
          <>
            {/* Top-left folder */}
            <path
              d="M9 12.5C9 11.4 9.9 10.5 11 10.5H16.5L18.2 12.5H25C26.1 12.5 27 13.4 27 14.5V21.5C27 22.6 26.1 23.5 25 23.5H11C9.9 23.5 9 22.6 9 21.5V12.5Z"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            {/* Bottom-right folder */}
            <path
              d="M21 25.5C21 24.4 21.9 23.5 23 23.5H28.5L30.2 25.5H37C38.1 25.5 39 26.4 39 27.5V34.5C39 35.6 38.1 36.5 37 36.5H23C21.9 36.5 21 35.6 21 34.5V25.5Z"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            {/* Coral invoice paper inside bottom folder */}
            <rect
              x="25"
              y="21.5"
              width="9"
              height="5"
              rx="1"
              fill={coral}
              stroke={badgeStroke}
              strokeWidth="1.2"
            />
            {/* Cobalt swap arrows */}
            <path
              d="M31 14C34.5 14.8 36.5 17.5 36.5 20.8M36.5 20.8L34.3 19M36.5 20.8L38.3 18.6"
              fill="none"
              stroke={primary}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.5 34C13 33.2 11 30.5 11 27.2M11 27.2L13.2 29M11 27.2L9.2 29.4"
              fill="none"
              stroke={primary}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'menu-kt-stok':
        return (
          <>
            {/* Box sheets sticking out */}
            <rect
              x="16"
              y="10"
              width="14"
              height="10"
              rx="1.5"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            <line
              x1="19"
              y1="14"
              x2="27"
              y2="14"
              stroke={primary}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            {/* Open cardboard box */}
            <path
              d="M12 19.5H34V34.5C34 35.6 33.1 36.5 32 36.5H14C12.9 36.5 12 35.6 12 34.5V19.5Z"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <path
              d="M12 19.5L8.5 22.8L12 24.5M34 19.5L37.5 22.8L34 24.5"
              fill={tintSoft}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            {/* Coral highlight spark top-left */}
            <circle cx="12.5" cy="12.5" r="3" fill={coral} stroke={badgeStroke} strokeWidth="1.25" />
            {/* Cobalt stock-in badge bottom-right */}
            <circle cx="34.5" cy="31.5" r="5.5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M34.5 28.8V33.6M32.4 31.8L34.5 33.8L36.6 31.8"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'menu-kt-harga':
        return (
          <>
            {/* Master catalog folder */}
            <path
              d="M10 14C10 12.6 11.1 11.5 12.5 11.5H19L21.5 14H33.5C34.9 14 36 15.1 36 16.5V32.5C36 33.9 34.9 35 33.5 35H12.5C11.1 35 10 33.9 10 32.5V14Z"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <path d="M10 18.5H36" stroke={tint} strokeWidth="2.5" />
            {/* Item tag lines */}
            <rect
              x="14.5"
              y="22.5"
              width="12"
              height="6.5"
              rx="1.5"
              fill={tint}
              stroke={stroke}
              strokeWidth="1.25"
            />
            <circle cx="17.5" cy="25.7" r="1.2" fill={coral} />
            <line
              x1="20.5"
              y1="25.7"
              x2="24"
              y2="25.7"
              stroke={stroke}
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            {/* Cobalt plus badge */}
            <circle cx="34.5" cy="32" r="5.5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M34.5 29.3V34.7M31.8 32H37.2"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </>
        );

      case 'menu-kt-customer':
        return (
          <>
            {/* Monitor card */}
            <rect
              x="11"
              y="12"
              width="25"
              height="18.5"
              rx="2.5"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <path
              d="M20.5 30.5L19 35.5H28L26.5 30.5"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <line
              x1="15.5"
              y1="35.5"
              x2="31.5"
              y2="35.5"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinecap="round"
            />
            {/* Profile lines */}
            <rect x="17" y="17.5" width="12" height="3.2" rx="1" fill={tint} />
            <line
              x1="17"
              y1="24"
              x2="25.5"
              y2="24"
              stroke={mutedLine}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Top-left cobalt partner avatar */}
            <circle cx="12" cy="14" r="5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <circle cx="12" cy="12.7" r="1.5" fill="#FFFFFF" />
            <path
              d="M9.4 16.5C9.8 15 10.8 14.5 12 14.5C13.2 14.5 14.2 15 14.6 16.5Z"
              fill="#FFFFFF"
            />
            {/* Bottom-right coral partner avatar */}
            <circle cx="35.5" cy="29" r="5" fill={coral} stroke={badgeStroke} strokeWidth="1.35" />
            <circle cx="35.5" cy="27.7" r="1.5" fill="#FFFFFF" />
            <path
              d="M32.9 31.5C33.3 30 34.3 29.5 35.5 29.5C36.7 29.5 37.7 30 38.1 31.5Z"
              fill="#FFFFFF"
            />
          </>
        );

      case 'menu-kt-hutang':
        return (
          <>
            {/* Calendar / due-date ledger */}
            <rect
              x="10.5"
              y="12"
              width="25"
              height="24"
              rx="3"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <path
              d="M10.5 17.5H35.5V15C35.5 13.3 34.2 12 32.5 12H13.5C11.8 12 10.5 13.3 10.5 15V17.5Z"
              fill="#93C5FD"
              fillOpacity={onDark ? 0.5 : 0.9}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Ring pins */}
            <line x1="17" y1="9.5" x2="17" y2="14" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
            <line x1="29" y1="9.5" x2="29" y2="14" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
            {/* Coral circled date / due indicator */}
            <circle cx="22.5" cy="26.5" r="4.8" fill="none" stroke={coral} strokeWidth="1.8" />
            <path
              d="M21 26.5H24M22.5 25V28"
              stroke={stroke}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            {/* Cobalt clock badge bottom-right */}
            <circle cx="34.5" cy="32" r="5.5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M34.5 29.4V32.2L36.5 33.4"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'menu-kt-laporan':
        return (
          <>
            {/* XLS Document */}
            <path
              d="M14 9.5H28L34.5 16V35.5C34.5 36.6 33.6 37.5 32.5 37.5H14C12.9 37.5 12 36.6 12 35.5V11.5C12 10.4 12.9 9.5 14 9.5Z"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            <path
              d="M28 9.5V16H34.5"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinejoin="round"
            />
            {/* Grid cells */}
            <rect x="15.5" y="24" width="14" height="8" rx="1" fill={tintSoft} />
            <line x1="22.5" y1="24" x2="22.5" y2="32" stroke={subtleLine} strokeWidth="1.2" />
            <line x1="15.5" y1="28" x2="29.5" y2="28" stroke={subtleLine} strokeWidth="1.2" />
            {/* Dark navy XLS badge */}
            <rect x="8" y="16" width="14.5" height="6.5" rx="1.5" fill="#1E3A6E" />
            <text
              x="15.2"
              y="20.7"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="4.6"
              fontWeight="700"
              fontFamily="Inter, Arial, sans-serif"
            >
              XLS
            </text>
            {/* Coral pie dot top-right */}
            <circle cx="35" cy="11.5" r="3.4" fill={coral} stroke={badgeStroke} strokeWidth="1.2" />
            {/* Cobalt download badge */}
            <circle cx="34" cy="33" r="5.3" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <path
              d="M34 30.5V35M32 33.2L34 35.2L36 33.2"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.45"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'menu-kt-pengaturan':
        return (
          <>
            {/* Stacked system bars */}
            <rect
              x="10"
              y="11"
              width="25"
              height="7"
              rx="2"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            <rect
              x="10"
              y="20.5"
              width="25"
              height="7"
              rx="2"
              fill={tint}
              stroke={stroke}
              strokeWidth={sw}
            />
            <rect
              x="10"
              y="30"
              width="25"
              height="7"
              rx="2"
              fill={surface}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Status dots & slider lines */}
            <circle cx="14" cy="14.5" r="1.4" fill={coral} />
            <line
              x1="18"
              y1="14.5"
              x2="29"
              y2="14.5"
              stroke={mutedLine}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="14" cy="24" r="1.4" fill={primary} />
            <line
              x1="18"
              y1="24"
              x2="27"
              y2="24"
              stroke={stroke}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="14" cy="33.5" r="1.4" fill={primary} />
            <line
              x1="18"
              y1="33.5"
              x2="26"
              y2="33.5"
              stroke={mutedLine}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Cobalt sync/settings badge bottom-right */}
            <circle cx="34.5" cy="30.5" r="5.5" fill={primary} stroke={badgeStroke} strokeWidth="1.35" />
            <circle cx="34.5" cy="30.5" r="2.2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
            <path
              d="M34.5 26.8V28.1M34.5 32.9V34.2M30.8 30.5H32.1M36.9 30.5H38.2"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </>
        );

      default:
        return (
          <rect
            x="12"
            y="12"
            width="24"
            height="24"
            rx="4"
            fill={surface}
            stroke={stroke}
            strokeWidth={sw}
          />
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
