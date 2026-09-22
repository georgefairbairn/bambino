/** Words per second for the headline reveal. */
const WORDS_PER_SECOND = 6;

/**
 * How many words of a headline are showing, `localFrame` frames after it
 * began. At 6 per second a five-word line is complete in under a second.
 */
export const getVisibleWordCount = ({
  totalWords,
  localFrame,
  fps,
}: {
  totalWords: number;
  localFrame: number;
  fps: number;
}): number => {
  if (localFrame < 0) return 0;
  const framesPerWord = fps / WORDS_PER_SECOND;
  return Math.min(totalWords, Math.floor(localFrame / framesPerWord) + 1);
};
