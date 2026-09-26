import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { type AdFormat, type Pace, toStoryFrame } from './compositions';
import { getEndCardScale, getLayout } from './layout';
import { CAST, type Cast } from './names';
import { getScene } from './scene';
import { StoryFrameContext } from './story-frame';
import { DEFAULT_HOOK, getHeadlines, HOOKS, type HookId } from './timeline';
import { Backdrop } from './layers/Backdrop';
import { EndCard } from './layers/EndCard';
import { Headline } from './layers/Headline';
import { Hook } from './layers/Hook';
import { Phone } from './layers/Phone';

export const MatchStory: React.FC<{
  format: AdFormat;
  pace?: Pace;
  hook?: HookId;
  headlines?: readonly string[];
  cast?: Cast;
}> = ({
  format,
  pace = 'full',
  hook = DEFAULT_HOOK,
  headlines = getHeadlines(hook),
  cast = CAST,
}) => {
  const frame = toStoryFrame(useCurrentFrame(), pace);
  const layout = getLayout(format);
  const scene = getScene(frame, layout, cast);

  return (
    <StoryFrameContext.Provider value={frame}>
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Backdrop />
        <Hook lines={HOOKS[hook]} fontSize={layout.hook.fontSize} exit={scene.hookExit} />
        {/* A first, so the partner's phone sits in front of it. */}
        {scene.phones
          .filter((p) => p.y < layout.height)
          .map((p) => (
            <Phone key={p.id} scene={p} frameWidth={layout.width} cast={cast} />
          ))}
        <Headline layout={layout} headlines={headlines} />
        {scene.endCard > 0 && (
          <EndCard
            progress={scene.endCard}
            scale={getEndCardScale(layout)}
            finePrintBottom={layout.endCard.finePrintBottom}
          />
        )}
      </AbsoluteFill>
    </StoryFrameContext.Provider>
  );
};
