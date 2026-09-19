import { useEffect, useState } from 'react';
import { oversight, Refused } from '../lib/api.js';
import {
  asRefusal,
  available,
  enrolThisDevice,
  whyNot,
  type Device,
} from '../lib/devices.js';
import { useI18n } from '../lib/i18n.js';
import { DateText } from './ui.js';
import { Field, HEADING } from './field.js';
import { Button } from './Button';
import Act from './Act.js';
import AfterAct from './AfterAct.js';

/**
 * The devices this member signs with.
 *
 * ── what enrolling actually does ──────────────────────────────────────────
 *
 * It makes a signing key inside this laptop or phone. The key never leaves the
 * device and Majlis never holds it — what is kept here is the public half,
 * against the member's name. There is no wallet, no seed phrase, no fee and
 * nothing to install, which is the whole reason this is the way a scholar
 * signs rather than a key file somebody has to keep.
 *
 * ── the sentence under the button ─────────────────────────────────────────
 *
 * It says what a signature made this way proves, and what it does not. It
 * proves that someone held this device and unlocked it. It does not prove who
 * that person was — a phone lent to a colleague signs exactly as well for
 * them. That is true of a wet signature too, and a member is better served by
 * reading it than by a padlock icon.
 *
 * ── and where the browser cannot ──────────────────────────────────────────
 *
 * The API is absent outside a secure context, and a machine with no
 * fingerprint reader and no PIN has no authenticator to offer. Both are asked
 * before anything is drawn, and where the answer is no the panel says which of
 * the two it is. **A control that cannot be honoured is absent, not disabled.**
 */

