import { Config } from '@remotion/cli/config';

// Render settings for flat UI with fine text, chosen by measuring encodes
// against lossless frames. See README "Output quality" for the numbers.

// Capture each frame losslessly; JPEG added a second lossy pass before H.264.
Config.setVideoImageFormat('png');
// HD colour matrix, tagged, in the limited range players expect. Untagged
// output gets decoded as BT.709 by browsers and shifts colour.
Config.setColorSpace('bt709');
Config.setPixelFormat('yuv420p');
// Within 0.2 dB of a lossless 4:2:0 encode. Lower CRFs only add bytes.
Config.setCrf(10);
Config.setX264Preset('slow');
// A silent AAC track. The ad is silent by design, but Meta's spec expects audio.
Config.setEnforceAudioTrack(true);
Config.setAudioBitrate('128k');

// Remotion converts to BT.709 with zscale, which keeps less detail on coloured
// edges than ffmpeg's own scaler (28.2 vs 29.6 dB). Swap it for the same
// conversion through scale.
const REMOTION_BT709_FILTER = 'zscale=matrix=709:matrixin=709:range=limited';
const BT709_FILTER = 'scale=out_color_matrix=bt709:out_range=tv';

Config.overrideFfmpegCommand(({ type, args }) => {
  // The pre-stitcher always encodes the frames, so it must carry the filter.
  // If a Remotion upgrade renames it, fail rather than silently lose the swap.
  if (type === 'pre-stitcher' && !args.includes(REMOTION_BT709_FILTER)) {
    throw new Error(`Remotion's BT.709 filter changed; update remotion.config.ts`);
  }
  return args.map((arg) => (arg === REMOTION_BT709_FILTER ? BT709_FILTER : arg));
});

Config.setOverwriteOutput(true);
Config.setConcurrency(4);
