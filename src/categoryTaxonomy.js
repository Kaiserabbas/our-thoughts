export const CATEGORY_TAXONOMY = [
  {
    id: 'religion',
    name: 'Religion',
    icon: '☪️',
    subcategories: ['Religious Poetry', 'Dua', 'القرآن', 'زیاراتِ معصومینؑ', 'Religious', 'Islamic History'],
  },
  {
    id: 'philosophy',
    name: 'Philosophy',
    icon: '🔭',
    subcategories: ['Philosophy', 'Ethics', 'Reflections'],
  },
  {
    id: 'literature',
    name: 'Literature',
    icon: '📜',
    subcategories: ['Poetry', 'اقوال', 'Quotes', 'Humour', 'Literary Collections'],
  },
  {
    id: 'technology',
    name: 'Technology & AI',
    icon: '💡',
    subcategories: ['Artificial Intelligence', 'AI Projects', 'Technology', 'Prompts'],
  },
  {
    id: 'history',
    name: 'History',
    icon: '📖',
    subcategories: ['Historical Events', 'Historical Figures', 'Islamic History', 'تاریخ'],
  },
  {
    id: 'books',
    name: 'Books',
    icon: '📚',
    subcategories: ['کوفہ کے مسافر', 'چھ رکنی شوری، اصول', 'Book Notes', 'Book Summaries', 'Book Reviews', 'Individual Book Collections'],
  },
  {
    id: 'society',
    name: 'Society & Politics',
    icon: '🏛️',
    subcategories: ['Politics', 'Economics', 'Social Issues', 'Society'],
  },
  {
    id: 'general',
    name: 'General & Miscellaneous',
    icon: '💭',
    subcategories: ['متفرق خیالات'],
  },
];

export function getMainCategoryForSubcategory(subcategory) {
  const normalized = String(subcategory || '').trim();
  const match = CATEGORY_TAXONOMY.find((category) =>
    category.subcategories.some((item) => item === normalized)
  );
  return match?.name || 'General & Miscellaneous';
}

export function getSubcategoriesForMainCategory(mainCategory, customSubcategories = []) {
  const aliases = {
    Poetry: 'Literature',
    Religious: 'Religion',
    Books: 'Books',
    Philosophy: 'Philosophy',
    General: 'General & Miscellaneous',
    Political: 'Society & Politics',
    Economics: 'Society & Politics',
  };
  const resolvedName = aliases[mainCategory] || mainCategory;
  const match = CATEGORY_TAXONOMY.find((category) => category.name === resolvedName);
  const builtIn = match?.subcategories || [];
  const custom = customSubcategories
    .filter((item) => item.mainCategory === (match?.name || resolvedName))
    .flatMap((item) => item.subcategories || []);
  return [...new Set([...builtIn, ...custom])];
}

export function resolveThoughtCategories(thought) {
  const subcategory = String(thought?.subcategory || '').trim();
  return {
    mainCategory: getMainCategoryForSubcategory(subcategory),
    subcategory: subcategory || '',
  };
}
