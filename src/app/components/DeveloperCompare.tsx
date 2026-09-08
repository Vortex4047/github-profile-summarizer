import { Loader2, ArrowRightLeft } from 'lucide-react';
import type { GitHubDashboardData } from '../github';

interface DeveloperCompareProps {
  primary: GitHubDashboardData | null;
  compare: GitHubDashboardData | null;
  compareInput: string;
  compareLoading: boolean;
  compareError: string | null;
  onCompareInputChange: (username: string) => void;
  onLoadCompare: () => void;
}

interface Summary {
  repos: number;
  followers: number;
  stars: number;
  forks: number;
  pushes: number;
}

function summarize(data: GitHubDashboardData | null): Summary {
  if (!data) return { repos: 0, followers: 0, stars: 0, forks: 0, pushes: 0 };

  return {
    repos: data.user.public_repos,
    followers: data.user.followers,
    stars: data.repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    forks: data.repos.reduce((sum, repo) => sum + repo.forks_count, 0),
    pushes: data.events.filter((event) => event.type === 'PushEvent').length,
  };
}

function MetricRow({ label, left, right }: { label: string; left: number; right: number }) {
  const diff = left - right;
  const lead = diff === 0 ? 'tie' : diff > 0 ? 'left' : 'right';

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-white/[0.02] border-b border-white/[0.04] text-xs">
      <span className="text-slate-400 font-medium">{label}</span>
      <div className="flex items-center gap-4 font-mono">
        <span className={lead === 'left' ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
          {left.toLocaleString()}
        </span>
        <span className="text-slate-600 text-[10px]">vs</span>
        <span className={lead === 'right' ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
          {right.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function DeveloperCompare({
  primary,
  compare,
  compareInput,
  compareLoading,
  compareError,
  onCompareInputChange,
  onLoadCompare,
}: DeveloperCompareProps) {
  const left = summarize(primary);
  const right = summarize(compare);

  return (
    <section className="neo-panel p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-slate-400" />
          <h3 className="text-lg font-semibold text-white tracking-tight">Developer Comparison</h3>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLoadCompare();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={compareInput}
            onChange={(event) => onCompareInputChange(event.target.value)}
            placeholder="e.g. torvalds"
            className="bg-slate-950/60 border border-white/10 rounded-md px-3 py-1 text-xs text-white placeholder:text-slate-500 font-mono w-40 focus:outline-none focus:border-emerald-500/50"
          />
          <button
            type="submit"
            disabled={compareLoading}
            className="px-3 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 rounded-md text-xs font-medium transition-colors"
          >
            {compareLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Compare'}
          </button>
        </form>
      </div>

      {compareError && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-md">
          {compareError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-lg bg-slate-950/40 border border-white/[0.06]">
          <span className="text-[10px] font-mono text-slate-500 uppercase">Primary Developer</span>
          <h4 className="text-sm font-semibold text-white truncate mt-0.5">
            {primary?.user.name || primary?.user.login || 'Not loaded'}
          </h4>
          <p className="text-xs text-slate-400 font-mono">@{primary?.user.login || '-'}</p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-950/40 border border-white/[0.06]">
          <span className="text-[10px] font-mono text-slate-500 uppercase">Benchmark Developer</span>
          <h4 className="text-sm font-semibold text-white truncate mt-0.5">
            {compare?.user.name || compare?.user.login || 'Enter user above'}
          </h4>
          <p className="text-xs text-slate-400 font-mono">@{compare?.user.login || '-'}</p>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        <MetricRow label="Public Repositories" left={left.repos} right={right.repos} />
        <MetricRow label="Followers" left={left.followers} right={right.followers} />
        <MetricRow label="Total Stars" left={left.stars} right={right.stars} />
        <MetricRow label="Total Community Forks" left={left.forks} right={right.forks} />
        <MetricRow label="Recent Push Events" left={left.pushes} right={right.pushes} />
      </div>
    </section>
  );
}
