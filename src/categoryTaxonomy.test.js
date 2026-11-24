// Runtime validation coverage for: category hierarchy and migrated thought integrity
import { describe, expect, it } from 'vitest';
import initialData from './initialData.json';
import {
  CATEGORY_TAXONOMY,
  getMainCategoryForSubcategory,
  getSubcategoriesForMainCategory,
  resolveThoughtCategories,
} from './categoryTaxonomy';

describe('category taxonomy', () => {
  it('maps known subcategories to their main category', () => {
    expect(getMainCategoryForSubcategory('Religious Poetry')).toBe('Religion');
    expect(getMainCategoryForSubcategory('Poetry')).toBe('Literature');
    expect(getMainCategoryForSubcategory('کوفہ کے مسافر')).toBe('Books');
    expect(getMainCategoryForSubcategory('Prompts')).toBe('Technology & AI');
  });

  it('includes custom subcategories for the selected main category', () => {
    const subcategories = getSubcategoriesForMainCategory('Religion', [
      { mainCategory: 'Religion', subcategories: ['Personal Reflections'] },
    ]);
    expect(subcategories).toContain('Personal Reflections');
  });

  it('falls back to general category for unknown subcategories', () => {
    expect(resolveThoughtCategories({ subcategory: '' })).toEqual({
      mainCategory: 'General & Miscellaneous',
      subcategory: '',
    });
  });
});

describe('bundled thought migration', () => {
  it('preserves all unique records and main-category mappings', () => {
    expect(initialData.thoughts.length).toBeGreaterThan(0);
    expect(new Set(initialData.thoughts.map((thought) => thought.id)).size)
      .toBe(initialData.thoughts.length);
    expect(initialData.thoughts.every((thought) => Boolean(thought.category))).toBe(true);
    expect(initialData.thoughts.every((thought) => Boolean(thought.subcategory))).toBe(true);
  });

  it('has non-empty taxonomy groups and a reviewable fallback', () => {
    expect(CATEGORY_TAXONOMY.length).toBeGreaterThanOrEqual(8);
    expect(CATEGORY_TAXONOMY.some((category) => category.name === 'General & Miscellaneous'))
      .toBe(true);
    expect(CATEGORY_TAXONOMY.some((category) => category.name === 'Society & Politics'))
      .toBe(true);
  });
});
