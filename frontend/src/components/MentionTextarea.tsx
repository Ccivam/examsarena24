import React, { useRef, useState } from 'react';
import axios from 'axios';

interface MentionUser {
  _id: string;
  name: string;
  username: string;
  picture?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
}

const MentionTextarea: React.FC<Props> = ({
  value, onChange, placeholder, rows = 4, maxLength, className, style, autoFocus,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const detectMention = (text: string, cursor: number) => {
    const before = text.slice(0, cursor);
    const match = before.match(/@([a-z0-9_]*)$/i);
    if (match) return { start: cursor - match[0].length, query: match[1] };
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(newVal);
    const mention = detectMention(newVal, cursor);
    if (mention) {
      setMentionStart(mention.start);
      setQuery(mention.query);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (mention.query.length >= 1) {
          axios.get(`/api/users/search?q=${encodeURIComponent(mention.query)}`, { withCredentials: true })
            .then(r => { setSuggestions(r.data); setActiveIdx(0); })
            .catch(() => setSuggestions([]));
        } else {
          setSuggestions([]);
        }
      }, 200);
    } else {
      setMentionStart(null);
      setQuery('');
      setSuggestions([]);
    }
  };

  const selectUser = (u: MentionUser) => {
    if (mentionStart === null) return;
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + query.length);
    const newText = `${before}@${u.username}${after}`;
    onChange(newText);
    setSuggestions([]);
    setMentionStart(null);
    setQuery('');
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = mentionStart + u.username.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestions[activeIdx]) { e.preventDefault(); selectUser(suggestions[activeIdx]); }
    } else if (e.key === 'Escape') { setSuggestions([]); }
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        className={className}
        style={style}
        rows={rows}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
      />
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 200,
          background: 'var(--c-paper)', border: '1px solid var(--c-border)',
          minWidth: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          {suggestions.map((u, i) => (
            <div
              key={u._id}
              onMouseDown={e => { e.preventDefault(); selectUser(u); }}
              style={{
                padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: i === activeIdx ? 'var(--c-paper-dark)' : 'transparent', fontSize: '0.85rem',
              }}
            >
              {u.picture ? (
                <img src={u.picture} alt={u.name} style={{ width: 22, height: 22, borderRadius: '50%' }} />
              ) : (
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--c-ink)', color: 'var(--c-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>
                  {u.name[0]?.toUpperCase()}
                </div>
              )}
              <span style={{ fontWeight: 600 }}>{u.name}</span>
              <span style={{ color: 'var(--c-ink-soft)', fontSize: '0.78rem' }}>@{u.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionTextarea;
