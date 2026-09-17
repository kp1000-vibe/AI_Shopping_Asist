import { AlertTriangle, Info } from 'lucide-react';
import type { ProviderStatus } from '@/lib/types';

interface ProviderNoticeProps {
  providers: readonly ProviderStatus[];
  partial: boolean;
  providersConfigured: boolean;
}

/**
 * Small, honest status line: which sources answered, and which did not.
 * Never hides a partial result behind a complete-looking list.
 */
export function ProviderNotice({ providers, partial, providersConfigured }: ProviderNoticeProps) {
  if (!providersConfigured) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          No price sources are configured on this deployment. Add at least one provider API key to
          start returning live prices.
        </span>
      </p>
    );
  }

  if (!partial) return null;

  const failed = providers.filter((provider) => !provider.ok).map((provider) => provider.provider);

  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Some stores did not respond{failed.length > 0 ? ` (${failed.join(', ')})` : ''}. The prices
        below are everything that came back in time.
      </span>
    </p>
  );
}
