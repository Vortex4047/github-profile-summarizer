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
} from 'recharts';
import type { GitHubRepo } from '../github';

interface TechStackProps {
  repos: GitHubRepo[];
  loading: boolean;
}

const COLORS = ['#f7df1e', '#3178c6', '#3776ab', '#1572b6', '#e34c26', '#22d3ee', '#a855f7'];

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

  const frontendLangs = new Set(['JavaScript', 'TypeScript', 'CSS', 'HTML', 'Vue', 'Svelte']);
  const backendLangs = new Set(['Python', 'Go', 'Rust', 'Java', 'C#', 'PHP', 'Ruby', 'Kotlin']);

  const frontendCount = repos.filter((repo) => repo.language && frontendLangs.has(repo.language)).length;
  const backendCount = repos.filter((repo) => repo.language && backendLangs.has(repo.language)).length;

  const avgForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0) / total;
  const avgStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0) / total;

  const now = Date.now();
  const updatedLastYear = repos.filter((repo) => now - Date.parse(repo.updated_at) <= 365 * 24 * 60 * 60 * 1000).length;

  return [
    { subject: 'Frontend', value: Math.round((frontendCount / total) * 100) },
    { subject: 'Backend', value: Math.round((backendCount / total) * 100) },
    { subject: 'Collab', value: Math.min(100, Math.round(avgForks * 12)) },
    { subject: 'Impact', value: Math.min(100, Math.round(avgStars * 6)) },
    { subject: 'Consistency', value: Math.round((updatedLastYear / total) * 100) },
  ];
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
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={skillData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
              <Radar
                name="Skills"
                dataKey="value"
                stroke="#22d3ee"
                fill="#22d3ee"
                fillOpacity={0.3}
                strokeWidth={2}
                className="transition-all hover:fill-opacity-50"
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
