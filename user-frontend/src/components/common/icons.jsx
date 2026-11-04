// Minimal monochrome icon set for the storefront. Icons inherit `currentColor`
// so they take their colour from the surrounding text styles. No icon library
// is installed, so these inline SVGs stay the only source of iconography.
const base = {
  viewBox: '0 0 24 24',
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const IconSearch = (props) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

export const IconHeart = ({ filled, ...props }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'} {...props}>
    <path d="M19 14c1.5-1.5 2.9-3.4 2.9-5.6A4.9 4.9 0 0 0 17 3.5c-1.7 0-3.2.9-5 2.5-1.8-1.6-3.3-2.5-5-2.5a4.9 4.9 0 0 0-4.9 4.9C2.1 10.6 3.5 12.5 5 14l7 7z" />
  </svg>
)

export const IconBag = (props) => (
  <svg {...base} {...props}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
)

export const IconMenu = (props) => (
  <svg {...base} {...props}>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </svg>
)

export const IconClose = (props) => (
  <svg {...base} {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

export const IconChevron = (props) => (
  <svg {...base} width={16} height={16} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const IconStore = (props) => (
  <svg {...base} {...props}>
    <path d="M3 9l1-5h16l1 5" />
    <path d="M4 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
    <path d="M5 15v6h14v-6" />
    <path d="M9 21v-5h6v5" />
  </svg>
)

export const IconShirt = (props) => (
  <svg {...base} strokeWidth={1.5} {...props}>
    <path d="M20.4 6.6 16 5.4a3 3 0 0 0-1-.8V3.5c0-.8-.7-1.5-1.5-1.5h-3A1.5 1.5 0 0 0 9 3.5v1.1a3 3 0 0 0-1 .8L3.6 6.6c-.7.2-1.1.9-.9 1.6l1 3.3c.2.6.8 1 1.5.9.4 0 .8.2 1 .5l1 1.3c.2.3.4.8.4 1.2V21h9v-4.6c0-.4.2-.9.4-1.2l1-1.3c.2-.3.6-.5 1-.5.7.1 1.3-.3 1.5-.9l1-3.3c.2-.7-.2-1.4-.9-1.6z" />
  </svg>
)

export const IconGrid = (props) => (
  <svg {...base} {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

export const IconArrow = (props) => (
  <svg {...base} {...props}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
)

export const IconStar = ({ filled, ...props }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'} width={16} height={16} {...props}>
    <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
  </svg>
)

export const IconUser = (props) => (
  <svg {...base} {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

export const IconTruck = (props) => (
  <svg {...base} {...props}>
    <path d="M1 3h15v13H1z" />
    <path d="M16 8h4l3 3v5h-7z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
)

export const IconShield = (props) => (
  <svg {...base} {...props}>
    <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

export const IconTag = (props) => (
  <svg {...base} {...props}>
    <path d="M20.6 13.4 12 22 2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" />
    <circle cx="7" cy="7" r="1.5" />
  </svg>
)

export const IconFilter = (props) => (
  <svg {...base} {...props}>
    <path d="M4 6h16" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
  </svg>
)

export const IconChevronLeft = (props) => (
  <svg {...base} width={16} height={16} {...props}>
    <path d="m15 18-6-6 6-6" />
  </svg>
)

export const IconChevronRight = (props) => (
  <svg {...base} width={16} height={16} {...props}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)

export const IconCheck = (props) => (
  <svg {...base} {...props}>
    <path d="m20 6-11 11-5-5" />
  </svg>
)

export const IconPlus = (props) => (
  <svg {...base} {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
)

export const IconMinus = (props) => (
  <svg {...base} {...props}>
    <path d="M5 12h14" />
  </svg>
)

export const IconMapPin = (props) => (
  <svg {...base} {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

export const IconPackage = (props) => (
  <svg {...base} {...props}>
    <path d="m21 8-9-5-9 5v8l9 5 9-5z" />
    <path d="M3.3 7 12 12l8.7-5" />
    <path d="M12 22V12" />
  </svg>
)

export const IconRefresh = (props) => (
  <svg {...base} {...props}>
    <path d="M3 12a9 9 0 0 1 15.5-6.4L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.4L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
)

export const IconHeadset = (props) => (
  <svg {...base} {...props}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <path d="M18 19a3 3 0 0 1-3 3h-2" />
    <rect x="2" y="13" width="4" height="6" rx="1" />
    <rect x="18" y="13" width="4" height="6" rx="1" />
  </svg>
)

export const IconCreditCard = (props) => (
  <svg {...base} {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
)

export const IconArrowLeft = (props) => (
  <svg {...base} {...props}>
    <path d="M19 12H5" />
    <path d="m11 18-6-6 6-6" />
  </svg>
)

export const IconLogout = (props) => (
  <svg {...base} {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)