export default function YourDevices() {
  const { t } = useI18n();

  const [devices, setDevices] = useState<Device[] | null>(null);
  const [can, setCan] = useState<'asking' | 'yes' | 'insecure' | 'unsupported' | 'no-authenticator'>(
    'asking',
  );

  const [naming, setNaming] = useState(false);
  const [label, setLabel] = useState('');
  const [refusal, setRefusal] = useState<string | null>(null);
  /** The device about to be forgotten, and the window asking about it. */
  const [forgetting, setForgetting] = useState<Device | null>(null);
  const [justDid, setJustDid] = useState<{
    did: string;
    means: string;
    next: readonly { label: string; to?: string; says?: string }[];
  } | null>(null);

  useEffect(() => {
    let alive = true;

    void (async () => {
      const ok = await available();
      const why = ok ? 'nothing' : await whyNot();
      if (!alive) return;
      setCan(ok ? 'yes' : (why === 'nothing' ? 'no-authenticator' : why));

      try {
        const held = await oversight.devices();
        if (alive) setDevices(held.devices);
      } catch {
        // A board with nothing enrolled and a reader with no seat both land
        // here, and neither is an error worth a red line on this screen.
        if (alive) setDevices([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function enrol() {
    const named = label.trim();
    try {
      const request = await oversight.askToEnrol();
      const answer = await enrolThisDevice(request, named);
      const kept = await oversight.enrolDevice(answer);
      setDevices((held) => [...(held ?? []), kept]);
      setLabel('');
    } catch (error) {
      /*
       * Closing the browser's own device prompt is not a fault and gets no
       * red line — but it is not a success either. Thrown rather than
       * swallowed, so the window says nothing was enrolled instead of saying
       * something was.
       */
      const refused = asRefusal(error);
      throw new Refused(
        refused.code,
        refused.code === 'cancelled' ? t('wm.enrol.cancelled') : refused.message,
        /* Nothing HTTP happened: the device prompt is the browser's own. */
        0,
      );
    }
  }

  async function forget(id: string) {
    await oversight.forgetDevice(id);
    setDevices((held) => (held ?? []).filter((d) => d.id !== id));
  }

  const BOX = 'w-full rounded-xl bg-raised px-3 py-2.5 text-body shadow-ring outline-none';

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="mb-1.5 text-label font-bold uppercase tracking-caps text-muted">
        {t('devices.heading')}
      </div>
      <p className="mb-3 max-w-[62ch] text-ui leading-relaxed text-sand">
        {t('devices.what')}
      </p>

      {devices && devices.length > 0 && (
        <ul className="mb-3 space-y-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card bg-raised px-4 py-3 shadow-ring"
            >
              <span className="text-body text-paper">{d.label}</span>
              <span className="text-note text-muted">
                {t('devices.since')} <DateText iso={d.enrolledAt} />
                {d.lastUsedAt && (
                  <>
                    <span className="mx-1.5 opacity-40">·</span>
                    {t('devices.lastUsed')} <DateText iso={d.lastUsedAt} />
                  </>
                )}
              </span>
              <Button
                type="button"
                onClick={() => setForgetting(d)}
                className="ms-auto text-note text-muted underline decoration-line underline-offset-4"
              >
                {t('devices.forget')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {devices && devices.length === 0 && can === 'yes' && (
        <p className="mb-3 max-w-[62ch] text-ui leading-relaxed text-muted">
          {t('devices.none')}
        </p>
      )}

      {/* The act, where the browser can honour it. */}
      {can === 'yes' && !naming && (
        <Button
          type="button"
          onClick={() => {
            setRefusal(null);
            setNaming(true);
          }}
          className="rounded-xl bg-raised px-4 py-2 text-ui font-semibold text-lapis shadow-ring"
        >
          {t('devices.enrol')}
        </Button>
      )}

      <Act
        open={can === 'yes' && naming}
        onClose={() => setNaming(false)}
        title={t('devices.enrol')}
        does={t('wm.enrol.does')}
        means={t('wm.enrol.means')}
        label={t('devices.enrolThis')}
        perform={enrol}
        onDone={setJustDid}
        after={{
          did: t('wm.enrol.did'),
          means: t('wm.enrol.didMeans'),
          next: [{ label: t('wm.next.devices'), says: t('wm.next.devicesSays') }],
        }}
      >
        <Field label={t('devices.label')} help={t('devices.labelHelp')} headingClass={HEADING}>
          {(attrs) => (
            <input
              {...attrs}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={120}
              className={BOX}
              required
            />
          )}
        </Field>
      </Act>

      <Act
        open={forgetting !== null}
        onClose={() => setForgetting(null)}
        title={t('devices.forget')}
        does={t('wm.forget.does')}
        means={t('wm.forget.means')}
        label={t('devices.forget')}
        grave
        perform={() => forget(forgetting!.id)}
        onDone={setJustDid}
        after={{
          did: t('wm.forget.did'),
          means: t('wm.forget.didMeans'),
          next: [{ label: t('wm.next.devices'), says: t('wm.next.devicesSays') }],
        }}
      >
        <p className="max-w-[58ch] text-ui leading-relaxed text-sand">{forgetting?.label}</p>
      </Act>

      {justDid && (
        <div className="mb-4">
          <AfterAct
            did={justDid.did}
            means={justDid.means}
            next={justDid.next}
            onClose={() => setJustDid(null)}
          />
        </div>
      )}

      {/*
        Why there is nothing to press. Said in place, with the reason, rather
        than a button that opens a dialog the browser cannot answer.
      */}
      {can !== 'yes' && can !== 'asking' && (
        <p className="max-w-[62ch] text-ui leading-relaxed text-muted">
          {t(
            can === 'insecure'
              ? 'devices.insecure'
              : can === 'unsupported'
                ? 'devices.unsupported'
                : 'devices.noAuthenticator',
          )}
        </p>
      )}

      {refusal && <p className="mt-3 text-ui leading-relaxed text-breach">{refusal}</p>}

      <p className="mt-3 max-w-[62ch] text-note leading-relaxed text-muted">
        {t('devices.proves')}
      </p>
    </div>
  );
}
