import { useMemo } from 'react';
import { Calendar, Code2, GitFork, Eye, Activity, Layers, Hash, Clock } from 'lucide-react';
import type { GitHubUser, GitHubRepo, GitHubEvent } from '../github';

interface ProfileStatsProps {
  user: GitHubUser | null;
  repos: GitHubRepo[];
  events: GitHubEvent[];
  loading: boolean;
}

function daysSince(dateStr: string) {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function getMostActiveDay(events: GitHubEvent[]) {
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  events.forEach((e) => {
    const d = new Date(e.createdAt);
    if (!Number.isNaN(d.getTime())) {
      dayCounts[d.getDay()] += 1;
    }
  });

  const maxIndex = dayCounts.indexOf(Math.max(...dayCounts));
  return dayCounts[maxIndex] > 0 ? dayNames[maxIndex] : '—';
}

function getAvgRepoSize(repos: GitHubRepo[]) {
  if (repos.length === 0) return '—';
  const totalSize = repos.reduce((sum, r) => sum + (r.size || 0), 0);
  const avgKB = totalSize / repos.length;
  if (avgKB >= 1024) return `${(avgKB / 1024).toFixed(1)} MB`;
  return `${Math.round(avgKB)} KB`;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className="neo-panel p-4 flex items-center gap-3 hover:border-cyan-400/40 transition-all cursor-default">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-cyan-950/50 border border-cyan-500/20 text-cyan-300 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400">{label}</div>
        <div className="text-lg text-white truncate">{value}</div>
      </div>
    </div>
  );
}

export function ProfileStats({ user, repos, events, loading }: ProfileStatsProps) {
  const totalForks = useMemo(() => repos.reduce((s, r) => s + r.forks_count, 0), [repos]);
  const totalStars = useMemo(() => repos.reduce((s, r) => s + r.stargazers_count, 0), [repos]);
  const totalWatchers = useMemo(() => repos.reduce((s, r) => s + (r.watchers_count || r.stargazers_count), 0), [repos]);
  const uniqueLangs = useMemo(() => new Set(repos.map((r) => r.language).filter(Boolean)).size, [repos]);
  const mostActiveDay = useMemo(() => getMostActiveDay(events), [events]);
  const avgSize = useMemo(() => getAvgRepoSize(repos), [repos]);
  const accountAge = useMemo(() => {
    if (!user?.created_at) return '—';
    const days = daysSince(user.created_at);
    if (days >= 365) return `${(days / 365).toFixed(1)} years`;
    return `${days} days`;
  }, [user?.created_at]);

  const issueEvents = useMemo(() => events.filter((e) => e.type === 'IssuesEvent').length, [events]);

  const placeholder = loading ? '—' : undefined;

  return (
    <div className="space-y-4">
      <h3 className="text-xl">Profile Stats</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatItem icon={<GitFork className="w-4 h-4" />} label="Total Forks" value={placeholder ?? totalForks.toLocaleString()} />
        <StatItem icon={<Eye className="w-4 h-4" />} label="Watchers" value={placeholder ?? totalWatchers.toLocaleString()} />
        <StatItem icon={<Code2 className="w-4 h-4" />} label="Languages" value={placeholder ?? uniqueLangs} />
        <StatItem icon={<Activity className="w-4 h-4" />} label="Issue Events" value={placeholder ?? issueEvents.toLocaleString()} />
        <StatItem icon={<Calendar className="w-4 h-4" />} label="Account Age" value={placeholder ?? accountAge} />
        <StatItem icon={<Layers className="w-4 h-4" />} label="Avg Repo Size" value={placeholder ?? avgSize} />
        <StatItem icon={<Hash className="w-4 h-4" />} label="Most Active Day" value={placeholder ?? mostActiveDay} />
        <StatItem icon={<Clock className="w-4 h-4" />} label="Followers" value={placeholder ?? (user?.followers ?? 0).toLocaleString()} />
      </div>
    </div>
  );
}
