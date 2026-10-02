import { useEffect, useState } from 'react';
import { governance, type Delivery, type Notice } from '../lib/api.js';
import { useI18n } from '../lib/i18n.js';
import Dialog from './Dialog.js';
import TheNotice from './TheNotice.js';
import { Button } from './Button';
import { ErrorText, Loading } from './ui.js';

/**
 * What a member would be told, without having opened this.
 *
 * ── the gap this is the visible end of ────────────────────────────────────
 *
 * Majlis answers *what needs you* perfectly well, and only to somebody already
 * looking at it. A question from the institution can sit for a week because
 * nobody happened to open the application, and the board's pace figure — the
 * one this product is sold on — carries every one of those days.
 *
 * ── and why the words are shown rather than described ─────────────────────
 *
 * A board is being asked to trust that a summary carrying its work through a
 * bank's mail system gives nothing away. That is not a thing to take on
 * assurance: the words are here, in full, so a secretary can read them before
 * deciding whether these go out at all. They carry counts, kinds, clocks and
 * addresses — no titles, and nothing about who is carrying what.
 *
 * ── and whether anything is actually sent ─────────────────────────────────
 *
 * On most installations, nothing. There is no mail channel wired and this
 * application has no clock of its own, so what makes a summary arrive is a
 * scheduler outside this process calling the same route. Both facts are said
 * here in words, because a member who believed they would be reminded and was
 * not is worse off than one who knows to come and look.
 */
export default function WhatWouldBeSent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [channel, setChannel] = useState<'none' | 'smtp' | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let current = true;
    setFailed(false);
    setDelivery(null);
    governance
      .waiting()
      .then((r) => {
        if (!current) return;
        setNotice(r.notice);
        setChannel(r.channel);
      })
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [open]);

  async function sendItNow() {
    setBusy(true);
    try {
      const r = await governance.sendWaiting();
      setNotice(r.notice);
      setDelivery(r.delivery);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      title={t('waiting.title')}
      onClose={onClose}
      acts={
        <Button
          type="button"
          onClick={onClose}
          className="text-ui text-muted hover:text-paper"
        >
          {t('common.back')}
        </Button>
      }
    >
      {failed ? (
        <ErrorText />
      ) : channel === null ? (
        <Loading />
      ) : notice === null ? (
        /* The ordinary good case, and worth saying rather than showing a blank. */
        <p className="max-w-[62ch] text-ui leading-relaxed text-muted">{t('waiting.nothing')}</p>
      ) : (
        <div className="grid gap-4">
          <p className="max-w-[62ch] text-ui leading-relaxed text-muted">{t('waiting.says')}</p>

          {/*
            The same panel the record uses for every other notice, so what is
            sent and what is shown cannot drift apart. Where nothing has been
            sent — which is this screen until somebody presses — it says so
            itself.
          */}
          <TheNotice
            notice={notice}
            delivery={
              delivery ?? {
                kind: channel,
                configured: channel !== 'none',
                sent: false,
                at: new Date().toISOString(),
              }
            }
          />

          <p className="max-w-[62ch] text-note leading-relaxed text-muted">
            {t(channel === 'none' ? 'waiting.noChannel' : 'waiting.noClock')}
          </p>

          {channel !== 'none' && !delivery?.sent && (
            <div>
              <Button
                type="button"
                onClick={sendItNow}
                disabled={busy}
                className="rounded-xl bg-gradient-to-br from-lapissoft to-lapis px-4 py-2 text-ui font-semibold text-white shadow-act transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? t('waiting.sending') : t('waiting.sendToMe')}
              </Button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
