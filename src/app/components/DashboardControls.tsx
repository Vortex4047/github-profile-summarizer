import type { GitHubEvent, GitHubRepo } from '../github';

export type HeatmapMode = 'commits' | 'activity' | 'hybrid';
export type RepoSort = 'stars' | 'forks' | 'updated' | 'name';

interface DashboardControlsProps {
  events: GitHubEvent[];
  repos: GitHubRepo[];
  heatmapWindow: number;
  heatmapMode: HeatmapMode;
  heatmapEventFilter: string;
  repoSort: RepoSort;
  hideForks: boolean;
  showActiveReposOnly: boolean;
  onHeatmapWindowChange: (days: number) => void;
  onHeatmapModeChange: (mode: HeatmapMode) => void;
  onHeatmapEventFilterChange: (eventType: string) => void;
  onRepoSortChange: (sort: RepoSort) => void;
  onHideForksChange: (value: boolean) => void;
  onShowActiveReposOnlyChange: (value: boolean) => void;
  onExportSnapshot: () => void;
  onCopySummary: () => void;
}

const windowOptions = [30, 90, 180, 365];

function friendlyEventType(type: string) {
  return type.replace('Event', '').replace(/([A-Z])/g, ' $1').trim();
}

export function DashboardControls({
  events,
  repos,
  heatmapWindow,
  heatmapMode,
  heatmapEventFilter,
  repoSort,
  hideForks,
  showActiveReposOnly,
  onHeatmapWindowChange,
  onHeatmapModeChange,
  onHeatmapEventFilterChange,
  onRepoSortChange,
  onHideForksChange,
  onShowActiveReposOnlyChange,
  onExportSnapshot,
  onCopySummary,
}: DashboardControlsProps) {
  const now = Date.now();
  const activeRepoCount = repos.filter((repo) => now - Date.parse(repo.updated_at) <= 180 * 24 * 60 * 60 * 1000).length;
  const uniqueReposTouched = new Set(events.map((event) => event.repoName)).size;
  const mergedPrs = events.filter((event) => event.prMerged).length;
  const totalPushes = events.filter((event) => event.type === 'PushEvent').length;

  const uniqueEventTypes = Array.from(new Set(events.map((event) => event.type))).sort();

  return (
    <section className="neo-panel p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article className="control-chip">
          <p className="control-chip__label">Heatmap Window</p>
          <div className="control-chip__buttons">
            {windowOptions.map((days) => (
              <button
                key={days}
                type="button"
                className={`control-pill ${days === heatmapWindow ? 'control-pill--active' : ''}`}
                onClick={() => onHeatmapWindowChange(days)}
              >
                {days}d
              </button>
            ))}
          </div>
        </article>

        <article className="control-chip">
          <p className="control-chip__label">Heatmap Mode</p>
          <select
            value={heatmapMode}
            onChange={(event) => onHeatmapModeChange(event.target.value as HeatmapMode)}
            className="control-select"
          >
            <option value="commits">Commit Volume</option>
            <option value="activity">Activity Events</option>
            <option value="hybrid">Hybrid Impact</option>
          </select>
        </article>

        <article className="control-chip">
          <p className="control-chip__label">Event Filter</p>
          <select
            value={heatmapEventFilter}
            onChange={(event) => onHeatmapEventFilterChange(event.target.value)}
            className="control-select"
          >
            <option value="all">All Event Types</option>
            {uniqueEventTypes.map((type) => (
              <option key={type} value={type}>
                {friendlyEventType(type)}
              </option>
            ))}
          </select>
        </article>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article className="control-chip">
          <p className="control-chip__label">Repo Sorting</p>
          <select
            value={repoSort}
            onChange={(event) => onRepoSortChange(event.target.value as RepoSort)}
            className="control-select"
          >
            <option value="stars">Stars (desc)</option>
            <option value="forks">Forks (desc)</option>
            <option value="updated">Recently updated</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </article>

        <label className="control-chip control-chip--checkbox">
          <input type="checkbox" checked={hideForks} onChange={(event) => onHideForksChange(event.target.checked)} />
          Hide forked repos
        </label>

        <label className="control-chip control-chip--checkbox">
          <input
            type="checkbox"
            checked={showActiveReposOnly}
            onChange={(event) => onShowActiveReposOnlyChange(event.target.checked)}
          />
          Active repos (updated 180d)
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <article className="insight-box">
          <p>Active repos</p>
          <h4>{activeRepoCount.toLocaleString()}</h4>
        </article>
        <article className="insight-box">
          <p>Repos touched</p>
          <h4>{uniqueReposTouched.toLocaleString()}</h4>
        </article>
        <article className="insight-box">
          <p>Merged PRs</p>
          <h4>{mergedPrs.toLocaleString()}</h4>
        </article>
        <article className="insight-box">
          <p>Push events</p>
          <h4>{totalPushes.toLocaleString()}</h4>
        </article>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="action-btn" onClick={onExportSnapshot}>
          Export Snapshot JSON
        </button>
        <button type="button" className="action-btn action-btn--secondary" onClick={onCopySummary}>
          Copy Dashboard Summary
        </button>
      </div>
    </section>
  );
}
