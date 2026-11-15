const drawings = {
  'new-element': 'M80 10l26 15v30L80 70 54 55V25z M80 25v30 M65 32l30 16 M65 48l30-16',
  'planetary-defense': 'M80 10l34 12v22L80 67 46 44V22z M64 37l11 12 23-25',
  'defeat-ultron': 'M53 14h54v39L80 65 53 53z M62 30h13 M85 30h13 M68 49h24 M40 10l80 58',
  'iron-man': 'M56 12h48l9 23-12 29H59L47 35z M59 30l15 5 M101 30l-15 5 M74 35v10h12V35 M68 53h24',
  research: 'M42 12h38l14 14v34H42z M80 12v14h14 M50 32h33 M50 40h25 M50 48h32 M30 22v43h52 M105 28h23 M105 36h15 M105 44h23',
  graduate: 'M26 29l54-17 54 17-54 17z M48 36v16q32 19 64 0V36 M126 32v19 M123 57h6l-3-6z M63 25l17 5 20-6',
  algorithms: 'M18 14h124v48H18z M18 25h124 M26 20h3 M33 20h3 M45 33l-9 8 9 8 M68 33l9 8-9 8 M61 32l-9 18 M92 53V34 M92 53h37 M98 49l9-6 7 2 13-12',
};

export function ProjectIllustration({project}: {project: keyof typeof drawings}) {
  return (
    <svg className="project-illustration" viewBox="0 0 160 76" aria-hidden="true">
      <path className="schematic-frame" d="M8 20V7h13 M139 7h13v13 M8 56v13h13 M139 69h13V56 M8 38h9 M143 38h9" />
      <path d={drawings[project]} />
    </svg>
  );
}
