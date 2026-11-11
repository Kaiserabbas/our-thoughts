import React, { useState, useMemo } from 'react';
import { getFontFamilyCss } from './fontUtils';
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  Copy,
  Download,
  Filter,
  Layers,
  Link2,
  Loader2,
  Search,
  Sparkles,
  Star,
  Tag,
  Volume2,
  VolumeX,
} from 'lucide-react';

// Urdu stop-words to ignore during similarity scoring
const URDU_STOP_WORDS = new Set([
  'کا', 'کی', 'کے', 'کو', 'نے', 'سے', 'پر', 'میں', 'ہے', 'ہیں', 'تھا', 'تھی', 'تھے',
  'اور', 'یا', 'کہ', 'وہ', 'یہ', 'ان', 'اس', 'تو', 'بھی', 'ہی', 'ایک', 'ہو', 'ہوا',
  'ہوئی', 'ہوئے', 'کیا', 'کس', 'کر', 'کرنا', 'کرنے', 'نہ', 'نہیں', 'تک', 'جب', 'تب',
  'اب', 'پھر', 'جو', 'جس', 'جن', 'ہم', 'آپ', 'تم', 'مجھ', 'مگر', 'بلکہ', 'لیکن', 'والا',
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are'
]);

function extractKeywords(text = '') {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟۔،!«»"'\d]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !URDU_STOP_WORDS.has(w));
  return [...new Set(words)];
}

function calculateSimilarity(thoughtA, thoughtB) {
  if (!thoughtA || !thoughtB || thoughtA.id === thoughtB.id) return { score: 0, commonWords: [] };

  let score = 0;
  const commonWords = [];

  // Category match
  if (thoughtA.category && thoughtB.category && thoughtA.category === thoughtB.category) {
    score += 35;
  }

  // Extract keywords from subject + description
  const wordsA = extractKeywords(`${thoughtA.subject} ${thoughtA.description}`);
  const wordsB = new Set(extractKeywords(`${thoughtB.subject} ${thoughtB.description}`));

  wordsA.forEach((w) => {
    if (wordsB.has(w)) {
      score += 12;
      if (commonWords.length < 5) {
        commonWords.push(w);
      }
    }
  });

  // Normalize score between 0 and 100
  const normalizedScore = Math.min(Math.round(score), 99);
  return { score: normalizedScore, commonWords };
}

// Pre-defined Academic Thematic Strands
const THEMATIC_STRANDS = [
  {
    id: 'kufa',
    title: 'کوفہ کے مسافر و واقعۂ کربلا',
    subtitle: 'شخصیات، خطبات اور فکری مکالمات',
    icon: '🏛️',
    filter: (t) =>
      t.category === 'کوفہ کے مسافر' ||
      /کوفہ|حسین|کربلا|حر|زہیر|بریر|مسلم|میثم|ابن زیاد/.test(`${t.subject} ${t.description}`)
  },
  {
    id: 'ahlebait',
    title: 'سیدہ فاطمہ زہراؑ و سیرتِ اہل بیتؑ',
    subtitle: 'فدک، حقوق، احتجاج اور علی شریعتی کا تجزیہ',
    icon: '📜',
    filter: (t) =>
      /فاطمہ|زہرا|فدک|بتول|علی شریعتی.*فاطمہ|آلِ رسول/.test(`${t.subject} ${t.description}`)
  },
  {
    id: 'duas',
    title: 'ادعیہ، مناجات و زیاراتِ معصومینؑ',
    subtitle: 'روحانی سکون، حاجات اور توسل',
    icon: '🤲',
    filter: (t) =>
      t.category === 'Dua' ||
      t.category === 'زیاراتِ معصومینؑ' ||
      /دعا|مناجات|سورہ یس|زیارت|حاجت/.test(`${t.subject} ${t.description}`)
  },
  {
    id: 'philosophy',
    title: 'فلسفہ، سماجی شعور و فکرِ شریعتی',
    subtitle: 'معاشرہ، خود آگاہی، مذہب اور عدل',
    icon: '🧠',
    filter: (t) =>
      t.category === 'Philosophy' ||
      /شریعتی|فلسفہ|شعور|استحصال|معاشرہ|عقیدت|ضمیر/.test(`${t.subject} ${t.description}`)
  },
  {
    id: 'poetry',
    title: 'ادب، نعت و اردو شاعری',
    subtitle: 'اقبال، راحت اندوری اور کلاسیکی اشعار',
    icon: '✒️',
    filter: (t) =>
      t.category === 'Poetry' ||
      t.category === 'Religious Poetry' ||
      /شعر|شاعر|اقبال|غزل|مصرع/.test(`${t.subject} ${t.description}`)
  },
  {
    id: 'wisdom',
    title: 'اقوال، حکمت و اخلاقیات',
    subtitle: 'نہج البلاغہ اور بزرگانِ دین کی نصیحتیں',
    icon: '💡',
    filter: (t) =>
      t.category === 'اقوال' ||
      t.category === 'Quotes' ||
      /نہج البلاغہ|فرمان|نصیحت|عزت|دانائی/.test(`${t.subject} ${t.description}`)
  },
  {
    id: 'tech',
    title: 'عصری خیالات، AI و پرامپٹس',
    subtitle: 'مصنوعی ذہانت اور تحقیقی منصوبے',
    icon: '🌐',
    filter: (t) =>
      t.category === 'AI Projects' ||
      t.category === 'Prompts' ||
      /ai|prompt|cv|scholarship|grant/i.test(`${t.subject} ${t.description}`)
  }
];

