import { useEffect, useMemo, useState } from 'react';
import { Star, GitFork, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { GitHubRepo } from '../github';

interface TopRepositoriesProps {
  repos: GitHubRepo[];
  loading: boolean;
  query: string;
  favoriteRepoIds: number[];
  onToggleFavorite: (repoId: number) => void;
}

const PAGE_SIZE = 4;

function buildTrend(repo: GitHubRepo) {
  const stars = Math.max(1, repo.stargazers_count);
  const forks = Math.max(1, repo.forks_count);

  return Array.from({ length: 7 }, (_, index) => {
    const factor = 0.55 + index * 0.08;
    return {
      value: Math.max(1, Math.round(stars * factor + forks * 0.5)),
    };
  });
}

export function TopRepositories({ repos, loading, query, favoriteRepoIds, onToggleFavorite }: TopRepositoriesProps) {
  const [page, setPage] = useState(1);
  const favoriteSet = useMemo(() => new Set(favoriteRepoIds), [favoriteRepoIds]);

  useEffect(() => {
    setPage(1);
  }, [repos.length, query]);

  const totalPages = Math.max(1, Math.ceil(repos.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const visibleRepos = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return repos.slice(start, start + PAGE_SIZE);
  }, [repos, safePage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl">Top Repositories</h3>
        <div className="text-right">
          <p className="text-xs text-slate-300">Page {safePage} / {totalPages}</p>
          <p className="text-[11px] text-amber-200">Favorites: {favoriteRepoIds.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && visibleRepos.length === 0 && (
          <div className="col-span-full text-sm text-gray-400 neo-panel p-6">
            Loading repositories...
          </div>
        )}

        {!loading && visibleRepos.length === 0 && (
          <div className="col-span-full text-sm text-gray-400 neo-panel p-6">
            No repositories matched {query ? `"${query}"` : 'this search'}.
          </div>
        )}

        {visibleRepos.map((repo) => {
          const isFavorite = favoriteSet.has(repo.id);

          return (
            <a
              key={repo.id}
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              className={`neo-panel p-6 hover:border-cyan-400/45 transition-all cursor-pointer group ${isFavorite ? 'repo-card--favorite' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="text-lg text-cyan-300 group-hover:text-cyan-200 transition-colors truncate">
                  {repo.name}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`repo-fav-btn ${isFavorite ? 'repo-fav-btn--active' : ''}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onToggleFavorite(repo.id);
                    }}
                    aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                    title={isFavorite ? 'Remove favorite' : 'Add favorite'}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-cyan-300" />
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                {repo.description || 'No description provided.'}
              </p>

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="inline-flex items-center justify-center rounded-md text-xs px-2 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {repo.language || 'Unknown'}
                </span>
                {repo.fork && (
                  <span className="inline-flex items-center justify-center rounded-md text-xs px-2 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/40">
                    Fork
                  </span>
                )}
                <div className="flex items-center gap-1 text-sm text-gray-400 ml-auto">
                  <Star className="w-4 h-4" />
                  <span>{repo.stargazers_count.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <GitFork className="w-4 h-4" />
                  <span>{repo.forks_count.toLocaleString()}</span>
                </div>
              </div>

              <div className="h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={buildTrend(repo)}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={isFavorite ? '#f59e0b' : '#22d3ee'}
                      strokeWidth={2}
                      dot={false}
                      className="transition-all group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </a>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="repo-page-btn"
          disabled={safePage <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        <button
          type="button"
          className="repo-page-btn"
          disabled={safePage >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
