import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { type AdFormat } from './compositions';
import { getPhoneState } from './choreography';
import { getLayout } from './layout';
import { CAST, type Cast } from './names';
import { HEADLINES, getBeat } from './timeline';
import { Backdrop } from './layers/Backdrop';
import { CardFan } from './layers/CardFan';
import { EndCard } from './layers/EndCard';
import { Headline } from './layers/Headline';
import { MatchFuse } from './layers/MatchFuse';
import { NameCard } from './layers/NameCard';
import { Phone } from './layers/Phone';

export const MatchStory: React.FC<{
  format: AdFormat;
  headlines?: readonly string[];
  cast?: Cast;
}> = ({ format, headlines = HEADLINES, cast = CAST }) => {
  const frame = useCurrentFrame();
  const layout = getLayout(format);
  const beat = getBeat(frame);

  const left = getPhoneState({ frame, side: 'left', cast });
  const right = getPhoneState({ frame, side: 'right', cast });

  return (
    <AbsoluteFill>
      <Backdrop />

      {beat.id === 'card-fan' && <CardFan />}

      <AbsoluteFill
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: layout.phoneGap,
          // Sits below the headline in 'above' layouts, centred in 'overlay'.
          paddingTop: layout.headlinePlacement === 'above' ? layout.height * 0.18 : 0,
        }}
      >
        {left.visible && (
          <Phone
            theme="mint"
            pose={left.pose}
            side="left"
            poseStartFrame={left.poseStartFrame}
            scale={layout.phoneScale}
          >
            {left.card && <NameCard name={left.card} swipe={left.swipe} />}
          </Phone>
        )}
        {right.visible && (
          <Phone
            theme="blue"
            pose={right.pose}
            side="right"
            poseStartFrame={right.poseStartFrame}
            scale={layout.phoneScale}
          >
            {right.card && <NameCard name={right.card} swipe={right.swipe} />}
          </Phone>
        )}
      </AbsoluteFill>

      {(beat.id === 'match-fuse' || beat.id === 'together') && (
        <MatchFuse name={cast.esme.name} />
      )}
      {beat.id === 'end-card' && <EndCard />}

      <Headline format={format} headlines={headlines} />
    </AbsoluteFill>
  );
};
