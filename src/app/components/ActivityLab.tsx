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
    <section className="neo-panel p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl">Signal Lab</h3>
        <p className="text-xs text-slate-300">Behavior and rhythm analytics</p>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading signal analytics...</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <article className="signal-tile lg:col-span-2">
          <h4 className="signal-tile__title">Event Type Distribution</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventMix} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                <XAxis dataKey="type" tick={{ fill: '#a5b4fc', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#93c5fd', fontSize: 11 }} axisLine={false} tickLine={false} width={26} />
                <Tooltip
                  cursor={{ fill: 'rgba(15,23,42,0.45)' }}
                  contentStyle={{ background: 'rgba(6, 20, 38, 0.95)', border: '1px solid rgba(34,211,238,0.5)', borderRadius: 8 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="url(#signalBarGradient)" />
                <defs>
                  <linearGradient id="signalBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="signal-tile">
          <h4 className="signal-tile__title">Engineering Rhythm</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={rhythm}>
                <PolarGrid stroke="rgba(148,163,184,0.3)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a5b4fc', fontSize: 11 }} />
                <PolarRadiusAxis tick={false} domain={[0, 100]} />
                <Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.26} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="signal-tile">
        <h4 className="signal-tile__title">Weekday Commit Intensity</h4>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayHeat} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#a5b4fc', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#93c5fd', fontSize: 11 }} axisLine={false} tickLine={false} width={26} />
              <Tooltip
                cursor={{ fill: 'rgba(15,23,42,0.45)' }}
                contentStyle={{ background: 'rgba(6, 20, 38, 0.95)', border: '1px solid rgba(56,189,248,0.45)', borderRadius: 8 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
