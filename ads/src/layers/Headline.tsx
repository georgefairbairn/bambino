import type React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { GABARITO } from '../fonts';
import { type AdFormat } from '../compositions';
import { getLayout } from '../layout';
import { getVisibleWordCount } from '../motion';
import { HEADLINES, getHeadline, getHeadlineStart } from '../timeline';
import { HEADLINE_COLOR } from '../theme';

export const Headline: React.FC<{
  format: AdFormat;
  headlines?: readonly string[];
}> = ({ format, headlines = HEADLINES }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = getLayout(format);
  const text = getHeadline(frame, headlines);
  const startFrame = getHeadlineStart(frame);

  if (text === null || startFrame === null) return null;

  const words = text.split(' ');
  const visible = getVisibleWordCount({
    totalWords: words.length,
    localFrame: frame - startFrame,
    fps,
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: layout.headlinePlacement === 'overlay' ? '6%' : '8%',
        left: 72,
        right: 72,
        fontFamily: GABARITO,
        fontWeight: 800,
        fontSize: layout.headlineFontSize,
        lineHeight: 1.08,
        color: HEADLINE_COLOR,
        letterSpacing: -1,
      }}
    >
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          style={{
            display: 'inline-block',
            marginRight: '0.28em',
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? 'translateY(0)' : 'translateY(0.15em)',
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
};
