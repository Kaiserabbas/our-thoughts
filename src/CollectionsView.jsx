import React, { useState, useRef, useEffect } from 'react';
import { getFontFamilyCss } from './fontUtils';
import { generateSpiritualVoiceWav, triggerDownload } from './audioExporter';
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Heart,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

// Arabic / Urdu diacritic and character normalization
function normalizeUrduText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/[\u0649\u064A\u06D0\u06D2]/g, '\u06CC')
    .replace(/[\u0629\u06C1\u06C2]/g, '\u06C1')
    .toLowerCase();
}

function highlightMatches(text, query) {
  if (!text || typeof text !== 'string' || !query || !query.trim()) return text;
  const rawWords = query.trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return text;
  const escaped = rawWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="search-word-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function getSearchExcerpt(text, query, max = 160) {
  if (!text) return 'No description added yet.';
  const trimmed = text.trim();
  if (!query || !query.trim()) {
    return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
  }
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const lower = trimmed.toLowerCase();
  let firstIdx = -1;
  for (const w of words) {
    const idx = lower.indexOf(w);
    if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) {
      firstIdx = idx;
    }
  }
  if (firstIdx === -1 || firstIdx < max / 2) {
    return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
  }
  const start = Math.max(0, firstIdx - 40);
  const end = Math.min(trimmed.length, start + max);
  return `${start > 0 ? '... ' : ''}${trimmed.slice(start, end)}${end < trimmed.length ? ' ...' : ''}`;
}

