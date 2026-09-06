import { useEffect, useRef, useState } from 'react';
import { useHealth } from '../lib/health.js';
import { useI18n } from '../lib/i18n.js';

/**
 * Speaking a reason instead of typing it.
 *
 * Stating why, with every vote, is the friction this product exists for — and
 * it is the slowest thing a scholar does here. Speaking is the one way to make
 * it fast without making it optional: the words are still theirs, still fresh,
 * still in their own register. Nothing is pre-filled, suggested or inherited,
 * and no model writes a fiqh reason for anybody.
 *
 * ── it appends, and never replaces ────────────────────────────────────────
 *
 * What is spoken is added to whatever is already in the field. A member who has
 * typed two sentences and then speaks a third has three; a control that
 * overwrote them would lose work with no warning and no undo, which is a bad
 * trade for a saved keystroke.
 *
 * ── and it says where the audio goes, once, before the first use ──────────
 *
 * The browser's speech recognition is not local in the browser most people use:
 * the recording is sent away to be transcribed. The institution turned this on;
 * the member holding the microphone did not, and is entitled to know before
 * they press it. The sentence comes from the server so that one statement
 * describes the installation.
 *
 * Answered once per browser. Asking every time would train people to dismiss
 * it, which is worse than not asking.
 *
 * ── absent where it cannot work ───────────────────────────────────────────
 *
 * Off unless the institution chose it, and off unless this browser has the
 * capability. In either case there is no control — not a disabled one — and
 * typing was always the path anyway.
 */

/*
 * Declared here rather than imported.
 *
 * Speech recognition is not in the DOM library TypeScript ships, because it has
 * never been a settled standard — which is also why the capability is checked
 * at runtime rather than assumed. Only what this component actually touches is
 * described; a fuller shape would be inventing a contract nobody guarantees.
 */
interface Recogniser {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (event: { resultIndex: number; results: Heard }) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface Heard {
  length: number;
  [index: number]: { isFinal: boolean; 0: { transcript: string } };
}

/** The two names browsers give the same thing. */
function recognitionClass(): (new () => Recogniser) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recogniser;
    webkitSpeechRecognition?: new () => Recogniser;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function Dictate({ onText }: { onText: (text: string) => void }) {
  const { t, lang } = useI18n();
  const health = useHealth();
  const [listening, setListening] = useState(false);
  const [asking, setAsking] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const recognition = useRef<Recogniser | null>(null);

  // Stop the microphone if this unmounts mid-sentence. A recogniser left
  // running after its panel has gone is a microphone nobody can see.
  useEffect(() => () => recognition.current?.stop(), []);

  const Recognition = recognitionClass();
  if (health?.dictation !== 'browser' || !Recognition) return null;

  const agreed = () => {
    try {
      return localStorage.getItem('majlis.dictation.told') === 'yes';
    } catch {
      // A browser that will not store it asks again, which is the safe failure.
      return false;
    }
  };

  function start() {
    setRefusal(null);
    const engine = new Recognition!();
    engine.lang = lang === 'ar' ? 'ar-SA' : lang === 'ur' ? 'ur-PK' : 'en-GB';
    engine.interimResults = false;
    engine.continuous = true;

    engine.onresult = (event) => {
      let said = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) said += event.results[i][0].transcript;
      }
      // Appended, never substituted. Two typed sentences and a spoken third
      // make three.
      if (said.trim()) onText(said.trim());
    };

    engine.onerror = (event) => {
      // In the browser's own words where it gave any. A microphone that stopped
      // for a reason nobody stated is the state people retry forever.
      setRefusal(event.error === 'not-allowed' ? t('dictate.denied') : t('dictate.failed'));
      setListening(false);
    };

    engine.onend = () => setListening(false);

    recognition.current = engine;
    engine.start();
    setListening(true);
  }

  function press() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    if (!agreed()) {
      setAsking(true);
      return;
    }
    start();
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={press}
        aria-pressed={listening}
        className={
          'rounded border px-3 py-1 text-[12px] transition-colors ' +
          (listening
            ? 'border-gold/60 text-goldsoft'
            : 'border-line text-muted hover:border-muted hover:text-paper')
        }
      >
        {listening ? t('dictate.stop') : t('dictate.start')}
      </button>

      {listening && (
        <span className="ms-2 text-[11.5px] text-muted">{t('dictate.listening')}</span>
      )}

      {refusal && (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-warn">{refusal}</p>
      )}

      {/*
        Where the audio goes, once, in the server's words. Not a dialogue that
        blocks the page: the field beneath is still typeable while this is up,
        because typing was always the path and this is the thing that leaves.
      */}
      {asking && (
        <div className="mt-2 rounded border border-line px-3 py-2.5">
          <p className="text-[12px] leading-relaxed text-muted">{health.dictationNote}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem('majlis.dictation.told', 'yes');
                } catch {
                  // Asked again next time rather than not offered at all.
                }
                setAsking(false);
                start();
              }}
              className="rounded border border-lapis/25 px-3 py-1 text-[12px] text-lapis font-medium"
            >
              {t('dictate.understood')}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="rounded border border-line px-3 py-1 text-[12px] text-muted"
            >
              {t('dictate.typeInstead')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
