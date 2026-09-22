import type React from 'react';
import { getEndCardPhases } from '../end-card';
import { ALFA_SLAB_ONE, POPPINS } from '../fonts';
import { AD_THEMES, HEADLINE_COLOR, ICON_BG } from '../theme';

/**
 * Advance widths in Alfa Slab One, measured in Chrome with the font loaded.
 * "b" + "ambino" sum exactly to "bambino" (4.655em), so there is no kerning at
 * the join and folding "ambino" to zero leaves the "b" where it started.
 */
const AMBINO_EM = 3.993;

/**
 * Proportions measured by pixel off assets/images/icon.png: the "b" fills
 * 70.8% of the square's height and 56.6% of its width, centred at 47.3% from
 * the top. A first pass at 63%, centred at 41.5%, read as close but not the
 * real icon.
 *
 * The glyph's ink is 0.81em tall, so a 220px icon needs a ~193px glyph.
 */
const WORDMARK_PX = 132;
const ICON_PX = 220;
const GLYPH_PX = (ICON_PX * 0.708) / 0.81;
const GLYPH_GROWTH = GLYPH_PX / WORDMARK_PX;

/** Icon square and iOS-style corner, in em of the grown glyph. */
const ICON_EM = ICON_PX / GLYPH_PX;
const ICON_RADIUS_EM = (ICON_PX * 0.225) / GLYPH_PX;

/** With the square centred on the line box, the glyph lands at 47.5%. */
const GLYPH_DROP_EM = 0;

/**
 * "bambino" arrives in the wordmark face and colour the app's sign-in screen
 * uses, holds, then folds into the app icon: "ambino" collapses into the "b",
 * which grows as the icon's mint square rises behind it. The download line
 * sits beneath throughout.
 */
export const EndCard: React.FC<{ progress: number; scale: number }> = ({ progress, scale }) => {
  const { wordmark, collapse, icon, tagline } = getEndCardPhases(progress);
  const mint = AD_THEMES.mint.primary;
  // A small overshoot as the icon lands, then settle.
  const iconScale = icon < 0.75 ? 0.35 + (icon / 0.75) * 0.75 : 1.1 - ((icon - 0.75) / 0.25) * 0.1;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontFamily: ALFA_SLAB_ONE,
          fontSize: WORDMARK_PX * scale,
          lineHeight: 1,
          color: mint,
          opacity: wordmark,
          transform: `translateY(${(1 - wordmark) * 30 * scale}px)`,
        }}
      >
        <span
          style={{
            position: 'relative',
            display: 'inline-block',
            transform: `scale(${1 + (GLYPH_GROWTH - 1) * collapse})`,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${ICON_EM}em`,
              height: `${ICON_EM}em`,
              borderRadius: `${ICON_RADIUS_EM}em`,
              backgroundColor: ICON_BG,
              boxShadow: '0 0.08em 0.2em rgba(5,150,105,0.18)',
              opacity: icon,
              transform: `translate(-50%, -50%) translateY(${GLYPH_DROP_EM}em) scale(${iconScale})`,
            }}
          />
          <span style={{ position: 'relative' }}>b</span>
        </span>
        <span
          style={{
            display: 'inline-block',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            maxWidth: `${(1 - collapse) * AMBINO_EM}em`,
            opacity: 1 - Math.pow(collapse, 0.6),
          }}
        >
          ambino
        </span>
      </div>
      <div
        style={{
          // Makes room as the icon grows taller than the wordmark it replaced.
          marginTop: (44 + 60 * collapse) * scale,
          fontFamily: POPPINS,
          fontWeight: 600,
          fontSize: 44 * scale,
          color: HEADLINE_COLOR,
          opacity: tagline,
          transform: `translateY(${(1 - tagline) * 16 * scale}px)`,
        }}
      >
        Free to download on the App Store
      </div>
    </div>
  );
};
