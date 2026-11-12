import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';
import { GoogleDriveService } from './googleDrive';
import CollectionsView from './CollectionsView';
import SimilarThoughtsView from './SimilarThoughtsView';
import SettingsView from './SettingsView';
import ConfirmModal from './ConfirmModal';
import GeminiKeyModal from './GeminiKeyModal';
import PostSoundPlayer from './PostSoundPlayer';
import VoicePanel from './VoicePanel';
import { useTTS } from './useTTS';
import { containsUrdu, formatEnglishSentence } from './useVoice';
import { useTranslate } from './useTranslate';
import initialData from './initialData.json';
import './App.css';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  Bold,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Clock,
  CloudLightning,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  Heart,
  Italic,
  Languages,
  Layers,
  List,
  Loader2,
  Lock,
  LogOut,
  Moon,
  Palette,
  Pencil,
  Pipette,
  Plus,
  Quote,
  RotateCw,
  Save,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  Sun,
  Tag,
  Trash2,
  Type,
  User,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import { getFontFamilyCss, getCategoriesByUsage, FONT_OPTIONS } from './fontUtils';

const CLIENT_ID = '574535920766-ntjn0mr37h07sd3l1n5c3o2j4na7bqok.apps.googleusercontent.com';
const DEFAULT_CATEGORIES = Array.isArray(initialData?.categories) && initialData.categories.length
  ? initialData.categories
  : ['Political', 'Religious', 'Poetry', 'Economics'];

const CARD_COLORS = [
  { id: 'default', label: 'Default', bg: '#ffffff' },
  { id: 'amber', label: 'Amber', bg: '#fffbeb' },
  { id: 'emerald', label: 'Emerald', bg: '#f0fdf4' },
  { id: 'blue', label: 'Sky Blue', bg: '#eff6ff' },
  { id: 'rose', label: 'Rose', bg: '#fff1f2' },
  { id: 'purple', label: 'Lavender', bg: '#faf5ff' },
  { id: 'indigo', label: 'Indigo', bg: '#eef2ff' },
  { id: 'teal', label: 'Teal', bg: '#f0fdfa' },
  { id: 'cyan', label: 'Cyan', bg: '#ecfeff' },
  { id: 'orange', label: 'Peach', bg: '#fff7ed' },
  { id: 'fuchsia', label: 'Fuchsia', bg: '#fdf4ff' },
  { id: 'slate', label: 'Slate', bg: '#f8fafc' },
];

const TEXT_COLORS = [
  { id: '', label: 'Default', color: '' },
  { id: '#dc2626', label: 'Ruby Red', color: '#dc2626' },
  { id: '#ea580c', label: 'Flame Orange', color: '#ea580c' },
  { id: '#d97706', label: 'Warm Amber', color: '#d97706' },
  { id: '#16a34a', label: 'Forest Green', color: '#16a34a' },
  { id: '#0d9488', label: 'Teal', color: '#0d9488' },
  { id: '#2563eb', label: 'Royal Blue', color: '#2563eb' },
  { id: '#4f46e5', label: 'Indigo', color: '#4f46e5' },
  { id: '#9333ea', label: 'Deep Purple', color: '#9333ea' },
  { id: '#c026d3', label: 'Fuchsia', color: '#c026d3' },
  { id: '#e11d48', label: 'Crimson Rose', color: '#e11d48' },
  { id: '#475569', label: 'Slate Gray', color: '#475569' },
];

function makeBlankForm(categories) {
  let defaultAuthor = 'Qaisar';
  try {
    defaultAuthor = localStorage.getItem('thought_organizer_default_author') || 'Qaisar';
  } catch {}
  return {
    subject: '',
    description: '',
    author: defaultAuthor,
    category: categories[0] || DEFAULT_CATEGORIES[0],
    entryDate: new Date().toISOString().slice(0, 10),
    favorite: false,
    descriptionAlign: 'right',
    textColor: '',
    fontFamily: '',
    cardColor: 'default',
    isBold: false,
    isItalic: false,
  };
}

function makeEditForm(thought, categories) {
  return {
    subject: thought?.subject || '',
    description: thought?.description || '',
    author: thought?.author || 'Qaisar',
    category: thought?.category || categories[0] || DEFAULT_CATEGORIES[0],
    entryDate: String(thought?.entryDate || new Date().toISOString().slice(0, 10)).slice(0, 10),
    favorite: Boolean(thought?.favorite),
    descriptionAlign: thought?.descriptionAlign || 'right',
    textColor: thought?.textColor || '',
    fontFamily: thought?.fontFamily || '',
    cardColor: thought?.cardColor || 'default',
    isBold: Boolean(thought?.isBold),
    isItalic: Boolean(thought?.isItalic),
  };
}

function normalizeCategories(categories) {
  const parsed = Array.isArray(categories) ? categories.filter(Boolean) : [];
  return parsed.length ? parsed : DEFAULT_CATEGORIES;
}

function normalizeSnapshot(payload) {
  if (!payload || typeof payload !== 'object') {
    return { thoughts: [], categories: DEFAULT_CATEGORIES, deletedThoughtIds: [] };
  }

  return {
    thoughts: Array.isArray(payload.thoughts) ? payload.thoughts : [],
    categories: normalizeCategories(payload.categories),
    deletedThoughtIds: Array.isArray(payload.deletedThoughtIds) ? payload.deletedThoughtIds : [],
  };
}

function formatDate(value) {
  if (!value) return 'No date';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
  return Promise.resolve();
}

function highlightSearchWords(node, query) {
  if (!query || !query.trim() || typeof node !== 'string') return node;
  const rawWords = query.trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return node;
  const escaped = rawWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = node.split(regex);
  if (parts.length <= 1) return node;
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

function parseInlineMarkdown(text, highlightQuery) {
  if (!text) return null;
  const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return <strong key={i}>{highlightSearchWords(token.slice(2, -2), highlightQuery)}</strong>;
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      return <em key={i}>{highlightSearchWords(token.slice(1, -1), highlightQuery)}</em>;
    }
    return highlightSearchWords(token, highlightQuery);
  });
}

function renderFormattedContent(text, highlightQuery) {
  if (!text) return 'No description added yet.';
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    let cleanLine = line;
    const isQuote = cleanLine.startsWith('> ');
    if (isQuote) cleanLine = cleanLine.slice(2);

    const isBullet = cleanLine.startsWith('• ') || cleanLine.startsWith('- ');
    if (isBullet) cleanLine = cleanLine.slice(2);

    return (
      <span
        key={idx}
        className={`content-line ${isQuote ? 'line-quote' : ''} ${isBullet ? 'line-bullet' : ''}`}
      >
        {isBullet && <span className="bullet-dot">• </span>}
        {parseInlineMarkdown(cleanLine, highlightQuery)}
        {idx < lines.length - 1 && <br />}
      </span>
    );
  });
}

function mergeThoughts(local, remote, deletedIds = []) {
  const deletedSet = new Set(deletedIds || []);
  const map = new Map();

  // Add remote thoughts first (unless deleted)
  (remote || []).forEach((thought) => {
    if (thought && thought.id && !deletedSet.has(thought.id)) {
      map.set(thought.id, { ...thought, author: thought.author || 'Qaisar' });
    }
  });

  // Merge local thoughts
  (local || []).forEach((thought) => {
    if (thought && thought.id && !deletedSet.has(thought.id)) {
      const existing = map.get(thought.id);
      if (!existing) {
        map.set(thought.id, { ...thought, author: thought.author || 'Qaisar' });
      } else {
        const localTime = Number(thought.updatedAt || thought.createdAt || thought.timestamp || 0);
        const existingTime = Number(existing.updatedAt || existing.createdAt || existing.timestamp || 0);
        if (localTime >= existingTime) {
          map.set(thought.id, { ...thought, author: thought.author || existing.author || 'Qaisar' });
        }
      }
    }
  });

  return Array.from(map.values()).sort((left, right) => {
    const leftTime = Number(left.createdAt || left.timestamp || 0);
    const rightTime = Number(right.createdAt || right.timestamp || 0);
    return rightTime - leftTime;
  });
}

function mergeCategories(local, remote) {
  const combined = [...new Set([...(remote || []), ...(local || [])].filter(Boolean))];
  return combined.length ? combined : DEFAULT_CATEGORIES;
}

