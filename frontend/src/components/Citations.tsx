import { useState } from 'react';
import type { Citation } from '../api/types';

export function Citations({ citations }: { citations: Citation[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="citations">
      <button
        className="citations-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        📚 Источники ({citations.length}) {open ? '▲' : '▼'}
      </button>
      {open && (
        <ul className="citations-list">
          {citations.map((c, i) => (
            <li key={`${c.documentId}-${i}`} className="citation">
              <div className="citation-head">
                <span className="citation-doc">{c.documentName}</span>
                {c.section && <span className="citation-section">{c.section}</span>}
                {typeof c.page === 'number' && (
                  <span className="citation-page">стр. {c.page}</span>
                )}
              </div>
              <blockquote className="citation-quote">{c.quote}</blockquote>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
