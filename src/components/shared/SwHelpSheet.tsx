import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SwHelpSheet = ({
  open,
  onClose,
  title,
  body,
  bullets = [],
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  bullets?: string[];
}) => (
  <>
    <button
      type="button"
      aria-hidden={!open}
      tabIndex={open ? 0 : -1}
      onClick={onClose}
      className={cn(
        'fixed inset-0 z-40 bg-black/40 transition-opacity',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
    />
    <aside className={cn('sw-help-sheet', open && 'open')}>
      <div className="sw-help-sheet-header">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Ajuda contextual</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          aria-label="Fechar ajuda"
        >
          <X size={16} />
        </button>
      </div>
      <div className="sw-help-sheet-body space-y-5">
        {body ? <p className="text-sm leading-7 text-[var(--text-secondary)]">{body}</p> : null}
        {bullets.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Próximos passos</p>
            <ul className="space-y-2">
              {bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  </>
);

export default SwHelpSheet;
