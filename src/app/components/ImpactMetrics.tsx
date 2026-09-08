import type { ReactNode } from 'react';
import { GitCommit, GitPullRequest, Star, FolderGit2 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { GitHubEvent, GitHubRepo } from '../github';

interface ImpactMetricsProps {
  repos: GitHubRepo[];
  events: GitHubEvent[];
  loading: boolean;
}

function getWeekSeries(events: GitHubEvent[], valueSelector: (event: GitHubEvent) => number) {
  const now = new Date();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const end = new Date(now);
    end.setDate(now.getDate() - (6 - index) * 7);

    const start = new Date(end);
    start.setDate(end.getDate() - 6);

    return {
      start,
      end,
      value: 0,
    };
  });

  events.forEach((event) => {
    const eventDate = new Date(event.createdAt);
    buckets.forEach((bucket) => {
      if (eventDate >= bucket.start && eventDate <= bucket.end) {
        bucket.value += valueSelector(event);
      }
    });
  });

  return buckets.map((bucket) => ({ value: bucket.value }));
}

export function ImpactMetrics({ repos, events, loading }: ImpactMetricsProps) {
  const totalCommits = events.reduce((sum, event) => sum + event.commitCount, 0);
  const prEvents = events.filter((event) => event.type === 'PullRequestEvent').length;
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);

  const commitTrend = getWeekSeries(events, (event) => event.commitCount);
  const prTrend = getWeekSeries(events, (event) => (event.type === 'PullRequestEvent' ? 1 : 0));
  const starsTrend = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 7)
    .reverse()
    .map((repo) => ({ value: repo.stargazers_count }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <MetricCard
        icon={<GitCommit className="w-4 h-4 text-emerald-400" />}
        label="Recent Commits"
        value={loading ? '—' : totalCommits.toLocaleString()}
        subtext={`${commitTrend.at(-1)?.value || 0} in the last 7 days`}
        data={commitTrend}
        color="#10b981"
      />
      <MetricCard
        icon={<Star className="w-4 h-4 text-amber-400" />}
        label="Total Stars Earned"
        value={loading ? '—' : totalStars.toLocaleString()}
        subtext={`Across ${repos.length} public repositories`}
        data={starsTrend.length ? starsTrend : [{ value: 0 }]}
        color="#f59e0b"
      />
      <MetricCard
        icon={<GitPullRequest className="w-4 h-4 text-sky-400" />}
        label="Pull Request Activity"
        value={loading ? '—' : prEvents.toLocaleString()}
        subtext={`${events.filter((e) => e.prMerged).length} merged successfully`}
        data={prTrend}
        color="#38bdf8"
      />
      <MetricCard
        icon={<FolderGit2 className="w-4 h-4 text-purple-400" />}
        label="Repositories & Forks"
        value={loading ? '—' : repos.length.toLocaleString()}
        subtext={`${totalForks} total community forks`}
        data={commitTrend}
        color="#a855f7"
      />
    </div>
  );
}

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  subtext?: string;
  data: { value: number }[];
  color: string;
}

function MetricCard({ icon, label, value, subtext, data, color }: MetricCardProps) {
  return (
    <div className="neo-panel p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>{label}</span>
          <div className="p-1.5 rounded bg-white/[0.04] border border-white/[0.06]">{icon}</div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold font-mono text-white mb-1 tracking-tight">
          {value}
        </div>
        {subtext && <div className="text-xs text-slate-400 line-clamp-1">{subtext}</div>}
      </div>

      <div className="mt-4 h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
