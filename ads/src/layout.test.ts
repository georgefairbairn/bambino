import { describe, expect, it } from 'vitest';
import { AD_FORMATS, FORMAT_SIZES } from './compositions';
import { getLayout } from './layout';

describe('layout', () => {
  it('returns the composition dimensions for every format', () => {
    for (const format of AD_FORMATS) {
      const layout = getLayout(format);
      expect(layout.width).toBe(FORMAT_SIZES[format].width);
      expect(layout.height).toBe(FORMAT_SIZES[format].height);
    }
  });

  it('renders the phones full size only in the primary Reel format', () => {
    expect(getLayout('reel').phoneScale).toBe(1);
    expect(getLayout('feed').phoneScale).toBeLessThan(1);
    expect(getLayout('square').phoneScale).toBeLessThan(getLayout('feed').phoneScale);
  });

  it('overlays the headline only where there is no vertical room for it', () => {
    expect(getLayout('reel').headlinePlacement).toBe('above');
    expect(getLayout('feed').headlinePlacement).toBe('above');
    expect(getLayout('square').headlinePlacement).toBe('overlay');
  });

  it('shrinks the headline as the frame gets shorter', () => {
    expect(getLayout('reel').headlineFontSize).toBeGreaterThan(getLayout('feed').headlineFontSize);
    expect(getLayout('feed').headlineFontSize).toBeGreaterThan(
      getLayout('square').headlineFontSize,
    );
  });

  it('keeps every value positive', () => {
    for (const format of AD_FORMATS) {
      const layout = getLayout(format);
      expect(layout.phoneScale).toBeGreaterThan(0);
      expect(layout.headlineFontSize).toBeGreaterThan(0);
      expect(layout.headlineMaxLines).toBeGreaterThan(0);
      expect(layout.phoneGap).toBeGreaterThan(0);
    }
  });
});
