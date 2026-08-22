import { useEffect } from 'react';

const SUFFIX = 'Gravitas Protocol';

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

/* One HTML file answers for every route, so the title and description written
   into it describe the application rather than the page in front of the reader.
   An institution works with many tabs open and each one should say where it is.
   This also gives a shared link something specific to show. */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const full = `${title} · ${SUFFIX}`;
    document.title = full;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', description);
  }, [title, description]);
}
