import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { ImpactMetrics } from './components/ImpactMetrics';
import { ContributionHeatmap } from './components/ContributionHeatmap';
import { TechStack } from './components/TechStack';
import { TopRepositories } from './components/TopRepositories';
import { ActivityStream } from './components/ActivityStream';
import { ScrollReveal } from './components/ScrollReveal';
import { DashboardControls, type HeatmapMode, type RepoSort } from './components/DashboardControls';
import { ActivityLab } from './components/ActivityLab';
import { DeveloperCompare } from './components/DeveloperCompare';
import { FunDock } from './components/FunDock';
import { CommandPalette, type CommandItem } from './components/CommandPalette';
import { ProfileStats } from './components/ProfileStats';
import { fetchGitHubDashboardData, type GitHubDashboardData } from './github';
import { GitPullRequest, ArrowRightLeft } from 'lucide-react';

const DEFAULT_USERNAME = 'Vortex4047';
const PROFILE_SURPRISE_POOL = [
  'torvalds',
  'gaearon',
  'sindresorhus',
  'addyosmani',
  'yyx990803',
  'dhh',
  'tj',
  'kentcdodds',
  'JakeWharton',
  'kamranahmedse',
];

function pickRandom<T>(list: T[], current?: T) {
  const filtered = current === undefined ? list : list.filter((item) => item !== current);
  if (filtered.length === 0) return list[0];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function readLocalNumberArray(key: string) {
  if (typeof window === 'undefined') return [] as number[];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'number') : [];
  } catch {
    return [];
  }
}

