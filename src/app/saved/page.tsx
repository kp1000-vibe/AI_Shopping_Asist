import type { Metadata } from 'next';
import { PageShell } from '@/components/page-shell';
import { SavedList } from '@/app/saved/saved-list';

export const metadata: Metadata = {
  title: 'Saved items',
  description: 'Offers you saved on PriceShelf, stored in this browser only.',
  alternates: { canonical: '/saved' },
  robots: { index: false, follow: true },
};

export default function SavedPage() {
  return (
    <PageShell
      title="Saved items"
      intro="Kept in this browser only — nothing is sent to our servers."
    >
      <SavedList />
    </PageShell>
  );
}
