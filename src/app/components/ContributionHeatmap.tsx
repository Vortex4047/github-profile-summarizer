import { useMemo, useRef, useState, type CSSProperties } from 'react';
import type { GitHubEvent } from '../github';
import type { HeatmapMode } from './DashboardControls';

interface ContributionHeatmapProps {
  events: GitHubEvent[];
  loading: boolean;
  days: number;
  mode: HeatmapMode;
  eventFilter: string;
}

interface HeatmapCell {
  week: number;
  day: number;
  date: string;
  score: number;
}

interface TowerCell extends HeatmapCell {
  key: string;
  x: number;
  y: number;
  height: number;
  intensity: number;
}

interface TooltipState {
  x: number;
  y: number;
  cell: TowerCell;
}

interface Projection {
  scale: number;
  offsetX: number;
  offsetY: number;
  floorPoints: Array<[number, number]>;
  baselineY: number;
}

const GRID_DAYS = 7;
const TILE_WIDTH = 18;
const TILE_HEIGHT = 10;
const MIN_TOWER_HEIGHT = 4;
const MAX_TOWER_HEIGHT = 90;
const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 380;

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

// City color palette - more vibrant and realistic
const intensityPalette = [
  { top: '#1a2a44', left: '#0f1a2e', right: '#152340', glow: 'rgba(74, 188, 255, 0.1)', windows: 'rgba(100, 160, 220, 0.15)' },
  { top: '#1e4a7a', left: '#153560', right: '#1a4070', glow: 'rgba(74, 188, 255, 0.25)', windows: 'rgba(140, 200, 255, 0.3)' },
  { top: '#2892d0', left: '#1d6ea0', right: '#2380b8', glow: 'rgba(36, 218, 255, 0.35)', windows: 'rgba(180, 230, 255, 0.5)' },
  { top: '#5b68e8', left: '#4450c2', right: '#505cd5', glow: 'rgba(116, 116, 255, 0.4)', windows: 'rgba(200, 200, 255, 0.55)' },
  { top: '#a050f0', left: '#7b3cc8', right: '#8e46dc', glow: 'rgba(183, 89, 255, 0.5)', windows: 'rgba(220, 180, 255, 0.65)' },
];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function eventWeight(event: GitHubEvent, mode: HeatmapMode) {
  if (mode === 'commits') {
    return event.type === 'PushEvent' ? Math.max(1, event.commitCount) : 0;
  }

  if (mode === 'activity') {
    return 1;
  }

  if (event.type === 'PushEvent') return Math.max(1, event.commitCount);
  if (event.type === 'PullRequestEvent') return event.prMerged ? 4 : 3;
  if (event.type === 'PullRequestReviewEvent') return 2;
  if (event.type === 'IssuesEvent') return 2;
  if (event.type === 'CreateEvent') return 1;
  if (event.type === 'WatchEvent') return 1;
  return 1;
}

function modeUnit(mode: HeatmapMode) {
  if (mode === 'commits') return 'commits';
  if (mode === 'activity') return 'events';
  return 'impact points';
}

function buildHeatmap(events: GitHubEvent[], days: number, mode: HeatmapMode, eventFilter: string): HeatmapCell[] {
  const scoresByDate = new Map<string, number>();
  const normalizedDays = Math.max(7, days);

  const endDay = new Date();
  endDay.setHours(0, 0, 0, 0);

  const windowStart = new Date(endDay);
  windowStart.setDate(endDay.getDate() - (normalizedDays - 1));

  events.forEach((event) => {
    if (eventFilter !== 'all' && event.type !== eventFilter) return;

    const eventDate = new Date(event.createdAt);
    if (Number.isNaN(eventDate.getTime())) return;

    eventDate.setHours(0, 0, 0, 0);
    if (eventDate < windowStart || eventDate > endDay) return;

    const weight = eventWeight(event, mode);
    if (weight <= 0) return;

    const key = toDateKey(eventDate);
    scoresByDate.set(key, (scoresByDate.get(key) || 0) + weight);
  });

  const displayDays = Math.ceil(normalizedDays / GRID_DAYS) * GRID_DAYS;
  const firstDay = new Date(endDay);
  firstDay.setDate(endDay.getDate() - (displayDays - 1));

  const cells: HeatmapCell[] = [];
  for (let index = 0; index < displayDays; index += 1) {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);

    const dateKey = toDateKey(date);
    cells.push({
      week: Math.floor(index / GRID_DAYS),
      day: index % GRID_DAYS,
      date: dateKey,
      score: scoresByDate.get(dateKey) || 0,
    });
  }

  return cells;
}

