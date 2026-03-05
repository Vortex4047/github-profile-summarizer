import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

function matchesCommand(command: CommandItem, query: string) {
  const target = `${command.label} ${command.hint || ''} ${(command.keywords || []).join(' ')}`.toLowerCase();
  return target.includes(query);
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((command) => matchesCommand(command, q));
  }, [commands, query]);

  if (!open) return null;

  return (
    <div className="palette-backdrop" role="dialog" aria-modal="true" aria-label="Command Palette" onClick={onClose}>
      <div className="palette-panel" onClick={(event) => event.stopPropagation()}>
        <div className="palette-search-wrap">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands..."
            className="palette-search"
          />
        </div>

        <div className="palette-list">
          {filtered.length === 0 && <p className="palette-empty">No commands found.</p>}
          {filtered.map((command) => (
            <button
              key={command.id}
              type="button"
              className="palette-item"
              onClick={() => {
                command.run();
                onClose();
              }}
            >
              <span>{command.label}</span>
              {command.hint && <span className="palette-item__hint">{command.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
