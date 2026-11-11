/**
 * Si Benih: tanaman lingkaran, digambar tangan dengan tinta dan cat air.
 * Satu SVG untuk semua tahap, dari benih yang mengintip sampai pohon berlampu,
 * dengan pot yang punya wajah (dan pendapat).
 */
import type { BenihMood, PlantHealth, PlantStage } from '@sehari/core';
import type { CSSProperties, ReactNode } from 'react';

type StageKey = PlantStage['key'];

const BASE = { x: 100, y: 151 };
const LEAF = '#7fbf6a';
const LEAF_DEEP = '#5a9c4e';
const POT = '#dc8a62';
const POT_DEEP = '#c06c45';
const SOIL = '#6b4429';

interface Stem {
  h: number;
  lean: number;
}

/** Titik di batang (kurva Bezier kubik) dan arah singgungnya. */
function stemAt(s: Stem, t: number) {
  const p0 = { x: BASE.x, y: BASE.y };
  const p1 = { x: BASE.x - s.lean * 0.9, y: BASE.y - s.h * 0.4 };
  const p2 = { x: BASE.x + s.lean * 1.6, y: BASE.y - s.h * 0.75 };
  const p3 = { x: BASE.x + s.lean, y: BASE.y - s.h };
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}
const stemPath = (s: Stem) =>
  `M${BASE.x} ${BASE.y} C${BASE.x - s.lean * 0.9} ${BASE.y - s.h * 0.4} ${BASE.x + s.lean * 1.6} ${BASE.y - s.h * 0.75} ${BASE.x + s.lean} ${BASE.y - s.h}`;

