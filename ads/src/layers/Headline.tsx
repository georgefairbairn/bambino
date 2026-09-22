import type React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { POPPINS } from '../fonts';
import { type AdLayout } from '../layout';
import { getVisibleWordCount } from '../motion';
import {
  HEADLINE_EXIT_FRAMES,
  HEADLINES,
  getBeat,
  getHeadlineStart,
  getOutgoingHeadline,
} from '../timeline';
import { HEADLINE_COLOR } from '../theme';

/** New lines wait this long so the outgoing one has cleared half its exit. */
const ENTER_DELAY = HEADLINE_EXIT_FRAMES / 2;

const Line: React.FC<{ text: string; layout: AdLayout; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  layout,
  style,
  children,
}) => (
  <div
    style={{
      position: 'absolute',
      top: layout.headline.top,
      left: layout.headline.sidePadding,
      right: layout.headline.sidePadding,
      textAlign: 'center',
      fontFamily: POPPINS,
      fontWeight: 600,
      fontSize: layout.headline.fontSize,
      lineHeight: 1.15,
      letterSpacing: -0.5,
      color: HEADLINE_COLOR,
      // Balanced wrapping, so no line strands a single word ("gender",
      // "really is") beneath a full first line.
      textWrap: 'balance',
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * The persistent headline slot. Each section's line reveals word by word in
 * Poppins SemiBold, the App Store face; the previous line lifts away first.
 * Headline 0 is the hook, which draws itself.
 */
export const Headline: React.FC<{ layout: AdLayout; headlines?: readonly string[] }> = ({
  layout,
  headlines = HEADLINES,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = getBeat(frame);
  const start = getHeadlineStart(frame);
  const outgoing = getOutgoingHeadline(frame);

  const current =
    beat.headlineIndex !== null && beat.headlineIndex !== 0 && start !== null
      ? headlines[beat.headlineIndex]
      : null;

  const framesPerWord = fps / 6;
  let incoming: React.ReactNode = null;
  if (current) {
    const local = frame - start! - (outgoing ? ENTER_DELAY : 0);
    const words = current.split(' ');
    const shown = getVisibleWordCount({ totalWords: words.length, localFrame: local, fps });
    incoming = (
      <Line text={current} layout={layout}>
        {words.map((word, i) => {
          const t = i < shown ? Math.min(1, (local - i * framesPerWord) / 5) : 0;
          return (
            <span
              key={`${word}-${i}`}
              style={{
                display: 'inline-block',
                marginRight: '0.26em',
                opacity: t,
                transform: `translateY(${(1 - t) * 0.3}em)`,
              }}
            >
              {word}
            </span>
          );
        })}
      </Line>
    );
  }

  const leaving =
    outgoing && outgoing.index !== 0 ? (
      <Line
        text={headlines[outgoing.index]!}
        layout={layout}
        style={{ opacity: 1 - outgoing.progress, transform: `translateY(${-outgoing.progress * 40}px)` }}
      >
        {headlines[outgoing.index]}
      </Line>
    ) : null;

  return (
    <>
      {leaving}
      {incoming}
    </>
  );
};
