import type React from 'react';
import {
  arrowBack,
  chevronDown,
  heart,
  heartDislike,
  optionsOutline,
  close,
  volumeHigh,
} from 'ionicons/icons';

/** The Ionicons the app itself uses, from the same icon set. */
const ICONS = {
  arrowBack,
  chevronDown,
  close,
  heart,
  heartDislike,
  optionsOutline,
  volumeHigh,
} as const;

export type IconName = keyof typeof ICONS;

/**
 * Outline glyphs style themselves through classes (`ionicon-stroke-width`,
 * `ionicon-fill-none`) that only exist in Ionicons' web stylesheet, so inside a
 * mask they drew with no stroke at all and the Filters icon was two dots.
 * Inject the same three rules the stylesheet applies.
 */
const IONICON_RULES =
  '<style>.ionicon{fill:black;stroke:black}.ionicon-fill-none{fill:none}.ionicon-stroke-width{stroke-width:32px}</style>';

const withRules = (dataUri: string): string => {
  const svg = decodeURIComponent(dataUri.replace(/^data:image\/svg\+xml;utf8,/, ''));
  const styled = svg.replace(/(<svg[^>]*>)/, `$1${IONICON_RULES}`);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(styled)}`;
};

/** Each mask depends only on the icon, so build it once rather than per frame. */
const MASKS = Object.fromEntries(
  Object.entries(ICONS).map(([name, uri]) => [name, `url("${withRules(uri)}")`]),
) as Record<IconName, string>;

/**
 * Drawn as a CSS mask over a solid colour, so each glyph takes whatever colour
 * the app gives it rather than the SVG's default black.
 */
export const Icon: React.FC<{ name: IconName; size: number; color: string }> = ({
  name,
  size,
  color,
}) => {
  const url = MASKS[name];
  return (
    <span
      style={{
        display: 'inline-block',
        flexShrink: 0,
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
};
