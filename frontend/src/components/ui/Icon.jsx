const PATHS = {
  dashboard: <><rect x='3' y='3' width='7' height='7' rx='1.5' /><rect x='14' y='3' width='7' height='7' rx='1.5' /><rect x='3' y='14' width='7' height='7' rx='1.5' /><rect x='14' y='14' width='7' height='7' rx='1.5' /></>,
  users: <><path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' /><circle cx='9' cy='7' r='4' /><path d='M22 21v-2a4 4 0 0 0-3-3.87' /><path d='M16 3.13a4 4 0 0 1 0 7.75' /></>,
  receipt: <><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' /><path d='M14 2v6h6' /><path d='M8 13h8' /><path d='M8 17h8' /></>,
  target: <><circle cx='12' cy='12' r='10' /><circle cx='12' cy='12' r='6' /><circle cx='12' cy='12' r='2' /></>,
  tasks: <><path d='M9 11l3 3L22 4' /><path d='M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' /></>,
  table: <><rect x='3' y='3' width='18' height='18' rx='2' /><path d='M3 9h18' /><path d='M3 15h18' /><path d='M9 3v18' /></>,
  menu: <><path d='M3 6h18' /><path d='M3 12h18' /><path d='M3 18h18' /></>,
  x: <><path d='M18 6L6 18' /><path d='M6 6l12 12' /></>,
  logout: <><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' /><path d='M16 17l5-5-5-5' /><path d='M21 12H9' /></>,
  plus: <><path d='M12 5v14' /><path d='M5 12h14' /></>,
  search: <><circle cx='11' cy='11' r='8' /><path d='M21 21l-4.3-4.3' /></>,
  bell: <><path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' /><path d='M13.73 21a2 2 0 0 1-3.46 0' /></>,
  user: <><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' /><circle cx='12' cy='7' r='4' /></>,
  home: <><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' /><path d='M9 22V12h6v10' /></>,
  paperclip: <path d='M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48' />,
  upload: <><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' /><path d='M17 8l-5-5-5 5' /><path d='M12 3v12' /></>,
  download: <><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' /><path d='M7 10l5 5 5-5' /><path d='M12 15V3' /></>,
  trash: <><path d='M3 6h18' /><path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' /><path d='M10 11v6' /><path d='M14 11v6' /><path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' /></>,
  edit: <><path d='M12 20h9' /><path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z' /></>,
  check: <path d='M20 6L9 17l-5-5' />,
  clock: <><circle cx='12' cy='12' r='10' /><path d='M12 6v6l4 2' /></>,
  arrow: <><path d='M5 12h14' /><path d='M12 5l7 7-7 7' /></>,
  chevron: <path d='M6 9l6 6 6-6' />,
  eye: <><path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z' /><circle cx='12' cy='12' r='3' /></>,
  'eye-off': <><path d='M17.94 17.94A10 10 0 0 1 12 19c-6.5 0-10-7-10-7a18 18 0 0 1 5.06-5.94' /><path d='M9.9 4.24A9 9 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.16 3.19' /><path d='M1 1l22 22' /></>
}

export default function Icon({ name, size = 18, strokeWidth = 1.8, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden='true'
    >
      {PATHS[name] || null}
    </svg>
  )
}