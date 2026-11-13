/** A bonequinha kawaii do Início (desenho original da prévia aprovada). */
export default function Bonequinha({ className }: { className?: string }) {
  const estrela = 'M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z'
  return (
    <svg viewBox="0 0 200 220" className={className} role="img" aria-label="Bonequinha kawaii sorrindo, com olhos grandes e brilhantes, bochechas rosadas e uma varinha de estrela">
      <ellipse cx="100" cy="212" rx="44" ry="6" fill="#F4C0CF" opacity="0.8" />
      <path d="M34 90 Q20 150 42 192 Q60 198 68 188 L72 100 Z" fill="#D9A441" />
      <path d="M166 90 Q180 150 158 192 Q140 198 132 188 L128 100 Z" fill="#D9A441" />
      <ellipse cx="100" cy="90" rx="68" ry="64" fill="#D9A441" />
      <rect x="86" y="192" width="11" height="14" rx="5" fill="#FFE0CC" />
      <rect x="103" y="192" width="11" height="14" rx="5" fill="#FFE0CC" />
      <ellipse cx="91" cy="208" rx="12" ry="5.5" fill="#FF7FA0" />
      <ellipse cx="109" cy="208" rx="12" ry="5.5" fill="#FF7FA0" />
      <path d="M76 152 Q100 144 124 152 L136 194 Q100 202 64 194 Z" fill="#A8E6D5" />
      <path d="M82 152 Q100 164 118 152 Q100 158 82 152Z" fill="#fff" />
      <path d={estrela} fill="#FFD166" transform="translate(100 176) scale(0.8)" />
      <circle cx="64" cy="172" r="8" fill="#FFE0CC" />
      <path d="M136 170 L162 138" stroke="#C8456A" strokeWidth="3" strokeLinecap="round" />
      <circle cx="136" cy="172" r="8" fill="#FFE0CC" />
      <path d={estrela} fill="#FFD166" transform="translate(165 132) scale(1.4)" />
      <circle cx="100" cy="96" r="60" fill="#FFE0CC" />
      <path d="M40 92 Q40 32 100 32 Q160 32 160 92 Q150 62 128 68 Q114 50 100 70 Q86 50 72 68 Q50 62 40 92 Z" fill="#D9A441" />
      <ellipse cx="76" cy="106" rx="10" ry="12.5" fill="#3B2A47" />
      <ellipse cx="124" cy="106" rx="10" ry="12.5" fill="#3B2A47" />
      <circle cx="80" cy="100" r="4" fill="#fff" />
      <circle cx="128" cy="100" r="4" fill="#fff" />
      <circle cx="72" cy="111" r="2" fill="#fff" />
      <circle cx="120" cy="111" r="2" fill="#fff" />
      <ellipse cx="56" cy="126" rx="10" ry="6" fill="#FFA8BC" />
      <ellipse cx="144" cy="126" rx="10" ry="6" fill="#FFA8BC" />
      <path d="M93 124 Q100 131 107 124" stroke="#3B2A47" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d={estrela} fill="#E8627F" transform="translate(140 54) scale(1.2)" />
      <path d="M0 4 C-8 -4 -4 -10 0 -5 C4 -10 8 -4 0 4Z" fill="#E8627F" transform="translate(30 60) scale(1.2)" />
      <path d={estrela} fill="var(--c-destaque)" transform="translate(28 150) scale(0.7)" />
      <path d={estrela} fill="var(--c-destaque)" transform="translate(176 90) scale(0.7)" />
    </svg>
  )
}
