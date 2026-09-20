import { type AdFormat, FORMAT_SIZES } from './compositions';

export interface AdLayout {
  width: number;
  height: number;
  /** Multiplier on the phone's base size. Reel is the reference at 1. */
  phoneScale: number;
  headlineFontSize: number;
  headlineMaxLines: number;
  /** 'above' puts the headline over the phones; 'overlay' floats it on top of them. */
  headlinePlacement: 'above' | 'overlay';
  /** Horizontal gap between the two phones, in px. */
  phoneGap: number;
}

const LAYOUTS: Record<AdFormat, Omit<AdLayout, 'width' | 'height'>> = {
  reel: {
    phoneScale: 1,
    headlineFontSize: 92,
    headlineMaxLines: 3,
    headlinePlacement: 'above',
    phoneGap: 48,
  },
  feed: {
    phoneScale: 0.8,
    headlineFontSize: 76,
    headlineMaxLines: 2,
    headlinePlacement: 'above',
    phoneGap: 40,
  },
  square: {
    phoneScale: 0.65,
    headlineFontSize: 64,
    headlineMaxLines: 2,
    headlinePlacement: 'overlay',
    phoneGap: 32,
  },
};

export const getLayout = (format: AdFormat): AdLayout => ({
  ...FORMAT_SIZES[format],
  ...LAYOUTS[format],
});
