import { useState, useEffect } from 'react';
import {
  Loader2,
  Search,
  KeyRound,
  Check,
  RotateCw,
  ExternalLink,
  MapPin,
  Building,
  Link as LinkIcon,
  Calendar,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  getGitHubToken,
  setGitHubToken,
  getRateLimitState,
  subscribeRateLimit,
  type GitHubUser,
  type RateLimitState,
} from '../github';

interface HeaderProps {
  user: GitHubUser | null;
  languageCount: number;
  usernameInput: string;
  searchQuery: string;
  loading: boolean;
  error: string | null;
  fromCache?: boolean;
  onUsernameInputChange: (username: string) => void;
  onSearchChange: (query: string) => void;
  onLoadProfile: (forceRefresh?: boolean) => void;
}

const SAMPLE_USERS = ['Vortex4047', 'torvalds', 'gaearon', 'yyx990803', 'sindresorhus'];

export function Header({
  user,
  languageCount,
  usernameInput,
  searchQuery,
  loading,
  error,
  fromCache,
  onUsernameInputChange,
  onSearchChange,
  onLoadProfile,
}: HeaderProps) {
  const [showTokenModal, setShowTokenModal] = useState(() => !getGitHubToken());
  const [tokenInput, setTokenInput] = useState(() => getGitHubToken());
  const [tokenSaved, setTokenSaved] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitState>(getRateLimitState());

  useEffect(() => {
    return subscribeRateLimit(setRateLimit);
  }, []);

  const handleSaveToken = () => {
    setGitHubToken(tokenInput);
    setTokenSaved(true);
    setTimeout(() => {
      setTokenSaved(false);
      setShowTokenModal(false);
      onLoadProfile(true);
    }, 800);
  };

  const handleClearToken = () => {
    setTokenInput('');
    setGitHubToken('');
    setShowTokenModal(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onLoadProfile();
  };

  const displayName = user?.name || user?.login || 'Developer';
  const joinedYear = user?.created_at
    ? new Date(user.created_at).getFullYear()
    : null;

  return (
    <div className="neo-panel p-6 sm:p-8">
      {/* Top Utility Bar: Live API Telemetry & Token Manager */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-6 border-b border-white/[0.08]">
        {/* Sample profiles quick switch */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 font-mono mr-1">Quick switch:</span>
          {SAMPLE_USERS.map((username) => (
            <button
              key={username}
              type="button"
              onClick={() => {
                onUsernameInputChange(username);
                // Trigger immediate load
                setTimeout(() => onLoadProfile(), 10);
              }}
              className={`text-xs px-2.5 py-1 rounded-full font-mono transition-colors ${
                user?.login.toLowerCase() === username.toLowerCase()
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
              }`}
            >
              @{username}
            </button>
          ))}
        </div>

        {/* API Telemetry Pill */}
        <div className="flex items-center gap-2 text-xs">
          {fromCache && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Cached
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowTokenModal((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-xs transition-colors border ${
              rateLimit.hasToken
                ? 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
                : 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
            }`}
            title="Click to manage GitHub Personal Access Token (Required)"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                rateLimit.hasToken
                  ? 'bg-emerald-400'
                  : 'bg-amber-400 animate-ping'
              }`}
            />
            <span>
              {rateLimit.hasToken
                ? `API: ${rateLimit.remaining}/${rateLimit.limit} (PAT)`
                : 'Token: Required'}
            </span>
            <KeyRound className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Token Modal / Drawer */}
      {showTokenModal && (
        <div className="mb-6 p-4 sm:p-5 rounded-lg bg-slate-900/95 border border-white/15 text-sm space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <h4 className="font-semibold text-white">GitHub Personal Access Token</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider font-semibold">
                Required
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTokenModal(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors"
            >
              Close
            </button>
          </div>

          {/* Token Generation Guide (Settings > Developer settings > Tokens (classic) > Generate new token) */}
          <div className="space-y-2.5 text-xs text-slate-300">
            <p className="leading-relaxed text-slate-300">
              A GitHub Personal Access Token is <strong>required</strong> to communicate with the GitHub API, inspect developer profiles, and calculate contribution telemetry. Your token is stored exclusively and securely in your browser's <code className="font-mono text-emerald-300 bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-500/20">localStorage</code>.
            </p>

            <div className="p-3 rounded-md bg-black/60 border border-white/10 space-y-2.5">
              <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-300 font-semibold">How to generate your token on GitHub:</span>
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>Open Token Generator directly ↗</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Navigation Breadcrumbs */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200 flex-wrap py-1.5 px-2.5 rounded bg-slate-950 border border-white/10">
                <span className="text-slate-400">Settings</span>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="text-slate-400">Developer settings</span>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="text-slate-400">Personal access tokens</span>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="text-emerald-400 font-semibold">Tokens (classic)</span>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="text-emerald-300 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  Generate new token
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-normal">
                Select <span className="text-slate-300 font-medium">Generate new token (classic)</span>. No special scopes are needed for public profiles (leave scopes unchecked, or check <code className="font-mono text-slate-300">public_repo</code> for public repository telemetry).
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Input
              type="password"
              placeholder="github_pat_xxxx or ghp_xxxx"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="bg-slate-950 border-white/15 text-white font-mono text-xs focus-visible:ring-emerald-500/30"
            />
            <Button
              type="button"
              onClick={handleSaveToken}
              disabled={!tokenInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 font-medium shrink-0"
            >
              {tokenSaved ? <Check className="w-4 h-4" /> : 'Save Token'}
            </Button>
            {getGitHubToken() && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearToken}
                className="text-xs text-rose-400 border-white/10 hover:bg-rose-500/10 shrink-0"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Profile Info & Search Controls */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
        {/* Left: Avatar & Bio */}
        <div className="flex gap-5 flex-1 min-w-0">
          <div className="relative shrink-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-white/10 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10">
                <Sparkles className="w-8 h-8 text-slate-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {displayName}
              </h2>
              {user?.html_url && (
                <a
                  href={user.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors font-mono"
                >
                  @{user.login}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-sm text-slate-300 mb-3 line-clamp-2 leading-relaxed">
              {user?.bio || 'Explore repositories, contribution cadence, and programming languages.'}
            </p>

            {/* Meta tags */}
            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
              {user?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {user.location}
                </span>
              )}
              {user?.company && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  {user.company}
                </span>
              )}
              {user?.blog && (
                <a
                  href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                  {user.blog.replace(/^https?:\/\//, '')}
                </a>
              )}
              {joinedYear && (
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Joined {joinedYear}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Search & Actions */}
        <div className="w-full lg:w-[380px] space-y-2.5">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter GitHub username"
              value={usernameInput}
              onChange={(e) => onUsernameInputChange(e.target.value)}
              className="bg-slate-950/60 border-white/10 focus:border-emerald-500/50 text-white placeholder:text-slate-500 font-mono text-sm"
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[110px] font-medium transition-colors border border-emerald-400/20"
            >
              {loading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading
                </span>
              ) : (
                'Search'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onLoadProfile(true)}
              title="Force refresh (bypass cache)"
              className="px-2.5 border-white/10 hover:bg-white/[0.08] text-slate-300"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </form>

          {/* Repo query filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Filter repositories or languages..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-slate-950/40 border-white/10 focus:border-white/20 text-white placeholder:text-slate-500 text-xs"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md p-2 flex items-start gap-2">
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
