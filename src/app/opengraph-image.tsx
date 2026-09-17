import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/env';

export const alt = 'PriceShelf — compare live prices across US retailers';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Social card. Rendered at build time with system fonts only. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#1A1A1A',
        padding: 72,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', width: 72, height: 72, gap: 6 }}>
          <div style={{ width: 33, height: 33, borderRadius: 8, background: '#FFFFFF' }} />
          <div style={{ width: 33, height: 33, borderRadius: 8, background: '#8B5CF6' }} />
          <div style={{ width: 33, height: 33, borderRadius: 8, background: '#FFFFFF' }} />
          <div
            style={{
              width: 33,
              height: 33,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.55)',
            }}
          />
        </div>
        <div style={{ color: '#FFFFFF', fontSize: 44, fontWeight: 700 }}>{SITE_NAME}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ color: '#FFFFFF', fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>
          One search. Every shelf price.
        </div>
        <div style={{ color: '#A1A1AA', fontSize: 32, lineHeight: 1.3 }}>
          Amazon · Walmart · Costco · Target · Best Buy · SHEIN · Sams Club · eBay · Home Depot
        </div>
      </div>
    </div>,
    size,
  );
}
