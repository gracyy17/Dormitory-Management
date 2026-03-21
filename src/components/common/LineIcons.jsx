import React from 'react';

function IconBase({ children, className = '', size = 18, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function BrandIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 14L12 3L20 14" />
      <path d="M6 14V20H18V14" />
      <path d="M10 20V16H14V20" />
      <circle cx="19" cy="6" r="2" />
    </IconBase>
  );
}

export function DashboardIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </IconBase>
  );
}

export function HomeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 10.5L12 3L21 10.5" />
      <path d="M5 9.8V21H19V9.8" />
      <path d="M10 21V14H14V21" />
    </IconBase>
  );
}

export function CardIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10H21" />
      <path d="M7 15H11" />
    </IconBase>
  );
}

export function WrenchIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M21 7.5A5 5 0 0 1 14.7 12L7 19.7A2.1 2.1 0 1 1 4.1 16.8L11.8 9.1A5 5 0 0 1 18.5 3L15 6.5L17.5 9Z" />
    </IconBase>
  );
}

export function ReportIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M7 3H14L19 8V21H7Z" />
      <path d="M14 3V8H19" />
      <path d="M10 12H16" />
      <path d="M10 16H16" />
    </IconBase>
  );
}

export function UserIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20C5.8 16.8 8.4 15 12 15C15.6 15 18.2 16.8 19 20" />
    </IconBase>
  );
}

export function UsersIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="16.5" cy="8" r="2.5" />
      <path d="M3.8 20C4.6 16.8 7 15.5 9.8 15.5C12.8 15.5 15.2 16.9 16 20" />
      <path d="M14 15.8C16.3 16.1 18 17.2 18.8 19.5" />
    </IconBase>
  );
}

export function SettingsIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12A7 7 0 0 0 19 12" />
      <path d="M12 4V2.5" />
      <path d="M12 21.5V20" />
      <path d="M4.9 4.9L6 6" />
      <path d="M18 18L19.1 19.1" />
      <path d="M2.5 12H4" />
      <path d="M20 12H21.5" />
      <path d="M4.9 19.1L6 18" />
      <path d="M18 6L19.1 4.9" />
    </IconBase>
  );
}

export function LogoutIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M10 3H5A2 2 0 0 0 3 5V19A2 2 0 0 0 5 21H10" />
      <path d="M14 16L19 12L14 8" />
      <path d="M19 12H9" />
    </IconBase>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M15 18L9 12L15 6" />
    </IconBase>
  );
}

export function ChevronRightIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M9 18L15 12L9 6" />
    </IconBase>
  );
}

export function MenuIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 7H20" />
      <path d="M4 12H20" />
      <path d="M4 17H20" />
    </IconBase>
  );
}

export function SearchIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20L16.4 16.4" />
    </IconBase>
  );
}

export function BellIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6.5 9.5C6.5 6.5 8.6 4.2 11.5 3.8V3A1.5 1.5 0 0 1 14.5 3V3.8C17.4 4.2 19.5 6.5 19.5 9.5V13L21 15.2V16H5V15.2L6.5 13Z" />
      <path d="M10 18A2 2 0 0 0 14 18" />
    </IconBase>
  );
}

export function ReceiptIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M7 3L9 4.5L11 3L13 4.5L15 3L17 4.5L19 3V21L17 19.5L15 21L13 19.5L11 21L9 19.5L7 21Z" />
      <path d="M10 8H16" />
      <path d="M10 12H16" />
      <path d="M10 16H14" />
    </IconBase>
  );
}

export function CheckCircleIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2L10.8 14.5L15.5 9.8" />
    </IconBase>
  );
}

export function XCircleIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9L15 15" />
      <path d="M15 9L9 15" />
    </IconBase>
  );
}

export function PulseIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 12H7L9.2 7L12.5 17L14.8 11L16.2 12H21" />
    </IconBase>
  );
}

export function MoonIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M15.8 3.5A8.5 8.5 0 1 0 20.5 14A7 7 0 1 1 15.8 3.5Z" />
    </IconBase>
  );
}

export function SunIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5V5" />
      <path d="M12 19V21.5" />
      <path d="M4.6 4.6L6.3 6.3" />
      <path d="M17.7 17.7L19.4 19.4" />
      <path d="M2.5 12H5" />
      <path d="M19 12H21.5" />
      <path d="M4.6 19.4L6.3 17.7" />
      <path d="M17.7 6.3L19.4 4.6" />
    </IconBase>
  );
}

export function LockIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8A4 4 0 0 1 16 8V11" />
    </IconBase>
  );
}

export function UnlockIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M9 11V8A4 4 0 0 1 16 8" />
    </IconBase>
  );
}

export function MailIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 8L12 13L21 8" />
    </IconBase>
  );
}

export function ShieldIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3L19 6V11C19 15.6 16.1 19.7 12 21C7.9 19.7 5 15.6 5 11V6Z" />
      <path d="M9.5 12.2L11.2 13.9L14.8 10.3" />
    </IconBase>
  );
}

export function WifiIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4.5 9.5A11 11 0 0 1 19.5 9.5" />
      <path d="M7.5 12.5A7 7 0 0 1 16.5 12.5" />
      <path d="M10.5 15.5A3 3 0 0 1 13.5 15.5" />
      <circle cx="12" cy="18.2" r="0.9" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function CalendarIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M8 3.5V7" />
      <path d="M16 3.5V7" />
      <path d="M4 10H20" />
    </IconBase>
  );
}

export function PowerIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5V11" />
      <path d="M7.4 5.3A7 7 0 1 0 16.6 5.3" />
    </IconBase>
  );
}

export function UploadIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 16V7" />
      <path d="M8.5 10.5L12 7L15.5 10.5" />
      <path d="M4 18.5A2.5 2.5 0 0 0 6.5 21H17.5A2.5 2.5 0 0 0 20 18.5" />
    </IconBase>
  );
}

export function BoltIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M13.5 2.8L6.8 12H12L10.8 21.2L17.5 12H12.4Z" />
    </IconBase>
  );
}

export function SnowflakeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 2.5V21.5" />
      <path d="M4.3 7L19.7 17" />
      <path d="M4.3 17L19.7 7" />
      <path d="M12 2.5L10.2 4.3" />
      <path d="M12 2.5L13.8 4.3" />
      <path d="M12 21.5L10.2 19.7" />
      <path d="M12 21.5L13.8 19.7" />
    </IconBase>
  );
}

export function SofaIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="4" y="11" width="16" height="7" rx="2" />
      <path d="M6 11V9.5A2.5 2.5 0 0 1 8.5 7H15.5A2.5 2.5 0 0 1 18 9.5V11" />
      <path d="M6 18V20" />
      <path d="M18 18V20" />
    </IconBase>
  );
}

export function FaucetIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 11H13" />
      <path d="M10 11V8.8A2.3 2.3 0 0 1 12.3 6.5H17" />
      <path d="M14.5 6.5V4.5H19.5V6.5" />
      <path d="M13 11V14A3 3 0 0 0 16 17H20" />
      <path d="M4 11V8.5H8" />
    </IconBase>
  );
}

export function CameraIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M8 7L9.2 4.8H14.8L16 7" />
      <circle cx="12" cy="13.5" r="3.2" />
    </IconBase>
  );
}
