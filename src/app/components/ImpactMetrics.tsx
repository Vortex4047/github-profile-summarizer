import type { ReactNode } from 'react';
import { TrendingUp, GitMerge, Star, GitCommit } from 'lucide-react';
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

  const commitTrend = getWeekSeries(events, (event) => event.commitCount);
  const prTrend = getWeekSeries(events, (event) => (event.type === 'PullRequestEvent' ? 1 : 0));
  const starsTrend = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 7)
    .reverse()
    .map((repo) => ({ value: repo.stargazers_count }));

  const commitTrendUp = commitTrend.at(-1)?.value ? commitTrend.at(-1)!.value >= (commitTrend.at(-2)?.value || 0) : false;

  return (
    <div className="space-y-4">
      <h3 className="text-xl">Impact Metrics</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          icon={<GitCommit className="w-5 h-5" />}
          label="TOTAL COMMITS"
          value={loading ? '-' : totalCommits.toLocaleString()}
          trend={loading ? undefined : `${commitTrend.at(-1)?.value || 0} in last week`}
          trendUp={commitTrendUp}
          data={commitTrend}
          color="#22d3ee"
        />
        <MetricCard
          icon={<GitMerge className="w-5 h-5" />}
          label="PR EVENTS"
          value={loading ? '-' : prEvents.toLocaleString()}
          trend={loading ? undefined : `${events.filter((event) => event.prMerged).length} merged`}
          data={prTrend}
          color="#a78bfa"
        />
        <MetricCard
          icon={<Star className="w-5 h-5" />}
          label="TOTAL STARS"
          value={loading ? '-' : totalStars.toLocaleString()}
          trend={loading ? undefined : `${repos.length} public repos`}
          data={starsTrend.length ? starsTrend : [{ value: 0 }]}
          color="#60a5fa"
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  data: { value: number }[];
  color: string;
}

function MetricCard({ icon, label, value, trend, trendUp, data, color }: MetricCardProps) {
  return (
    <div className="neo-panel p-6 hover:border-cyan-400/40 transition-all cursor-pointer group">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-4xl mb-1 flex items-center gap-2">
            {value}
            {trendUp && <TrendingUp className="w-6 h-6 text-green-400" />}
          </div>
          {trend && <div className="text-xs text-green-400">{trend}</div>}
        </div>
      </div>
      <div className="mt-4 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              className="transition-all group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
