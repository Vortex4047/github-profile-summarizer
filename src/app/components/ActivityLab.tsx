import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import type { GitHubEvent, GitHubRepo } from '../github';

interface ActivityLabProps {
  events: GitHubEvent[];
  repos: GitHubRepo[];
  loading: boolean;
}

function niceType(type: string) {
  return type.replace('Event', '').replace(/([A-Z])/g, ' $1').trim();
}

function byDayIndex(isoDate: string) {
  const d = new Date(isoDate);
  return Number.isNaN(d.getTime()) ? 0 : d.getDay();
}

const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ActivityLab({ events, repos, loading }: ActivityLabProps) {
  const eventMix = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((event) => map.set(event.type, (map.get(event.type) || 0) + 1));

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([type, value]) => ({ type: niceType(type), value }));
  }, [events]);

  const weekdayHeat = useMemo(() => {
    const values = Array.from({ length: 7 }, (_, i) => ({ day: weekLabels[i], value: 0 }));
    events.forEach((event) => {
      values[byDayIndex(event.createdAt)].value += Math.max(1, event.commitCount || 0);
    });
    return values;
  }, [events]);

  const rhythm = useMemo(() => {
    const totalRepos = Math.max(1, repos.length);
    const avgStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0) / totalRepos;
    const avgForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0) / totalRepos;
    const mergedPr = events.filter((event) => event.prMerged).length;
    const pushes = events.filter((event) => event.type === 'PushEvent').length;

    return [
      { subject: 'Momentum', value: Math.min(100, Math.round(pushes * 1.8)) },
      { subject: 'Collab', value: Math.min(100, Math.round(mergedPr * 4.2)) },
      { subject: 'Impact', value: Math.min(100, Math.round(avgStars * 6.5)) },
      { subject: 'Maintenance', value: Math.min(100, Math.round(avgForks * 8.5)) },
      { subject: 'Breadth', value: Math.min(100, new Set(repos.map((repo) => repo.language).filter(Boolean)).size * 12) },
    ];
  }, [events, repos]);

  return (
    <section className="neo-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white tracking-tight">Activity Analytics</h3>
        <span className="text-xs text-slate-400 font-mono">Cadence & rhythm</span>
      </div>

      {loading && <p className="text-xs text-slate-500">Loading analytics...</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <article className="p-4 rounded-lg bg-slate-950/40 border border-white/[0.05] lg:col-span-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Event Type Distribution</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventMix} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={26} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="p-4 rounded-lg bg-slate-950/40 border border-white/[0.05]">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Engineering Rhythm</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={rhythm}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis tick={false} domain={[0, 100]} />
                <Radar dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.18} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="p-4 rounded-lg bg-slate-950/40 border border-white/[0.05]">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Weekday Commit Frequency</h4>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayHeat} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={26} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
