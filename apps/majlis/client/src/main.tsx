import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.js';
import { I18nProvider, initialLang } from './lib/i18n.js';
import { loadLang } from './locales/index.js';
import './index.css';

function draw() {
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <I18nProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </React.StrictMode>,
  );
}

/*
 * The reader's own language first, then the first screen.
 *
 * Arabic and Urdu are fetched rather than shipped with the application (see
 * `loadLang`), and drawing before the chunk arrived would show an Arabic
 * reader the English fallback in a right-to-left frame and then swap every
 * word. For English this resolves at once. A failed fetch draws in English,
 * which is then the truth about what the reader is shown.
 */
loadLang(initialLang()).then(draw, draw);