function Leaf({ x, y, size, angle, flip, i = 0, deep }: { x: number; y: number; size: number; angle: number; flip?: boolean; i?: number; deep?: boolean }) {
  const s = size;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1) rotate(${angle})`}>
      <g className="bn-leaf" style={{ '--i': i } as CSSProperties}>
        <path d={`M0 0 C${s * 0.25} ${-s * 0.55} ${s * 0.85} ${-s * 0.5} ${s} ${-s * 0.06} C${s * 0.8} ${s * 0.36} ${s * 0.28} ${s * 0.3} 0 0Z`} fill={deep ? LEAF_DEEP : LEAF} className="bn-ink" />
        <path d={`M${s * 0.12} ${-s * 0.03} Q${s * 0.5} ${-s * 0.16} ${s * 0.82} ${-s * 0.07}`} className="bn-ink thin" fill="none" />
      </g>
    </g>
  );
}

function Flower({ x, y, r, petals, color, core = '#f6c84c', spin = 0 }: { x: number; y: number; r: number; petals: number; color: string; core?: string; spin?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="bn-bloom">
        {Array.from({ length: petals }, (_, k) => (
          <ellipse key={k} cx={0} cy={-r * 0.78} rx={r * 0.36} ry={r * 0.56} fill={color} className={r < 12 ? 'bn-ink thin' : 'bn-ink'} transform={`rotate(${spin + (360 / petals) * k})`} />
        ))}
        <circle r={r * 0.4} fill={core} className={r < 12 ? 'bn-ink thin' : 'bn-ink'} />
      </g>
    </g>
  );
}

function Sunflower({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="bn-bloom">
        {Array.from({ length: 14 }, (_, k) => (
          <path key={k} d={`M0 ${-r * 0.42} Q${r * 0.24} ${-r * 0.78} 0 ${-r * 1.1} Q${-r * 0.24} ${-r * 0.78} 0 ${-r * 0.42}Z`} fill={k % 2 ? '#f4b63a' : '#f8cf52'} className="bn-ink thin" transform={`rotate(${(360 / 14) * k})`} />
        ))}
        <circle r={r * 0.5} fill="#8a5a35" className="bn-ink" />
        {[[-0.18, -0.14], [0.16, -0.18], [0, 0.04], [-0.22, 0.16], [0.2, 0.18]].map(([dx, dy], k) => (
          <circle key={k} cx={r * dx!} cy={r * dy!} r={r * 0.045} fill="#5d3a1f" />
        ))}
      </g>
    </g>
  );
}

function Bud({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="bn-bloom">
        <path d={`M0 ${r * 0.5} C${-r * 0.9} ${r * 0.1} ${-r * 0.5} ${-r * 0.9} 0 ${-r * 1.25} C${r * 0.5} ${-r * 0.9} ${r * 0.9} ${r * 0.1} 0 ${r * 0.5}Z`} fill="#f4a3be" className="bn-ink" />
        <path d={`M${-r * 0.72} ${-r * 0.1} Q${-r * 0.3} ${r * 0.75} 0 ${r * 0.5} Q${r * 0.3} ${r * 0.75} ${r * 0.72} ${-r * 0.1} Q0 ${r * 0.3} ${-r * 0.72} ${-r * 0.1}Z`} fill={LEAF_DEEP} className="bn-ink" />
      </g>
    </g>
  );
}

function Tree({ lights }: { lights?: boolean }) {
  const k = lights ? 1.2 : 1.08;
  const top = BASE.y - 66 * k;
  const puffs: [number, number, number][] = [
    [100, top - 30, 30],
    [70, top - 12, 25],
    [130, top - 12, 25],
    [84, top - 44, 22],
    [118, top - 46, 22],
    [100, top - 6, 24],
  ].map(([x, y, r]) => [x!, y! , r! * k] as [number, number, number]);
  const blossoms: [number, number][] = [[76, top - 18], [124, top - 30], [98, top - 52], [112, top - 6], [86, top - 40]];
  const bulbs: [number, number, string][] = [
    [62, top - 6, '#f6c84c'],
    [78, top + 4, '#f48aa9'],
    [96, top + 8, '#7cc3ee'],
    [114, top + 6, '#f6c84c'],
    [130, top - 2, '#a6e08a'],
    [142, top - 14, '#f48aa9'],
  ];
  return (
    <>
      <path d={`M93 ${BASE.y} C95 ${BASE.y - 24} 92 ${BASE.y - 40} 96 ${top + 6} L104 ${top + 6} C108 ${BASE.y - 40} 105 ${BASE.y - 24} 108 ${BASE.y}Z`} fill="#a9744a" className="bn-ink" />
      <path d={`M97 ${BASE.y - 34} Q84 ${BASE.y - 46} 78 ${top + 2}`} className="bn-ink" fill="none" />
      <path d={`M104 ${BASE.y - 30} Q116 ${BASE.y - 42} 122 ${top + 4}`} className="bn-ink" fill="none" />
      <g className="bn-canopy">
        {puffs.map(([x, y, r], i) => (
          <circle key={`o${i}`} cx={x} cy={y} r={r} fill={LEAF} className="bn-ink" />
        ))}
        {puffs.map(([x, y, r], i) => (
          <circle key={`f${i}`} cx={x} cy={y} r={r - 1.6} fill={i % 2 ? LEAF : '#8cc878'} />
        ))}
        <path d={`M78 ${top - 30} q6 -8 14 -4 M112 ${top - 22} q7 -6 13 0 M92 ${top - 12} q6 -6 12 -1`} className="bn-ink thin" fill="none" opacity=".55" />
        {blossoms.map(([x, y], i) => (
          <Flower key={i} x={x} y={y} r={7} petals={5} color={i % 2 ? '#fbd0de' : '#f7a9c2'} spin={i * 20} />
        ))}
        {lights ? (
          <>
            <path d={`M56 ${top - 12} Q78 ${top + 14} 100 ${top + 8} T146 ${top - 20}`} className="bn-ink thin" fill="none" />
            {bulbs.map(([x, y, c], i) => (
              <circle key={i} cx={x} cy={y} r={4.2} fill={c} className="bn-ink thin bn-bulb" style={{ '--i': i } as CSSProperties} />
            ))}
            <g transform={`translate(${112} ${top - 60 * k})`}>
              <g className="bn-bird">
              <path d="M0 0 c4 -8 14 -8 16 0 c0 6 -6 9 -12 8 l-6 3 z" fill="#7cc3ee" className="bn-ink thin" />
              <path d="M16 -1 l5 1 l-5 2" fill="#f4b63a" className="bn-ink thin" />
              <circle cx="11.5" cy="-1.5" r="1.1" fill="var(--ink)" />
              </g>
            </g>
          </>
        ) : null}
      </g>
    </>
  );
}

const STEMS: Partial<Record<StageKey, Stem>> = {
  tunas: { h: 34, lean: 2 },
  daun: { h: 58, lean: 5 },
  kuncup: { h: 78, lean: -5 },
  bunga: { h: 92, lean: 6 },
  matahari: { h: 110, lean: -5 },
};

function Growth({ stage }: { stage: StageKey }) {
  if (stage === 'benih')
    return (
      <g className="bn-seedling">
        <path d={`M86 ${BASE.y - 1} C86 ${BASE.y - 22} 114 ${BASE.y - 22} 114 ${BASE.y - 1}Z`} fill="#a9744a" className="bn-ink" />
        <path d={`M99 ${BASE.y - 16} l-3 6 l5 3 l-3 5`} className="bn-ink thin" fill="none" />
        <path d={`M100 ${BASE.y - 17} q0 -9 7 -12`} className="bn-ink" fill="none" stroke={LEAF_DEEP} />
        <Leaf x={107} y={BASE.y - 29} size={11} angle={-30} />
      </g>
    );
  if (stage === 'pohon' || stage === 'pohon-lampu') return <Tree lights={stage === 'pohon-lampu'} />;
  const s = STEMS[stage]!;
  const tip = stemAt(s, 1);
  const leaves: ReactNode[] = [];
  const at = (t: number, size: number, flip: boolean, angle = -28, deep = false) => {
    const p = stemAt(s, t);
    leaves.push(<Leaf key={leaves.length} x={p.x} y={p.y} size={size} angle={angle} flip={flip} i={leaves.length} deep={deep} />);
  };
  let crown: ReactNode = null;
  if (stage === 'tunas') {
    at(1, 25, false, -40);
    at(1, 21, true, -46, true);
  } else if (stage === 'daun') {
    at(0.4, 32, false, -20, true);
    at(0.66, 29, true, -24);
    at(1, 22, false, -46);
    at(1, 19, true, -54, true);
  } else if (stage === 'kuncup') {
    at(0.26, 35, true, -16, true);
    at(0.48, 33, false, -22);
    at(0.72, 26, true, -30);
    crown = <Bud x={tip.x} y={tip.y - 3} r={14} />;
  } else if (stage === 'bunga') {
    at(0.22, 37, false, -14, true);
    at(0.42, 35, true, -20);
    at(0.62, 27, false, -28);
    const b = stemAt(s, 0.56);
    crown = (
      <>
        <path d={`M${b.x} ${b.y} q-18 -6 -25 -24`} className="bn-ink" fill="none" stroke={LEAF_DEEP} />
        <Bud x={b.x - 25} y={b.y - 28} r={8} />
        <Flower x={tip.x} y={tip.y - 4} r={25} petals={6} color="#f7a9c2" />
      </>
    );
  } else if (stage === 'matahari') {
    at(0.2, 40, true, -12, true);
    at(0.38, 40, false, -16);
    at(0.58, 31, true, -24);
    at(0.74, 25, false, -30, true);
    crown = (
      <>
        <path d={`M${BASE.x - 24} ${BASE.y} q-4 -18 2 -30`} className="bn-ink" fill="none" stroke={LEAF_DEEP} />
        <Flower x={BASE.x - 22} y={BASE.y - 34} r={12} petals={5} color="#cfe3ff" />
        <Sunflower x={tip.x} y={tip.y - 6} r={27} />
      </>
    );
  }
  return (
    <>
      <path d={stemPath(s)} className="bn-ink bn-stem" fill="none" stroke={LEAF_DEEP} />
      {leaves}
      {crown}
    </>
  );
}

/** Wajah pot: mata, mulut, pipi. Berubah mengikuti suasana hati. */
function Face({ mood, mini }: { mood: BenihMood; mini: boolean }) {
  const y = 186;
  const L = 88;
  const R = 112;
  let eyes: ReactNode;
  if (mood === 'tidur')
    eyes = (
      <>
        <path d={`M${L - 5} ${y} q5 4 10 0`} className="bn-face-line" />
        <path d={`M${R - 5} ${y} q5 4 10 0`} className="bn-face-line" />
      </>
    );
  else if (mood === 'girang' || mood === 'pesta')
    eyes = (
      <>
        <path d={`M${L - 5} ${y + 2} q5 -7 10 0`} className="bn-face-line" />
        <path d={`M${R - 5} ${y + 2} q5 -7 10 0`} className="bn-face-line" />
      </>
    );
  else if (mood === 'ngambek')
    eyes = (
      <>
        <path d={`M${L - 6} ${y - 5} l10 3`} className="bn-face-line" />
        <path d={`M${R + 6} ${y - 5} l-10 3`} className="bn-face-line" />
        <circle cx={L} cy={y + 2} r={mini ? 4 : 2.6} className="bn-eye" />
        <circle cx={R} cy={y + 2} r={mini ? 4 : 2.6} className="bn-eye" />
      </>
    );
  else if (mood === 'cemburu')
    eyes = (
      <>
        <path d={`M${L - 6} ${y - 2} h12`} className="bn-face-line" />
        <path d={`M${R - 6} ${y - 2} h12`} className="bn-face-line" />
        <circle cx={L + 3} cy={y + 1.5} r={mini ? 3.6 : 2.4} className="bn-eye" />
        <circle cx={R + 3} cy={y + 1.5} r={mini ? 3.6 : 2.4} className="bn-eye" />
      </>
    );
  else
    eyes = (
      <g className="bn-blink">
        <circle cx={L} cy={y} r={mini ? 4.4 : 3} className="bn-eye" />
        <circle cx={R} cy={y} r={mini ? 4.4 : 3} className="bn-eye" />
        {mini ? null : (
          <>
            <circle cx={L + 1} cy={y - 1.1} r="0.9" fill="#fff" />
            <circle cx={R + 1} cy={y - 1.1} r="0.9" fill="#fff" />
          </>
        )}
      </g>
    );
  if (mini) return <g>{eyes}</g>;
  const mouth =
    mood === 'girang' || mood === 'pesta' ? (
      <path d="M94 194 q6 8 12 0 z" fill="#8f2f3f" className="bn-face-line" />
    ) : mood === 'tidur' ? (
      <ellipse cx="100" cy="196" rx="2.4" ry="3" fill="#8f2f3f" />
    ) : mood === 'haus' ? (
      <ellipse cx="100" cy="196.5" rx="3.2" ry="2.4" fill="none" className="bn-face-line" />
    ) : mood === 'ngambek' ? (
      <path d="M94 199 q6 -6 12 0" className="bn-face-line" />
    ) : mood === 'cemburu' ? (
      <path d="M95 197 q3 -3 6 0 t6 0" className="bn-face-line" />
    ) : (
      <path d="M94 194 q6 6 12 0" className="bn-face-line" />
    );
  return (
    <g>
      {mood === 'ngambek' ? null : (
        <>
          <ellipse cx="79" cy="194" rx="5" ry="3.2" fill="#f7a9c2" opacity={mood === 'girang' || mood === 'pesta' ? 0.95 : 0.6} />
          <ellipse cx="121" cy="194" rx="5" ry="3.2" fill="#f7a9c2" opacity={mood === 'girang' || mood === 'pesta' ? 0.95 : 0.6} />
        </>
      )}
      {eyes}
      {mouth}
      {mood === 'haus' ? <path d="M127 176 q-4 7 0 9 q4 -2 0 -9z" fill="#8fcdf2" className="bn-ink thin bn-sweat" /> : null}
    </g>
  );
}

export interface BenihProps {
  stage: StageKey;
  health?: PlantHealth;
  mood?: BenihMood;
  watered?: boolean;
  visitors?: boolean;
  size?: number;
  /** Siluet saja: tahap yang belum dicapai. */
  locked?: boolean;
  className?: string;
}

export function Benih({ stage, health = 'segar', mood, watered, visitors, size = 150, locked, className }: BenihProps) {
  const mini = size < 72;
  const m: BenihMood = mood ?? (health === 'layu' ? 'ngambek' : health === 'haus' ? 'haus' : watered ? 'girang' : 'santai');
  return (
    <svg
      className={['bn', `bn-${health}`, `bn-m-${m}`, mini ? 'mini' : '', locked ? 'locked' : '', className].filter(Boolean).join(' ')}
      viewBox="0 0 200 220"
      width={size}
      height={size * 1.1}
      aria-hidden
      style={{ '--bn-sw': mini ? 3.6 : 2.2 } as CSSProperties}>
      <ellipse cx="100" cy="213" rx="46" ry="5" className="bn-shadow" />
      <g className="bn-plant">
        <Growth stage={stage} />
      </g>
      {/* pot */}
      <path d="M66 162 L134 162 L126 208 Q125 213 119 213 L81 213 Q75 213 74 208Z" fill={POT} className="bn-ink" />
      <path d="M118 166 L112 209" stroke="#fff" strokeOpacity=".28" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M74 206 Q100 212 126 206 L126 208 Q125 213 119 213 L81 213 Q75 213 74 208Z" fill={POT_DEEP} opacity=".55" />
      <rect x="58" y="149" width="84" height="15" rx="6" fill={POT} className="bn-ink" />
      <path d="M64 151.5 h72" stroke={SOIL} strokeWidth="5" strokeLinecap="round" />
      <path d="M64 160 h72" stroke={POT_DEEP} strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
      {locked ? null : <Face mood={m} mini={mini} />}
      {m === 'pesta' && !locked ? (
        <g className="bn-hat">
          <path d="M132 150 L146 122 L156 150Z" fill="#f6c84c" className="bn-ink" />
          <path d="M137 140 l14 0 M141 131 l8 0" stroke="#f48aa9" strokeWidth="3" strokeLinecap="round" />
          <circle cx="146" cy="120" r="4" fill="#f48aa9" className="bn-ink thin" />
        </g>
      ) : null}
      {m === 'tidur' && !locked && !mini ? (
        <g className="bn-zzz">
          <text x="134" y="150">z</text>
          <text x="144" y="136">z</text>
          <text x="156" y="120">Z</text>
        </g>
      ) : null}
      {watered && !locked ? (
        <g className="bn-drops">
          {[78, 100, 122].map((x, i) => (
            <path key={x} d={`M${x} 8 q-5 9 0 12 q5 -3 0 -12z`} fill="#8fcdf2" className="bn-ink thin" style={{ '--i': i } as CSSProperties} />
          ))}
        </g>
      ) : null}
      {visitors && !locked ? (
        <g className="bn-fly">
          <g transform="translate(158 60)">
            <path d="M0 0 C-12 -14 -18 2 0 4 C-14 8 -8 18 0 6Z" fill="#f7a9c2" className="bn-ink thin bn-wing" />
            <path d="M0 0 C12 -14 18 2 0 4 C14 8 8 18 0 6Z" fill="#fbd0de" className="bn-ink thin bn-wing r" />
            <path d="M0 -3 v12" className="bn-ink thin" />
          </g>
        </g>
      ) : null}
    </svg>
  );
}
