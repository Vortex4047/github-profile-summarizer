import { useMemo } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { GitHubRepo } from '../github';

interface TechStackProps {
  repos: GitHubRepo[];
  loading: boolean;
}

const GITHUB_LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Java: '#b07219',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Shell: '#89e051',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
};

const DEFAULT_PALETTE = [
  '#38bdf8',
  '#10b981',
  '#a855f7',
  '#f59e0b',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
];

function buildLanguageData(repos: GitHubRepo[]) {
  const map = new Map<string, number>();
  let totalWithLang = 0;

  repos.forEach((repo) => {
    if (!repo.language) return;
    map.set(repo.language, (map.get(repo.language) || 0) + 1);
    totalWithLang += 1;
  });

  const total = Math.max(1, totalWithLang);
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count], index) => {
      const percentage = Math.round((count / total) * 100);
      const color = GITHUB_LANG_COLORS[name] || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
      return {
        name,
        count,
        percentage,
        color,
      };
    });
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

  const avgStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0) / total;

  return [
    { subject: 'Frontend', value: Math.min(100, Math.round((frontendCount / total) * 120)), fullMark: 100 },
    { subject: 'Backend', value: Math.min(100, Math.round((backendCount / total) * 120)), fullMark: 100 },
    { subject: 'Systems', value: Math.min(100, Math.round((systemsCount / total) * 140)), fullMark: 100 },
    { subject: 'DevOps', value: Math.min(100, Math.round((devopsCount / total) * 130)), fullMark: 100 },
    { subject: 'Data & ML', value: Math.min(100, Math.round((dataCount / total) * 130)), fullMark: 100 },
    { subject: 'Impact', value: Math.min(100, Math.round(avgStars * 8)), fullMark: 100 },
  ];
}

export function TechStack({ repos, loading }: TechStackProps) {
  const languageData = useMemo(() => buildLanguageData(repos), [repos]);
  const skillData = useMemo(() => buildSkillData(repos), [repos]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white tracking-tight">Language & Domain Profile</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Languages Breakdown */}
        <div className="neo-panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Language Distribution
              </h4>
              <span className="text-xs text-slate-500 font-mono">
                {languageData.length} detected
              </span>
            </div>

            {loading && languageData.length === 0 && (
              <p className="text-xs text-slate-500 py-8 text-center">Analyzing code languages...</p>
            )}

            {!loading && languageData.length === 0 && (
              <p className="text-xs text-slate-500 py-8 text-center">No languages recorded.</p>
            )}

            {languageData.length > 0 && (
              <>
                {/* Proportional Spectrum Bar (like GitHub) */}
                <div className="h-2 w-full rounded-full overflow-hidden flex bg-slate-800 mb-5">
                  {languageData.map((lang) => (
                    <div
                      key={lang.name}
                      style={{
                        width: `${Math.max(2, lang.percentage)}%`,
                        backgroundColor: lang.color,
                      }}
                      title={`${lang.name}: ${lang.percentage}%`}
                    />
                  ))}
                </div>

                {/* Legend list */}
                <div className="space-y-2.5">
                  {languageData.map((lang) => (
                    <div key={lang.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: lang.color }}
                        />
                        <span className="font-medium text-slate-200">{lang.name}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-slate-400">
                        <span>{lang.count} {lang.count === 1 ? 'repo' : 'repos'}</span>
                        <span className="font-semibold text-slate-300 w-10 text-right">
                          {lang.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Radar Domain Profile */}
        <div className="neo-panel p-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Domain Competencies
            </h4>
            <span className="text-xs text-slate-500 font-mono">Profile radar</span>
          </div>

          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Proficiency"
                  dataKey="value"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.18}
                  strokeWidth={1.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
