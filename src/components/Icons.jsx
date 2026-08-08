/** Ícones de traço, desenhados no mesmo peso para o app inteiro. */

const base = (props) => ({
  width: props.size || 22,
  height: props.size || 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: props.weight || 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
});

export const IcoHome = (p) => (
  <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.5 20v-6h5v6" /></svg>
);
export const IcoPlus = (p) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IcoCalendar = (p) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
);
export const IcoList = (p) => (
  <svg {...base(p)}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>
);
export const IcoChart = (p) => (
  <svg {...base(p)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const IcoDoc = (p) => (
  <svg {...base(p)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
);
export const IcoGear = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>
);
export const IcoClock = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 1.9" /></svg>
);
export const IcoShield = (p) => (
  <svg {...base(p)}><path d="M12 3 5 6v6c0 4.2 2.9 7.8 7 9 4.1-1.2 7-4.8 7-9V6z" /><path d="m9.2 12.2 2 2 3.6-3.8" /></svg>
);
export const IcoBack = (p) => (
  <svg {...base(p)}><path d="M15 5 8 12l7 7" /></svg>
);
export const IcoChevron = (p) => (
  <svg {...base(p)}><path d="m9 5 7 7-7 7" /></svg>
);
export const IcoTrash = (p) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7M6.5 7l.8 12.2a1.8 1.8 0 0 0 1.8 1.8h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" /></svg>
);
export const IcoCopy = (p) => (
  <svg {...base(p)}><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15" /></svg>
);
export const IcoEdit = (p) => (
  <svg {...base(p)}><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M14.5 5.5l4 4" /></svg>
);
export const IcoSearch = (p) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
);
export const IcoShare = (p) => (
  <svg {...base(p)}><path d="M12 15V3M8.5 6.5 12 3l3.5 3.5" /><path d="M6 12H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1" /></svg>
);
export const IcoCamera = (p) => (
  <svg {...base(p)}><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.3-2h6.8l1.3 2h1.8A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" /><circle cx="12" cy="13" r="3.6" /></svg>
);
export const IcoFinger = (p) => (
  <svg {...base(p)}><path d="M12 3a7 7 0 0 0-7 7v3.5" /><path d="M19 10a7 7 0 0 0-3.5-6" /><path d="M8.5 10a3.5 3.5 0 0 1 7 0v4a9 9 0 0 1-1.2 4.5" /><path d="M12 10v4.5c0 2-.5 4-1.5 5.5" /><path d="M5 17.5A9 9 0 0 0 6 14" /><path d="M19 13.5c0 2.2-.4 4.3-1.2 6" /></svg>
);
export const IcoLock = (p) => (
  <svg {...base(p)}><rect x="4.5" y="10" width="15" height="11" rx="2.5" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></svg>
);
export const IcoDownload = (p) => (
  <svg {...base(p)}><path d="M12 3v12M8 11.5l4 4 4-4" /><path d="M4 20h16" /></svg>
);
export const IcoUpload = (p) => (
  <svg {...base(p)}><path d="M12 16V4M8 8.5l4-4 4 4" /><path d="M4 20h16" /></svg>
);
export const IcoMoon = (p) => (
  <svg {...base(p)}><path d="M20 13.5A8.5 8.5 0 0 1 10 3.2 8.6 8.6 0 1 0 20 13.5z" /></svg>
);
export const IcoSun = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
);
export const IcoCheck = (p) => (
  <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7" /></svg>
);
export const IcoAlert = (p) => (
  <svg {...base(p)}><path d="M12 4.5 2.8 20h18.4z" /><path d="M12 10v4M12 17h.01" /></svg>
);
export const IcoUser = (p) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>
);
export const IcoLock2 = IcoLock;
export const IcoWhatsApp = (p) => (
  <svg width={p.size || 22} height={p.size || 22} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 0 0-8.7 15L2 22l5.2-1.3A10 10 0 1 0 12 2m0 1.9a8.1 8.1 0 1 1-4.2 15l-.3-.2-3 .8.8-2.9-.2-.3A8.1 8.1 0 0 1 12 3.9m-3.4 4c-.2 0-.4 0-.6.3l-.6.8c-.2.3-.3.6-.2 1 .3 1.4 1.2 2.7 2.4 3.7 1.3 1.1 2.6 1.7 3.7 1.8.5 0 1 0 1.3-.4l.6-.7c.2-.3.2-.5-.1-.7l-1.6-1c-.2-.1-.4-.1-.6.1l-.5.6c-.2.2-.3.2-.5.1-1-.4-2-1.4-2.5-2.4-.1-.2 0-.4.1-.5l.5-.5c.2-.2.2-.4.1-.6l-.8-1.4c-.1-.2-.3-.2-.5-.2z" />
  </svg>
);
export const IcoPrint = (p) => (
  <svg {...base(p)}><path d="M7 9V3.5h10V9" /><rect x="3.5" y="9" width="17" height="8" rx="2" /><path d="M7 14h10v6.5H7z" /></svg>
);
export const IcoMail = (p) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.8 7 8.2 6 8.2-6" /></svg>
);

/* Controles da folha modal */
export const IcoMinus = (p) => (
  <svg {...base(p)}><path d="M5 12h14" /></svg>
);
export const IcoMaximize = (p) => (
  <svg {...base(p)}><rect x="4.5" y="4.5" width="15" height="15" rx="2.5" /></svg>
);
export const IcoClose = (p) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);

/* Gaveta de arquivos */
export const IcoPasta = (p) => (
  <svg {...base(p)}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2l2 2.6h7.8A2.5 2.5 0 0 1 21 10.1v7.4a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /></svg>
);

/* Backup completo */
export const IcoPacote = (p) => (
  <svg {...base(p)}><path d="M3.5 8.2 12 4l8.5 4.2v7.6L12 20l-8.5-4.2z" /><path d="m3.5 8.2 8.5 4.2 8.5-4.2M12 12.4V20" /></svg>
);
