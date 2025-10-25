//utils.js: ⬇
//util section: Small helper functions that make it easier

// Turn any text into a ...2
export function slugify(text = ''){
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') 
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g,'-');
}

// Show how long ago something happened in a simple way
export function timeAgo(iso){
  if(!iso) return '';    
  const then = new Date(iso);
  const diff = Date.now() - then.getTime();

  const s = Math.floor(diff/1000);
  if(s < 60) return `${s}s ago`;

  const m = Math.floor(s/60);
  if(m < 60) return `${m}m ago`;

  const h = Math.floor(m/60);
  if(h < 24) return `${h}h ago`;

  const d = Math.floor(h/24);
  if(d < 30) return `${d}d ago`;

  return then.toLocaleDateString(); // If more than 1 month, show date
}

export function debounce(fn, wait=300){
  let t;
  return (...args) => {
    clearTimeout(t); 
    t = setTimeout(()=> fn(...args), wait)
  };
}

// Make text safe for HTML (so no weird symbols break page)
export function escapeHtml(str = ''){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'", '&#39;');
}
