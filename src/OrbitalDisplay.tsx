const satellites = [24, 144, 264];

/** Схема орбитальной сети; состояние задаёт миссия, а не декоративный таймер. */
export function OrbitalDisplay({compromised = false, syncing = false}: {compromised?: boolean; syncing?: boolean}) {
  return <div className="orbital-display" data-compromised={compromised} data-syncing={syncing} aria-hidden="true">
    <svg viewBox="0 0 480 300" fill="none">
      <ellipse className="orbit-track" cx="240" cy="150" rx="214" ry="94" transform="rotate(-18 240 150)" />
      <ellipse className="orbit-track orbit-track-secondary" cx="240" cy="150" rx="190" ry="124" transform="rotate(24 240 150)" />
      <g className="orbital-globe">
        <circle cx="240" cy="150" r="83" />
        <ellipse cx="240" cy="150" rx="35" ry="83" />
        <ellipse cx="240" cy="150" rx="65" ry="83" />
        <path d="M157 150h166M166 113h148M166 187h148M240 67v166" />
      </g>
      {satellites.map(angle => <g key={angle} transform={`rotate(${angle} 240 150)`}>
        <path className="orbital-uplink" d="M240 34v33" />
        <g className="orbital-satellite" transform="translate(240 24)">
          <path d="M-7-9H7V9H-7zM-29-6h17V6h-17zM12-6h17V6H12zM-12 0h5M7 0h5M0 9v7" />
        </g>
      </g>)}
      <path className="orbital-crosshair" d="M236 150h8m-4-4v8M34 145v10m412-10v10" />
    </svg>
  </div>;
}