function readLocalStringArray(key: string) {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [usernameInput, setUsernameInput] = useState(DEFAULT_USERNAME);
  const [dashboard, setDashboard] = useState<GitHubDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const [heatmapWindow, setHeatmapWindow] = useState(180);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('commits');
  const [heatmapEventFilter, setHeatmapEventFilter] = useState('all');
  const [repoSort, setRepoSort] = useState<RepoSort>('stars');
  const [hideForks, setHideForks] = useState(false);
  const [showActiveReposOnly, setShowActiveReposOnly] = useState(false);

  const [favoriteRepoIds, setFavoriteRepoIds] = useState<number[]>(() =>
    readLocalNumberArray('gh-dashboard-favorites')
  );
  const [recentUsers, setRecentUsers] = useState<string[]>(() =>
    readLocalStringArray('gh-dashboard-recent-users')
  );

  const [compareInput, setCompareInput] = useState('torvalds');
  const [compareDashboard, setCompareDashboard] = useState<GitHubDashboardData | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const favoriteSet = useMemo(() => new Set(favoriteRepoIds), [favoriteRepoIds]);

  const loadProfile = useCallback(
    async (username: string, forceRefresh = false) => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchGitHubDashboardData(username, { forceRefresh });
        setDashboard(data);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : 'Unable to load GitHub profile.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadCompareProfile = useCallback(async (username: string) => {
    const sanitized = username.trim().replace(/^@/, '');
    if (!sanitized) return;

    setCompareLoading(true);
    setCompareError(null);

    try {
      const data = await fetchGitHubDashboardData(sanitized);
      setCompareDashboard(data);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Unable to load comparison profile.';
      setCompareError(message);
    } finally {
      setCompareLoading(false);
    }
  }, []);

  // On mount: load ONLY the default user (NOT the compare profile, conserving API budget)
  useEffect(() => {
    void loadProfile(DEFAULT_USERNAME);
  }, [loadProfile]);

  useEffect(() => {
    if (!dashboard?.user.login) return;
    setRecentUsers((prev) =>
      [dashboard.user.login, ...prev.filter((item) => item !== dashboard.user.login)].slice(0, 8)
    );
  }, [dashboard?.user.login]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('gh-dashboard-favorites', JSON.stringify(favoriteRepoIds));
  }, [favoriteRepoIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('gh-dashboard-recent-users', JSON.stringify(recentUsers));
  }, [recentUsers]);

  const filteredRepos = useMemo(() => {
    const repos = dashboard?.repos ?? [];
    const query = searchQuery.trim().toLowerCase();
    const now = Date.now();

    const filtered = repos.filter((repo) => {
      if (hideForks && repo.fork) return false;
      if (showActiveReposOnly && now - Date.parse(repo.updated_at) > 180 * 24 * 60 * 60 * 1000)
        return false;
      if (!query) return true;
      const haystack = `${repo.name} ${repo.description || ''} ${repo.language || ''}`.toLowerCase();
      return haystack.includes(query);
    });

    const sorted = [...filtered];

    if (repoSort === 'forks') {
      sorted.sort((a, b) => b.forks_count - a.forks_count);
    } else if (repoSort === 'updated') {
      sorted.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    } else if (repoSort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
    }

    sorted.sort((a, b) => Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id)));

    return sorted;
  }, [dashboard?.repos, searchQuery, hideForks, showActiveReposOnly, repoSort, favoriteSet]);

  const languageCount = useMemo(() => {
    const repos = dashboard?.repos ?? [];
    return new Set(repos.map((repo) => repo.language).filter(Boolean)).size;
  }, [dashboard?.repos]);

  const handleLoadProfile = useCallback(
    (forceRefresh?: boolean) => {
      void loadProfile(usernameInput, forceRefresh);
    },
    [loadProfile, usernameInput]
  );

  const handleLoadCompare = useCallback(() => {
    void loadCompareProfile(compareInput);
  }, [loadCompareProfile, compareInput]);

  const handleLoadRecentUser = useCallback(
    (username: string) => {
      setUsernameInput(username);
      void loadProfile(username);
    },
    [loadProfile]
  );

  const handleSurpriseProfile = useCallback(() => {
    const current = dashboard?.user.login || usernameInput;
    const picked = pickRandom(PROFILE_SURPRISE_POOL, current);
    setUsernameInput(picked);
    void loadProfile(picked);
  }, [dashboard?.user.login, usernameInput, loadProfile]);

  const handleToggleFavorite = useCallback((repoId: number) => {
    setFavoriteRepoIds((prev) =>
      prev.includes(repoId) ? prev.filter((id) => id !== repoId) : [repoId, ...prev].slice(0, 30)
    );
  }, []);

  const handleExportSnapshot = useCallback(() => {
    if (!dashboard) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      user: dashboard.user,
      repos: filteredRepos,
      favoriteRepoIds,
      events: dashboard.events,
      heatmap: {
        windowDays: heatmapWindow,
        mode: heatmapMode,
        filter: heatmapEventFilter,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${dashboard.user.login}-github-dossier.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [dashboard, filteredRepos, favoriteRepoIds, heatmapWindow, heatmapMode, heatmapEventFilter]);

  const handleCopySummary = useCallback(async () => {
    if (!dashboard) return;
    const summary = [
      `Developer: ${dashboard.user.name || dashboard.user.login} (@${dashboard.user.login})`,
      `Public Repos: ${dashboard.user.public_repos}`,
      `Total Stars: ${filteredRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0)}`,
      `Followers: ${dashboard.user.followers}`,
      `Primary Languages: ${languageCount}`,
      `Profile: ${dashboard.user.html_url}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      // best-effort
    }
  }, [dashboard, filteredRepos, languageCount]);

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: 'cmd-surprise',
        label: 'Explore Random Developer',
        hint: 'Shift + R',
        run: handleSurpriseProfile,
        keywords: ['random', 'profile', 'explore'],
      },
      {
        id: 'cmd-toggle-compare',
        label: showCompare ? 'Hide Developer Comparison' : 'Show Developer Comparison',
        run: () => {
          setShowCompare((p) => !p);
          if (!showCompare && !compareDashboard) {
            void loadCompareProfile(compareInput);
          }
        },
      },
      {
        id: 'cmd-reset-search',
        label: 'Clear Filters & Search',
        run: () => {
          setSearchQuery('');
          setHideForks(false);
          setShowActiveReposOnly(false);
          setHeatmapEventFilter('all');
          setRepoSort('stars');
        },
      },
      { id: 'cmd-copy-summary', label: 'Copy Profile Summary', run: () => void handleCopySummary() },
      { id: 'cmd-export', label: 'Export JSON Dossier', run: handleExportSnapshot },
      ...PROFILE_SURPRISE_POOL.slice(0, 5).map((username) => ({
        id: `cmd-load-${username}`,
        label: `Load @${username}`,
        run: () => {
          setUsernameInput(username);
          void loadProfile(username);
        },
        keywords: ['load', 'profile', 'user'],
      })),
    ],
    [
      handleSurpriseProfile,
      showCompare,
      compareDashboard,
      loadCompareProfile,
      compareInput,
      handleCopySummary,
      handleExportSnapshot,
      loadProfile,
    ]
  );

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (event.shiftKey && key === 'r') {
        event.preventDefault();
        handleSurpriseProfile();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSurpriseProfile]);

  return (
    <div className="dashboard-shell">
      <div className="max-w-[1360px] mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Clean Editorial Title Bar */}
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight">
                GitHub Developer Dossier
              </h1>
              <p className="text-xs text-slate-400">Activity, language focus, and code intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !showCompare;
                setShowCompare(next);
                if (next && !compareDashboard) {
                  void loadCompareProfile(compareInput);
                }
              }}
              className={`control-pill ${showCompare ? 'control-pill--active' : ''}`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Compare Developer</span>
            </button>
          </div>
        </div>

        {/* Profile Identity & Search Bar */}
        <ScrollReveal>
          <Header
            user={dashboard?.user ?? null}
            languageCount={languageCount}
            usernameInput={usernameInput}
            searchQuery={searchQuery}
            loading={loading}
            error={error}
            fromCache={dashboard?.fromCache}
            onUsernameInputChange={setUsernameInput}
            onSearchChange={setSearchQuery}
            onLoadProfile={handleLoadProfile}
          />
        </ScrollReveal>

        {/* Quick Utility Actions Bar */}
        <ScrollReveal delay={15}>
          <FunDock
            currentUsername={dashboard?.user.login || null}
            recentUsers={recentUsers}
            onSurpriseProfile={handleSurpriseProfile}
            onOpenCommandPalette={() => setPaletteOpen(true)}
            onLoadRecentUser={handleLoadRecentUser}
            onExportSnapshot={handleExportSnapshot}
            onCopySummary={handleCopySummary}
          />
        </ScrollReveal>

        {/* 4-Metric Key Indicators */}
        <ScrollReveal delay={30}>
          <ImpactMetrics
            repos={dashboard?.repos ?? []}
            events={dashboard?.events ?? []}
            loading={loading}
          />
        </ScrollReveal>

        {/* Fast Repository & Heatmap Filters */}
        <ScrollReveal delay={45}>
          <DashboardControls
            events={dashboard?.events ?? []}
            repos={dashboard?.repos ?? []}
            heatmapWindow={heatmapWindow}
            heatmapMode={heatmapMode}
            heatmapEventFilter={heatmapEventFilter}
            repoSort={repoSort}
            hideForks={hideForks}
            showActiveReposOnly={showActiveReposOnly}
            onHeatmapWindowChange={setHeatmapWindow}
            onHeatmapModeChange={setHeatmapMode}
            onHeatmapEventFilterChange={setHeatmapEventFilter}
            onRepoSortChange={setRepoSort}
            onHideForksChange={setHideForks}
            onShowActiveReposOnlyChange={setShowActiveReposOnly}
            onExportSnapshot={handleExportSnapshot}
            onCopySummary={handleCopySummary}
          />
        </ScrollReveal>

        {/* 8-Tile Deep Profile Stats */}
        <ScrollReveal delay={55}>
          <ProfileStats
            user={dashboard?.user ?? null}
            repos={dashboard?.repos ?? []}
            events={dashboard?.events ?? []}
            loading={loading}
          />
        </ScrollReveal>

        {/* Main Bento Grid: 2-Column Interlocking Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <ScrollReveal delay={65}>
              <TechStack repos={dashboard?.repos ?? []} loading={loading} />
            </ScrollReveal>

            <ScrollReveal delay={85}>
              <ActivityLab
                events={dashboard?.events ?? []}
                repos={filteredRepos}
                loading={loading}
              />
            </ScrollReveal>
          </div>

          <div className="space-y-6">
            <ScrollReveal delay={75}>
              <ContributionHeatmap
                events={dashboard?.events ?? []}
                calendar={dashboard?.calendar}
                loading={loading}
                days={heatmapWindow}
                mode={heatmapMode}
                eventFilter={heatmapEventFilter}
                username={dashboard?.user.login || usernameInput}
              />
            </ScrollReveal>

            <ScrollReveal delay={95}>
              <TopRepositories
                repos={filteredRepos}
                loading={loading}
                query={searchQuery}
                favoriteRepoIds={favoriteRepoIds}
                onToggleFavorite={handleToggleFavorite}
              />
            </ScrollReveal>
          </div>
        </div>

        {/* Activity Stream */}
        <ScrollReveal delay={110}>
          <ActivityStream
            title="Recent Activity Timeline"
            events={dashboard?.events ?? []}
            loading={loading}
          />
        </ScrollReveal>

        {/* On-Demand Comparison View (Only loads when opened) */}
        {showCompare && (
          <ScrollReveal delay={120}>
            <DeveloperCompare
              primary={dashboard}
              compare={compareDashboard}
              compareInput={compareInput}
              compareLoading={compareLoading}
              compareError={compareError}
              onCompareInputChange={setCompareInput}
              onLoadCompare={handleLoadCompare}
            />
          </ScrollReveal>
        )}
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
}
