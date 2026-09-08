import { useEffect, useMemo, useState } from 'react';
import { Star, GitFork, ArrowUpRight, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import type { GitHubRepo } from '../github';

interface TopRepositoriesProps {
  repos: GitHubRepo[];
  loading: boolean;
  query: string;
  favoriteRepoIds: number[];
  onToggleFavorite: (repoId: number) => void;
}

const PAGE_SIZE = 6;

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

export function TopRepositories({
  repos,
  loading,
  query,
  favoriteRepoIds,
  onToggleFavorite,
}: TopRepositoriesProps) {
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
        <h3 className="text-lg font-semibold text-white tracking-tight">Repositories</h3>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>{repos.length} total</span>
          {favoriteRepoIds.length > 0 && (
            <span className="text-amber-400 font-medium">({favoriteRepoIds.length} pinned)</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {loading && visibleRepos.length === 0 && (
          <div className="col-span-full text-xs text-slate-400 neo-panel p-8 text-center">
            Fetching repositories...
          </div>
        )}

        {!loading && visibleRepos.length === 0 && (
          <div className="col-span-full text-xs text-slate-400 neo-panel p-8 text-center">
            No repositories found {query ? `matching "${query}"` : ''}.
          </div>
        )}

        {visibleRepos.map((repo) => {
          const isFavorite = favoriteSet.has(repo.id);
          const langColor = (repo.language && GITHUB_LANG_COLORS[repo.language]) || '#94a3b8';

          return (
            <div
              key={repo.id}
              className={`neo-panel p-4 flex flex-col justify-between transition-colors group relative ${
                isFavorite ? 'border-amber-500/30 bg-amber-500/[0.02]' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-white hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 group/link truncate text-sm"
                  >
                    <span className="truncate">{repo.name}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-40 group-hover/link:opacity-100 transition-opacity shrink-0" />
                  </a>

                  <button
                    type="button"
                    onClick={() => onToggleFavorite(repo.id)}
                    className={`p-1 rounded hover:bg-white/[0.06] transition-colors shrink-0 ${
                      isFavorite ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={isFavorite ? 'Unpin repository' : 'Pin to top'}
                  >
                    <Bookmark className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <p className="text-xs text-slate-400 mb-3 line-clamp-2 min-h-[32px] leading-relaxed">
                  {repo.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04] text-xs text-slate-400 flex-wrap">
                {repo.language && (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: langColor }}
                    />
                    <span className="text-slate-300">{repo.language}</span>
                  </span>
                )}

                {repo.fork && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] border border-white/[0.06] text-slate-400">
                    Fork
                  </span>
                )}

                <div className="flex items-center gap-1 ml-auto font-mono text-[11px]">
                  <Star className="w-3 h-3 text-slate-400" />
                  <span>{repo.stargazers_count.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-1 font-mono text-[11px]">
                  <GitFork className="w-3 h-3 text-slate-400" />
                  <span>{repo.forks_count.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500 font-mono">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="control-pill"
              disabled={safePage <= 1}
              onClick={() => setPage((c) => Math.max(1, c - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <button
              type="button"
              className="control-pill"
              disabled={safePage >= totalPages}
              onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
