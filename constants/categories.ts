import { CATEGORY_KEYS, type CategoryKey } from '@/convex/categories';

export { CATEGORY_KEYS };
export type { CategoryKey };

export const CATEGORY_META: Record<CategoryKey, { label: string; description: string }> = {
  trending: { label: 'Trending', description: 'Climbing fast right now' },
  classic: { label: 'Classic', description: 'Popular for generations' },
  celebrity: { label: 'Celebrity', description: 'A famous association' },
  vintage: { label: 'Vintage', description: 'Old-fashioned, due a comeback' },
  unisex: { label: 'Unisex', description: 'Used across genders' },
  rare: { label: 'Rare', description: 'Uncommon and distinctive' },
};
