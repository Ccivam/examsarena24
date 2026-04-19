const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub', 'hr']);
const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title', 'class', 'id']);

export function sanitizeHtml(html: string): string {
  const DOMParser = window.DOMParser;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  
  function sanitizeNode(node: Node): DocumentFragment | Text | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    
    const el = node as Element;
    const tagName = el.tagName.toLowerCase();
    
    if (!ALLOWED_TAGS.has(tagName)) {
      const fragment = document.createDocumentFragment();
      for (const child of Array.from(el.childNodes)) {
        const sanitized = sanitizeNode(child);
        if (sanitized) fragment.appendChild(sanitized);
      }
      return fragment;
    }
    
    const newEl = document.createElement(tagName);
    
    for (const attr of Array.from(el.attributes)) {
      if (ALLOWED_ATTRS.has(attr.name.toLowerCase())) {
        if (attr.name === 'href' || attr.name === 'src') {
          const url = attr.value.trim().toLowerCase();
          if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
            newEl.setAttribute(attr.name, attr.value);
          }
        } else {
          newEl.setAttribute(attr.name, attr.value);
        }
      }
    }
    
    for (const child of Array.from(el.childNodes)) {
      const sanitized = sanitizeNode(child);
      if (sanitized) newEl.appendChild(sanitized);
    }
    
    return newEl;
  }
  
  const result = document.createDocumentFragment();
  const body = doc.body.firstElementChild;
  if (body) {
    for (const child of Array.from(body.childNodes)) {
      const sanitized = sanitizeNode(child);
      if (sanitized) result.appendChild(sanitized);
    }
  }
  
  return result.innerHTML;
}
