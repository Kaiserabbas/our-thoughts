import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getFontFamilyCss } from './fontUtils';
import { generateSpiritualVoiceWav, triggerDownload } from './audioExporter';
import { CATEGORY_TAXONOMY, getSubcategoriesForMainCategory } from './categoryTaxonomy';
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Heart,
  Loader2,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Shuffle,
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
  const trimmed = text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!trimmed) return 'No description added yet.';
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
  customSubcategories = [],
  collectionSearchQuery,
  setCollectionSearchQuery,
  collectionSelectedCategory,
  setCollectionSelectedCategory,
  collectionFavoritesOnly,
  setCollectionFavoritesOnly,
  collectionRecentOnly = false,
  setCollectionRecentOnly,
  collectionSelectedSubcategory = 'All',
  setCollectionSelectedSubcategory,
  formatDate,
  summarizeText,
  setSelectedThought,
  toggleFavorite,
  togglePinned,
  toggleArchived,
  onBulkUpdate,
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
  const [openMenuId,  setOpenMenuId]  = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = () => setOpenMenuId(null);
    const onKey = (e) => { if (e.key === 'Escape') setOpenMenuId(null); };
    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenuId]);

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
    const cleanDesc = (thought.description || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    const fullText = `${thought.subject ? thought.subject + '. ' : ''}${cleanDesc}`.trim();
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

  // Sort mode for the collection view
  const [sortBy, setSortBy] = useState('newest');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSubcategory, setBulkSubcategory] = useState('');

  const getThoughtTime = (thought) => {
    const raw = thought?.createdAt || thought?.timestamp;
    if (raw) return Number(raw) || 0;
    if (thought?.entryDate) {
      const parsed = Date.parse(thought.entryDate);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return 0;
  };

  const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
  const nowTs = Date.now();

  // Robust multi-word search with diacritic-tolerant matching across subject, body, category, and author
  const filteredThoughts = [...thoughts].filter((thought) => {
    const cleanDesc = (thought.description || '').replace(/<[^>]*>/g, ' ');
    const haystack = normalizeUrduText(
      `${thought.subject || ''} ${cleanDesc} ${thought.category || ''} ${thought.subcategory || ''} ${Array.isArray(thought.tags) ? thought.tags.join(' ') : ''} ${thought.author || ''}`
    );
    const matchesQuery =
      normalizedWords.length === 0 ||
      normalizedWords.every((word) => haystack.includes(word));
    const matchesFavorite = !collectionFavoritesOnly || thought.favorite;
    const matchesRecent =
      !collectionRecentOnly || nowTs - getThoughtTime(thought) <= RECENT_WINDOW_MS;
    const matchesSubcategory =
      collectionSelectedSubcategory === 'All' ||
      thought.subcategory === collectionSelectedSubcategory;
    const matchesArchive = showArchived ? thought.archived : !thought.archived;
    return matchesQuery && matchesFavorite && matchesRecent && matchesSubcategory && matchesArchive;
  });

  // Apply category filter — match on thought.category OR fall back to legacy category name
  const visibleThoughts = (collectionSelectedCategory === 'All'
    ? filteredThoughts
    : filteredThoughts.filter(
        (thought) =>
          thought.category === collectionSelectedCategory ||
          thought.legacyCategory === collectionSelectedCategory
      )
  ).sort((left, right) => {
    if (sortBy === 'oldest') return getThoughtTime(left) - getThoughtTime(right);
    if (sortBy === 'title')
      return String(left.subject || '').localeCompare(String(right.subject || ''), undefined, { sensitivity: 'base' });
    return getThoughtTime(right) - getThoughtTime(left);
  });

  // baseFiltered kept for counts/back-compat (newest first)
  const baseFiltered = [...filteredThoughts].sort(
    (left, right) => getThoughtTime(right) - getThoughtTime(left)
  );

  // Count thoughts per category
  const categoryCounts = {};
  for (const cat of categories) {
    categoryCounts[cat] = baseFiltered.filter((t) => t.category === cat).length;
  }
  const favoritesCount = baseFiltered.filter((t) => t.favorite).length;
  const recentCount = thoughts.filter((t) => nowTs - getThoughtTime(t) <= RECENT_WINDOW_MS).length;

  // Group by category for "All" view
  const groupedCollections = categories
    .map((category) => {
      const items = visibleThoughts.filter((thought) => thought.category === category);
      return { category, items };
    })
    .filter((group) => group.items.length > 0);

  const totalFavorites = thoughts.filter((thought) => thought.favorite).length;
  const totalPinned = thoughts.filter((thought) => thought.pinned).length;

  // Extract most frequently used meaningful words from thoughts for quick-search chips
  const suggestedKeywords = useMemo(() => {
    const STOP_WORDS = new Set([
      'اور', 'کے', 'کی', 'کا', 'کو', 'سے', 'میں', 'ہے', 'ہیں', 'تھا', 'تھی', 'تھے',
      'پر', 'نے', 'جو', 'کہ', 'اس', 'ان', 'یہ', 'وہ', 'بھی', 'تو', 'ہی', 'نہیں',
      'ہو', 'کر', 'کیا', 'ایک', 'لیے', 'لئے', 'گیا', 'گئی', 'گئے', 'جب', 'تب', 'اگر',
      'مگر', 'لیکن', 'پھر', 'سب', 'اپنے', 'اپنی', 'اپنا', 'کرتے', 'ہوتے', 'ہوتی', 'ہوتا',
      'والے', 'والی', 'والا', 'رہے', 'رہی', 'رہا', 'ہوئے', 'ہوئی', 'ہوا', 'تک', 'بعد',
      'پہلے', 'ساتھ', 'طرح', 'بارے', 'یہاں', 'وہاں', 'کچھ', 'کوئی', 'کسی', 'کیوں', 'کیسے',
      'جہاں', 'وہی', 'اسی', 'ہم', 'تم', 'آپ', 'مجھے', 'ہمیں', 'انہیں', 'انھیں', 'انہوں',
      'جن', 'جنہیں', 'جس', 'جسے', 'کرنا', 'ہونا', 'دیا', 'دی', 'دے', 'لیا', 'لی', 'لیں',
      'رکھ', 'بنا', 'جاتا', 'جاتی', 'جاتے', 'سکتا', 'سکتی', 'سکتے', 'چاہیے', 'وغیرہ',
      'the', 'and', 'for', 'that', 'with', 'this', 'from', 'are', 'was', 'were', 'have',
      'has', 'had', 'not', 'but', 'you', 'your', 'all', 'can', 'will', 'just', 'into',
      'more', 'also', 'than', 'then', 'about', 'what', 'when', 'where', 'which', 'who',
      'why', 'how', 'its', 'their', 'they', 'them', 'been', 'being', 'would', 'could',
      'should', 'untitled', 'thought', 'nbsp',
    ]);

    const pool = collectionSelectedCategory !== 'All' && !collectionFavoritesOnly && !collectionRecentOnly
      ? thoughts.filter((t) => !t.archived && (t.category === collectionSelectedCategory || t.legacyCategory === collectionSelectedCategory))
      : thoughts.filter((t) => !t.archived);
    const source = pool.length > 0 ? pool : thoughts;

    const counts = new Map();
    for (const thought of source) {
      const cleanDesc = (thought.description || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ');
      const text = `${thought.subject || ''} ${cleanDesc} ${Array.isArray(thought.tags) ? thought.tags.join(' ') : ''}`;
      const tokens = text
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/);

      // Count unique words per thought + frequency so one long post doesn't monopolize chips
      const seenInThought = new Set();
      for (const raw of tokens) {
        const word = raw.trim();
        const lower = word.toLowerCase();
        if (word.length < 3 || /^\d+$/.test(word) || STOP_WORDS.has(lower)) continue;
        if (!seenInThought.has(lower)) {
          seenInThought.add(lower);
          const entry = counts.get(lower);
          counts.set(lower, { display: entry?.display || word, count: (entry?.count || 0) + 1 });
        }
      }
    }

    const top = Array.from(counts.values())
      .filter((item) => item.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((item) => item.display);

    return top.length > 0
      ? top
      : ['کوفہ', 'شریعتی', 'نہج البلاغہ', 'دعا', 'عشق', 'علم', 'فاطمہؑ', 'حکمت'];
  }, [thoughts, collectionSelectedCategory, collectionFavoritesOnly, collectionRecentOnly]);

  const renderThoughtCard = (thought) => {
    const isCustomColor = thought.cardColor && thought.cardColor.startsWith('#');
    const cardColorClass = isCustomColor ? '' : `card-color-${thought.cardColor || 'default'}`;
    const isSpeakingThis = activeSpeakingThoughtId === thought.id;
    const isLoadingThis = isSpeakingThis && isLoadingAudio;

    return (
      <div
        key={thought.id}
        className={`article-card ${cardColorClass} ${openMenuId === thought.id ? 'menu-open' : ''}`}
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
            <input
              type="checkbox"
              className="card-select-checkbox"
              checked={selectedIds.includes(thought.id)}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                event.stopPropagation();
                setSelectedIds((current) =>
                  event.target.checked
                    ? [...new Set([...current, thought.id])]
                    : current.filter((id) => id !== thought.id)
                );
              }}
              aria-label={`Select ${thought.subject || 'thought'}`}
            />
            <span className="card-category-breadcrumb" title={`${thought.category || 'متفرق'}${thought.subcategory ? ` › ${thought.subcategory}` : ''}`}>
              <Tag size={11} className="breadcrumb-icon" />
              <span className="breadcrumb-main">{thought.category || 'متفرق'}</span>
              {thought.subcategory && (
                <>
                  <span className="breadcrumb-sep" aria-hidden="true">›</span>
                  <span className="breadcrumb-sub">{thought.subcategory}</span>
                </>
              )}
            </span>
            {thought.pinned && (
              <span className="card-pinned-indicator" title="Pinned thought">
                <Pin size={11} />
              </span>
            )}
          </div>

          <div className="card-quick-actions" onClick={(e) => e.stopPropagation()}>
            {/* Quick Listen (Gemini TTS) */}
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
              <Star size={14} className={thought.favorite ? 'filled' : ''} />
            </button>

            {/* Overflow More Actions Menu */}
            <div className="card-more-wrapper">
              <button
                type="button"
                className={`card-quick-btn more-btn ${openMenuId === thought.id ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId((cur) => (cur === thought.id ? null : thought.id));
                }}
                title="More actions"
                aria-label="More actions"
                aria-expanded={openMenuId === thought.id}
              >
                <MoreHorizontal size={15} />
              </button>

              {openMenuId === thought.id && (
                <div className="card-more-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    role="menuitem"
                    className="card-more-item"
                    onClick={(e) => {
                      handleQuickCopy(e, thought);
                      setOpenMenuId(null);
                    }}
                  >
                    {copiedId === thought.id ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedId === thought.id ? 'Copied!' : 'Copy thought'}</span>
                  </button>

                  {togglePinned && (
                    <button
                      type="button"
                      role="menuitem"
                      className="card-more-item"
                      onClick={() => {
                        togglePinned(thought.id);
                        setOpenMenuId(null);
                      }}
                    >
                      <Pin size={14} />
                      <span>{thought.pinned ? 'Unpin' : 'Pin to top'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    className="card-more-item"
                    disabled={exportingId === thought.id}
                    onClick={(e) => {
                      handleExportAudio(e, thought);
                      setOpenMenuId(null);
                    }}
                  >
                    <Download size={14} />
                    <span>{exportingId === thought.id ? 'Exporting audio…' : 'Export audio (.wav)'}</span>
                  </button>

                  {toggleArchived && (
                    <button
                      type="button"
                      role="menuitem"
                      className="card-more-item"
                      onClick={() => {
                        toggleArchived(thought.id);
                        setOpenMenuId(null);
                      }}
                    >
                      <Download size={14} />
                      <span>{thought.archived ? 'Restore from archive' : 'Archive'}</span>
                    </button>
                  )}

                  <div className="card-more-divider" />

                  <button
                    type="button"
                    role="menuitem"
                    className="card-more-item danger"
                    onClick={() => {
                      setOpenMenuId(null);
                      onRequestDeleteThought(thought);
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Heading with generous padding — Jameel Noori font */}
        <strong
          className="article-title"
          style={{ fontFamily: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Georgia, serif" }}
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

        {Array.isArray(thought.tags) && thought.tags.length > 0 && (
          <div className="card-tags-row">
            {thought.tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                type="button"
                className="card-tag-pill"
                onClick={(e) => { e.stopPropagation(); setCollectionSearchQuery(tag); }}
                title={`تلاش: ${tag}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="card-bottom-row">
          <div className="card-bottom-left card-meta-line">
            {thought.author && (
              <span className="card-meta-author" title="مصنف / قلم کار">
                <User size={12} />
                <span>{highlightMatches(thought.author, trimmedQuery)}</span>
              </span>
            )}
            <span className="card-meta-dot" aria-hidden="true">·</span>
            <span className="article-meta">
              <CalendarDays size={12} /> {formatDate(thought.entryDate || thought.createdAt || thought.timestamp)}
            </span>
            {thought.description && (
              <>
                <span className="card-meta-dot" aria-hidden="true">·</span>
                <span className="article-word-count">
                  {thought.description.trim().split(/\s+/).length} الفاظ
                </span>
              </>
            )}
          </div>

          <div className="card-bottom-right">
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
      {/* ══════════════════════════════════════════════
          PAGE HEADER — title + quick stats
      ══════════════════════════════════════════════ */}
      <div className="collections-heading">
        <div className="collections-heading-left">
          <p className="eyebrow">Home</p>
          <h2>Thought Collections</h2>
        </div>
        <div className="collection-counts" aria-label="Collection counts">
          <span><BookOpen size={14} /> {thoughts.length} thoughts</span>
          <span><Heart size={14} /> {totalFavorites} favourites</span>
          <span><Pin size={14} /> {totalPinned} pinned</span>
          <button
            type="button"
            className="collection-random-btn"
            title="فکرِ اتفاقی — Random thought"
            aria-label="Random thought"
            onClick={() => {
              const pool = thoughts.filter((t) => !t.archived);
              if (!pool.length) return;
              setSelectedThought(pool[Math.floor(Math.random() * pool.length)]);
            }}
          >
            <Shuffle size={14} />
            <span>Random</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MAIN CATEGORY NAVBAR — with dropdown submenus
      ══════════════════════════════════════════════ */}
      <nav className="cat-navbar" aria-label="Browse by category">
        {/* ALL tab */}
        <div className="cat-nav-item">
          <button
            type="button"
            className={`cat-nav-btn ${collectionSelectedCategory === 'All' && !collectionFavoritesOnly && !collectionRecentOnly ? 'active' : ''}`}
            onClick={() => {
              setCollectionSelectedCategory('All');
              setCollectionFavoritesOnly(false);
              setCollectionRecentOnly(false);
              setCollectionSelectedSubcategory('All');
            }}
          >
            <BookOpen size={14} />
            <span>All</span>
            <span className="cat-nav-count">{baseFiltered.length}</span>
          </button>
        </div>

        {/* Main category tabs with dropdown */}
        {CATEGORY_TAXONOMY.map((taxCat) => {
          const catName = taxCat.name;
          const catCount = categoryCounts[catName] || 0;
          const isActive = collectionSelectedCategory === catName && !collectionFavoritesOnly && !collectionRecentOnly;
          const subs = getSubcategoriesForMainCategory(catName, customSubcategories);
          // sub-counts: thoughts in this cat that belong to each subcategory
          const subCounts = {};
          for (const s of subs) {
            subCounts[s] = thoughts.filter((t) => t.category === catName && t.subcategory === s && (!showArchived ? !t.archived : t.archived)).length;
          }
          return (
            <div key={catName} className="cat-nav-item cat-nav-has-sub">
              <button
                type="button"
                className={`cat-nav-btn${isActive ? ' active' : ''}${catCount === 0 ? ' cat-nav-empty' : ''}`}
                onClick={() => {
                  setCollectionSelectedCategory(catName);
                  setCollectionFavoritesOnly(false);
                  setCollectionRecentOnly(false);
                  setCollectionSelectedSubcategory('All');
                }}
              >
                <span className="cat-nav-icon">{taxCat.icon}</span>
                <span>{catName}</span>
                <span className="cat-nav-count">{catCount}</span>
                {subs.length > 0 && <ChevronRight size={11} className="cat-nav-chevron" />}
              </button>

              {/* Dropdown submenu */}
              {subs.length > 0 && (
                <div className="cat-nav-dropdown" role="menu">
                  <div className="cat-dropdown-header">
                    <span className="cat-nav-icon">{taxCat.icon}</span>
                    <strong>{catName}</strong>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    className={`cat-dropdown-item${isActive && collectionSelectedSubcategory === 'All' ? ' active' : ''}`}
                    onClick={() => {
                      setCollectionSelectedCategory(catName);
                      setCollectionFavoritesOnly(false);
                      setCollectionRecentOnly(false);
                      setCollectionSelectedSubcategory('All');
                    }}
                  >
                    <span>All in {catName}</span>
                    <span className="cat-dropdown-count">{catCount}</span>
                  </button>
                  {subs.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      role="menuitem"
                      className={`cat-dropdown-item${isActive && collectionSelectedSubcategory === sub ? ' active' : ''}`}
                      onClick={() => {
                        setCollectionSelectedCategory(catName);
                        setCollectionFavoritesOnly(false);
                        setCollectionRecentOnly(false);
                        setCollectionSelectedSubcategory(sub);
                      }}
                    >
                      <span>{sub}</span>
                      <span className="cat-dropdown-count">{subCounts[sub] ?? 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Favourites */}
        <div className="cat-nav-item">
          <button
            type="button"
            className={`cat-nav-btn tab-favorites${collectionFavoritesOnly ? ' active' : ''}`}
            onClick={() => { setCollectionFavoritesOnly(true); setCollectionSelectedCategory('All'); setCollectionRecentOnly(false); setCollectionSelectedSubcategory('All'); }}
          >
            <Star size={14} />
            <span>Favourites</span>
            <span className="cat-nav-count">{favoritesCount}</span>
          </button>
        </div>

        {/* Recent */}
        <div className="cat-nav-item">
          <button
            type="button"
            className={`cat-nav-btn tab-recent${collectionRecentOnly ? ' active' : ''}`}
            onClick={() => { setCollectionRecentOnly(true); setCollectionFavoritesOnly(false); setCollectionSelectedCategory('All'); setCollectionSelectedSubcategory('All'); }}
          >
            <Clock size={13} />
            <span>Recent</span>
            <span className="cat-nav-count">{recentCount}</span>
          </button>
        </div>
      </nav>

      {/* ── Active breadcrumb / subcategory pills ── */}
      {collectionSelectedCategory !== 'All' && !collectionFavoritesOnly && !collectionRecentOnly && (() => {
        const subs = getSubcategoriesForMainCategory(collectionSelectedCategory, customSubcategories);
        if (subs.length === 0) return null;
        return (
          <div className="subcategory-pill-strip" role="group" aria-label="Filter by subcategory">
            <span className="subcategory-strip-label"><Tag size={12} /> Subcategory:</span>
            <button
              type="button"
              className={`subcategory-pill ${collectionSelectedSubcategory === 'All' ? 'active' : ''}`}
              onClick={() => setCollectionSelectedSubcategory('All')}
            >
              All <span className="subcategory-pill-count">{visibleThoughts.length}</span>
            </button>
            {subs.map((sub) => {
              const cnt = visibleThoughts.filter((t) => t.subcategory === sub).length;
              return (
                <button
                  key={sub}
                  type="button"
                  className={`subcategory-pill ${collectionSelectedSubcategory === sub ? 'active' : ''}`}
                  onClick={() => setCollectionSelectedSubcategory(collectionSelectedSubcategory === sub ? 'All' : sub)}
                >
                  {sub}
                  {cnt > 0 && <span className="subcategory-pill-count">{cnt}</span>}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════
          SEARCH + SORT TOOLBAR
      ══════════════════════════════════════════════ */}
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
                onClick={() => { setCollectionSearchQuery(''); if (searchInputRef.current) searchInputRef.current.focus(); }}
                title="تلاش صاف کریں (Clear search)"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
            <kbd className="search-kbd-hint" title="Press Ctrl+K or / to search">Ctrl K</kbd>
          </label>

          {/* Sort + Archive inline with search */}
          <div className="toolbar-controls">
            <select
              className="collection-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort order"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
            </select>
            <button
              type="button"
              className={`secondary-button archive-filter-btn ${showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? 'Show active' : 'Show archive'}
            </button>
          </div>
        </div>

        {/* Quick Word Discovery Chips */}
        <div className="search-quick-tags" role="region" aria-label="Quick search terms">
          <span className="search-tags-label">
            <Sparkles size={12} />
            <span>تجویز کردہ الفاظ:</span>
          </span>
          <div className="search-tag-pills">
            {suggestedKeywords.map((kw) => (
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

      {onBulkUpdate && (
        <div className="bulk-management-bar" aria-label="Bulk thought management">
          <span className="bulk-bar-label">✎ Bulk Edit:</span>
          <label className="bulk-select-label">
            <input
              type="checkbox"
              checked={visibleThoughts.length > 0 && visibleThoughts.every((thought) => selectedIds.includes(thought.id))}
              onChange={(event) => setSelectedIds(
                event.target.checked ? visibleThoughts.map((thought) => thought.id) : []
              )}
            />
            Select visible
          </label>
          <span className="bulk-selected-count">{selectedIds.length} selected</span>
          <div className="bulk-category-group">
            <select
              value={bulkCategory}
              onChange={(event) => {
                setBulkCategory(event.target.value);
                setBulkSubcategory('');
              }}
              aria-label="Bulk main category"
            >
              <option value="">Move to category…</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            {bulkCategory && (
              <select
                value={bulkSubcategory}
                onChange={(event) => setBulkSubcategory(event.target.value)}
                aria-label="Bulk subcategory"
              >
                <option value="">Subcategory…</option>
                {getSubcategoriesForMainCategory(bulkCategory, customSubcategories)
                  .map((subcategory) => (
                    <option key={subcategory} value={subcategory}>{subcategory}</option>
                  ))}
              </select>
            )}
            <button
              type="button"
              className="secondary-button"
              disabled={!selectedIds.length || (!bulkCategory && !bulkSubcategory)}
              onClick={() => {
                const patch = {};
                if (bulkCategory) patch.category = bulkCategory;
                if (bulkSubcategory) patch.subcategory = bulkSubcategory;
                onBulkUpdate(selectedIds, patch);
                setSelectedIds([]);
              }}
            >
              Apply
            </button>
          </div>
          <button
            type="button"
            className="secondary-button"
            disabled={!selectedIds.length}
            onClick={() => {
              onBulkUpdate(selectedIds, { favorite: true });
              setSelectedIds([]);
            }}
          >
            ♥ Favorite
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!selectedIds.length}
            onClick={() => {
              onBulkUpdate(selectedIds, { archived: true });
              setSelectedIds([]);
            }}
          >
            Archive
          </button>
        </div>
      )}

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
      ) : collectionSelectedCategory !== 'All' || collectionFavoritesOnly || collectionRecentOnly ? (
        /* ── Single category or favorites: flat grid, ALL thoughts ── */
        <section className="single-category-view">
          <div className="section-title-row">
            <h2>
              {collectionRecentOnly ? '🕐 Recent Thoughts' : collectionFavoritesOnly ? '★ Favorites' : collectionSelectedCategory}
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
                      مزید {remainingCount} دیکھیں
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
