import { Loader2, Swords } from 'lucide-react';
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
    <div className="compare-metric-row">
      <span>{label}</span>
      <div className="compare-metric-row__values">
        <strong className={lead === 'left' ? 'text-cyan-300' : ''}>{left.toLocaleString()}</strong>
        <span className="compare-metric-row__vs">vs</span>
        <strong className={lead === 'right' ? 'text-purple-300' : ''}>{right.toLocaleString()}</strong>
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
    <section className="neo-panel p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl inline-flex items-center gap-2">
          <Swords className="w-5 h-5 text-cyan-300" />
          Developer Duel
        </h3>
        <div className="compare-form">
          <input
            type="text"
            value={compareInput}
            onChange={(event) => onCompareInputChange(event.target.value)}
            placeholder="Compare username"
            className="compare-form__input"
          />
          <button type="button" onClick={onLoadCompare} className="compare-form__btn" disabled={compareLoading}>
            {compareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Compare'}
          </button>
        </div>
      </div>

      {compareError && <p className="text-sm text-rose-300">{compareError}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article className="compare-card">
          <p className="compare-card__label">Primary</p>
          <h4>{primary?.user.name || primary?.user.login || 'Not loaded'}</h4>
          <p className="compare-card__meta">@{primary?.user.login || '-'}</p>
        </article>
        <article className="compare-card compare-card--right">
          <p className="compare-card__label">Compared</p>
          <h4>{compare?.user.name || compare?.user.login || 'Not loaded'}</h4>
          <p className="compare-card__meta">@{compare?.user.login || '-'}</p>
        </article>
      </div>

      <div className="compare-grid">
        <MetricRow label="Public Repositories" left={left.repos} right={right.repos} />
        <MetricRow label="Followers" left={left.followers} right={right.followers} />
        <MetricRow label="Total Stars" left={left.stars} right={right.stars} />
        <MetricRow label="Total Forks" left={left.forks} right={right.forks} />
        <MetricRow label="Recent Push Events" left={left.pushes} right={right.pushes} />
      </div>
    </section>
  );
}
