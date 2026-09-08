import { useMemo, useState, useEffect } from 'react';
import type { GitHubEvent, ContributionCalendarData } from '../github';
import type { HeatmapMode } from './DashboardControls';
import { Box, Play, RefreshCw, Layers, ExternalLink, Calendar, Grid3X3, Sparkles } from 'lucide-react';

interface ContributionHeatmapProps {
  events: GitHubEvent[];
  calendar?: ContributionCalendarData;
  loading: boolean;
  days: number;
  mode: HeatmapMode;
  eventFilter: string;
  username?: string;
}

interface DayData {
  date: Date;
  dateStr: string;
  weekIndex: number;
  dayOfWeek: number; // 0=Sun, 6=Sat
  count: number;
  level: number;
}

// Exact colors from yoshi389111/github-profile-3d-contrib NightGreenSettings.json
const NIGHT_GREEN_COLORS = [
  // Level 0: no contrib
  { top: 'rgb(68, 68, 68)', left: 'rgb(57, 57, 57)', right: 'rgb(48, 48, 48)' },
  // Level 1
  { top: 'rgb(27, 125, 40)', left: 'rgb(23, 105, 33)', right: 'rgb(19, 88, 28)' },
  // Level 2
  { top: 'rgb(36, 167, 54)', left: 'rgb(30, 140, 45)', right: 'rgb(25, 117, 38)' },
  // Level 3
  { top: 'rgb(45, 209, 67)', left: 'rgb(38, 175, 56)', right: 'rgb(31, 146, 47)' },
  // Level 4
  { top: 'rgb(87, 218, 105)', left: 'rgb(73, 183, 88)', right: 'rgb(61, 153, 74)' },
];

// Official GitHub 2D calendar dark-mode colors
const GITHUB_2D_COLORS = [
  '#161b22', // Level 0
  '#0e4429', // Level 1
  '#006d32', // Level 2
  '#26a641', // Level 3
  '#39d353', // Level 4
];

function getContribLevel(count: number): number {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 9) return 2;
  if (count <= 19) return 3;
  return 4;
}

// Height scaling formula from yoshi389111/github-profile-3d-contrib
function getPillarHeight(count: number, level: number): number {
  if (level === 0 || count <= 0) return 2.6;
  return Math.log10(count / 20 + 1) * 144 + 4;
}

