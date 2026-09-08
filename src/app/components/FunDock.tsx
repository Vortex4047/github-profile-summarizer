import { Compass, Keyboard, Download, Copy, History } from 'lucide-react';

interface FunDockProps {
  currentUsername: string | null;
  themeVariant?: string;
  partyMode?: boolean;
  focusMode?: boolean;
  recentUsers: string[];
  onTogglePartyMode?: () => void;
  onToggleFocusMode?: () => void;
  onShuffleTheme?: () => void;
  onSurpriseProfile: () => void;
  onOpenCommandPalette: () => void;
  onLoadRecentUser: (username: string) => void;
  onExportSnapshot?: () => void;
  onCopySummary?: () => void;
}

export function FunDock({
  currentUsername,
  recentUsers,
  onSurpriseProfile,
  onOpenCommandPalette,
  onLoadRecentUser,
  onExportSnapshot,
  onCopySummary,
}: FunDockProps) {
  return (
    <section className="neo-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Left: Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          className="control-pill"
          onClick={onSurpriseProfile}
          title="Explore a notable open source developer"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Explore Random Dev</span>
        </button>

        <button
          type="button"
          className="control-pill"
          onClick={onOpenCommandPalette}
          title="Open command palette (⌘K)"
        >
          <Keyboard className="w-3.5 h-3.5 text-slate-400" />
          <span>Commands</span>
          <kbd className="text-[10px] bg-white/[0.08] px-1.5 py-0.5 rounded text-slate-400 font-mono ml-1">
            ⌘K
          </kbd>
        </button>

        {onExportSnapshot && (
          <button
            type="button"
            className="control-pill"
            onClick={onExportSnapshot}
            title="Download JSON dossier"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export JSON</span>
          </button>
        )}

        {onCopySummary && (
          <button
            type="button"
            className="control-pill"
            onClick={onCopySummary}
            title="Copy profile summary"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Summary</span>
          </button>
        )}
      </div>

      {/* Right: Recent Profiles History */}
      {recentUsers.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto text-xs text-slate-400 shrink-0">
          <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-[11px] font-mono text-slate-500">History:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {recentUsers.slice(0, 5).map((user) => (
              <button
                key={user}
                type="button"
                onClick={() => onLoadRecentUser(user)}
                className={`font-mono text-[11px] px-2 py-0.5 rounded transition-colors ${
                  currentUsername?.toLowerCase() === user.toLowerCase()
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                @{user}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
