import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
} from 'recharts';
import type { GitHubRepo } from '../github';

interface TechStackProps {
  repos: GitHubRepo[];
  loading: boolean;
}

const COLORS = [
  '#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb923c', '#22d3ee',
];

function buildLanguageData(repos: GitHubRepo[]) {
  const map = new Map<string, number>();
  repos.forEach((repo) => {
    if (!repo.language) return;
    map.set(repo.language, (map.get(repo.language) || 0) + 1);
  });

  const total = Math.max(1, repos.length);
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, count], index) => ({
      name,
      value: Math.round((count / total) * 100),
      color: COLORS[index % COLORS.length],
    }));
}

function buildSkillData(repos: GitHubRepo[]) {
  const total = Math.max(1, repos.length);

  const frontendLangs = new Set(['JavaScript', 'TypeScript', 'CSS', 'HTML', 'Vue', 'Svelte', 'Dart']);
  const backendLangs = new Set(['Python', 'Go', 'Rust', 'Java', 'C#', 'PHP', 'Ruby', 'Kotlin', 'Scala', 'Elixir']);
  const devopsLangs = new Set(['Shell', 'Dockerfile', 'HCL', 'Nix', 'Makefile', 'PowerShell']);
  const systemsLangs = new Set(['C', 'C++', 'Rust', 'Assembly', 'Zig']);
  const dataLangs = new Set(['Python', 'R', 'Julia', 'Jupyter Notebook', 'MATLAB']);

  const frontendCount = repos.filter((r) => r.language && frontendLangs.has(r.language)).length;
  const backendCount = repos.filter((r) => r.language && backendLangs.has(r.language)).length;
  const devopsCount = repos.filter((r) => r.language && devopsLangs.has(r.language)).length;
  const systemsCount = repos.filter((r) => r.language && systemsLangs.has(r.language)).length;
  const dataCount = repos.filter((r) => r.language && dataLangs.has(r.language)).length;

  const avgForks = repos.reduce((sum, r) => sum + r.forks_count, 0) / total;
  const avgStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0) / total;

  const now = Date.now();
  const recentlyUpdated = repos.filter((r) => now - Date.parse(r.updated_at) <= 180 * 24 * 60 * 60 * 1000).length;
  const hasDescription = repos.filter((r) => r.description && r.description.length > 15).length;

  const uniqueLangs = new Set(repos.map((r) => r.language).filter(Boolean)).size;
  const diversity = Math.min(100, Math.round((uniqueLangs / Math.max(total, 1)) * 140));

  return [
    { subject: 'Frontend', value: Math.round((frontendCount / total) * 100), fullMark: 100 },
    { subject: 'Backend', value: Math.round((backendCount / total) * 100), fullMark: 100 },
    { subject: 'DevOps', value: Math.round((devopsCount / total) * 100), fullMark: 100 },
    { subject: 'Systems', value: Math.round((systemsCount / total) * 100), fullMark: 100 },
    { subject: 'Data/ML', value: Math.round((dataCount / total) * 100), fullMark: 100 },
    { subject: 'Community', value: Math.min(100, Math.round(avgForks * 12)), fullMark: 100 },
    { subject: 'Impact', value: Math.min(100, Math.round(avgStars * 6)), fullMark: 100 },
    { subject: 'Activity', value: Math.round((recentlyUpdated / total) * 100), fullMark: 100 },
    { subject: 'Docs', value: Math.round((hasDescription / total) * 100), fullMark: 100 },
    { subject: 'Diversity', value: diversity, fullMark: 100 },
  ];
}

function CustomRadarTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="city-tooltip" style={{ position: 'relative', transform: 'none', pointerEvents: 'none' }}>
      <p className="city-tooltip__date">{data.subject}</p>
      <p className="city-tooltip__value">{data.value}%</p>
    </div>
  );
}

export function TechStack({ repos, loading }: TechStackProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const languageData = useMemo(() => buildLanguageData(repos), [repos]);
  const skillData = useMemo(() => buildSkillData(repos), [repos]);

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: `drop-shadow(0 0 8px ${fill})` }}
        />
      </g>
    );
  };

  const topLanguage = languageData[0];

  return (
    <div className="space-y-4">
      <h3 className="text-xl">Tech Stack</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="neo-panel p-6">
          <h4 className="text-sm mb-4">Most-Used Languages</h4>

          {loading && languageData.length === 0 && <p className="text-sm text-gray-400">Loading languages...</p>}

          {!loading && languageData.length === 0 && (
            <p className="text-sm text-gray-400">No language data available for this user.</p>
          )}

          {languageData.length > 0 && (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={82}
                      paddingAngle={2}
                      dataKey="value"
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(undefined)}
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color} className="cursor-pointer transition-all" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-3xl">{topLanguage.value}%</div>
                    <div className="text-xs text-gray-400">{topLanguage.name}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {languageData.map((lang) => (
                  <div key={lang.name} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: lang.color }}></div>
                      <span>{lang.name}</span>
                    </div>
                    <span className="text-gray-400">{lang.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="neo-panel p-6">
          <h4 className="text-sm mb-4">Skill Distribution</h4>
          <ResponsiveContainer width="100%" height={310}>
            <RadarChart data={skillData} cx="50%" cy="50%" outerRadius="72%">
              <defs>
                <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.15} />
                </radialGradient>
              </defs>
              <PolarGrid stroke="#334155" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Skills"
                dataKey="value"
                stroke="#22d3ee"
                fill="url(#radarGrad)"
                fillOpacity={0.55}
                strokeWidth={2}
                dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#67e8f9', stroke: '#22d3ee', strokeWidth: 2 }}
              />
              <Tooltip content={<CustomRadarTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