export function ContributionHeatmap({
  events,
  calendar,
  loading,
  days: propDays,
  mode,
  eventFilter,
  username = 'Vortex4047',
}: ContributionHeatmapProps) {
  const [animateKey, setAnimateKey] = useState(0);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [repoSvgAvailable, setRepoSvgAvailable] = useState<boolean | null>(null);
  const [displayTab, setDisplayTab] = useState<'3d' | '2d' | 'both'>('3d');
  const [selectedYear, setSelectedYear] = useState<string>('lastYear');

  // Check if user has an official committed profile-night-green.svg in their ${user}/${user} repo
  useEffect(() => {
    if (!username) return;
    let isCancelled = false;

    const checkSvg = async () => {
      const branches = ['main', 'master'];
      for (const branch of branches) {
        const url = `https://raw.githubusercontent.com/${username}/${username}/${branch}/profile-3d-contrib/profile-night-green.svg`;
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (!isCancelled && res.ok) {
            setRepoSvgAvailable(true);
            return;
          }
        } catch {
          // ignore
        }
      }
      if (!isCancelled) setRepoSvgAvailable(false);
    };

    void checkSvg();
    return () => {
      isCancelled = true;
    };
  }, [username]);

  // Aggregate event counts as fallback if calendar API is not yet loaded
  const countsByDateFromEvents = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((event) => {
      if (eventFilter !== 'all' && event.type !== eventFilter) return;
      const dateObj = new Date(event.createdAt);
      if (Number.isNaN(dateObj.getTime())) return;
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      let weight = 1;
      if (mode === 'commits') {
        weight = event.type === 'PushEvent' ? Math.max(1, event.commitCount) : 0;
      } else if (mode === 'activity') {
        weight = 1;
      } else {
        weight = event.type === 'PushEvent' ? Math.max(1, event.commitCount) : event.prMerged ? 3 : 1;
      }

      if (weight > 0) {
        map.set(dateKey, (map.get(dateKey) || 0) + weight);
      }
    });
    return map;
  }, [events, mode, eventFilter]);

  // Available year selector options
  const availableYears = useMemo(() => {
    const list: string[] = ['lastYear'];
    if (calendar?.years && calendar.years.length > 0) {
      calendar.years.forEach((y) => {
        if (!list.includes(y.year)) list.push(y.year);
      });
    } else {
      const currentYear = new Date().getFullYear();
      for (let y = currentYear; y >= currentYear - 3; y--) {
        list.push(String(y));
      }
    }
    return list;
  }, [calendar?.years]);

  // Process and arrange the active dataset into 53 weeks of days
  const calendarData = useMemo(() => {
    let sourceDays: { date: string; count: number; level: number }[] = [];

    if (calendar) {
      if (selectedYear === 'lastYear') {
        sourceDays = calendar.days || [];
      } else if (calendar.allContributions && calendar.allContributions.length > 0) {
        sourceDays = calendar.allContributions.filter((c) => c.date.startsWith(`${selectedYear}-`));
      } else {
        sourceDays = calendar.days || [];
      }
    }

    // If sourceDays is still empty (calendar not loaded), synthesize from events or date window
    if (!sourceDays || sourceDays.length === 0) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const totalDays = 53 * 7;
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - totalDays + 1);

      sourceDays = [];
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        const count = countsByDateFromEvents.get(dateStr) || 0;
        sourceDays.push({
          date: dateStr,
          count,
          level: getContribLevel(count),
        });
      }
    }

    // Sort sourceDays chronologically
    const sortedSource = [...sourceDays].sort((a, b) => a.date.localeCompare(b.date));
    if (sortedSource.length === 0) {
      return { days: [], sortedPillars: [], weeksCount: 53, totalContributions: 0, monthStarts: [] };
    }

    const firstDate = new Date(`${sortedSource[0].date}T00:00:00Z`);
    const firstSunday = new Date(firstDate);
    firstSunday.setUTCDate(firstSunday.getUTCDate() - firstSunday.getUTCDay());

    const result: DayData[] = [];
    let maxWeek = 0;
    const monthStarts: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    sortedSource.forEach((item) => {
      const cur = new Date(`${item.date}T00:00:00Z`);
      const diffDays = Math.floor((cur.getTime() - firstSunday.getTime()) / 86400000);
      const weekIndex = Math.max(0, Math.floor(diffDays / 7));
      const dayOfWeek = cur.getUTCDay();

      if (weekIndex > maxWeek) maxWeek = weekIndex;

      const m = cur.getUTCMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        const monthShort = cur.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        monthStarts.push({ month: monthShort, weekIndex });
      }

      result.push({
        date: cur,
        dateStr: item.date,
        weekIndex,
        dayOfWeek,
        count: item.count,
        level: item.level,
      });
    });

    const totalWeeks = Math.max(52, maxWeek + 1);

    // CRITICAL DEPTH SORTING: (weekIndex + dayOfWeek) ascending ensures proper isometric painter occlusion
    const sortedPillars = [...result].sort(
      (a, b) => a.weekIndex + a.dayOfWeek - (b.weekIndex + b.dayOfWeek)
    );

    const totalCount =
      selectedYear === 'lastYear' && calendar?.totalContributions
        ? calendar.totalContributions
        : result.reduce((sum, d) => sum + d.count, 0);

    return {
      days: result,
      sortedPillars,
      weeksCount: totalWeeks,
      totalContributions: totalCount,
      monthStarts,
    };
  }, [calendar, selectedYear, countsByDateFromEvents]);

  // Compute Radar telemetry stats for top-right (matching github-profile-3d-contrib)
  const radarData = useMemo(() => {
    const commits = events.filter((e) => e.type === 'PushEvent').reduce((s, e) => s + e.commitCount, 0);
    const prs = events.filter((e) => e.type === 'PullRequestEvent').length;
    const issues = events.filter((e) => e.type === 'IssuesEvent').length;
    const reviews = events.filter((e) => e.type === 'PullRequestReviewEvent').length;
    const stars = events.filter((e) => e.type === 'WatchEvent').length;

    const maxVal = Math.max(8, commits, prs * 3, issues * 3, reviews * 3, stars * 2);
    return [
      { label: 'Commits', val: Math.min(1, Math.max(0.18, commits / maxVal)), raw: commits },
      { label: 'PRs', val: Math.min(1, Math.max(0.18, (prs * 3) / maxVal)), raw: prs },
      { label: 'Issues', val: Math.min(1, Math.max(0.18, (issues * 3) / maxVal)), raw: issues },
      { label: 'Reviews', val: Math.min(1, Math.max(0.18, (reviews * 3) / maxVal)), raw: reviews },
      { label: 'Stars', val: Math.min(1, Math.max(0.18, (stars * 2) / maxVal)), raw: stars },
    ];
  }, [events]);

  // 3D Isometric View Parameters & Bounding Box Centering Math
  const svgWidth = 1120;
  const svgHeight = 630;
  const dx = 16.5; // Step in X
  const ANGLE = 30;
  const dy = dx * Math.tan((ANGLE * Math.PI) / 180); // ~9.526
  const dxx = dx * 0.9;
  const dyy = dy * 0.9;

  // Calculate the exact bounding box of the entire 53-week 3D isometric grid
  const bounds = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    calendarData.sortedPillars.forEach((d) => {
      const px = (d.weekIndex - d.dayOfWeek) * dx;
      const py = (d.weekIndex + d.dayOfWeek) * dy;
      const h = getPillarHeight(d.count, d.level);

      if (px - dxx < minX) minX = px - dxx;
      if (px + dxx * 2 > maxX) maxX = px + dxx * 2;
      if (py - h - dyy < minY) minY = py - h - dyy;
      if (py + dyy * 2.5 > maxY) maxY = py + dyy * 2.5;
    });

    if (!Number.isFinite(minX)) {
      return { scale: 1, translateX: 0, translateY: 0 };
    }

    const gridWidth = maxX - minX;
    const gridHeight = maxY - minY;

    const availYStart = 90;
    const availYEnd = svgHeight - 45;
    const availHeight = availYEnd - availYStart;
    const availWidth = svgWidth - 60;

    const scale = Math.min(1.02, Math.min(availWidth / gridWidth, availHeight / gridHeight));
    const scaledWidth = gridWidth * scale;
    const scaledHeight = gridHeight * scale;

    const translateX = (svgWidth - scaledWidth) / 2 - minX * scale;
    const translateY = availYStart + (availHeight - scaledHeight) / 2 - minY * scale;

    return {
      scale,
      translateX,
      translateY,
    };
  }, [calendarData.sortedPillars, dx, dy, dxx, dyy, svgWidth, svgHeight]);

  const repoSvgUrl = `https://raw.githubusercontent.com/${username}/${username}/main/profile-3d-contrib/profile-night-green.svg`;

  // Format date nicely for tooltip
  const formatTooltipDate = (d: DayData) => {
    try {
      return d.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return d.dateStr;
    }
  };

  const currentYearLabel =
    selectedYear === 'lastYear' ? 'the last year' : selectedYear;

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white tracking-tight">
            Contribution Graph
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            {calendarData.totalContributions.toLocaleString()} contributions
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: 3D, 2D Profile, Both */}
          <div className="flex items-center bg-[#161b22] border border-white/10 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setDisplayTab('3d')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
                displayTab === '3d'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>3D Night Green</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayTab('2d')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
                displayTab === '2d'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>2D GitHub Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayTab('both')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
                displayTab === 'both'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3 h-3" />
              <span>Both</span>
            </button>
          </div>

          {displayTab !== '2d' && (
            <button
              type="button"
              onClick={() => setAnimateKey((k) => k + 1)}
              className="control-pill"
              title="Replay 3D Pillar Growth Animation"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Replay Growth</span>
            </button>
          )}

          <a
            href="https://github.com/yoshi389111/github-profile-3d-contrib"
            target="_blank"
            rel="noreferrer"
            className="control-pill text-slate-400 hover:text-white"
            title="View yoshi389111/github-profile-3d-contrib"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Action Spec</span>
          </a>
        </div>
      </div>

      {/* VIEW: 3D ISOMETRIC NIGHT GREEN */}
      {(displayTab === '3d' || displayTab === 'both') && (
        <div className="neo-panel p-4 sm:p-6 bg-[#00000f] border-white/10 relative overflow-hidden flex flex-col items-center justify-center">
          {loading && (
            <div className="absolute inset-0 bg-[#00000f]/80 backdrop-blur-sm z-20 flex items-center justify-center text-xs text-slate-300 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              Loading real-time contribution telemetry...
            </div>
          )}

          <div className="w-full flex justify-center">
            <svg
              key={animateKey}
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto max-h-[580px] select-none block"
              style={{ fontFamily: '"Sora", "Ubuntu", sans-serif' }}
            >
              {/* Deep Night Green Background */}
              <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#00000f" rx="8" />

              {/* Title / Header Telemetry (Top-Left) */}
              <g transform="translate(48, 46)">
                <text fill="rgb(255, 200, 55)" fontSize="26" fontWeight="bold">
                  {calendarData.totalContributions.toLocaleString()}
                </text>
                <text fill="#aaaaaa" fontSize="12" y="20" letterSpacing="0.02em">
                  contributions in {currentYearLabel} • Night Green 3D Engine
                </text>
              </g>

              {/* Top-Right Telemetry Radar Chart */}
              <g transform="translate(940, 46)">
                <circle cx="65" cy="45" r="38" fill="none" stroke="#222233" strokeWidth="1" />
                <circle cx="65" cy="45" r="24" fill="none" stroke="#222233" strokeWidth="1" />
                <circle cx="65" cy="45" r="12" fill="none" stroke="#222233" strokeWidth="1" />

                {radarData.map((item, idx) => {
                  const angle = (idx * 2 * Math.PI) / radarData.length - Math.PI / 2;
                  const x = 65 + 38 * Math.cos(angle);
                  const y = 45 + 38 * Math.sin(angle);
                  const lx = 65 + 50 * Math.cos(angle);
                  const ly = 45 + 50 * Math.sin(angle);

                  return (
                    <g key={item.label}>
                      <line x1="65" y1="45" x2={x} y2={y} stroke="#2a2a3c" strokeWidth="0.75" />
                      <text
                        x={lx}
                        y={ly + 3}
                        fill="#777788"
                        fontSize="8.5"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {item.label}
                      </text>
                    </g>
                  );
                })}

                <polygon
                  points={radarData
                    .map((item, idx) => {
                      const angle = (idx * 2 * Math.PI) / radarData.length - Math.PI / 2;
                      const r = 8 + item.val * 28;
                      return `${65 + r * Math.cos(angle)},${45 + r * Math.sin(angle)}`;
                    })
                    .join(' ')}
                  fill="#47a042"
                  fillOpacity="0.45"
                  stroke="#47a042"
                  strokeWidth="2"
                />
              </g>

              {/* 3D Isometric Contribution Pillars (FULL 53-WEEK YEAR, PERFECTLY CENTERED) */}
              <g transform={`translate(${bounds.translateX}, ${bounds.translateY}) scale(${bounds.scale})`}>
                {calendarData.sortedPillars.map((d) => {
                  const baseX = (d.weekIndex - d.dayOfWeek) * dx;
                  const baseY = (d.weekIndex + d.dayOfWeek) * dy;
                  const calHeight = getPillarHeight(d.count, d.level);
                  const color = NIGHT_GREEN_COLORS[d.level] || NIGHT_GREEN_COLORS[0];

                  return (
                    <g
                      key={d.dateStr}
                      transform={`translate(${baseX} ${baseY - calHeight})`}
                      onMouseEnter={() => setHoveredDay(d)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className="cursor-pointer transition-opacity hover:opacity-90"
                    >
                      {/* Pillar Growth Animation */}
                      {d.level > 0 && (
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values={`${baseX} ${baseY - 2.6};${baseX} ${baseY - calHeight}`}
                          dur="1.4s"
                          repeatCount="1"
                        />
                      )}

                      {/* Top Panel (Isometric Rhombus) */}
                      <rect
                        stroke="none"
                        x="0"
                        y="0"
                        width={dxx}
                        height={dxx}
                        transform="skewY(-30) skewX(40.89) scale(1 1.15)"
                        fill={color.top}
                      />

                      {/* Left Panel */}
                      <rect
                        stroke="none"
                        x="0"
                        y="0"
                        width={dxx}
                        height={calHeight}
                        transform="skewY(30) scale(1 1.15)"
                        fill={color.left}
                      >
                        {d.level > 0 && (
                          <animate
                            attributeName="height"
                            values={`2.6;${calHeight}`}
                            dur="1.4s"
                            repeatCount="1"
                          />
                        )}
                      </rect>

                      {/* Right Panel */}
                      <rect
                        stroke="none"
                        x="0"
                        y="0"
                        width={dxx}
                        height={calHeight}
                        transform={`translate(${dxx} ${dyy}) skewY(-30) scale(1 1.15)`}
                        fill={color.right}
                      >
                        {d.level > 0 && (
                          <animate
                            attributeName="height"
                            values={`2.6;${calHeight}`}
                            dur="1.4s"
                            repeatCount="1"
                          />
                        )}
                      </rect>
                    </g>
                  );
                })}
              </g>

              {/* Bottom Centered Legend */}
              <g transform={`translate(${(svgWidth - 160) / 2}, ${svgHeight - 24})`}>
                <text fill="#777788" fontSize="10.5" y="10">
                  Less
                </text>
                {NIGHT_GREEN_COLORS.map((c, idx) => (
                  <rect
                    key={idx}
                    x={32 + idx * 18}
                    y="1"
                    width="12"
                    height="12"
                    fill={c.top}
                    rx="1.5"
                  />
                ))}
                <text fill="#777788" fontSize="10.5" x={32 + 5 * 18 + 6} y="10">
                  More
                </text>
              </g>
            </svg>
          </div>

          {/* Interactive Hover Tooltip */}
          {hoveredDay && (
            <div className="absolute bottom-3 right-4 bg-slate-900/95 border border-white/20 rounded-md px-3 py-2 text-xs shadow-2xl pointer-events-none z-30 font-mono">
              <div className="font-semibold text-white">{formatTooltipDate(hoveredDay)}</div>
              <div className="text-emerald-400 font-medium">
                {hoveredDay.count} contribution{hoveredDay.count === 1 ? '' : 's'}
              </div>
              <div className="text-[10px] text-slate-400">Activity level {hoveredDay.level} of 4</div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: 2D GITHUB PROFILE CALENDAR (EXACT MATCH TO USER'S GITHUB PROFILE SCREENSHOT) */}
      {(displayTab === '2d' || displayTab === 'both') && (
        <div className="flex flex-col 2xl:flex-row gap-4 items-start w-full">
          {/* Main 2D Calendar Card */}
          <div className="flex-1 min-w-0 w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-4 sm:p-5 text-slate-200">
            {/* Header: "112 contributions in the last year" + settings + year selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-sm">
              <h4 className="font-medium text-white text-base">
                {calendarData.totalContributions.toLocaleString()} contributions in {currentYearLabel}
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                {/* Year pills for standard & medium viewports */}
                <div className="flex 2xl:hidden items-center gap-1 bg-[#161b22] border border-[#30363d] rounded-md p-0.5 overflow-x-auto">
                  {availableYears.map((yearKey) => {
                    const isSelected = selectedYear === yearKey;
                    const displayLabel = yearKey === 'lastYear' ? 'Last year' : yearKey;

                    return (
                      <button
                        key={yearKey}
                        type="button"
                        onClick={() => setSelectedYear(yearKey)}
                        className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap transition-all ${
                          isSelected
                            ? 'bg-[#1f6feb] text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {displayLabel}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                  <span>Contribution settings</span>
                  <span className="text-[10px]">▼</span>
                </div>
              </div>
            </div>

            {/* Inner Calendar Border Box (matching GitHub profile) */}
            <div className="border border-[#30363d] rounded-md p-3 sm:p-4 bg-[#0d1117] overflow-x-auto">
              <div className="min-w-[690px]">
                {/* SVG 2D Grid */}
                <svg
                  viewBox="0 0 740 125"
                  className="w-full h-auto select-none"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}
                >
                  {/* Month labels along the top */}
                  <g transform="translate(32, 14)">
                    {calendarData.monthStarts.map((m, idx) => (
                      <text
                        key={idx}
                        x={m.weekIndex * 13.2}
                        y="0"
                        fill="#8b949e"
                        fontSize="10"
                      >
                        {m.month}
                      </text>
                    ))}
                  </g>

                  {/* Day of Week Labels: Mon, Wed, Fri */}
                  <g transform="translate(0, 32)">
                    <text x="0" y="21" fill="#8b949e" fontSize="9.5">
                      Mon
                    </text>
                    <text x="0" y="47" fill="#8b949e" fontSize="9.5">
                      Wed
                    </text>
                    <text x="0" y="73" fill="#8b949e" fontSize="9.5">
                      Fri
                    </text>
                  </g>

                  {/* 53 Weeks x 7 Days Contribution Rectangles */}
                  <g transform="translate(32, 22)">
                    {calendarData.days.map((d) => {
                      const x = d.weekIndex * 13.2;
                      const y = d.dayOfWeek * 13;
                      const fillColor = GITHUB_2D_COLORS[d.level] || GITHUB_2D_COLORS[0];

                      return (
                        <rect
                          key={d.dateStr}
                          x={x}
                          y={y}
                          width="10.5"
                          height="10.5"
                          rx="2"
                          ry="2"
                          fill={fillColor}
                          stroke={d.level === 0 ? '#1b1f24' : 'transparent'}
                          strokeWidth="0.5"
                          className="cursor-pointer transition-all hover:stroke-white hover:stroke-[1.5]"
                          onMouseEnter={() => setHoveredDay(d)}
                          onMouseLeave={() => setHoveredDay(null)}
                        >
                          <title>
                            {d.count} contribution{d.count === 1 ? '' : 's'} on {formatTooltipDate(d)}
                          </title>
                        </rect>
                      );
                    })}
                  </g>
                </svg>

                {/* Footer: Learn how we count contributions + Legend */}
                <div className="flex items-center justify-between pt-3 text-xs text-[#8b949e]">
                  <a
                    href="https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-settings-on-your-profile/why-are-my-contributions-not-showing-up-on-my-profile"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-blue-400 transition-colors"
                  >
                    Learn how we count contributions
                  </a>

                  <div className="flex items-center gap-1.5">
                    <span>Less</span>
                    <div className="flex gap-1 items-center">
                      {GITHUB_2D_COLORS.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-2.5 h-2.5 rounded-[2px]"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span>More</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Year Selector (visible on wide screens, matching user screenshot) */}
          <div className="hidden 2xl:flex flex-col gap-1.5 w-28 shrink-0">
            {availableYears.map((yearKey) => {
              const isSelected = selectedYear === yearKey;
              const displayLabel = yearKey === 'lastYear' ? 'Last year' : yearKey;

              return (
                <button
                  key={yearKey}
                  type="button"
                  onClick={() => setSelectedYear(yearKey)}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#1f6feb] text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
                  }`}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