function getIntensity(score: number, maxScore: number) {
  if (score <= 0 || maxScore <= 0) return 0;
  return Math.min(1, Math.log(score + 1) / Math.log(maxScore + 1));
}

function getTowerHeight(score: number, maxScore: number) {
  const intensity = getIntensity(score, maxScore);
  if (score === 0) return MIN_TOWER_HEIGHT;
  return Math.max(12, Math.round(MIN_TOWER_HEIGHT + intensity * MAX_TOWER_HEIGHT));
}

function pickPalette(intensity: number) {
  if (intensity <= 0) return intensityPalette[0];
  if (intensity < 0.25) return intensityPalette[1];
  if (intensity < 0.5) return intensityPalette[2];
  if (intensity < 0.75) return intensityPalette[3];
  return intensityPalette[4];
}

function pointsToString(points: Array<[number, number]>) {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function formatMetricValue(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function getFloorPoints(gridWeeks: number): Array<[number, number]> {
  return [
    [0, -TILE_HEIGHT / 2],
    [(gridWeeks * TILE_WIDTH) / 2, ((gridWeeks - 1) * TILE_HEIGHT) / 2],
    [((gridWeeks - GRID_DAYS) * TILE_WIDTH) / 2, ((gridWeeks + GRID_DAYS - 1) * TILE_HEIGHT) / 2],
    [(-GRID_DAYS * TILE_WIDTH) / 2, ((GRID_DAYS - 1) * TILE_HEIGHT) / 2],
  ];
}

function getProjection(towers: TowerCell[], gridWeeks: number): Projection {
  const floorPoints = getFloorPoints(gridWeeks);

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const include = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };

  floorPoints.forEach(([x, y]) => include(x, y));

  towers.forEach((tower) => {
    include(tower.x - TILE_WIDTH / 2, tower.y + TILE_HEIGHT / 2);
    include(tower.x + TILE_WIDTH / 2, tower.y + TILE_HEIGHT / 2);
    include(tower.x - TILE_WIDTH / 2, tower.y - TILE_HEIGHT / 2 - tower.height);
    include(tower.x + TILE_WIDTH / 2, tower.y - TILE_HEIGHT / 2 - tower.height);
  });

  const baselineY = floorPoints[2][1] + 8;
  include(floorPoints[3][0] - 10, baselineY);
  include(floorPoints[1][0] + 10, baselineY);

  const drawWidth = Math.max(1, maxX - minX);
  const drawHeight = Math.max(1, maxY - minY);

  const paddingX = 24;
  const paddingY = 20;

  const scaleX = (VIEWBOX_WIDTH - paddingX * 2) / drawWidth;
  const scaleY = (VIEWBOX_HEIGHT - paddingY * 2) / drawHeight;
  const scale = Math.max(0.45, Math.min(scaleX, scaleY, 1.7));

  const offsetX = (VIEWBOX_WIDTH - drawWidth * scale) / 2 - minX * scale;
  const offsetY = (VIEWBOX_HEIGHT - drawHeight * scale) / 2 - minY * scale;

  return {
    scale,
    offsetX,
    offsetY,
    floorPoints,
    baselineY,
  };
}

// Generate window positions for building faces
function generateWindows(height: number, faceWidth: number): Array<{ x: number; y: number }> {
  if (height < 20) return [];
  const windows: Array<{ x: number; y: number }> = [];
  const rows = Math.max(1, Math.floor((height - 8) / 10));
  const cols = Math.max(1, Math.floor(faceWidth / 5));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Randomly skip some windows to look realistic
      if (Math.random() > 0.65) {
        windows.push({
          x: (c + 0.5) / cols,
          y: (r + 0.5) / rows,
        });
      }
    }
  }
  return windows;
}