function parseHashRoute(hash) {
  const clean = (hash || '').replace(/^#\/?/, '').trim();
  if (!clean) return { view: 'home', thoughtId: null, isEdit: false };
  if (clean === 'similar') return { view: 'similar', thoughtId: null, isEdit: false };
  if (clean === 'add') return { view: 'add', thoughtId: null, isEdit: false };
  if (clean === 'settings') return { view: 'settings', thoughtId: null, isEdit: false };

  const match = clean.match(/^thought\/([^/]+)(\/edit)?$/);
  if (match) {
    return {
      view: 'thought',
      thoughtId: decodeURIComponent(match[1]),
      isEdit: Boolean(match[2]),
    };
  }

  return { view: 'home', thoughtId: null, isEdit: false };
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('app_theme') || 'light';
  });

  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('gdrive_token') || null;
  });

  const [tokenExpiry, setTokenExpiry] = useState(() => {
    if (typeof window === 'undefined') return null;
    const expiry = localStorage.getItem('gdrive_token_expires_at');
    return expiry ? Number(expiry) : null;
  });

  const [thoughts, setThoughts] = useState(() => {
    const defaultList = (Array.isArray(initialData?.thoughts) ? initialData.thoughts : []).map((t) => ({
      ...t,
      author: t.author || 'Qaisar',
    }));
    if (typeof window === 'undefined') return defaultList;
    try {
      const saved = localStorage.getItem('cached_thoughts');
      const parsed = JSON.parse(saved || 'null');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeThoughts(parsed, defaultList).map((t) => ({
          ...t,
          author: t.author || 'Qaisar',
        }));
      }
      return defaultList;
    } catch {
      return defaultList;
    }
  });

  const [categories, setCategories] = useState(() => {
    const defaultCats = Array.isArray(initialData?.categories) && initialData.categories.length
      ? initialData.categories
      : DEFAULT_CATEGORIES;
    if (typeof window === 'undefined') return defaultCats;
    try {
      const saved = localStorage.getItem('cached_categories');
      const parsed = JSON.parse(saved || 'null');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeCategories(parsed, defaultCats);
      }
      return defaultCats;
    } catch {
      return defaultCats;
    }
  });

  const [deletedThoughtIds, setDeletedThoughtIds] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('cached_deleted_thought_ids');
      const parsed = JSON.parse(saved || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const sortedCategories = React.useMemo(() => {
    return getCategoriesByUsage(categories, thoughts);
  }, [categories, thoughts]);

  const [formData, setFormData] = useState(() => {
    try {
      const savedCats = JSON.parse(localStorage.getItem('cached_categories') || 'null');
      const savedThoughts = JSON.parse(localStorage.getItem('cached_thoughts') || '[]');
      const initialSorted = getCategoriesByUsage(normalizeCategories(savedCats), Array.isArray(savedThoughts) ? savedThoughts : []);
      return makeBlankForm(initialSorted);
    } catch {
      return makeBlankForm(DEFAULT_CATEGORIES);
    }
  });
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('');
  const [collectionSelectedCategory, setCollectionSelectedCategory] = useState('All');
  const [collectionFavoritesOnly, setCollectionFavoritesOnly] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const [status, setStatus] = useState('Ready');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedThought, setSelectedThought] = useState(null);
  const [isEditingThought, setIsEditingThought] = useState(false);
  const [editFormData, setEditFormData] = useState(() => makeBlankForm(DEFAULT_CATEGORIES));
  const [copiedThought, setCopiedThought] = useState(false);
  const [pasteToast, setPasteToast] = useState(null);

  // ── Password Protection State (@ThoughtsOrganizer@) ──
  const [rememberPassword, setRememberPassword] = useState(() => {
    try {
      return localStorage.getItem('thought_organizer_remember_password') === 'true';
    } catch {
      return false;
    }
  });
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      if (localStorage.getItem('thought_organizer_remember_password') === 'true') {
        return true;
      }
      return sessionStorage.getItem('thought_organizer_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingTargetView, setPendingTargetView] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Voice & Audio state ──
  const [voiceLang, setVoiceLang] = useState(() => {
    return localStorage.getItem('thought_organizer_voice_lang') || 'ur-PK';
  });

  useEffect(() => {
    if (voiceLang) {
      localStorage.setItem('thought_organizer_voice_lang', voiceLang);
    }
  }, [voiceLang]);

  const [ttsRate, setTtsRate] = useState(() => {
    const saved = localStorage.getItem('tts_playback_rate');
    return saved ? parseFloat(saved) : 0.85;
  });
  const [ttsPitch, setTtsPitch] = useState(() => {
    const saved = localStorage.getItem('tts_playback_pitch');
    return saved ? parseFloat(saved) : 0.68;
  });
  const [voiceEngine, setVoiceEngine] = useState('gemini');

  const [activeSpeakingThoughtId, setActiveSpeakingThoughtId] = useState(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [translatedThought, setTranslatedThought] = useState(null);
  const [isExportingAudio, setIsExportingAudio] = useState(false);
  const [isTranslatingThought, setIsTranslatingThought] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);

  const { speak, stop: ttsStop, isSpeaking, isLoadingAudio, exportAudio } = useTTS();
  const { translate } = useTranslate();

  const [copiedLink, setCopiedLink] = useState(false);
  const [inReadingSearchOpen, setInReadingSearchOpen] = useState(false);
  const [inReadingSearchQuery, setInReadingSearchQuery] = useState('');
  const [readingFontSize, setReadingFontSize] = useState(() => {
    return parseInt(localStorage.getItem('reading_font_size') || '22', 10);
  });

  const handleAdjustFontSize = (delta) => {
    setReadingFontSize((prev) => {
      const next = Math.min(36, Math.max(16, prev + delta));
      localStorage.setItem('reading_font_size', String(next));
      return next;
    });
  };

  const navigateTo = useCallback((routePath, replace = false) => {
    const targetHash = routePath.startsWith('#')
      ? routePath
      : `#/${routePath.replace(/^\//, '')}`;
    if (window.location.hash === targetHash) return;
    if (replace) {
      const url = new URL(window.location.href);
      url.hash = targetHash;
      window.location.replace(url.href);
    } else {
      window.location.hash = targetHash;
    }
  }, []);

  const handleSelectThought = useCallback((thought) => {
    navigateTo(`thought/${thought.id}`);
  }, [navigateTo]);

  const closeSelectedThought = useCallback(() => {
    ttsStop();
    setShowTranslated(false);
    setTranslatedThought(null);
    setActiveSpeakingThoughtId(null);
    setInReadingSearchOpen(false);
    setInReadingSearchQuery('');
    if (window.location.hash.startsWith('#/thought/')) {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigateTo('');
      }
    } else {
      navigateTo('');
    }
  }, [ttsStop, navigateTo]);

  const handleStartEditThought = useCallback(() => {
    if (selectedThought) {
      navigateTo(`thought/${selectedThought.id}/edit`);
    }
  }, [selectedThought, navigateTo]);

  const handleCancelEditThought = useCallback(() => {
    if (selectedThought) {
      setEditFormData(makeEditForm(selectedThought, categories));
      navigateTo(`thought/${selectedThought.id}`);
    }
  }, [selectedThought, categories, navigateTo]);

  const handleSwitchView = useCallback((view) => {
    if (view === 'home') navigateTo('');
    else navigateTo(view);
  }, [navigateTo]);

  const requestProtectedView = useCallback((targetView) => {
    if (isUnlocked) {
      handleSwitchView(targetView);
    } else {
      setPendingTargetView(targetView);
      setPasswordInput('');
      setPasswordError('');
      setPasswordModalOpen(true);
    }
  }, [isUnlocked, handleSwitchView]);

  const handlePasswordSubmit = (e) => {
    if (e) e.preventDefault();
    if (passwordInput.trim() === '@ThoughtsOrganizer@') {
      setIsUnlocked(true);
      try {
        sessionStorage.setItem('thought_organizer_unlocked', 'true');
        if (rememberPassword) {
          localStorage.setItem('thought_organizer_remember_password', 'true');
        } else {
          localStorage.removeItem('thought_organizer_remember_password');
        }
      } catch {}
      setPasswordModalOpen(false);
      setPasswordError('');
      const target = pendingTargetView || 'add';
      setPendingTargetView(null);
      handleSwitchView(target);
      setPasteToast(
        rememberPassword
          ? 'رسائی منظور! پاس ورڈ محفوظ کر لیا گیا (Password saved)'
          : 'رسائی منظور! خوش آمدید (Access granted)'
      );
      setTimeout(() => setPasteToast(null), 2200);
    } else {
      setPasswordError('غلط پاس ورڈ! دوبارہ کوشش کریں (Incorrect password)');
    }
  };

  const handleCancelPassword = () => {
    setPasswordModalOpen(false);
    setPasswordInput('');
    setPasswordError('');
    setPendingTargetView(null);
  };

  const handleLockSession = () => {
    setIsUnlocked(false);
    setRememberPassword(false);
    try {
      sessionStorage.removeItem('thought_organizer_unlocked');
      localStorage.removeItem('thought_organizer_remember_password');
    } catch {}
    handleSwitchView('home');
    setPasteToast('سیشن اور محفوظ پاس ورڈ لاک کر دیا گیا (Session locked)');
    setTimeout(() => setPasteToast(null), 2000);
  };

  const handleCopyLink = useCallback(() => {
    if (!selectedThought) return;
    const url = `${window.location.origin}${window.location.pathname}#/thought/${selectedThought.id}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setPasteToast('لنک کاپی ہو گیا! (Direct link copied)');
      setTimeout(() => {
        setPasteToast(null);
        setCopiedLink(false);
      }, 2000);
    }
  }, [selectedThought]);

  // Route synchronization on hashchange, mount, and thoughts change
  useEffect(() => {
    const syncFromHash = () => {
      const route = parseHashRoute(window.location.hash);
      if (route.view === 'thought' && route.thoughtId) {
        const found = thoughts.find((t) => String(t.id) === String(route.thoughtId));
        if (found) {
          setSelectedThought(found);
          setIsEditingThought(route.isEdit);
        } else {
          setSelectedThought(null);
          setIsEditingThought(false);
          setActiveView('home');
        }
      } else {
        setSelectedThought(null);
        setIsEditingThought(false);
        if ((route.view === 'add' || route.view === 'settings') && !isUnlocked) {
          setPendingTargetView(route.view);
          setPasswordInput('');
          setPasswordError('');
          setPasswordModalOpen(true);
          setActiveView('home');
        } else {
          setActiveView(route.view || 'home');
        }
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [thoughts, isUnlocked]);

  // Capacitor Android hardware back button integration
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const subPromise = CapApp.addListener('backButton', () => {
        const clean = window.location.hash.replace(/^#\/?/, '').trim();
        if (clean && clean !== '/') {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
      return () => {
        subPromise.then((sub) => sub.remove());
      };
    }
  }, []);

  const showPasteToast = (msg) => {
    setPasteToast(msg);
    setTimeout(() => setPasteToast(null), 2000);
  };

  const readClipboardText = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) return text;
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
    return window.prompt('Paste text here:') || '';
  };

  const handlePasteToDescription = async (isEdit = false) => {
    const text = await readClipboardText();
    if (!text) return;
    const ref = isEdit ? editTextareaRef : addTextareaRef;
    const setForm = isEdit ? setEditFormData : setFormData;
    const textarea = ref.current;
    if (textarea) {
      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? 0;
      setForm((current) => {
        const desc = current.description || '';
        const updated = desc.substring(0, start) + text + desc.substring(end);
        return { ...current, description: updated };
      });
      setTimeout(() => {
        textarea.focus();
        const cursor = start + text.length;
        textarea.setSelectionRange(cursor, cursor);
      }, 50);
    } else {
      setForm((current) => ({
        ...current,
        description: current.description ? `${current.description}\n${text}` : text,
      }));
    }
    showPasteToast('Pasted into description!');
  };

  const handlePasteToSubject = async (isEdit = false) => {
    const text = await readClipboardText();
    if (!text) return;
    const setForm = isEdit ? setEditFormData : setFormData;
    const firstLine = text.split('\n')[0].trim();
    setForm((current) => ({
      ...current,
      subject: firstLine,
    }));
    showPasteToast('Pasted into subject!');
  };

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    action: null,
  });

  const addTextareaRef = useRef(null);
  const editTextareaRef = useRef(null);
  const tokenClientRef = useRef(null);
  const syncedTokenRef = useRef(null);
  const isSyncingRef = useRef(false);
  const queuedSyncRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Persist Audio settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_playback_rate', String(ttsRate));
    }
  }, [ttsRate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_playback_pitch', String(ttsPitch));
    }
  }, [ttsPitch]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_voice_engine', voiceEngine);
    }
  }, [voiceEngine]);

  useEffect(() => {
    if (categories.length && formData.category && !categories.includes(formData.category)) {
      setFormData((current) => ({ ...current, category: categories[0] }));
    }
  }, [categories, formData.category]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cached_thoughts', JSON.stringify(thoughts));
    }
  }, [thoughts]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cached_categories', JSON.stringify(categories));
    }
  }, [categories]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cached_deleted_thought_ids', JSON.stringify(deletedThoughtIds));
    }
  }, [deletedThoughtIds]);

  // URL Hash OAuth token parser (for redirect-based OAuth callbacks)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        if (accessToken) {
          localStorage.setItem('gdrive_token', accessToken);
          setToken(accessToken);
          if (expiresIn) {
            const expiresAt = Date.now() + Number(expiresIn) * 1000;
            localStorage.setItem('gdrive_token_expires_at', String(expiresAt));
            setTokenExpiry(expiresAt);
          }
          setStatus('Connected');
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (err) {
        console.error('Error parsing token hash:', err);
      }
    }
  }, []);

  // Deep Link Listener for Mobile APK (OAuth callback via custom scheme)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const sub = CapApp.addListener('appUrlOpen', async (data) => {
        try {
          const url = data.url;
          if (url && (url.includes('access_token=') || url.includes('token='))) {
            await Browser.close().catch(() => {});
            const rawParams = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
            const params = new URLSearchParams(rawParams);
            const accessToken = params.get('access_token') || params.get('token');
            const expiresIn = params.get('expires_in');
            if (accessToken) {
              localStorage.setItem('gdrive_token', accessToken);
              setToken(accessToken);
              if (expiresIn) {
                const expiresAt = Date.now() + Number(expiresIn) * 1000;
                localStorage.setItem('gdrive_token_expires_at', String(expiresAt));
                setTokenExpiry(expiresAt);
              }
              setStatus('Connected');
            }
          }
        } catch (err) {
          console.error('Error handling deep link:', err);
        }
      });

      return () => {
        sub.then((s) => s.remove());
      };
    }
  }, []);

  // Google OAuth Client for Web
  useEffect(() => {
    const initGoogle = () => {
      if (window.google?.accounts?.oauth2) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: async (response) => {
            if (response.error) {
              setStatus('Auth Error');
              return;
            }

            localStorage.setItem('gdrive_token', response.access_token);
            setToken(response.access_token);

            if (response.expires_in) {
              const expiresAt = Date.now() + Number(response.expires_in) * 1000;
              localStorage.setItem('gdrive_token_expires_at', String(expiresAt));
              setTokenExpiry(expiresAt);
            }

            setStatus('Connected');
          },
        });
        return true;
      }
      return false;
    };

    if (initGoogle()) return undefined;

    const interval = window.setInterval(() => {
      if (initGoogle()) window.clearInterval(interval);
    }, 200);

    return () => window.clearInterval(interval);
  }, []);

  const clearGoogleToken = useCallback(() => {
    localStorage.removeItem('gdrive_token');
    localStorage.removeItem('gdrive_token_expires_at');
    syncedTokenRef.current = null;
    setToken(null);
    setTokenExpiry(null);
    setStatus('Auth expired');
  }, []);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setStatus(token ? 'Connected' : 'Ready');
    };
    const handleOffline = () => {
      setStatus('Offline (Saved locally)');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token]);

  // Synchronize with Google Drive
  const syncWithDrive = useCallback(async (
    currentThoughts = thoughts,
    currentCategories = categories,
    options = {}
  ) => {
    const { deletedIds = deletedThoughtIds, directPush = false, forcePull = false } = options;

    if (!token || (tokenExpiry && Date.now() >= tokenExpiry)) {
      if (token) clearGoogleToken();
      return;
    }

    if (!navigator.onLine) {
      setStatus('Offline (Saved locally)');
      return;
    }

    if (isSyncingRef.current) {
      queuedSyncRef.current = { currentThoughts, currentCategories, options };
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    setStatus('Syncing...');

    try {
      const folderId = await GoogleDriveService.getOrCreateFolder(token);
      const { fileId: activeFileId, isNew } = await GoogleDriveService.getOrCreateDataFile(token, folderId);

      if (isNew || directPush) {
        const snapshot = {
          thoughts: currentThoughts,
          categories: currentCategories,
          deletedThoughtIds: deletedIds,
          lastSyncedAt: Date.now(),
        };
        await GoogleDriveService.uploadThoughts(token, activeFileId, snapshot);
      } else {
        const remoteState = normalizeSnapshot(await GoogleDriveService.downloadThoughts(token, activeFileId));
        const combinedDeleted = [...new Set([...deletedIds, ...(remoteState.deletedThoughtIds || [])])];
        setDeletedThoughtIds(combinedDeleted);

        let finalThoughts;
        let finalCategories;

        if (forcePull && remoteState.thoughts.length > 0) {
          finalThoughts = mergeThoughts(currentThoughts, remoteState.thoughts, combinedDeleted);
          finalCategories = mergeCategories(currentCategories, remoteState.categories);
        } else {
          finalThoughts = mergeThoughts(currentThoughts, remoteState.thoughts, combinedDeleted);
          finalCategories = mergeCategories(currentCategories, remoteState.categories);
        }

        setThoughts(finalThoughts);
        setCategories(finalCategories);

        await GoogleDriveService.uploadThoughts(token, activeFileId, {
          thoughts: finalThoughts,
          categories: finalCategories,
          deletedThoughtIds: combinedDeleted,
          lastSyncedAt: Date.now(),
        });
      }

      setStatus('Saved to Drive');
    } catch (error) {
      console.error('Sync error:', error);
      if (error?.status === 401) {
        clearGoogleToken();
        setStatus('Auth expired');
      } else {
        setStatus('Sync Error');
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);

      if (queuedSyncRef.current) {
        const next = queuedSyncRef.current;
        queuedSyncRef.current = null;
        syncWithDrive(next.currentThoughts, next.currentCategories, next.options);
      }
    }
  }, [categories, clearGoogleToken, deletedThoughtIds, thoughts, token, tokenExpiry]);

  useEffect(() => {
    if (!token || syncedTokenRef.current === token) {
      return;
    }

    syncedTokenRef.current = token;
    syncWithDrive(thoughts, categories);
  }, [token, thoughts, categories, syncWithDrive]);

  // Modal keyboard dismiss
  useEffect(() => {
    if (!selectedThought) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeSelectedThought();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedThought, closeSelectedThought]);

  useEffect(() => {
    if (!selectedThought) {
      setIsEditingThought(false);
      setCopiedThought(false);
      return;
    }

    setEditFormData(makeEditForm(selectedThought, categories));
    setIsEditingThought(false);
  }, [selectedThought, categories]);

  // Universal Login Handler: Supports In-App GIS Popup (direct, zero-config) & Browser Flow
  const handleLogin = async (options = {}) => {
    const useBrowser = Boolean(options && options.browser);

    // 1. In-App GIS Popup (Primary)
    // Works seamlessly on Web and inside the APK with sanitized User-Agent and popup dialog in MainActivity.
    // Does NOT send or require any redirect_uri, eliminating Error 400: redirect_uri_mismatch!
    if (!useBrowser) {
      if (tokenClientRef.current) {
        try {
          tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
          return;
        } catch (err) {
          console.warn('In-app tokenClient request failed, trying fallback:', err);
        }
      } else if (window.google?.accounts?.oauth2) {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: async (response) => {
              if (response.error) {
                setStatus('Auth Error');
                return;
              }
              localStorage.setItem('gdrive_token', response.access_token);
              setToken(response.access_token);
              if (response.expires_in) {
                const expiresAt = Date.now() + Number(response.expires_in) * 1000;
                localStorage.setItem('gdrive_token_expires_at', String(expiresAt));
                setTokenExpiry(expiresAt);
              }
              setStatus('Connected');
            },
          });
          tokenClientRef.current = client;
          client.requestAccessToken({ prompt: 'consent' });
          return;
        } catch (err) {
          console.warn('Direct token client initialization failed:', err);
        }
      }
    }

    // 2. Browser / Chrome Custom Tab flow (Secondary / Fallback)
    // Note: Requires https://kaiserabbas.github.io/thought-organizer/ to be registered in Google Cloud Console
    if (Capacitor.isNativePlatform() || useBrowser) {
      const redirectUri = 'https://kaiserabbas.github.io/thought-organizer/';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&prompt=consent`;

      try {
        await Browser.open({ url: authUrl });
      } catch (browserErr) {
        console.error('Browser open failed:', browserErr);
      }
    }
  };

  const handleManualToken = (inputToken) => {
    if (!inputToken || !inputToken.trim()) return false;
    const cleanToken = inputToken.trim();
    localStorage.setItem('gdrive_token', cleanToken);
    const expiresAt = Date.now() + 3600 * 1000;
    localStorage.setItem('gdrive_token_expires_at', String(expiresAt));
    setToken(cleanToken);
    setTokenExpiry(expiresAt);
    setStatus('Connected');
    return true;
  };

  const handleLogout = () => {
    localStorage.removeItem('gdrive_token');
    localStorage.removeItem('gdrive_token_expires_at');
    setToken(null);
    setTokenExpiry(null);
    syncedTokenRef.current = null;
    setStatus('Ready');
  };

  const handleRefreshMemory = async () => {
    if (token) {
      setStatus('Refreshing...');
      await syncWithDrive(thoughts, categories, { forcePull: true });
      setStatus('Refreshed');
    } else {
      try {
        const savedThoughts = JSON.parse(localStorage.getItem('cached_thoughts') || '[]');
        const savedCategories = normalizeCategories(JSON.parse(localStorage.getItem('cached_categories') || 'null'));
        const savedDeleted = JSON.parse(localStorage.getItem('cached_deleted_thought_ids') || '[]');
        setThoughts(Array.isArray(savedThoughts) ? savedThoughts : []);
        setCategories(savedCategories);
        setDeletedThoughtIds(Array.isArray(savedDeleted) ? savedDeleted : []);
        setStatus('Memory Refreshed');
      } catch {
        setStatus('Memory Refreshed');
      }
    }
  };

  // Local JSON Backup Export & Import Handlers
  const handleExportBackup = () => {
    const data = {
      thoughts,
      categories,
      deletedThoughtIds,
      exportedAt: new Date().toISOString(),
      app: 'Thought Organizer',
      version: '1.0.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thought-organizer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const importedThoughts = Array.isArray(parsed.thoughts) ? parsed.thoughts : [];
        const importedCategories = normalizeCategories(parsed.categories);
        const mergedT = mergeThoughts(thoughts, importedThoughts, deletedThoughtIds);
        const mergedC = mergeCategories(categories, importedCategories);
        setThoughts(mergedT);
        setCategories(mergedC);
        setStatus('Backup Restored');
        if (token) {
          await syncWithDrive(mergedT, mergedC, { directPush: true });
        }
      } catch {
        alert('Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Copy Thought Handler
  const handleCopyThought = async (thoughtToCopy) => {
    const t = thoughtToCopy || selectedThought;
    if (!t) return;

    const textToCopy = `${t.subject}\n\n${t.description}\n\nCategory: ${t.category} | ${formatDate(t.entryDate || t.createdAt)}`;
    await copyToClipboard(textToCopy);
    setCopiedThought(true);
    setTimeout(() => setCopiedThought(false), 2000);
  };

  // Formatting tool helper: insert markdown tags into textarea
  const handleInsertTag = (textareaRef, tagStart, tagEnd, isEdit = false) => {
    const el = textareaRef.current;
    const setForm = isEdit ? setEditFormData : setFormData;

    if (!el) {
      setForm((prev) => ({ ...prev, description: `${prev.description}${tagStart}${tagEnd}` }));
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const selected = val.slice(start, end);
    const replacement = `${tagStart}${selected || 'text'}${tagEnd}`;
    const nextVal = val.slice(0, start) + replacement + val.slice(end);

    setForm((prev) => ({ ...prev, description: nextVal }));

    setTimeout(() => {
      el.focus();
      const cursorStart = start + tagStart.length;
      const cursorEnd = cursorStart + (selected ? selected.length : 4);
      el.setSelectionRange(cursorStart, cursorEnd);
    }, 0);
  };

  // Save new thought
  const handleSaveThought = async (event) => {
    if (event) event.preventDefault();
    const subject = formData.subject.trim();
    const description = formData.description.trim();
    if (!subject && !description) {
      showPasteToast('براہ کرم عنوان یا متن درج کریں (Please enter subject or description)');
      return;
    }

    const author = (formData.author ? formData.author.trim() : '') || 'Qaisar';
    try {
      localStorage.setItem('thought_organizer_default_author', author);
    } catch {}

    const nextThought = {
      id: crypto.randomUUID(),
      subject: subject || 'بلا عنوان فکر',
      description,
      author,
      category: formData.category || categories[0] || DEFAULT_CATEGORIES[0],
      entryDate: formData.entryDate || new Date().toISOString().slice(0, 10),
      favorite: Boolean(formData.favorite),
      descriptionAlign: formData.descriptionAlign || 'right',
      textColor: formData.textColor || '',
      fontFamily: formData.fontFamily || '',
      cardColor: formData.cardColor || 'default',
      isBold: Boolean(formData.isBold),
      isItalic: Boolean(formData.isItalic),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedThoughts = [nextThought, ...thoughts];
    setThoughts(updatedThoughts);
    setFormData(makeBlankForm(sortedCategories));
    setActiveView('home');
    navigateTo('');
    setStatus('Saved Locally');
    showPasteToast(`✓ فکر "${nextThought.subject}" کامیابی سے شامل کر لیا گیا! (Thought added successfully)`);

    if (token) {
      await syncWithDrive(updatedThoughts, categories, { directPush: true });
    }
  };

  // Add category
  const handleAddCategory = async (name) => {
    const trimmed = name.trim();
    if (!trimmed || categories.includes(trimmed)) return;

    const nextCategories = [...categories, trimmed];
    setCategories(nextCategories);
    setFormData((current) => ({ ...current, category: trimmed }));
    setStatus('Category added');
    showPasteToast(`✓ زمرہ "${trimmed}" شامل کر لیا گیا (Category added)`);

    if (token) {
      await syncWithDrive(thoughts, nextCategories, { directPush: true });
    }
  };

  // Request category deletion with confirmation
  const requestDeleteCategory = (categoryName, count) => {
    setConfirmModal({
      isOpen: true,
      title: 'زمرہ حذف کرنے کی تصدیق (Confirm Category Deletion)',
      message: `کیا آپ واقعی زمرہ "${categoryName}" کو حذف کرنا چاہتے ہیں؟ اس کے ${count} ${count === 1 ? 'فکر' : 'افکار'} بنیادی زمرے میں منتقل کر دیے جائیں گے۔ (Are you sure you want to delete this category?)`,
      confirmText: 'حذف کریں (Delete Category)',
      cancelText: 'منسوخ (Cancel)',
      action: () => executeDeleteCategory(categoryName),
    });
  };

  // Execute category deletion
  const executeDeleteCategory = async (categoryName) => {
    const nextCategories = categories.filter((category) => category !== categoryName);
    const fallbackCategories = nextCategories.length ? nextCategories : DEFAULT_CATEGORIES;
    const fallbackCategory = fallbackCategories[0] || 'General';
    const updatedThoughts = thoughts.map((thought) => (
      thought.category === categoryName ? { ...thought, category: fallbackCategory, updatedAt: Date.now() } : thought
    ));

    setCategories(fallbackCategories);
    setThoughts(updatedThoughts);
    if (collectionSelectedCategory === categoryName) {
      setCollectionSelectedCategory('All');
    }
    setFormData((current) => ({ ...current, category: current.category === categoryName ? fallbackCategory : current.category }));
    setEditFormData((current) => ({ ...current, category: current.category === categoryName ? fallbackCategory : current.category }));
    setStatus('Category removed');
    showPasteToast(`زمرہ "${categoryName}" حذف کر دیا گیا (Category deleted)`);

    if (token) {
      await syncWithDrive(updatedThoughts, fallbackCategories, { directPush: true });
    }
  };

  // Toggle favorite
  const toggleFavorite = async (id) => {
    const updatedThoughts = thoughts.map((thought) =>
      thought.id === id ? { ...thought, favorite: !thought.favorite, updatedAt: Date.now() } : thought
    );
    setThoughts(updatedThoughts);
    setSelectedThought((current) =>
      current?.id === id ? { ...current, favorite: !current.favorite, updatedAt: Date.now() } : current
    );
    setStatus('Saved Locally');

    if (token) {
      await syncWithDrive(updatedThoughts, categories, { directPush: true });
    }
  };

  // Request thought deletion with confirmation
  const requestDeleteThought = (thought) => {
    if (!thought) return;
    const thoughtTitle = thought.subject ? `"${thought.subject}"` : 'اس فکر';
    setConfirmModal({
      isOpen: true,
      title: 'حذف کرنے کی تصدیق (Confirm Deletion)',
      message: `کیا آپ واقعی ${thoughtTitle} کو ہمیشہ کے لیے حذف کرنا چاہتے ہیں؟ یہ عمل واپس نہیں لیا جا سکے گا۔ (Are you sure you want to delete this thought?)`,
      confirmText: 'ہاں، حذف کریں (Delete Thought)',
      cancelText: 'منسوخ (Cancel)',
      action: () => executeDeleteThought(thought.id, thought.subject),
    });
  };

  // Execute thought deletion
  const executeDeleteThought = async (id, subject) => {
    const nextDeletedIds = [...new Set([...deletedThoughtIds, id])];
    setDeletedThoughtIds(nextDeletedIds);
    localStorage.setItem('cached_deleted_thought_ids', JSON.stringify(nextDeletedIds));

    const updatedThoughts = thoughts.filter((thought) => thought.id !== id);
    setThoughts(updatedThoughts);
    localStorage.setItem('cached_thoughts', JSON.stringify(updatedThoughts));

    if (selectedThought?.id === id) {
      setSelectedThought(null);
      setIsEditingThought(false);
      navigateTo('', true);
    }
    setStatus('Thought removed');
    showPasteToast(`فکر ${subject ? `"${subject}"` : ''} کامیابی سے حذف کر دیا گیا (Thought deleted)`);

    if (token) {
      await syncWithDrive(updatedThoughts, categories, { deletedIds: nextDeletedIds, directPush: true });
    }
  };

  // Update existing thought
  const handleUpdateThought = async (event) => {
    if (event) event.preventDefault();
    if (!selectedThought) return;

    const subject = editFormData.subject.trim();
    const description = editFormData.description.trim();
    if (!subject && !description) return;

    const author = (editFormData.author ? editFormData.author.trim() : '') || 'Qaisar';
    try {
      localStorage.setItem('thought_organizer_default_author', author);
    } catch {}

    const updatedThought = {
      ...selectedThought,
      subject: subject || 'بلا عنوان فکر',
      description,
      author,
      category: editFormData.category || categories[0] || DEFAULT_CATEGORIES[0],
      entryDate: editFormData.entryDate || new Date().toISOString().slice(0, 10),
      favorite: Boolean(editFormData.favorite),
      descriptionAlign: editFormData.descriptionAlign || 'right',
      textColor: editFormData.textColor || '',
      fontFamily: editFormData.fontFamily || '',
      cardColor: editFormData.cardColor || 'default',
      isBold: Boolean(editFormData.isBold),
      isItalic: Boolean(editFormData.isItalic),
      updatedAt: Date.now(),
    };

    const updatedThoughts = thoughts.map((thought) => (thought.id === selectedThought.id ? updatedThought : thought));
    setThoughts(updatedThoughts);
    setSelectedThought(updatedThought);
    setIsEditingThought(false);
    setStatus('Saved Locally');
    showPasteToast(`✓ فکر "${updatedThought.subject}" میں تبدیلیاں محفوظ ہو گئیں! (Changes saved)`);
    navigateTo(`thought/${updatedThought.id}`, true);

    if (token) {
      await syncWithDrive(updatedThoughts, categories, { directPush: true });
    }
  };

  const handleQuickListenThought = (thought) => {
    if ((isSpeaking || isLoadingAudio) && activeSpeakingThoughtId === thought.id) {
      ttsStop();
      setActiveSpeakingThoughtId(null);
      return;
    }
    const fullText = `${thought.subject ? thought.subject + '. ' : ''}${thought.description || ''}`.trim();
    if (!fullText) return;
    const lang = containsUrdu(fullText) ? 'ur-PK' : 'en-US';
    setActiveSpeakingThoughtId(thought.id);
    speak(fullText, {
      lang,
      rate: ttsRate,
      pitch: ttsPitch,
      engine: 'gemini',
      onEnd: () => setActiveSpeakingThoughtId(null),
      onError: (err) => {
        setActiveSpeakingThoughtId(null);
        if (err?.code === 'MISSING_GEMINI_KEY') {
          setIsGeminiModalOpen(true);
        }
      },
    });
  };



  const handleToggleTranslateSelected = async () => {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }
    if (translatedThought && translatedThought.id === selectedThought?.id) {
      setShowTranslated(true);
      return;
    }
    if (!selectedThought) return;
    setIsTranslatingThought(true);
    const isUr = containsUrdu(selectedThought.description || selectedThought.subject || '');
    const sourceLang = isUr ? 'ur' : 'en';
    const targetLang = isUr ? 'en' : 'ur';

    try {
      const translatedSubj = selectedThought.subject
        ? await translate(selectedThought.subject, sourceLang, targetLang)
        : '';
      const translatedDesc = selectedThought.description
        ? await translate(selectedThought.description, sourceLang, targetLang)
        : '';
      setTranslatedThought({
        id: selectedThought.id,
        targetLang,
        subject: translatedSubj,
        description: translatedDesc,
      });
      setShowTranslated(true);
    } catch {
      showPasteToast('Translation failed');
    } finally {
      setIsTranslatingThought(false);
    }
  };

  const favoriteCount = thoughts.filter((thought) => thought.favorite).length;
  const summarizeText = (value, max = 112) => {
    const baseValue = value || 'No description added yet.';
    return baseValue.length > max ? `${baseValue.slice(0, max)}...` : baseValue;
  };

  const getCounts = (text = '') => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    return `${words} words · ${chars} characters`;
  };

  return (
    <div className="app-shell" data-theme={theme}>
      {/* ── Top Bar ── */}
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-icon">
            <img src="/logo.png" alt="Brain icon" width={120} height={120} />
          </div>
          <div>
            <p className="eyebrow">مجموعۂ افکار و علمی ذخیرہ • Scholarly Compendium</p>
            <h1>Thought Organizer</h1>
          </div>
        </div>

        <div className="header-actions">
          {/* Total Thoughts Count Pill */}
          <span className="status-pill academic-status-pill" title="کل محفوظ شدہ افکار">
            <BookOpen size={14} className="status-icon success" />
            <span className="pill-bold">{thoughts.length}</span>
            <span>افکار</span>
          </span>

          {/* Quick Backup Export (Icon Button) */}
          <button
            type="button"
            className="action-button icon-only-btn backup-top-btn"
            onClick={handleExportBackup}
            title="بیک اپ محفوظ کریں (Export JSON Backup)"
            aria-label="Export Backup"
          >
            <Download size={17} />
          </button>

          {/* Quick Session Lock Button (Visible when unlocked) */}
          {isUnlocked && (
            <button
              type="button"
              className="action-button icon-only-btn session-lock-btn"
              onClick={handleLockSession}
              title="سیشن لاک کریں (Lock Session)"
              aria-label="Lock Session"
            >
              <Lock size={16} />
            </button>
          )}

          {/* Quick Theme Toggle Button (Icon Button) */}
          <button
            type="button"
            className="action-button icon-only-btn theme-quick-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Settings (Icon Button) */}
          <button
            type="button"
            className={`action-button icon-only-btn settings-icon-btn ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => requestProtectedView(activeView === 'settings' ? 'home' : 'settings')}
            title="ترتیبات (Settings)"
            aria-label="Settings"
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      {/* ── Navigation Tabs ── */}
      <div className="view-tabs" role="tablist" aria-label="Primary views">
        <button
          type="button"
          className={`tab-pill ${activeView === 'home' ? 'active' : ''}`}
          onClick={() => handleSwitchView('home')}
        >
          <BookOpen size={16} /> تمام افکار (Home)
        </button>
        <button
          type="button"
          className={`tab-pill ${activeView === 'similar' ? 'active' : ''}`}
          onClick={() => handleSwitchView('similar')}
        >
          <Layers size={16} /> مماثل افکار (Similar Thoughts)
        </button>
      </div>

      {/* ── Main View Container ── */}
      <main className="dashboard">
        {selectedThought ? (
          <article
            className={`academic-reading-page ${selectedThought.cardColor && !selectedThought.cardColor.startsWith('#') ? `card-color-${selectedThought.cardColor}` : ''}`}
            style={selectedThought.cardColor?.startsWith('#') ? { backgroundColor: selectedThought.cardColor } : undefined}
          >
            {/* Top Navigation & Action Controls */}
            <header className="reading-page-nav">
              <button
                type="button"
                className="icon-button reading-back-btn"
                onClick={closeSelectedThought}
                title="واپسی تمام افکار (Back to thoughts)"
                aria-label="Back to all thoughts"
              >
                <ArrowRight size={20} />
              </button>

              <div className="reading-nav-actions">
                {!isEditingThought && (
                  <>
                    <button
                      type="button"
                      className={`icon-button copy-link-btn ${copiedLink ? 'copied' : ''}`}
                      onClick={handleCopyLink}
                      aria-label="Copy direct link"
                      title={copiedLink ? 'لنک کاپی ہو گیا!' : 'کاپی لنک (Share / Direct Link)'}
                    >
                      {copiedLink ? <Check size={17} /> : <Share2 size={17} />}
                    </button>

                    <button
                      type="button"
                      className={`icon-button copy-post-btn ${copiedThought ? 'copied' : ''}`}
                      onClick={() => handleCopyThought(selectedThought)}
                      aria-label="Copy thought"
                      title={copiedThought ? 'متن کاپی ہو گیا!' : 'کاپی متن (Copy thought)'}
                    >
                      {copiedThought ? <Check size={17} /> : <Copy size={17} />}
                    </button>

                    <button
                      type="button"
                      className={`icon-button translate-btn ${showTranslated ? 'active' : ''}`}
                      onClick={handleToggleTranslateSelected}
                      disabled={isTranslatingThought}
                      aria-label="Translate thought"
                      title={isTranslatingThought ? 'Translating...' : showTranslated ? 'Hide translation' : 'Translate thought'}
                    >
                      <Languages size={17} />
                    </button>

                    <button
                      type="button"
                      className={`icon-button reading-search-btn ${inReadingSearchOpen ? 'active' : ''}`}
                      onClick={() => {
                        setInReadingSearchOpen(!inReadingSearchOpen);
                        if (inReadingSearchOpen) setInReadingSearchQuery('');
                      }}
                      aria-label="Search in thought"
                      title={inReadingSearchOpen ? 'تلاش بند کریں' : 'اس فکر میں تلاش کریں (Search in thought)'}
                    >
                      <Search size={17} />
                    </button>

                    <button
                      type="button"
                      className="icon-button"
                      onClick={handleStartEditThought}
                      aria-label="Edit thought"
                      title="ترمیم کریں (Edit thought)"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      type="button"
                      className="icon-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(selectedThought.id);
                      }}
                      aria-label="Toggle favorite"
                      title={selectedThought.favorite ? 'Remove favorite' : 'Mark favorite'}
                    >
                      <Star size={17} className={selectedThought.favorite ? 'filled' : ''} />
                    </button>

                    <button
                      type="button"
                      className="icon-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        requestDeleteThought(selectedThought);
                      }}
                      aria-label="Delete thought"
                      title="Delete thought"
                    >
                      <Trash2 size={17} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="icon-button reading-close-x"
                  onClick={closeSelectedThought}
                  aria-label="بند کریں"
                  title="Close reading view"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* Translation View Block */}
            {showTranslated && !isEditingThought && translatedThought && translatedThought.id === selectedThought.id && (
              <div className="preview-translation-block reading-translation-block" dir="auto">
                <div className="translation-block-header">
                  <span className="badge-translated">
                    <Languages size={14} /> ترجمہ ({translatedThought.targetLang === 'ur' ? 'اردو Urdu' : 'English'})
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setShowTranslated(false)}
                    title="Close translation"
                  >
                    <X size={14} />
                  </button>
                </div>
                {translatedThought.subject && (
                  <h4 className="translation-title">{translatedThought.subject}</h4>
                )}
                <div className="translation-body">
                  {renderFormattedContent(translatedThought.description)}
                </div>
              </div>
            )}

            {isEditingThought ? (
              <form
                className="preview-edit-form"
                onSubmit={handleUpdateThought}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleUpdateThought();
                  }
                }}
              >
                <div className="field">
                  <div className="field-label-row">
                    <span className="flex-label">
                      <User size={14} /> مصنف / قلم کار (Author / Contributor)
                    </span>
                  </div>
                  <input
                    value={editFormData.author || ''}
                    onChange={(event) => setEditFormData((current) => ({ ...current, author: event.target.value }))}
                    placeholder="آپ کا نام یا قلم کار کا نام (e.g. Qaisar)"
                    dir="auto"
                  />
                </div>

                <div className="field">
                  <div className="field-label-row">
                    <span>Subject</span>
                    <button
                      type="button"
                      className="paste-quick-btn"
                      onClick={() => handlePasteToSubject(true)}
                      title="Paste from clipboard into subject"
                    >
                      <ClipboardPaste size={12} />
                      <span>Paste</span>
                    </button>
                  </div>
                  <input
                    value={editFormData.subject}
                    onChange={(event) => setEditFormData((current) => ({ ...current, subject: event.target.value }))}
                    placeholder="Thought subject"
                    dir="auto"
                    style={{
                      fontFamily: getFontFamilyCss(editFormData.fontFamily),
                    }}
                  />
                </div>

                <div className="field">
                  <div className="field-label-row">
                    <span>Description</span>
                    <button
                      type="button"
                      className="paste-quick-btn"
                      onClick={() => handlePasteToDescription(true)}
                      title="Paste from clipboard into description"
                    >
                      <ClipboardPaste size={12} />
                      <span>Paste</span>
                    </button>
                  </div>

                  <div className="rich-toolbar" role="toolbar" aria-label="Description formatting tools">
                    <div className="toolbar-group">
                      <button
                        type="button"
                        className="toolbar-btn toolbar-paste-btn"
                        onClick={() => handlePasteToDescription(true)}
                        title="Paste from clipboard"
                      >
                        <ClipboardPaste size={14} />
                        <span>Paste</span>
                      </button>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                      <button
                        type="button"
                        className={`toolbar-btn ${editFormData.descriptionAlign === 'left' ? 'active' : ''}`}
                        onClick={() => setEditFormData((c) => ({ ...c, descriptionAlign: 'left' }))}
                        title="Align left"
                      >
                        <AlignLeft size={14} />
                      </button>
                      <button
                        type="button"
                        className={`toolbar-btn ${editFormData.descriptionAlign === 'center' ? 'active' : ''}`}
                        onClick={() => setEditFormData((c) => ({ ...c, descriptionAlign: 'center' }))}
                        title="Align center"
                      >
                        <AlignCenter size={14} />
                      </button>
                      <button
                        type="button"
                        className={`toolbar-btn ${editFormData.descriptionAlign === 'right' ? 'active' : ''}`}
                        onClick={() => setEditFormData((c) => ({ ...c, descriptionAlign: 'right' }))}
                        title="Align right"
                      >
                        <AlignRight size={14} />
                      </button>
                      <button
                        type="button"
                        className={`toolbar-btn ${editFormData.descriptionAlign === 'justify' ? 'active' : ''}`}
                        onClick={() => setEditFormData((c) => ({ ...c, descriptionAlign: 'justify' }))}
                        title="Justify text"
                      >
                        <AlignJustify size={14} />
                      </button>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                      <button
                        type="button"
                        className={`toolbar-btn ${editFormData.isBold ? 'active' : ''}`}
                        onClick={() => {
                          if (editTextareaRef.current?.selectionStart !== editTextareaRef.current?.selectionEnd) {
                            handleInsertTag(editTextareaRef, '**', '**', true);
                          } else {
                            setEditFormData((c) => ({ ...c, isBold: !c.isBold }));
                          }
                        }}
                        title="Bold"
                      >
                        <Bold size={14} />
                      </button>
                      <button
                        type="button"
                        className={`toolbar-btn ${editFormData.isItalic ? 'active' : ''}`}
                        onClick={() => {
                          if (editTextareaRef.current?.selectionStart !== editTextareaRef.current?.selectionEnd) {
                            handleInsertTag(editTextareaRef, '*', '*', true);
                          } else {
                            setEditFormData((c) => ({ ...c, isItalic: !c.isItalic }));
                          }
                        }}
                        title="Italic"
                      >
                        <Italic size={14} />
                      </button>
                      <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => handleInsertTag(editTextareaRef, '\n• ', '', true)}
                        title="Bullet point"
                      >
                        <List size={14} />
                      </button>
                      <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => handleInsertTag(editTextareaRef, '\n> ', '', true)}
                        title="Quote"
                      >
                        <Quote size={14} />
                      </button>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-color-group">
                      <span className="toolbar-label" title="Text Color">
                        <Type size={13} />
                      </span>
                      {TEXT_COLORS.map((tc) => (
                        <button
                          key={tc.id}
                          type="button"
                          className={`color-dot-btn ${editFormData.textColor === tc.color ? 'active' : ''}`}
                          style={{ backgroundColor: tc.color || 'var(--text-primary)' }}
                          onClick={() => setEditFormData((c) => ({ ...c, textColor: tc.color }))}
                          title={tc.label}
                          aria-label={tc.label}
                        />
                      ))}
                      <label className="custom-color-picker-btn" title="Pick custom text color">
                        <input
                          type="color"
                          className="custom-color-input"
                          value={editFormData.textColor?.startsWith('#') ? editFormData.textColor : '#1f2937'}
                          onChange={(e) => setEditFormData((c) => ({ ...c, textColor: e.target.value }))}
                          aria-label="Custom text color"
                        />
                        <Pipette size={11} className="picker-pipette-icon" />
                      </label>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group font-select-group">
                      <span className="toolbar-label" title="Font Style">
                        <Type size={13} />
                      </span>
                      <select
                        className="font-picker-select"
                        value={editFormData.fontFamily || ''}
                        onChange={(e) => setEditFormData((c) => ({ ...c, fontFamily: e.target.value }))}
                        title="Select Font"
                        aria-label="Font family"
                      >
                        <option value="">Default Font</option>
                        <optgroup label="── Urdu & Arabic Fonts (خطوط اردو وعربية) ──">
                          {FONT_OPTIONS.filter((f) => f.group === 'Urdu / Arabic').map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="── English Fonts ──">
                          {FONT_OPTIONS.filter((f) => f.group === 'English').map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <textarea
                    ref={editTextareaRef}
                    rows="7"
                    value={editFormData.description}
                    onChange={(event) => setEditFormData((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Update the thought... (Supports **bold**, *italic*, bullets •)"
                    dir="auto"
                    style={{
                      textAlign: editFormData.descriptionAlign || 'right',
                      color: editFormData.textColor || undefined,
                      fontWeight: editFormData.isBold ? '700' : 'normal',
                      fontStyle: editFormData.isItalic ? 'italic' : 'normal',
                      fontFamily: getFontFamilyCss(editFormData.fontFamily),
                    }}
                  />
                  <div className="textarea-footer">
                    <span className="counter-text">{getCounts(editFormData.description)}</span>
                    <span className="shortcut-hint">Press Ctrl+Enter to save</span>
                  </div>
                </div>

                <div className="field">
                  <div className="field-label-row">
                    <span className="flex-label">
                      <Palette size={14} /> Card Background Color
                    </span>
                  </div>
                  <div className="card-color-picker" role="radiogroup" aria-label="Card Color">
                    {CARD_COLORS.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        role="radio"
                        aria-checked={editFormData.cardColor === col.id}
                        className={`card-color-swatch swatch-${col.id} ${editFormData.cardColor === col.id ? 'active' : ''}`}
                        onClick={() => setEditFormData((current) => ({ ...current, cardColor: col.id }))}
                        title={col.label}
                        aria-label={col.label}
                      >
                        <span className="swatch-indicator" style={col.bg ? { backgroundColor: col.bg } : undefined} />
                        {editFormData.cardColor === col.id && <Check size={12} className="swatch-check" />}
                      </button>
                    ))}
                    <label className="card-color-custom-label" title="Pick custom card background color">
                      <input
                        type="color"
                        className="custom-color-input"
                        value={editFormData.cardColor?.startsWith('#') ? editFormData.cardColor : '#ffffff'}
                        onChange={(e) => setEditFormData((c) => ({ ...c, cardColor: e.target.value }))}
                        aria-label="Custom card background color"
                      />
                      <Pipette size={13} className="custom-picker-icon" />
                    </label>
                  </div>
                </div>

                <div className="field">
                  <div className="field-label-row">
                    <span>Category</span>
                    <span className="field-hint">Click a category to select it</span>
                  </div>
                  <div className="category-select-chips" role="radiogroup" aria-label="Select category">
                    {sortedCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        role="radio"
                        aria-checked={editFormData.category === category}
                        className={`category-select-chip ${editFormData.category === category ? 'selected' : ''}`}
                        onClick={() => setEditFormData((current) => ({ ...current, category }))}
                      >
                        <Tag size={13} />
                        {category}
                        {editFormData.category === category && <Check size={13} className="chip-check" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field-row">
                  <label className="field compact">
                    <span>Date</span>
                    <input
                      type="date"
                      value={editFormData.entryDate}
                      onChange={(event) => setEditFormData((current) => ({ ...current, entryDate: event.target.value }))}
                    />
                  </label>

                  <div className="field compact">
                    <span className="field-label-spacer" aria-hidden="true">&nbsp;</span>
                    <label className="favorite-toggle compact-fav">
                      <input
                        type="checkbox"
                        checked={editFormData.favorite}
                        onChange={(event) => setEditFormData((current) => ({ ...current, favorite: event.target.checked }))}
                      />
                      <Star size={16} className={editFormData.favorite ? 'filled' : ''} /> Add Favorite
                    </label>
                  </div>
                </div>

                <div className="form-footer">
                  <div className="preview-edit-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleCancelEditThought}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="primary-button save-button">
                      <Save size={16} /> Save changes
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="reading-content-flow">
                {/* Academic Metadata & Reader Controls */}
                <div className="reading-meta-bar">
                  <div className="reading-meta-left">
                    <span className="reading-category-pill">
                      <Tag size={13} />
                      {selectedThought.category || 'متفرق افکار'}
                    </span>
                    {selectedThought.author && (
                      <span className="reading-author-pill" title="قلم کار">
                        <User size={13} />
                        <span>قلم: {selectedThought.author}</span>
                      </span>
                    )}
                    <span className="reading-date-pill">
                      <CalendarDays size={13} />
                      {formatDate(selectedThought.entryDate || selectedThought.createdAt || selectedThought.timestamp)}
                    </span>
                    <span className="reading-readtime-pill" title="تخمینہ مطالعہ">
                      <Clock size={12} />
                      {`مطالعہ: ~${Math.max(1, Math.ceil((selectedThought.description || '').trim().split(/\s+/).filter(Boolean).length / 130))} منٹ`}
                    </span>
                  </div>

                  {/* Font Size Adjuster for comfortable reading */}
                  <div className="reading-font-controls" title="فونٹ سائز ایڈجسٹ کریں">
                    <button
                      type="button"
                      className="font-size-step-btn"
                      onClick={() => handleAdjustFontSize(-2)}
                      title="فونٹ کا سائز چھوٹا کریں (A-)"
                      aria-label="Decrease reading font size"
                    >
                      A-
                    </button>
                    <span className="font-size-val">{readingFontSize}px</span>
                    <button
                      type="button"
                      className="font-size-step-btn"
                      onClick={() => handleAdjustFontSize(2)}
                      title="فونٹ کا سائز بڑا کریں (A+)"
                      aria-label="Increase reading font size"
                    >
                      A+
                    </button>
                  </div>
                </div>

                {/* In-Reading Word Search Bar */}
                {inReadingSearchOpen && (
                  <div className="reading-search-bar" role="search" aria-label="In-thought word search">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="اس فکر کے متن میں کوئی بھی لفظ تلاش کریں..."
                      value={inReadingSearchQuery}
                      onChange={(e) => setInReadingSearchQuery(e.target.value)}
                      autoFocus
                      dir="auto"
                    />
                    {inReadingSearchQuery && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => setInReadingSearchQuery('')}
                        title="صاف کریں"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}

                {/* Academic Article Title */}
                <h1
                  className="reading-article-title"
                  dir="auto"
                  style={{
                    fontFamily: getFontFamilyCss(selectedThought.fontFamily) || "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif",
                  }}
                >
                  {highlightSearchWords(selectedThought.subject || 'بلا عنوان فکر', inReadingSearchQuery)}
                </h1>

                {/* Dedicated Google Gemini SoundPlayer */}
                <div className="reading-audio-wrapper">
                  <PostSoundPlayer
                    thought={selectedThought}
                    onRequireGeminiKey={() => setIsGeminiModalOpen(true)}
                    defaultRate={ttsRate}
                    defaultPitch={ttsPitch}
                  />
                </div>

                <div className="academic-ornament" aria-hidden="true">
                  <span>✦</span>
                  <span>•</span>
                  <span>✦</span>
                  <span>•</span>
                  <span>✦</span>
                </div>

                {/* Article Body */}
                <div
                  className="reading-article-body"
                  dir="auto"
                  style={{
                    fontSize: `${readingFontSize}px`,
                    lineHeight: 2.45,
                    textAlign: selectedThought.descriptionAlign || 'right',
                    color: selectedThought.textColor || undefined,
                    fontWeight: selectedThought.isBold ? '700' : undefined,
                    fontStyle: selectedThought.isItalic ? 'italic' : undefined,
                    fontFamily: getFontFamilyCss(selectedThought.fontFamily) || "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif",
                  }}
                >
                  {renderFormattedContent(selectedThought.description, inReadingSearchQuery)}
                </div>

                <div className="academic-ornament footer-ornament" aria-hidden="true">
                  <span>✦</span>
                  <span>•</span>
                  <span>✦</span>
                  <span>•</span>
                  <span>✦</span>
                </div>

                {/* Article Footnotes & Quick Navigation */}
                <footer className="reading-page-footer">
                  <div className="reading-footer-tags">
                    <span className="footer-tag-item">
                      <strong>موضوع:</strong> {selectedThought.category || 'متفرق'}
                    </span>
                    {selectedThought.author && (
                      <span className="footer-tag-item">
                        <strong>قلم کار:</strong> {selectedThought.author}
                      </span>
                    )}
                    {selectedThought.fontFamily && (
                      <span className="footer-tag-item">
                        <strong>رسم الخط:</strong> {FONT_OPTIONS.find((f) => f.id === selectedThought.fontFamily)?.label || selectedThought.fontFamily}
                      </span>
                    )}
                    {selectedThought.favorite && (
                      <span className="footer-tag-item favorite-badge">
                        <Star size={13} className="filled" /> پسندیدہ
                      </span>
                    )}
                  </div>
                  <div className="reading-footer-nav">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => navigateTo('similar')}
                      title="مماثل افکار دریافت کریں"
                    >
                      <Sparkles size={16} />
                      <span>مماثل افکار</span>
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={closeSelectedThought}
                      title="تمام افکار کی طرف واپسی"
                    >
                      <ArrowRight size={16} />
                      <span>واپسی</span>
                    </button>
                  </div>
                </footer>
              </div>
            )}
          </article>
        ) : (
          <>

        {activeView === 'home' && (
          <CollectionsView
            categories={sortedCategories}
            thoughts={thoughts}
            collectionSearchQuery={collectionSearchQuery}
            setCollectionSearchQuery={setCollectionSearchQuery}
            collectionSelectedCategory={collectionSelectedCategory}
            setCollectionSelectedCategory={setCollectionSelectedCategory}
            collectionFavoritesOnly={collectionFavoritesOnly}
            setCollectionFavoritesOnly={setCollectionFavoritesOnly}
            formatDate={formatDate}
            summarizeText={summarizeText}
            setSelectedThought={handleSelectThought}
            toggleFavorite={toggleFavorite}
            onRequestDeleteThought={requestDeleteThought}
            onAddThought={() => requestProtectedView('add')}
            onCopyThought={handleCopyThought}
            onListenThought={handleQuickListenThought}
            activeSpeakingThoughtId={activeSpeakingThoughtId}
            isLoadingAudio={isLoadingAudio}
            onRequireGeminiKey={() => setIsGeminiModalOpen(true)}
          />
        )}

        {activeView === 'similar' && (
          <SimilarThoughtsView
            thoughts={thoughts}
            categories={sortedCategories}
            formatDate={formatDate}
            summarizeText={summarizeText}
            setSelectedThought={handleSelectThought}
            toggleFavorite={toggleFavorite}
            onCopyThought={handleCopyThought}
            onListenThought={handleQuickListenThought}
            activeSpeakingThoughtId={activeSpeakingThoughtId}
            isLoadingAudio={isLoadingAudio}
          />
        )}

        {activeView === 'add' && (
          <section className="composer-page">
            <div className="composer-layout">
              <div
                className={`capture-card ${formData.cardColor && !formData.cardColor.startsWith('#') ? `card-color-${formData.cardColor}` : ''}`}
                style={formData.cardColor?.startsWith('#') ? { backgroundColor: formData.cardColor } : undefined}
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">New thought</p>
                    <h2>Add a thought</h2>
                  </div>
                  <div className="chip">{thoughts.length} entries</div>
                </div>

                <form
                  className="entry-form"
                  onSubmit={handleSaveThought}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveThought();
                    }
                  }}
                >
                  {/* Practical Composer Quick Bar */}
                  <div className="composer-quick-bar">
                    <button
                      type="button"
                      className="composer-pill-btn"
                      onClick={() => handlePasteToDescription(false)}
                      title="Paste clipboard text into description"
                      aria-label="Paste text"
                    >
                      <ClipboardPaste size={15} />
                    </button>

                    <button
                      type="button"
                      className="composer-pill-btn"
                      onClick={() => {
                        const draftText = `${formData.subject ? formData.subject + '\n\n' : ''}${formData.description || ''}`.trim();
                        if (!draftText) {
                          showPasteToast('Draft is empty');
                          return;
                        }
                        navigator.clipboard.writeText(draftText);
                        showPasteToast('Draft copied to clipboard!');
                      }}
                      title="Copy current draft"
                      aria-label="Copy draft"
                    >
                      <Copy size={15} />
                    </button>

                    <button
                      type="button"
                      className={`composer-pill-btn ${(isSpeaking || isLoadingAudio) && activeSpeakingThoughtId === 'draft' ? 'active' : ''}`}
                      onClick={() => {
                        if ((isSpeaking || isLoadingAudio) && activeSpeakingThoughtId === 'draft') {
                          ttsStop();
                          setActiveSpeakingThoughtId(null);
                          return;
                        }
                        const draftText = `${formData.subject ? formData.subject + '. ' : ''}${formData.description || ''}`.trim();
                        if (!draftText) {
                          showPasteToast('Nothing to listen to');
                          return;
                        }
                        const isUr = containsUrdu(draftText);
                        setActiveSpeakingThoughtId('draft');
                        speak(draftText, {
                          lang: isUr ? 'ur-PK' : voiceLang,
                          rate: ttsRate,
                          pitch: ttsPitch,
                          engine: 'gemini',
                          onEnd: () => setActiveSpeakingThoughtId(null),
                          onError: (err) => {
                            setActiveSpeakingThoughtId(null);
                            if (err?.code === 'MISSING_GEMINI_KEY') {
                              setIsGeminiModalOpen(true);
                            }
                          },
                        });
                      }}
                      title="Listen to draft in Google Gemini studio voice"
                      aria-label="Listen draft"
                    >
                      {isLoadingAudio && activeSpeakingThoughtId === 'draft' ? (
                        <Loader2 size={15} className="spin-icon" />
                      ) : isSpeaking && activeSpeakingThoughtId === 'draft' ? (
                        <VolumeX size={15} />
                      ) : (
                        <Volume2 size={15} />
                      )}
                    </button>

                    <button
                      type="button"
                      className="composer-pill-btn"
                      disabled={isExportingAudio}
                      onClick={async () => {
                        const draftText = `${formData.subject ? formData.subject + '. ' : ''}${formData.description || ''}`.trim();
                        if (!draftText) {
                          showPasteToast('Add some text to export audio');
                          return;
                        }
                        setIsExportingAudio(true);
                        const isUr = containsUrdu(draftText);
                        const filename = `${(formData.subject || 'thought').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}.wav`;
                        const res = await exportAudio(draftText, { lang: isUr ? 'ur-PK' : voiceLang, filename });
                        setIsExportingAudio(false);
                        if (res && res.code === 'MISSING_GEMINI_KEY') {
                          setIsGeminiModalOpen(true);
                          return;
                        }
                        if (res && !res.success) {
                          showPasteToast(`Export failed: ${res.error || 'Check connection'}`);
                          return;
                        }
                        showPasteToast('Spiritual voice audio (.wav) exported!');
                      }}
                      title="Export spiritual voice audio (.wav)"
                      aria-label="Export audio"
                    >
                      {isExportingAudio ? <Loader2 size={15} className="spin-icon" /> : <Download size={15} />}
                    </button>

                    <button
                      type="button"
                      className="composer-pill-btn"
                      disabled={isTranslatingThought}
                      onClick={async () => {
                        const textToTrans = (formData.description || formData.subject || '').trim();
                        if (!textToTrans) {
                          showPasteToast('Add some text to translate');
                          return;
                        }
                        setIsTranslatingThought(true);
                        const isUr = containsUrdu(textToTrans);
                        const sLang = isUr ? 'ur' : 'en';
                        const tLang = isUr ? 'en' : 'ur';
                        try {
                          const transSubj = formData.subject ? await translate(formData.subject, sLang, tLang) : '';
                          const transDesc = formData.description ? await translate(formData.description, sLang, tLang) : '';
                          setFormData((c) => ({
                            ...c,
                            subject: transSubj || c.subject,
                            description: transDesc || c.description,
                          }));
                          showPasteToast(`Translated to ${tLang === 'ur' ? 'Urdu' : 'English'}`);
                        } catch {
                          showPasteToast('Translation failed');
                        } finally {
                          setIsTranslatingThought(false);
                        }
                      }}
                      title="Translate draft between Urdu & English"
                      aria-label="Translate draft"
                    >
                      {isTranslatingThought ? <Loader2 size={15} className="spin-icon" /> : <Languages size={15} />}
                    </button>
                  </div>

                  {/* Voice Input Panel */}
                  <VoicePanel
                    lang={voiceLang}
                    setLang={setVoiceLang}
                    ttsRate={ttsRate}
                    ttsPitch={ttsPitch}
                    voiceEngine={voiceEngine}
                    onRequireGeminiKey={() => setIsGeminiModalOpen(true)}
                    onNewChunk={(chunk) => {
                      // Each chunk is a NEW piece of final text — append with space & capitalize English
                      setFormData((c) => {
                        const prev = (c.description || '').trim();
                        if (!prev) {
                          const formatted = containsUrdu(chunk) ? chunk : formatEnglishSentence(chunk);
                          return { ...c, description: formatted };
                        }
                        const combined = `${prev} ${chunk}`;
                        const formatted = containsUrdu(combined) ? combined : formatEnglishSentence(combined);
                        return { ...c, description: formatted };
                      });
                    }}
                    onDraftComplete={({ subject, description }) => {
                      const isUrdu = containsUrdu(`${subject} ${description}`);
                      const fmtSub = !isUrdu && subject ? formatEnglishSentence(subject) : subject;
                      const fmtDesc = !isUrdu && description ? formatEnglishSentence(description) : description;
                      setFormData((c) => ({
                        ...c,
                        subject: fmtSub || c.subject,
                        description: fmtDesc || c.description,
                      }));
                    }}
                  />

                  <div className="field">
                    <div className="field-label-row">
                      <span className="flex-label">
                        <User size={14} /> مصنف / قلم کار (Author / Contributor)
                      </span>
                    </div>
                    <input
                      value={formData.author || ''}
                      onChange={(event) => setFormData((current) => ({ ...current, author: event.target.value }))}
                      placeholder="آپ کا نام یا قلم کار کا نام (e.g. Qaisar)"
                      dir="auto"
                    />
                  </div>

                  <div className="field">
                    <div className="field-label-row">
                      <span>Subject</span>
                      <button
                        type="button"
                        className="paste-quick-btn"
                        onClick={() => handlePasteToSubject(false)}
                        title="Paste from clipboard into subject"
                        aria-label="Paste into subject"
                      >
                        <ClipboardPaste size={13} />
                      </button>
                    </div>
                    <input
                      value={formData.subject}
                      onChange={(event) => setFormData((current) => ({ ...current, subject: event.target.value }))}
                      placeholder="What sparked this thought?"
                      dir="auto"
                      style={{
                        fontFamily: getFontFamilyCss(formData.fontFamily),
                      }}
                    />
                  </div>

                  {/* ── Description with Rich Formatting Toolbar ── */}
                  <div className="field">
                    <div className="field-label-row">
                      <span>Description</span>
                      <button
                        type="button"
                        className="paste-quick-btn"
                        onClick={() => handlePasteToDescription(false)}
                        title="Paste from clipboard into description"
                        aria-label="Paste into description"
                      >
                        <ClipboardPaste size={13} />
                      </button>
                    </div>

                    <div className="rich-toolbar" role="toolbar" aria-label="Text formatting tools">
                      <div className="toolbar-group">
                        <button
                          type="button"
                          className="toolbar-btn toolbar-paste-btn"
                          onClick={() => handlePasteToDescription(false)}
                          title="Paste from clipboard"
                          aria-label="Paste from clipboard"
                        >
                          <ClipboardPaste size={14} />
                        </button>
                      </div>

                      <div className="toolbar-divider" />

                      <div className="toolbar-group">
                        <button
                          type="button"
                          className={`toolbar-btn ${formData.descriptionAlign === 'left' ? 'active' : ''}`}
                          onClick={() => setFormData((c) => ({ ...c, descriptionAlign: 'left' }))}
                          title="Align left"
                        >
                          <AlignLeft size={14} />
                        </button>
                        <button
                          type="button"
                          className={`toolbar-btn ${formData.descriptionAlign === 'center' ? 'active' : ''}`}
                          onClick={() => setFormData((c) => ({ ...c, descriptionAlign: 'center' }))}
                          title="Align center"
                        >
                          <AlignCenter size={14} />
                        </button>
                        <button
                          type="button"
                          className={`toolbar-btn ${formData.descriptionAlign === 'right' ? 'active' : ''}`}
                          onClick={() => setFormData((c) => ({ ...c, descriptionAlign: 'right' }))}
                          title="Align right"
                        >
                          <AlignRight size={14} />
                        </button>
                        <button
                          type="button"
                          className={`toolbar-btn ${formData.descriptionAlign === 'justify' ? 'active' : ''}`}
                          onClick={() => setFormData((c) => ({ ...c, descriptionAlign: 'justify' }))}
                          title="Justify text"
                        >
                          <AlignJustify size={14} />
                        </button>
                      </div>

                      <div className="toolbar-divider" />

                      <div className="toolbar-group">
                        <button
                          type="button"
                          className={`toolbar-btn ${formData.isBold ? 'active' : ''}`}
                          onClick={() => {
                            if (addTextareaRef.current?.selectionStart !== addTextareaRef.current?.selectionEnd) {
                              handleInsertTag(addTextareaRef, '**', '**', false);
                            } else {
                              setFormData((c) => ({ ...c, isBold: !c.isBold }));
                            }
                          }}
                          title="Bold"
                        >
                          <Bold size={14} />
                        </button>
                        <button
                          type="button"
                          className={`toolbar-btn ${formData.isItalic ? 'active' : ''}`}
                          onClick={() => {
                            if (addTextareaRef.current?.selectionStart !== addTextareaRef.current?.selectionEnd) {
                              handleInsertTag(addTextareaRef, '*', '*', false);
                            } else {
                              setFormData((c) => ({ ...c, isItalic: !c.isItalic }));
                            }
                          }}
                          title="Italic"
                        >
                          <Italic size={14} />
                        </button>
                        <button
                          type="button"
                          className="toolbar-btn"
                          onClick={() => handleInsertTag(addTextareaRef, '\n• ', '', false)}
                          title="Insert bullet point"
                        >
                          <List size={14} />
                        </button>
                        <button
                          type="button"
                          className="toolbar-btn"
                          onClick={() => handleInsertTag(addTextareaRef, '\n> ', '', false)}
                          title="Insert quote block"
                        >
                          <Quote size={14} />
                        </button>
                      </div>

                      <div className="toolbar-divider" />

                      <div className="toolbar-color-group">
                        <span className="toolbar-label" title="Text Color">
                          <Type size={13} />
                        </span>
                        {TEXT_COLORS.map((tc) => (
                          <button
                            key={tc.id}
                            type="button"
                            className={`color-dot-btn ${formData.textColor === tc.color ? 'active' : ''}`}
                            style={{ backgroundColor: tc.color || 'var(--text-primary)' }}
                            onClick={() => setFormData((c) => ({ ...c, textColor: tc.color }))}
                            title={tc.label}
                            aria-label={tc.label}
                          />
                        ))}
                        <label className="custom-color-picker-btn" title="Pick custom text color">
                          <input
                            type="color"
                            className="custom-color-input"
                            value={formData.textColor?.startsWith('#') ? formData.textColor : '#1f2937'}
                            onChange={(e) => setFormData((c) => ({ ...c, textColor: e.target.value }))}
                            aria-label="Custom text color"
                          />
                          <Pipette size={11} className="picker-pipette-icon" />
                        </label>
                      </div>

                      <div className="toolbar-divider" />

                      <div className="toolbar-group font-select-group">
                        <span className="toolbar-label" title="Font Style">
                          <Type size={13} />
                        </span>
                        <select
                          className="font-picker-select"
                          value={formData.fontFamily || ''}
                          onChange={(e) => setFormData((c) => ({ ...c, fontFamily: e.target.value }))}
                          title="Select Font"
                          aria-label="Font family"
                        >
                          <option value="">Default Font</option>
                          <optgroup label="── Urdu & Arabic Fonts (خطوط اردو وعربية) ──">
                            {FONT_OPTIONS.filter((f) => f.group === 'Urdu / Arabic').map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="── English Fonts ──">
                            {FONT_OPTIONS.filter((f) => f.group === 'English').map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    <textarea
                      ref={addTextareaRef}
                      rows="6"
                      value={formData.description}
                      onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Add deeper notes, reflections, or context... (Supports **bold**, *italic*, bullets •)"
                      dir="auto"
                      style={{
                        textAlign: formData.descriptionAlign || 'right',
                        color: formData.textColor || undefined,
                        fontWeight: formData.isBold ? '700' : 'normal',
                        fontStyle: formData.isItalic ? 'italic' : 'normal',
                        fontFamily: getFontFamilyCss(formData.fontFamily),
                      }}
                    />
                    <div className="textarea-footer">
                      <span className="counter-text">{getCounts(formData.description)}</span>
                      <span className="shortcut-hint">Press Ctrl+Enter to save</span>
                    </div>
                  </div>

                  {/* ── Card Background Color Picker ── */}
                  <div className="field">
                    <div className="field-label-row">
                      <span className="flex-label">
                        <Palette size={14} /> Card Background Color
                      </span>
                      <span className="field-hint">Choose background tint for this card</span>
                    </div>

                    <div className="card-color-picker" role="radiogroup" aria-label="Card Background Color">
                      {CARD_COLORS.map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          role="radio"
                          aria-checked={formData.cardColor === col.id}
                          className={`card-color-swatch swatch-${col.id} ${formData.cardColor === col.id ? 'active' : ''}`}
                          onClick={() => setFormData((current) => ({ ...current, cardColor: col.id }))}
                          title={col.label}
                          aria-label={col.label}
                        >
                          <span className="swatch-indicator" style={col.bg ? { backgroundColor: col.bg } : undefined} />
                          {formData.cardColor === col.id && <Check size={12} className="swatch-check" />}
                        </button>
                      ))}
                      <label className="card-color-custom-label" title="Pick custom card background color">
                        <input
                          type="color"
                          className="custom-color-input"
                          value={formData.cardColor?.startsWith('#') ? formData.cardColor : '#ffffff'}
                          onChange={(e) => setFormData((c) => ({ ...c, cardColor: e.target.value }))}
                          aria-label="Custom card background color"
                        />
                        <Pipette size={13} className="custom-picker-icon" />
                      </label>
                    </div>
                  </div>

                  {/* ── Category Selection Chips ── */}
                  <div className="field">
                    <div className="field-label-row">
                      <span>Category</span>
                      <span className="field-hint">Click a category to select it</span>
                    </div>

                    <div className="category-select-chips" role="radiogroup" aria-label="Select category">
                      {sortedCategories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          role="radio"
                          aria-checked={formData.category === category}
                          className={`category-select-chip ${formData.category === category ? 'selected' : ''}`}
                          onClick={() => setFormData((current) => ({ ...current, category }))}
                        >
                          <Tag size={13} />
                          {category}
                          {formData.category === category && <Check size={13} className="chip-check" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field-row">
                    <label className="field compact">
                      <span>Date</span>
                      <input
                        type="date"
                        value={formData.entryDate}
                        onChange={(event) => setFormData((current) => ({ ...current, entryDate: event.target.value }))}
                      />
                    </label>

                    <div className="field compact">
                      <span className="field-label-spacer" aria-hidden="true">&nbsp;</span>
                      <label className="favorite-toggle compact-fav">
                        <input
                          type="checkbox"
                          checked={formData.favorite}
                          onChange={(event) => setFormData((current) => ({ ...current, favorite: event.target.checked }))}
                        />
                        <Star size={16} className={formData.favorite ? 'filled' : ''} /> Add Favorite
                      </label>
                    </div>
                  </div>

                  <div className="form-footer">
                    <button type="submit" className="primary-button save-button">
                      <Save size={16} /> Save thought
                    </button>
                  </div>
                </form>
              </div>

              {/* Sidebar Stats */}
              <div className="stats-card">
                <div className="stat-row">
                  <div className="stat-icon">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <strong>{thoughts.length}</strong>
                    <span>Total thoughts</span>
                  </div>
                </div>
                <div className="stat-row">
                  <div className="stat-icon">
                    <Heart size={18} />
                  </div>
                  <div>
                    <strong>{favoriteCount}</strong>
                    <span>Favorites</span>
                  </div>
                </div>
                <div className="stat-row">
                  <div className="stat-icon">
                    <Tag size={18} />
                  </div>
                  <div>
                    <strong>{categories.length}</strong>
                    <span>Categories</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeView === 'settings' && (
          <SettingsView
            theme={theme}
            setTheme={setTheme}
            categories={sortedCategories}
            thoughts={thoughts}
            onAddCategory={handleAddCategory}
            onRequestDeleteCategory={requestDeleteCategory}
            token={token}
            status={status}
            isSyncing={isSyncing}
            handleRefreshMemory={handleRefreshMemory}
            handleLogin={handleLogin}
            handleLogout={handleLogout}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onManualToken={handleManualToken}
            ttsRate={ttsRate}
            setTtsRate={setTtsRate}
            ttsPitch={ttsPitch}
            setTtsPitch={setTtsPitch}
            voiceEngine={voiceEngine}
            setVoiceEngine={setVoiceEngine}
            isSpeaking={isSpeaking}
            onStopTTS={ttsStop}
            onTestSpeak={(text, lang) => {
              speak(text, {
                lang,
                rate: ttsRate,
                pitch: ttsPitch,
                engine: 'gemini',
              });
            }}
          />
        )}

          </>
        )}
      </main>

      {/* ── Floating Paste Toast ── */}
      {pasteToast && (
        <div className="paste-toast" role="status" aria-live="polite">
          <CheckCircle size={15} />
          <span>{pasteToast}</span>
        </div>
      )}

      {/* ── Security Password Modal (@ThoughtsOrganizer@) ── */}
      {passwordModalOpen && (
        <div className="preview-backdrop password-modal-backdrop" role="dialog" aria-modal="true" onClick={handleCancelPassword}>
          <div className="password-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="password-modal-header">
              <div className="password-icon-badge">
                <Lock size={26} />
              </div>
              <h3>محفوظ رسائی (Protected Access)</h3>
              <p>
                {pendingTargetView === 'settings' ? 'ترتیبات (Settings)' : 'نیا فکر شامل کرنے (Add Thought)'} کے لیے پاس ورڈ درج کریں:
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="password-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="password-field-input"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="پاس ورڈ درج کریں..."
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <label className="password-remember-label">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                />
                <span>پاس ورڈ محفوظ رکھیں (Save password on this device)</span>
              </label>

              {passwordError && (
                <div className="password-error-alert" role="alert">
                  {passwordError}
                </div>
              )}

              <div className="password-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCancelPassword}
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  className="primary-button"
                >
                  <Lock size={15} />
                  <span>تصدیق کریں (Unlock)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Global Confirm Deletion Modal ── */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText || 'منسوخ (Cancel)'}
        onConfirm={() => {
          if (confirmModal.action) confirmModal.action();
        }}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ── Gemini AI Setup Modal ── */}
      <GeminiKeyModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        onSuccess={() => {
          showPasteToast('Gemini connected! Studio voice & Urdu AI ready.');
        }}
      />

      {/* ── Desktop FAB: Add Thought ── */}
      <button
        type="button"
        className={`desktop-fab ${activeView === 'add' ? 'active' : ''}`}
        onClick={() => requestProtectedView(activeView === 'add' ? 'home' : 'add')}
        aria-label="Add new thought"
        title="Add new thought"
      >
        {activeView === 'add' ? <X size={24} /> : <Plus size={24} />}
      </button>

      {/* ── Mobile Bottom Navigation Bar (Ergonomic for Phones & Tablets) ── */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-item ${activeView === 'home' ? 'active' : ''}`}
          onClick={() => handleSwitchView('home')}
          aria-label="Home"
        >
          <BookOpen size={19} />
          <span>تمام افکار</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeView === 'similar' ? 'active' : ''}`}
          onClick={() => handleSwitchView('similar')}
          aria-label="Similar"
        >
          <Layers size={19} />
          <span>مماثل افکار</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-fab ${activeView === 'add' ? 'active' : ''}`}
          onClick={() => requestProtectedView('add')}
          aria-label="New Thought"
          title="نیا فکر تحریر کریں"
        >
          <Plus size={26} />
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => requestProtectedView('settings')}
          aria-label="Settings"
        >
          <Settings size={19} />
          <span>ترتیبات</span>
        </button>
      </nav>
    </div>
  );
}
