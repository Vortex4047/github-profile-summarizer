import { GitCommit, GitMerge, GitBranch, MoreHorizontal, AlertCircle, Star } from 'lucide-react';
import type { GitHubEvent } from '../github';

interface ActivityStreamProps {
  title: string;
  events: GitHubEvent[];
  loading: boolean;
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function getRelativeTime(isoDate: string): string {
  const diffMs = Date.parse(isoDate) - Date.now();
  const minutes = Math.round(diffMs / 60000);

  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');

  const days = Math.round(hours / 24);
  return rtf.format(days, 'day');
}

function getEventMetadata(event: GitHubEvent) {
  if (event.type === 'PushEvent') {
    return {
      icon: GitCommit,
      title: `Pushed ${event.commitCount} commit${event.commitCount === 1 ? '' : 's'}`,
      color: '#22d3ee',
    };
  }

  if (event.type === 'PullRequestEvent') {
    return {
      icon: GitMerge,
      title: event.prMerged ? 'Merged a pull request' : 'Opened/updated a pull request',
      color: '#a855f7',
    };
  }

  if (event.type === 'CreateEvent') {
    return {
      icon: GitBranch,
      title: 'Created a branch or repository',
      color: '#10b981',
    };
  }

  if (event.type === 'WatchEvent') {
    return {
      icon: Star,
      title: 'Starred a repository',
      color: '#f59e0b',
    };
  }

  return {
    icon: AlertCircle,
    title: event.type.replace('Event', ''),
    color: '#94a3b8',
  };
}

export function ActivityStream({ title, events, loading }: ActivityStreamProps) {
  const visibleEvents = events.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
        <span className="text-xs text-slate-400 font-mono">{events.length} events</span>
      </div>

      <div className="neo-panel p-5">
        {loading && visibleEvents.length === 0 && (
          <p className="text-xs text-slate-500 py-6 text-center">Loading recent activity...</p>
        )}

        {!loading && visibleEvents.length === 0 && (
          <p className="text-xs text-slate-500 py-6 text-center">No recent public activity reported.</p>
        )}

        <div className="space-y-3">
          {visibleEvents.map((event, index) => {
            const meta = getEventMetadata(event);
            const Icon = meta.icon;

            return (
              <div
                key={event.id}
                className="flex gap-3.5 hover:bg-white/[0.03] p-2.5 rounded-lg transition-colors group"
              >
                <div className="relative shrink-0">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {index < visibleEvents.length - 1 && (
                    <div className="absolute top-7 left-1/2 -translate-x-1/2 w-[1px] h-6 bg-white/[0.08]"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                    {meta.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                    <a
                      href={`https://github.com/${event.repoName}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-emerald-400 transition-colors truncate max-w-[260px]"
                    >
                      {event.repoName}
                    </a>
                    <span>•</span>
                    <span className="text-slate-500">{getRelativeTime(event.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
