import { Focus, Gamepad2, Keyboard, Shuffle, Sparkles, WandSparkles } from 'lucide-react';

type ThemeVariant = 'cyber' | 'holo' | 'quantum' | 'ember' | 'matrix' | 'aurora';

interface FunDockProps {
  currentUsername: string | null;
  themeVariant: ThemeVariant;
  partyMode: boolean;
  focusMode: boolean;
  recentUsers: string[];
  onTogglePartyMode: () => void;
  onToggleFocusMode: () => void;
  onShuffleTheme: () => void;
  onSurpriseProfile: () => void;
  onOpenCommandPalette: () => void;
  onLoadRecentUser: (username: string) => void;
}

const themeLabel: Record<ThemeVariant, string> = {
  cyber: 'Cyber',
  holo: 'Hologram',
  quantum: 'Quantum',
  ember: 'Ember',
  matrix: 'Matrix',
  aurora: 'Aurora',
};

export function FunDock({
  currentUsername,
  themeVariant,
  partyMode,
  focusMode,
  recentUsers,
  onTogglePartyMode,
  onToggleFocusMode,
  onShuffleTheme,
  onSurpriseProfile,
  onOpenCommandPalette,
  onLoadRecentUser,
}: FunDockProps) {
  return (
    <section className="neo-panel fun-dock p-5 space-y-4">
      <div className="fun-dock__head">
        <div>
          <h3 className="text-lg inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            Fun Dock
          </h3>
          <p className="text-xs text-slate-300 mt-1">Theme: {themeLabel[themeVariant]} • Active profile: @{currentUsername || '-'}</p>
        </div>
        <button type="button" className="fun-chip fun-chip--ghost" onClick={onOpenCommandPalette}>
          <Keyboard className="w-3.5 h-3.5" />
          Command Palette
        </button>
      </div>

      <div className="fun-dock__actions">
        <button type="button" className="fun-chip" onClick={onSurpriseProfile}>
          <WandSparkles className="w-3.5 h-3.5" />
          Surprise Me
        </button>

        <button type="button" className={`fun-chip ${partyMode ? 'fun-chip--active' : ''}`} onClick={onTogglePartyMode}>
          <Gamepad2 className="w-3.5 h-3.5" />
          Party Mode
        </button>

        <button type="button" className={`fun-chip ${focusMode ? 'fun-chip--active' : ''}`} onClick={onToggleFocusMode}>
          <Focus className="w-3.5 h-3.5" />
          Focus Mode
        </button>

        <button type="button" className="fun-chip" onClick={onShuffleTheme}>
          <Shuffle className="w-3.5 h-3.5" />
          Shuffle Theme
        </button>
      </div>

      {recentUsers.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-2">Recent Profiles</p>
          <div className="fun-dock__recents">
            {recentUsers.map((user) => (
              <button key={user} type="button" className="recent-pill" onClick={() => onLoadRecentUser(user)}>
                @{user}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