export default function CollectionsView({
  categories,
  thoughts,
  collectionSearchQuery,
  setCollectionSearchQuery,
  collectionSelectedCategory,
  setCollectionSelectedCategory,
  collectionFavoritesOnly,
  setCollectionFavoritesOnly,
  formatDate,
  summarizeText,
  setSelectedThought,
  toggleFavorite,
  onRequestDeleteThought,
  onAddThought,
  onCopyThought,
  onListenThought,
  activeSpeakingThoughtId,
  isLoadingAudio,
  onRequireGeminiKey,
}) {
  const [copiedId,    setCopiedId]    = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const categoryTabsRef = useRef(null);
  const searchInputRef = useRef(null);

  // Global hotkey: Ctrl+K or / to focus search input instantly
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (collectionSearchQuery) {
          setCollectionSearchQuery('');
        } else {
          searchInputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collectionSearchQuery, setCollectionSearchQuery]);

  const scrollCategoryTabs = (direction) => {
    if (categoryTabsRef.current) {
      const scrollOffset = direction === 'left' ? -280 : 280;
      categoryTabsRef.current.scrollBy({ left: scrollOffset, behavior: 'smooth' });
    }
  };

  const trimmedQuery = collectionSearchQuery.trim();
  const normalizedWords = normalizeUrduText(trimmedQuery)
    .split(/\s+/)
    .filter(Boolean);

  const handleQuickCopy = (e, thought) => {
    e.stopPropagation();
    if (onCopyThought) {
      onCopyThought(thought);
      setCopiedId(thought.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const handleExportAudio = async (e, thought) => {
    e.stopPropagation();
    if (exportingId === thought.id) return;
    setExportingId(thought.id);
    const fullText = `${thought.subject ? thought.subject + '. ' : ''}${thought.description || ''}`.trim();
    if (!fullText) { setExportingId(null); return; }
    try {
      const wavBlob = await generateSpiritualVoiceWav(fullText);
      const safeName = (thought.subject || 'thought').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_').slice(0, 50);
      triggerDownload(wavBlob, `${safeName}-spiritual-voice.wav`);
    } catch (err) {
      if (err.code === 'MISSING_GEMINI_KEY' || err.message?.includes('Gemini API key')) {
        if (onRequireGeminiKey) onRequireGeminiKey();
      }
    }
    setExportingId(null);
  };

  // Robust multi-word search with diacritic-tolerant matching across subject, body, category, and author
  const baseFiltered = [...thoughts]
    .sort((left, right) => Number(right.createdAt || right.timestamp || 0) - Number(left.createdAt || left.timestamp || 0))
    .filter((thought) => {
      const haystack = normalizeUrduText(
        `${thought.subject || ''} ${thought.description || ''} ${thought.category || ''} ${thought.author || ''}`
      );
      const matchesQuery =
        normalizedWords.length === 0 ||
        normalizedWords.every((word) => haystack.includes(word));
      const matchesFavorite = !collectionFavoritesOnly || thought.favorite;
      return matchesQuery && matchesFavorite;
    });

  // Apply category filter
  const visibleThoughts = collectionSelectedCategory === 'All'
    ? baseFiltered
    : baseFiltered.filter((thought) => thought.category === collectionSelectedCategory);

  // Count thoughts per category
  const categoryCounts = {};
  for (const cat of categories) {
    categoryCounts[cat] = baseFiltered.filter((t) => t.category === cat).length;
  }
  const favoritesCount = baseFiltered.filter((t) => t.favorite).length;

  // Group by category for "All" view
  const groupedCollections = categories
    .map((category) => {
      const items = visibleThoughts.filter((thought) => thought.category === category);
      return { category, items };
    })
    .filter((group) => group.items.length > 0);

  const totalFavorites = thoughts.filter((thought) => thought.favorite).length;

  const renderThoughtCard = (thought) => {
    const isCustomColor = thought.cardColor && thought.cardColor.startsWith('#');
    const cardColorClass = isCustomColor ? '' : `card-color-${thought.cardColor || 'default'}`;
    const isSpeakingThis = activeSpeakingThoughtId === thought.id;
    const isLoadingThis = isSpeakingThis && isLoadingAudio;

    return (
      <div
        key={thought.id}
        className={`article-card ${cardColorClass}`}
        style={isCustomColor ? { backgroundColor: thought.cardColor } : undefined}
        onClick={() => setSelectedThought(thought)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setSelectedThought(thought);
          }
        }}
      >
        <div className="card-top-row">
          <div className="card-top-left-badges">
            <span className="card-category-badge">
              <Tag size={12} />
              <span>{thought.category || 'متفرق'}</span>
            </span>
            {thought.author && (
              <span className="card-author-badge" title="مصنف / قلم کار">
                <User size={11} />
                <span>{highlightMatches(thought.author, trimmedQuery)}</span>
              </span>
            )}
          </div>
          <div className="card-quick-actions">
            {/* Quick Listen in Spiritual Voice (Gemini TTS) */}
            <button
              type="button"
              className={`card-quick-btn listen-btn ${isSpeakingThis ? 'active' : ''} ${isLoadingThis ? 'loading' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onListenThought) onListenThought(thought);
              }}
              title={
                isLoadingThis
                  ? 'Generating Gemini spiritual voice...'
                  : isSpeakingThis
                  ? 'Stop listening'
                  : 'Listen in spiritual voice (Gemini TTS)'
              }
              aria-label="Listen to thought"
            >
              {isLoadingThis ? (
                <Loader2 size={14} className="spin-icon" />
              ) : isSpeakingThis ? (
                <VolumeX size={14} />
              ) : (
                <Volume2 size={14} />
              )}
            </button>

            {/* Quick Copy */}
            <button
              type="button"
              className={`card-quick-btn copy-btn ${copiedId === thought.id ? 'active' : ''}`}
              onClick={(e) => handleQuickCopy(e, thought)}
              title={copiedId === thought.id ? 'Copied!' : 'Copy post'}
              aria-label="Copy post"
            >
              {copiedId === thought.id ? <Check size={14} className="copied-check" /> : <Copy size={14} />}
            </button>

            {/* Favorite */}
            <button
              type="button"
              className={`card-quick-btn fav-btn ${thought.favorite ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(thought.id);
              }}
              title={thought.favorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label="Toggle favorite"
            >
              <Star size={15} className={thought.favorite ? 'filled' : ''} />
            </button>

            {/* Delete */}
            <button
              type="button"
              className="card-quick-btn del-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDeleteThought(thought);
              }}
              title="Delete thought"
              aria-label="Delete thought"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Enhanced Heading with generous padding */}
        <strong
          className="article-title"
          style={{ fontFamily: getFontFamilyCss(thought.fontFamily) }}
        >
          {highlightMatches(thought.subject || 'Untitled thought', trimmedQuery)}
        </strong>

        <p
          className="article-excerpt"
          dir="auto"
          style={{
            textAlign: thought.descriptionAlign || 'right',
            color: thought.textColor || undefined,
            fontWeight: thought.isBold ? '700' : undefined,
            fontStyle: thought.isItalic ? 'italic' : undefined,
            fontFamily: getFontFamilyCss(thought.fontFamily),
          }}
        >
          {highlightMatches(
            getSearchExcerpt(thought.description, trimmedQuery, 160),
            trimmedQuery
          )}
        </p>

        <div className="card-bottom-row">
          <div className="card-bottom-left">
            <span className="article-meta">
              <CalendarDays size={12} /> {formatDate(thought.entryDate || thought.createdAt || thought.timestamp)}
            </span>
            {thought.description && (
              <span className="article-word-count">
                {thought.description.trim().split(/\s+/).length} الفاظ
              </span>
            )}
          </div>

          <div className="card-bottom-right">
            {/* Export Audio button (Icon button) */}
            <button
              type="button"
              className={`card-export-audio-btn icon-only ${exportingId === thought.id ? 'exporting' : ''}`}
              onClick={(e) => handleExportAudio(e, thought)}
              disabled={exportingId === thought.id}
              title={exportingId === thought.id ? 'آڈیو تیار ہو رہی ہے...' : 'آڈیو محفوظ کریں (.wav)'}
              aria-label="Export audio"
            >
              <Download size={13} />
            </button>

            <span className="article-open-pill" title="مطالعہ فکر (Read thought)">
              <span>مطالعہ</span>
              <ChevronLeft size={13} />
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="collections-page">
      <div className="collections-heading">
        <div>
          <p className="eyebrow">Home</p>
          <h2>Thought collections</h2>
        </div>
        <div className="collection-counts" aria-label="Collection counts">
          <span>
            <BookOpen size={15} /> {thoughts.length} thoughts
          </span>
          <span>
            <Tag size={15} /> {categories.length} collections
          </span>
          <span>
            <Heart size={15} /> {totalFavorites} favorites
          </span>
        </div>
      </div>

      {/* ── Category Tabs with Scroll Controls ── */}
      <div className="category-scroll-container">
        <button
          type="button"
          className="category-scroll-arrow left"
          onClick={() => scrollCategoryTabs('left')}
          title="پچھلے موضوعات (Scroll Left)"
          aria-label="Scroll categories left"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="category-tabs" ref={categoryTabsRef} role="tablist" aria-label="Filter by category">
          <button
            type="button"
            role="tab"
            aria-selected={collectionSelectedCategory === 'All' && !collectionFavoritesOnly}
            className={`category-tab ${collectionSelectedCategory === 'All' && !collectionFavoritesOnly ? 'active' : ''}`}
            onClick={() => { setCollectionSelectedCategory('All'); setCollectionFavoritesOnly(false); }}
          >
            <BookOpen size={14} />
            تمام افکار
            <span className="tab-count">{baseFiltered.length}</span>
          </button>

          {categories.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={collectionSelectedCategory === category && !collectionFavoritesOnly}
              className={`category-tab ${collectionSelectedCategory === category && !collectionFavoritesOnly ? 'active' : ''}`}
              onClick={() => { setCollectionSelectedCategory(category); setCollectionFavoritesOnly(false); }}
            >
              <Tag size={13} />
              {category}
              <span className="tab-count">{categoryCounts[category] || 0}</span>
            </button>
          ))}

          <button
            type="button"
            role="tab"
            aria-selected={collectionFavoritesOnly}
            className={`category-tab tab-favorites ${collectionFavoritesOnly ? 'active' : ''}`}
            onClick={() => { setCollectionFavoritesOnly(true); setCollectionSelectedCategory('All'); }}
          >
            <Star size={13} />
            پسندیدہ
            <span className="tab-count">{favoritesCount}</span>
          </button>
        </div>

        <button
          type="button"
          className="category-scroll-arrow right"
          onClick={() => scrollCategoryTabs('right')}
          title="اگلے موضوعات (Scroll Right)"
          aria-label="Scroll categories right"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Search Bar & Convenient Word Discovery ── */}
      <div className="collections-toolbar">
        <div className="search-box-row">
          <label className="search-box">
            <Search size={16} className="search-box-icon" />
            <input
              ref={searchInputRef}
              value={collectionSearchQuery}
              onChange={(event) => setCollectionSearchQuery(event.target.value)}
              placeholder="تلاش کریں... لفظ، عنوان، مصنف، یا مفہوم (Search thoughts, words, authors...)"
              dir="auto"
            />
            {collectionSearchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  setCollectionSearchQuery('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                title="تلاش صاف کریں (Clear search)"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
            <kbd className="search-kbd-hint" title="Press Ctrl+K or / to search">Ctrl K</kbd>
          </label>
        </div>

        {/* Quick Word Discovery Chips */}
        <div className="search-quick-tags" role="region" aria-label="Quick search terms">
          <span className="search-tags-label">
            <Sparkles size={12} />
            <span>تجویز کردہ الفاظ:</span>
          </span>
          <div className="search-tag-pills">
            {['کوفہ', 'شریعتی', 'نہج البلاغہ', 'دعا', 'عشق', 'علم', 'فاطمہؑ', 'حکمت'].map((kw) => (
              <button
                key={kw}
                type="button"
                className={`search-tag-chip ${collectionSearchQuery.includes(kw) ? 'active' : ''}`}
                onClick={() => {
                  if (collectionSearchQuery === kw) {
                    setCollectionSearchQuery('');
                  } else {
                    setCollectionSearchQuery(kw);
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }
                }}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {thoughts.length === 0 ? (
        <div className="empty-state">
          <Sparkles size={20} />
          <p>No thoughts saved yet.</p>
          <button type="button" className="primary-button" onClick={onAddThought}>
            <Plus size={14} /> Add Thought
          </button>
        </div>
      ) : visibleThoughts.length === 0 ? (
        <div className="empty-state">
          <Search size={26} />
          <p className="empty-title">
            {trimmedQuery ? (
              <>
                <strong>"{trimmedQuery}"</strong> کے لیے کوئی فکر نہیں ملا۔
              </>
            ) : (
              'اس زمرے میں کوئی فکر دستیاب نہیں ہے۔'
            )}
          </p>
          <p className="empty-desc">
            مختلف الفاظ یا املا کے ساتھ دوبارہ تلاش کریں، یا تمام کیٹیگریز دیکھیں۔
          </p>
          <div className="empty-actions">
            {collectionSelectedCategory !== 'All' && trimmedQuery && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCollectionSelectedCategory('All')}
              >
                تمام موضوعات میں تلاش کریں
              </button>
            )}
            {trimmedQuery && (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setCollectionSearchQuery('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
              >
                <X size={14} />
                <span>تلاش صاف کریں</span>
              </button>
            )}
          </div>
        </div>
      ) : trimmedQuery ? (
        /* ── Active Search Results: show ALL matching thoughts without 2-item truncation ── */
        <section className="single-category-view search-results-view">
          <div className="section-title-row search-results-title-row">
            <div className="search-results-heading">
              <Search size={18} />
              <h2>
                <span>تلاش کے نتائج:</span>
                <span className="search-query-badge">"{trimmedQuery}"</span>
              </h2>
            </div>
            <div className="search-results-actions">
              <span className="search-count-badge">
                {visibleThoughts.length} {visibleThoughts.length === 1 ? 'فکر ملا' : 'افکار ملے'}
              </span>
              <button
                type="button"
                className="search-clear-inline-btn"
                onClick={() => {
                  setCollectionSearchQuery('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                title="تلاش بند کریں"
              >
                <X size={14} />
                <span>صاف کریں</span>
              </button>
            </div>
          </div>
          <div className="article-list">
            {visibleThoughts.map((thought) => renderThoughtCard(thought))}
          </div>
        </section>
      ) : collectionSelectedCategory !== 'All' || collectionFavoritesOnly ? (
        /* ── Single category or favorites: flat grid, ALL thoughts ── */
        <section className="single-category-view">
          <div className="section-title-row">
            <h2>
              {collectionFavoritesOnly ? '★ Favorites' : collectionSelectedCategory}
            </h2>
            <span>{visibleThoughts.length} {visibleThoughts.length === 1 ? 'thought' : 'thoughts'}</span>
          </div>
          <div className="article-list">
            {visibleThoughts.map((thought) => renderThoughtCard(thought))}
          </div>
        </section>
      ) : (
        /* ── All categories: grouped sections, 2 thoughts each then ...more ── */
        <div className="collection-section-grid">
          {groupedCollections.map((group) => {
            const displayedItems = group.items.slice(0, 2);
            const remainingCount = group.items.length - 2;

            return (
              <section key={group.category} className="collection-section">
                <div className="collection-title-row">
                  <h2>{group.category}</h2>
                  <span>
                    {group.items.length} {group.items.length === 1 ? 'thought' : 'thoughts'}
                  </span>
                </div>
                <div className="article-grid">
                  {displayedItems.map((thought) => renderThoughtCard(thought))}
                </div>
                {remainingCount > 0 && (
                  <div className="category-more-row">
                    <button
                      type="button"
                      className="category-more-link"
                      onClick={() => {
                        setCollectionSelectedCategory(group.category);
                        setCollectionFavoritesOnly(false);
                      }}
                    >
                      ...more ({remainingCount} more)
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
