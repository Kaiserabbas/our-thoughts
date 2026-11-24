import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = resolve(ROOT, 'src/initialData.json');
const APPLY = process.argv.includes('--apply');
const BACKUP_DIR = resolve(ROOT, 'backups');
const REPORT = resolve(ROOT, 'category-migration-report.json');

const taxonomy = [
  ['Religion', ['Religious Poetry', 'Dua', 'القرآن', 'زیاراتِ معصومینؑ', 'Religious', 'Islamic History']],
  ['Philosophy', ['Philosophy', 'Ethics', 'Reflections']],
  ['Literature', ['Poetry', 'اقوال', 'Quotes', 'Humour', 'Literary Collections']],
  ['Technology & AI', ['Artificial Intelligence', 'AI Projects', 'Technology', 'Prompts']],
  ['History', ['کوفہ کے مسافر', 'Historical Events', 'Historical Figures', 'Islamic History']],
  ['Books', ['Book Notes', 'Book Summaries', 'Book Reviews', 'Individual Book Collections']],
];

function mainFor(subcategory) {
  return taxonomy.find(([, subcategories]) => subcategories.includes(subcategory))?.[0]
    || 'General & Miscellaneous';
}

const data = JSON.parse(readFileSync(SOURCE, 'utf8'));
const mapping = new Map();
const audit = data.thoughts.map((thought) => {
  const subcategory = String(thought.subcategory || '').trim();
  const mainCategory = mainFor(subcategory);
  const key = `${thought.category || '(none)'} -> ${subcategory || '(none)'}`;
  mapping.set(key, (mapping.get(key) || 0) + 1);
  return {
    id: thought.id,
    originalCategory: thought.category || null,
    subcategory: subcategory || null,
    destinationCategory: mainCategory,
  };
});

const report = {
  mode: APPLY ? 'apply' : 'dry-run',
  source: SOURCE,
  counts: {
    thoughts: data.thoughts.length,
    mapped: audit.filter((item) => item.destinationCategory !== 'General & Miscellaneous').length,
    needsReview: audit.filter((item) => item.destinationCategory === 'General & Miscellaneous').length,
  },
  mappings: Object.fromEntries([...mapping].map(([key, count]) => [key, count]).sort()),
};

if (APPLY) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = resolve(BACKUP_DIR, `initialData-${stamp}.json`);
  copyFileSync(SOURCE, backup);
  report.backup = backup;
  data.thoughts = data.thoughts.map((thought) => ({
    ...thought,
    legacyCategory: thought.legacyCategory || thought.category || null,
    category: mainFor(String(thought.subcategory || '').trim()),
  }));
  data.categories = ['Religion', 'Philosophy', 'Literature', 'Technology & AI', 'History', 'Books', 'General & Miscellaneous'];
  writeFileSync(SOURCE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