export default function SimilarThoughtsView({
  thoughts = [],
  categories = [],
  formatDate,
  summarizeText,
  setSelectedThought,
  toggleFavorite,
  onCopyThought,
  onListenThought,
  activeSpeakingThoughtId,
  isLoadingAudio,
}) {
  const [selectedSeedId, setSelectedSeedId] = useState(() => thoughts[0]?.id || null);
  const [activeStrandId, setActiveStrandId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const selectedSeed = useMemo(() => {
    return thoughts.find((t) => t.id === selectedSeedId) || thoughts[0] || null;
  }, [thoughts, selectedSeedId]);

  // Compute similar thoughts for the selected seed
  const similarThoughts = useMemo(() => {
    if (!selectedSeed) return [];
    return thoughts
      .filter((t) => t.id !== selectedSeed.id)
      .map((t) => {
        const { score, commonWords } = calculateSimilarity(selectedSeed, t);
        return { thought: t, score, commonWords };
      })
      .filter((item) => item.score > 20)
      .sort((a, b) => b.score - a.score);
  }, [thoughts, selectedSeed]);

  // Thoughts filtered by active thematic strand
  const strandThoughts = useMemo(() => {
    if (!activeStrandId) return null;
    const strand = THEMATIC_STRANDS.find((s) => s.id === activeStrandId);
    if (!strand) return null;
    return thoughts.filter(strand.filter);
  }, [thoughts, activeStrandId]);

  const handleQuickCopy = (e, thought) => {
    e.stopPropagation();
    if (onCopyThought) {
      onCopyThought(thought);
      setCopiedId(thought.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const candidateThoughts = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return thoughts.slice(0, 40);
    return thoughts.filter((t) =>
      `${t.subject} ${t.description} ${t.category}`.toLowerCase().includes(q)
    );
  }, [thoughts, searchFilter]);

  return (
    <section className="similar-thoughts-page">
      {/* ── Page Masthead ── */}
      <div className="similar-masthead">
        <div>
          <p className="eyebrow">Thematic Analysis &amp; Relations</p>
          <h2>مماثل افکار و فکری ہم آہنگی</h2>
          <p className="similar-lead">
            علمی و فکری ذخیرے میں موجود مشترک موضوعات، تاریخی روابط اور فلسفیانہ مماثلتیں
          </p>
        </div>
        <div className="similar-stats-badge">
          <Layers size={16} />
          <span>{thoughts.length} مطبوعہ افکار</span>
        </div>
      </div>

      {/* ── Thematic Strands Navigation (موضوعاتی سلسلے) ── */}
      <div className="strands-section">
        <div className="strands-title-row">
          <h3>
            <Filter size={15} /> موضوعاتی زمرے (Curated Thematic Strands)
          </h3>
          {activeStrandId && (
            <button
              type="button"
              className="strand-clear-btn"
              onClick={() => setActiveStrandId(null)}
            >
              تمام افکار دکھائیں (Show All)
            </button>
          )}
        </div>
        <div className="strands-scroll-row">
          {THEMATIC_STRANDS.map((strand) => {
            const count = thoughts.filter(strand.filter).length;
            const isActive = activeStrandId === strand.id;
            return (
              <button
                key={strand.id}
                type="button"
                className={`strand-card ${isActive ? 'active' : ''}`}
                onClick={() => setActiveStrandId(isActive ? null : strand.id)}
              >
                <div className="strand-icon">{strand.icon}</div>
                <div className="strand-text">
                  <div className="strand-name">{strand.title}</div>
                  <div className="strand-sub">{strand.subtitle}</div>
                </div>
                <span className="strand-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── If a thematic strand is active, display its thoughts ── */}
      {activeStrandId && strandThoughts && (
        <div className="strand-results-panel">
          <div className="strand-results-header">
            <h4>
              {THEMATIC_STRANDS.find((s) => s.id === activeStrandId)?.title} ({strandThoughts.length} افکار)
            </h4>
          </div>
          <div className="article-list">
            {strandThoughts.map((thought) => (
              <div
                key={thought.id}
                className="article-card"
                onClick={() => setSelectedThought(thought)}
              >
                <div className="card-top-row">
                  <span className="article-meta">
                    <CalendarDays size={13} /> {formatDate(thought.entryDate || thought.createdAt)}
                  </span>
                  <div className="card-quick-actions">
                    <button
                      type="button"
                      className={`card-quick-btn copy-btn ${copiedId === thought.id ? 'active' : ''}`}
                      onClick={(e) => handleQuickCopy(e, thought)}
                      title="کاپی کریں"
                    >
                      {copiedId === thought.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button
                      type="button"
                      className={`card-quick-btn fav-btn ${thought.favorite ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(thought.id);
                      }}
                      title="پسندیدہ"
                    >
                      <Star size={15} className={thought.favorite ? 'filled' : ''} />
                    </button>
                  </div>
                </div>
                <strong className="article-title">{thought.subject || 'بلا عنوان'}</strong>
                <p className="article-excerpt">{summarizeText(thought.description, 160)}</p>
                <div className="card-bottom-row">
                  <span className="article-category-badge">
                    <Tag size={11} /> {thought.category}
                  </span>
                  <span className="article-open">
                    مطالعہ کریں <ChevronLeft size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Interactive Seed Selector & Similar Thoughts Engine ── */}
      <div className="similarity-workbench">
        <div className="workbench-header">
          <div className="workbench-title-block">
            <Link2 size={18} className="workbench-icon" />
            <div>
              <h3>فکری موازنہ و مماثلت (Thought Comparison Engine)</h3>
              <p>کوئی بھی فکر منتخب کریں تاکہ اس کے مماثل، ہم خیال اور متعلقہ افکار تلاش کیے جا سکیں</p>
            </div>
          </div>

          {/* Seed Selector Search / Dropdown */}
          <div className="seed-selector-controls">
            <div className="seed-search-box">
              <Search size={15} />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="فکر تلاش کریں یا منتخب کریں..."
                dir="auto"
              />
            </div>
            <select
              className="seed-dropdown"
              value={selectedSeedId || ''}
              onChange={(e) => setSelectedSeedId(e.target.value)}
            >
              {candidateThoughts.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.subject?.slice(0, 48) || 'بلا عنوان'} ({t.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Seed Spotlight Card */}
        {selectedSeed && (
          <div className="seed-spotlight-card">
            <div className="spotlight-header">
              <span className="spotlight-tag">
                <Sparkles size={13} /> منتخب شدہ مرکزی فکر (Anchor Thought)
              </span>
              <span className="spotlight-category">{selectedSeed.category}</span>
            </div>
            <h4
              className="spotlight-title"
              style={{ fontFamily: getFontFamilyCss(selectedSeed.fontFamily) }}
            >
              {selectedSeed.subject || 'بلا عنوان'}
            </h4>
            <p
              className="spotlight-body"
              dir="auto"
              style={{ fontFamily: getFontFamilyCss(selectedSeed.fontFamily) }}
            >
              {selectedSeed.description}
            </p>
            <div className="spotlight-footer">
              <span className="spotlight-date">
                <CalendarDays size={13} /> {formatDate(selectedSeed.entryDate || selectedSeed.createdAt)}
              </span>
              <div className="spotlight-actions">
                <button
                  type="button"
                  className="spotlight-btn"
                  onClick={() => setSelectedThought(selectedSeed)}
                >
                  پورا مطالعہ کریں <ChevronLeft size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Similar Results List */}
        <div className="similar-results-container">
          <div className="similar-results-heading">
            <h4>
              اس فکر سے ہم آہنگ و مماثل افکار ({similarThoughts.length} نتائج)
            </h4>
            <span className="similarity-legend">
              مماثلت کی شرح مشترک موضوع اور کلیدی اصطلاحات پر مبنی ہے
            </span>
          </div>

          {similarThoughts.length === 0 ? (
            <div className="empty-state">
              <Sparkles size={22} />
              <p>اس فکر سے ملتی جلتی کوئی دوسری فکر تلاش نہیں کی جا سکی۔ کوئی دوسری فکر منتخب کیجیے۔</p>
            </div>
          ) : (
            <div className="similar-grid">
              {similarThoughts.map(({ thought, score, commonWords }) => {
                const isSpeakingThis = activeSpeakingThoughtId === thought.id;
                const isLoadingThis = isSpeakingThis && isLoadingAudio;

                return (
                  <div
                    key={thought.id}
                    className="similar-card"
                    onClick={() => setSelectedThought(thought)}
                  >
                    <div className="similar-card-header">
                      <div className="similarity-badge">
                        <span className="score-number">{score}%</span>
                        <span className="score-label">مماثلت</span>
                      </div>
                      <span className="article-meta">
                        <CalendarDays size={12} /> {formatDate(thought.entryDate || thought.createdAt)}
                      </span>
                    </div>

                    <strong
                      className="similar-card-title"
                      style={{ fontFamily: getFontFamilyCss(thought.fontFamily) }}
                    >
                      {thought.subject || 'بلا عنوان'}
                    </strong>

                    <p
                      className="similar-card-excerpt"
                      dir="auto"
                      style={{ fontFamily: getFontFamilyCss(thought.fontFamily) }}
                    >
                      {summarizeText(thought.description, 160)}
                    </p>

                    {/* Common Words Tags */}
                    {commonWords.length > 0 && (
                      <div className="common-keywords-row">
                        <span className="keywords-label">مشترک الفاظ:</span>
                        {commonWords.map((word, idx) => (
                          <span key={idx} className="keyword-chip">
                            {word}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="card-bottom-row">
                      <span className="article-category-badge">
                        <Tag size={11} /> {thought.category}
                      </span>
                      <div className="card-quick-actions">
                        <button
                          type="button"
                          className={`card-quick-btn copy-btn ${copiedId === thought.id ? 'active' : ''}`}
                          onClick={(e) => handleQuickCopy(e, thought)}
                          title="کاپی کریں"
                        >
                          {copiedId === thought.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <button
                          type="button"
                          className="similar-card-switch-seed"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSeedId(thought.id);
                            window.scrollTo({ top: 380, behavior: 'smooth' });
                          }}
                          title="اسے مرکزی فکر بنائیں"
                        >
                          مرکزی بنائیں ↺
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
