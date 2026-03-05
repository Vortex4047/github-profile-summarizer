import { Loader2, Search } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { GitHubUser } from '../github';

interface HeaderProps {
  user: GitHubUser | null;
  languageCount: number;
  usernameInput: string;
  searchQuery: string;
  loading: boolean;
  error: string | null;
  onUsernameInputChange: (username: string) => void;
  onSearchChange: (query: string) => void;
  onLoadProfile: () => void;
}

function deriveBadges(user: GitHubUser | null, languageCount: number): string[] {
  if (!user) {
    return ['Open Source', 'Repository Builder'];
  }

  const badges: string[] = ['Open Source'];

  if (user.public_repos >= 30) {
    badges.push('Repository Builder');
  }

  if (user.followers >= 100) {
    badges.push('Community Builder');
  }

  if (languageCount >= 4) {
    badges.push('Polyglot');
  }

  return badges;
}

export function Header({
  user,
  languageCount,
  usernameInput,
  searchQuery,
  loading,
  error,
  onUsernameInputChange,
  onSearchChange,
  onLoadProfile,
}: HeaderProps) {
  const badges = deriveBadges(user, languageCount);
  const badgeThemes = [
    'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30',
    'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30',
    'bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30',
    'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30',
  ];

  const displayName = user?.name || 'GitHub Developer';
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onLoadProfile();
  };

  return (
    <div className="neo-panel p-8">
      <div className="flex flex-col xl:flex-row items-start justify-between gap-6">
        <div className="flex gap-6 flex-1 w-full">
          <div className="relative shrink-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={`${displayName} avatar`}
                className="w-24 h-24 rounded-full object-cover border border-cyan-400/60"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 p-1">
                <div className="w-full h-full rounded-full bg-[#1e293b] flex items-center justify-center">
                  <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                    <path
                      d="M20 15 L30 30 L20 45 M30 15 L40 30 L30 45"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-cyan-400"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <h2 className="text-3xl">{displayName}</h2>
              <span className="text-gray-400">@{user?.login || 'username'}</span>
            </div>
            <p className="text-gray-300 mb-4">
              {user?.bio || 'Load a profile to explore repository activity, language focus, and contribution history.'}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-400">Developer Type:</span>
              {badges.map((badge, index) => (
                <Badge
                  key={badge}
                  variant="outline"
                  className={badgeThemes[index % badgeThemes.length]}
                >
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full xl:w-[420px] space-y-3">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="GitHub username"
              value={usernameInput}
              onChange={(event) => onUsernameInputChange(event.target.value)}
              className="bg-[#0f1629]/60 border-white/10 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-600 text-white min-w-[120px] shadow-[0_0_18px_rgba(34,211,238,0.5)] border border-cyan-200/40"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading
                </span>
              ) : (
                'Load Profile'
              )}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Filter repos and languages"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-10 bg-[#0f1629]/60 border-white/10 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
            />
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
        </form>
      </div>
    </div>
  );
}
