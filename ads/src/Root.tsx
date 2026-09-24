import type React from 'react';
import { Composition, Still } from 'remotion';
import { AD_FORMATS, COMPOSITION_IDS, DURATION_IN_FRAMES, FORMAT_SIZES, FPS } from './compositions';
import { MatchStory } from './MatchStory';
import { BrandPost } from './posts/BrandPost';
import { ListPost } from './posts/ListPost';

export const RemotionRoot: React.FC = () => (
  <>
    {AD_FORMATS.map((format) => (
      <Composition
        key={format}
        id={COMPOSITION_IDS[format]}
        component={MatchStory}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={FORMAT_SIZES[format].width}
        height={FORMAT_SIZES[format].height}
        defaultProps={{ format }}
      />
    ))}
    {/* Instagram feed posts, 4:5. See src/posts/data.ts for the grid. */}
    <Still id="Post-Brand" component={BrandPost} width={1080} height={1350} />
    <Still
      id="Post-List"
      component={ListPost}
      width={1080}
      height={1350}
      defaultProps={{ list: 'rising-girls' as const }}
    />
  </>
);
