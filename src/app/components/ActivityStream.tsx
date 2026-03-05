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
        <h3 className="text-xl">{title}</h3>
        <button className="text-gray-400 hover:text-white transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="neo-panel p-6">
        {loading && visibleEvents.length === 0 && <p className="text-sm text-gray-400">Loading activity...</p>}

        {!loading && visibleEvents.length === 0 && (
          <p className="text-sm text-gray-400">No recent public activity was returned by GitHub.</p>
        )}

        <div className="space-y-4">
          {visibleEvents.map((event, index) => {
            const meta = getEventMetadata(event);
            const Icon = meta.icon;

            return (
              <div
                key={event.id}
                className="flex gap-4 hover:bg-white/5 p-3 rounded-lg transition-all cursor-pointer group"
              >
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {index < visibleEvents.length - 1 && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-cyan-500/50 to-transparent"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm group-hover:text-cyan-300 transition-colors">{meta.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={`https://github.com/${event.repoName}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-cyan-400 hover:underline truncate max-w-[220px]"
                    >
                      {event.repoName}
                    </a>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{getRelativeTime(event.createdAt)}</span>
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
