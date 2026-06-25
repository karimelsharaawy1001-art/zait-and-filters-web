'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, Sparkles, Tag, ArrowLeft } from 'lucide-react';
import { optimizeImageUrl } from '@/lib/images';

interface Suggestion {
  type: 'product' | 'category' | 'smart';
  id?: string;
  label: string;
  sublabel?: string;
  price?: number;
  image?: string;
  url: string;
}

interface Props {
  placeholder?: string;
  onClose?: () => void;
  autoFocus?: boolean;
  compact?: boolean; // true = navbar mode, false = full hero mode
}

export default function SmartSearchBar({ placeholder = 'ابحث عن قطعة غيار، ماركة، سيارة...', onClose, autoFocus, compact = true }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setOpen(true);
      setHighlighted(-1);
    } catch { setSuggestions([]); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 1) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 280);
  };

  const navigate = (url: string) => {
    setOpen(false);
    setQuery('');
    setSuggestions([]);
    onClose?.();
    router.push(url);
  };

  const submit = () => {
    if (!query.trim()) return;
    // If there's a smart suggestion at index 0, prefer it for full flexibility
    if (suggestions.length > 0 && suggestions[0].type === 'smart') {
      navigate(suggestions[0].url);
    } else {
      navigate(`/store?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') { setOpen(false); onClose?.(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0) navigate(suggestions[highlighted].url);
      else submit();
    }
    else if (e.key === 'Escape') { setOpen(false); onClose?.(); }
  };

  const clearQuery = () => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const iconSize = compact ? 17 : 20;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* ── Input row ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#fff', border: `1.5px solid ${open ? '#22c55e' : '#e5e7eb'}`,
        borderRadius: compact ? '12px' : '16px',
        padding: compact ? '7px 12px' : '10px 16px',
        gap: '8px', transition: 'border-color 0.15s',
        boxShadow: open ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
      }}>
        <Search size={iconSize} color={open ? '#22c55e' : '#9ca3af'} style={{ flexShrink: 0, transition: 'color 0.15s' }} />
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 1 && setOpen(true)}
          placeholder={placeholder}
          dir="rtl"
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: compact ? '0.88rem' : '1rem', color: '#111', direction: 'rtl',
            fontFamily: 'inherit',
          }}
        />
        {loading && <Loader2 size={14} color="#22c55e" style={{ flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />}
        {!loading && query && (
          <button onClick={clearQuery} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0, flexShrink: 0 }}>
            <X size={14} />
          </button>
        )}
        <button
          onClick={submit}
          style={{
            background: '#22c55e', border: 'none', borderRadius: '8px',
            padding: compact ? '5px 12px' : '7px 16px',
            color: '#fff', fontWeight: '700', fontSize: compact ? '0.8rem' : '0.88rem',
            cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
        >
          بحث
        </button>
      </div>

      {/* ── Suggestions dropdown ── */}
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, left: 0,
          background: '#fff', borderRadius: '16px', zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e5e7eb', overflow: 'hidden',
          animation: 'searchDropIn 0.15s ease',
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes searchDropIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
            @keyframes spin { to { transform: rotate(360deg); } }
            .srch-item:hover { background: #f0fdf4 !important; }
          `}} />

          {suggestions.map((s, i) => (
            <button
              key={i}
              className="srch-item"
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => navigate(s.url)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'right',
                background: highlighted === i ? '#f0fdf4' : '#fff',
                borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                transition: 'background 0.1s', direction: 'rtl',
              }}
            >
              {/* Icon / image */}
              {s.type === 'product' && s.image ? (
                <img
                  src={optimizeImageUrl(s.image)} alt=""
                  style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '8px', background: '#f8fafc', border: '1px solid #f0f0f0', flexShrink: 0 }}
                />
              ) : s.type === 'smart' ? (
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #bbf7d0' }}>
                  <Sparkles size={16} color="#16a34a" />
                </div>
              ) : s.type === 'category' ? (
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #bfdbfe' }}>
                  <Tag size={16} color="#3b82f6" />
                </div>
              ) : (
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #e5e7eb' }}>
                  <Search size={16} color="#9ca3af" />
                </div>
              )}

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem', fontWeight: s.type === 'smart' ? '800' : '700',
                  color: s.type === 'smart' ? '#15803d' : '#111',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </div>
                {s.sublabel && (
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.sublabel}
                  </div>
                )}
              </div>

              {/* Price */}
              {s.type === 'product' && s.price && (
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#16a34a', flexShrink: 0 }}>
                  {Number(s.price).toLocaleString('ar-EG')} ج.م
                </div>
              )}

              {/* Arrow for smart suggestion */}
              {s.type === 'smart' && (
                <ArrowLeft size={14} color="#16a34a" style={{ flexShrink: 0 }} />
              )}
            </button>
          ))}

          {/* Footer hint */}
          <div style={{ padding: '7px 14px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', fontSize: '0.68rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <kbd style={{ background: '#e5e7eb', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', color: '#374151', fontFamily: 'monospace' }}>↑↓</kbd>
            للتنقل
            <kbd style={{ background: '#e5e7eb', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', color: '#374151', fontFamily: 'monospace' }}>Enter</kbd>
            للاختيار
            <kbd style={{ background: '#e5e7eb', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', color: '#374151', fontFamily: 'monospace' }}>Esc</kbd>
            إغلاق
          </div>
        </div>
      )}
    </div>
  );
}