export function ContributionHeatmap({ events, loading, days, mode, eventFilter }: ContributionHeatmapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const data = useMemo(
    () => buildHeatmap(events, days, mode, eventFilter),
    [events, days, mode, eventFilter]
  );

  const gridWeeks = Math.max(1, Math.ceil(data.length / GRID_DAYS));
  const maxScore = useMemo(() => Math.max(1, ...data.map((entry) => entry.score)), [data]);

  const towerData = useMemo(
    () =>
      [...data]
        .map((entry) => {
          const intensity = getIntensity(entry.score, maxScore);
          const height = getTowerHeight(entry.score, maxScore);
          return {
            ...entry,
            key: `${entry.date}-${entry.week}-${entry.day}`,
            x: (entry.week - entry.day) * (TILE_WIDTH / 2),
            y: (entry.week + entry.day) * (TILE_HEIGHT / 2),
            height,
            intensity,
          };
        })
        .sort((a, b) => {
          const depth = a.week + a.day - (b.week + b.day);
          if (depth !== 0) return depth;
          return a.day - b.day;
        }),
    [data, maxScore]
  );

  const projection = useMemo(() => getProjection(towerData, gridWeeks), [towerData, gridWeeks]);

  const totalScore = useMemo(() => data.reduce((sum, cell) => sum + cell.score, 0), [data]);
  const activeDays = useMemo(() => data.filter((cell) => cell.score > 0).length, [data]);

  const activeCell = useMemo(
    () => towerData.find((entry) => entry.key === hoveredKey) || null,
    [hoveredKey, towerData]
  );

  const updateTooltip = (event: React.PointerEvent<SVGGElement>, cell: TowerCell) => {
    if (!rootRef.current) return;
    const bounds = rootRef.current.getBoundingClientRect();
    setTooltip({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      cell,
    });
  };

  const handlePointerEnter = (event: React.PointerEvent<SVGGElement>, cell: TowerCell) => {
    setHoveredKey(cell.key);
    updateTooltip(event, cell);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGGElement>, cell: TowerCell) => {
    setHoveredKey(cell.key);
    updateTooltip(event, cell);
  };

  const handlePointerLeave = () => {
    setHoveredKey(null);
    setTooltip(null);
  };

  const tooltipLabel = tooltip?.cell || activeCell;

  const tooltipMaxX = rootRef.current ? rootRef.current.clientWidth - 32 : 600;
  const tooltipMaxY = rootRef.current ? rootRef.current.clientHeight - 28 : 280;
  const safeTooltipX = tooltip ? Math.max(32, Math.min(tooltip.x, tooltipMaxX)) : 0;
  const safeTooltipY = tooltip ? Math.max(32, Math.min(tooltip.y, tooltipMaxY)) : 0;

  const legendSteps = [0, 0.24, 0.45, 0.7, 0.95].map((step) => pickPalette(step));

  const unit = modeUnit(mode);
  const panelCaption = loading
    ? `Loading ${unit} skyline...`
    : `Last ${days} days • ${formatMetricValue(totalScore)} ${unit}`;

  const topCell = useMemo(() => [...data].sort((a, b) => b.score - a.score)[0], [data]);

  const topText =
    topCell && topCell.score > 0
      ? `${formatMetricValue(topCell.score)} ${unit} on ${dateFmt.format(new Date(topCell.date))}`
      : `No ${unit} found in this window.`;

  // Seed-based pseudo-random for consistent window patterns
  const windowSeed = useMemo(() => Math.random(), [data]);

  const createPillar = (cell: TowerCell) => {
    const floorTop: [number, number] = [cell.x, cell.y - TILE_HEIGHT / 2];
    const floorRight: [number, number] = [cell.x + TILE_WIDTH / 2, cell.y];
    const floorBottom: [number, number] = [cell.x, cell.y + TILE_HEIGHT / 2];
    const floorLeft: [number, number] = [cell.x - TILE_WIDTH / 2, cell.y];

    const topTop: [number, number] = [floorTop[0], floorTop[1] - cell.height];
    const topRight: [number, number] = [floorRight[0], floorRight[1] - cell.height];
    const topBottom: [number, number] = [floorBottom[0], floorBottom[1] - cell.height];
    const topLeft: [number, number] = [floorLeft[0], floorLeft[1] - cell.height];

    const topFace = pointsToString([topTop, topRight, topBottom, topLeft]);
    const leftFace = pointsToString([topLeft, topBottom, floorBottom, floorLeft]);
    const rightFace = pointsToString([topRight, topBottom, floorBottom, floorRight]);
    const floorFace = pointsToString([floorTop, floorRight, floorBottom, floorLeft]);

    const palette = pickPalette(cell.intensity);
    const isActive = hoveredKey === cell.key;
    const glow = isActive ? `drop-shadow(0 0 12px ${palette.glow})` : 'none';
    const opacity = cell.score === 0 ? 0.55 : 1;
    const animationDelay = `${((cell.week + cell.day) % 16) * 34}ms`;

    // Generate windows on the left face
    const leftWindows: JSX.Element[] = [];
    const rightWindows: JSX.Element[] = [];

    if (cell.height > 18 && cell.score > 0) {
      const numRows = Math.max(1, Math.floor((cell.height - 6) / 12));
      const numCols = 2;

      // Left face windows
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const litSeed = ((cell.week * 7 + cell.day) * 13 + r * 5 + c * 3) % 10;
          if (litSeed < 4) continue; // skip some windows

          const tFace = (r + 0.3) / numRows;
          const sFace = (c + 0.3) / numCols;
          const wFaceWidth = 0.4 / numCols;
          const wFaceHeight = 0.35 / numRows;

          // Interpolate on the left face quadrilateral
          const lx = topLeft[0] + (topBottom[0] - topLeft[0]) * sFace + (floorLeft[0] - topLeft[0]) * tFace;
          const ly = topLeft[1] + (topBottom[1] - topLeft[1]) * sFace + (floorLeft[1] - topLeft[1]) * tFace;

          const lit = litSeed > 6;
          leftWindows.push(
            <rect
              key={`lw-${r}-${c}`}
              x={lx - 1}
              y={ly - 1}
              width={2.5 * wFaceWidth * TILE_WIDTH}
              height={2 * wFaceHeight * cell.height}
              fill={lit ? palette.windows : 'rgba(0,0,0,0.2)'}
              opacity={lit ? (isActive ? 0.9 : 0.7) : 0.3}
              rx="0.3"
            />
          );
        }
      }

      // Right face windows
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const litSeed = ((cell.week * 7 + cell.day) * 11 + r * 7 + c * 2) % 10;
          if (litSeed < 4) continue;

          const tFace = (r + 0.3) / numRows;
          const sFace = (c + 0.3) / numCols;

          const rx = topRight[0] + (topBottom[0] - topRight[0]) * (1 - sFace) + (floorRight[0] - topRight[0]) * tFace;
          const ry = topRight[1] + (topBottom[1] - topRight[1]) * (1 - sFace) + (floorRight[1] - topRight[1]) * tFace;

          const lit = litSeed > 5;
          rightWindows.push(
            <rect
              key={`rw-${r}-${c}`}
              x={rx - 1.2}
              y={ry - 1}
              width={2.2}
              height={1.8}
              fill={lit ? palette.windows : 'rgba(0,0,0,0.15)'}
              opacity={lit ? (isActive ? 0.9 : 0.65) : 0.25}
              rx="0.2"
            />
          );
        }
      }
    }

    // Antenna for tallest buildings
    const showAntenna = cell.score === maxScore && cell.height > 60;
    const antennaTop: [number, number] = [(topTop[0] + topBottom[0]) / 2, topTop[1] - 14];

    return (
      <g
        key={cell.key}
        role="button"
        tabIndex={0}
        aria-label={`${formatMetricValue(cell.score)} ${unit} on ${cell.date}`}
        className={`city-pillar ${isActive ? 'city-pillar--active' : ''}`}
        style={{ '--pillar-delay': animationDelay, '--pillar-intensity': `${cell.intensity}` } as CSSProperties}
        onPointerEnter={(event) => handlePointerEnter(event, cell)}
        onPointerMove={(event) => handlePointerMove(event, cell)}
        onPointerLeave={handlePointerLeave}
        onClick={(event) => {
          if (isActive) {
            handlePointerLeave();
            return;
          }
          handlePointerEnter(event, cell);
        }}
        onFocus={() => setHoveredKey(cell.key)}
        onBlur={() => setHoveredKey(null)}
      >
        {/* Floor shadow */}
        <polygon points={floorFace} className="city-pillar__floor" />

        {/* Building body */}
        <polygon points={leftFace} fill={palette.left} opacity={opacity} className="city-pillar__left" style={{ filter: glow }} />
        <polygon points={rightFace} fill={palette.right} opacity={opacity} className="city-pillar__right" style={{ filter: glow }} />
        <polygon points={topFace} fill={palette.top} opacity={1} className="city-pillar__top" style={{ filter: glow }} />

        {/* Windows */}
        {leftWindows}
        {rightWindows}

        {/* Top edge highlight */}
        <polyline
          points={pointsToString([topLeft, topTop, topRight])}
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.5"
          strokeLinecap="round"
          className="city-pillar__edge"
        />
        <polyline
          points={pointsToString([topLeft, topBottom, topRight])}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.35"
          strokeLinecap="round"
        />

        {/* Rooftop light */}
        <circle
          cx={(topTop[0] + topBottom[0]) / 2}
          cy={(topTop[1] + topBottom[1]) / 2}
          r={cell.score > 0 ? 1 : 0.5}
          fill={cell.score > 0 ? palette.windows : 'rgba(255,255,255,0.2)'}
          opacity={isActive ? 1 : 0.7}
        />

        {/* Antenna on tallest buildings */}
        {showAntenna && (
          <>
            <line
              x1={(topTop[0] + topBottom[0]) / 2}
              y1={topTop[1]}
              x2={antennaTop[0]}
              y2={antennaTop[1]}
              stroke="rgba(200,220,255,0.6)"
              strokeWidth="0.6"
            />
            <circle cx={antennaTop[0]} cy={antennaTop[1]} r="1.2" fill="#ef4444" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {/* Ground glow / street light effect */}
        {cell.score > 0 && (
          <ellipse
            cx={cell.x}
            cy={cell.y + TILE_HEIGHT / 2 + 1}
            rx={TILE_WIDTH / 3}
            ry={TILE_HEIGHT / 4}
            fill={palette.glow}
            opacity={isActive ? 0.6 : 0.25}
          />
        )}
      </g>
    );
  };

  // Generate stars for the sky
  const stars = useMemo(() => {
    const result: Array<{ cx: number; cy: number; r: number; opacity: number }> = [];
    for (let i = 0; i < 40; i++) {
      result.push({
        cx: (i * 197 + 31) % VIEWBOX_WIDTH,
        cy: (i * 127 + 17) % (VIEWBOX_HEIGHT * 0.4),
        r: ((i * 13) % 3) * 0.3 + 0.4,
        opacity: ((i * 23) % 5) * 0.12 + 0.2,
      });
    }
    return result;
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-xl">Contribution City</h3>
      <div className="neo-panel p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h4 className="text-sm uppercase tracking-[0.18em] text-cyan-200/85">Contribution Skyline</h4>
          <p className="text-xs text-slate-300">{panelCaption}</p>
        </div>

        <div ref={rootRef} className="city-heatmap-wrap">
          <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            className="h-[300px] w-full md:h-[360px]"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <radialGradient id="cityAura" cx="50%" cy="76%" r="70%">
                <stop offset="0%" stopColor="rgba(56,189,248,0.22)" />
                <stop offset="58%" stopColor="rgba(56,189,248,0.06)" />
                <stop offset="100%" stopColor="rgba(2,6,23,0)" />
              </radialGradient>
              <linearGradient id="citySkyline" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(10,15,30,0.95)" />
                <stop offset="25%" stopColor="rgba(15,25,50,0.85)" />
                <stop offset="55%" stopColor="rgba(20,35,65,0.65)" />
                <stop offset="100%" stopColor="rgba(2,6,23,0)" />
              </linearGradient>
              <linearGradient id="cityFloor" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1f3f67" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#101f37" stopOpacity="0.72" />
              </linearGradient>
              <pattern id="cityFloorGrid" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(125,211,252,0.12)" strokeWidth="0.5" />
              </pattern>
              <radialGradient id="cityFloorGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(56,189,248,0.15)" />
                <stop offset="100%" stopColor="rgba(2,6,23,0)" />
              </radialGradient>
            </defs>

            {/* Night sky */}
            <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#citySkyline)" opacity="0.95" />

            {/* Stars */}
            {stars.map((star, i) => (
              <circle key={`star-${i}`} cx={star.cx} cy={star.cy} r={star.r} fill="white" opacity={star.opacity}>
                {i % 5 === 0 && (
                  <animate attributeName="opacity" values={`${star.opacity};${star.opacity * 0.3};${star.opacity}`} dur={`${2 + (i % 3)}s`} repeatCount="indefinite" />
                )}
              </circle>
            ))}

            {/* Moon */}
            <circle cx={VIEWBOX_WIDTH - 60} cy={40} r="12" fill="rgba(255,255,240,0.08)" />
            <circle cx={VIEWBOX_WIDTH - 58} cy={38} r="10" fill="rgba(255,255,240,0.12)" />
            <circle cx={VIEWBOX_WIDTH - 56} cy={36} r="6" fill="rgba(255,255,250,0.06)" />

            <g transform={`translate(${projection.offsetX} ${projection.offsetY}) scale(${projection.scale})`}>
              {/* Floor aura */}
              <ellipse cx="0" cy={projection.baselineY - 6} rx={190} ry={26} fill="url(#cityAura)" opacity="0.85" />

              {/* Floor platform */}
              <polygon points={pointsToString(projection.floorPoints)} fill="url(#cityFloor)" opacity="0.65" />
              <polygon points={pointsToString(projection.floorPoints)} fill="url(#cityFloorGrid)" opacity="0.7" />

              {/* Floor glow */}
              <ellipse
                cx={(projection.floorPoints[0][0] + projection.floorPoints[2][0]) / 2}
                cy={(projection.floorPoints[0][1] + projection.floorPoints[2][1]) / 2}
                rx={80}
                ry={20}
                fill="url(#cityFloorGlow)"
                opacity="0.5"
              />

              {/* Buildings */}
              {towerData.map(createPillar)}

              {/* Base line */}
              <line
                x1={projection.floorPoints[3][0] - 8}
                y1={projection.baselineY}
                x2={projection.floorPoints[1][0] + 8}
                y2={projection.baselineY}
                stroke="rgba(74,188,255,0.5)"
                strokeWidth="1.2"
              />
            </g>
          </svg>

          {tooltipLabel && (
            <div className="city-tooltip" style={{ left: safeTooltipX, top: safeTooltipY }}>
              <p className="city-tooltip__date">{dateFmt.format(new Date(tooltipLabel.date))}</p>
              <p className="city-tooltip__value">
                {formatMetricValue(tooltipLabel.score)} {unit}
              </p>
              <p className="city-tooltip__meta">Week {tooltipLabel.week + 1}, day {tooltipLabel.day + 1}</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-300">
            Peak day: <span className="text-cyan-300">{topText}</span>
          </p>
          <p className="text-xs text-slate-300">
            Active days: <span className="text-cyan-300">{activeDays.toLocaleString()}</span>
          </p>
          {loading && <p className="text-xs text-slate-400">Loading contribution skyline...</p>}
        </div>

        <div className="flex items-center justify-between mt-5 text-xs text-slate-300">
          <span>Low</span>
          <div className="flex items-center gap-1.5">
            {legendSteps.map((step, index) => (
              <div
                key={`legend-${index}`}
                className="h-4 w-4 rounded-sm border border-white/15"
                style={{ backgroundColor: step.top }}
              ></div>
            ))}
          </div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
