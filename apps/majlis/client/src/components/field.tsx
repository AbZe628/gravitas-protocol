import { useId, type ReactNode } from 'react';

/**
 * A box to fill in, with the words that say what belongs in it attached to it.
 *
 * ── the fault this closes ─────────────────────────────────────────────────
 *
 * Sixty-six boxes in this application sat directly beneath a heading that was
 * not joined to them. On the screen it reads correctly, so the fault is
 * invisible to anyone looking at it. Three things follow from it anyway:
 *
 *   A member reading with a screen reader arrives at an unnamed box. The
 *   heading was announced a moment earlier as loose text, and the machine has
 *   no way to say it belongs to what the cursor is now in.
 *
 *   Pressing the words does not put the cursor in the box. Every other
 *   application a member uses does this, so they press, nothing happens, and
 *   they press again in the box.
 *
 *   A test cannot find the box by asking for it by name — and this is how the
 *   fault was caught. A test written to prove that a failed act keeps the
 *   screen looked for the reason box by its heading, did not find it, quietly
 *   skipped filling it in, left the act disabled, pressed it to no effect and
 *   reported that it had passed. It would have passed against any code at all.
 *
 * ── so the joining is not optional here ───────────────────────────────────
 *
 * The identifier is made by React, handed to whatever the caller renders, and
 * the heading points at it. A caller cannot render the box without receiving
 * the identifier, which is the only reason this is a function taking a
 * function rather than a wrapper that hopes.
 *
 * The help line, where there is one, is joined the same way, so it is read out
 * with the box rather than lost above it.
 */
/** The heading a box carries on the ordinary screens. */
export const HEADING = 'mb-1.5 block text-[12px] text-muted';

export function Field({
  label,
  help,
  className,
  headingClass,
  helpClass,
  children,
}: {
  /** What the box is for, in the board's words. */
  label: string;
  /** A sentence under it, when the heading alone does not settle what to write. */
  help?: ReactNode;
  className?: string;
  /** The heading's own look, where a screen sets its headings differently. */
  headingClass?: string;
  helpClass?: string;
  /** Rendered with the attributes that join it to its heading. Spread them on. */
  children: (attrs: { id: string; 'aria-describedby': string | undefined }) => ReactNode;
}) {
  const id = useId();
  const helpId = help ? id + '-help' : undefined;

  /*
   * A column, with the box pushed to the bottom of it.
   *
   * Two boxes side by side in a row, one of them with a help line and one
   * without, landed at different heights the moment the help moved above the
   * box: *Opening balance* and *Cap* sat on different baselines with nothing
   * to explain why. Grid and flex rows already stretch their cells to the
   * tallest, so pushing the box down settles both onto the same line without
   * either caller having to know what the other one renders.
   */
  return (
    <div className={'flex h-full flex-col ' + (className ?? '')}>
      <label htmlFor={id} className={headingClass ?? 'mb-1 block text-[12px] text-muted'}>
        {label}
      </label>
      {help && (
        <p
          id={helpId}
          className={helpClass ?? 'mb-2 max-w-[62ch] text-[11.5px] leading-[1.6] text-muted'}
        >
          {help}
        </p>
      )}
      <div className="mt-auto">{children({ id, 'aria-describedby': helpId })}</div>
    </div>
  );
}

/**
 * A box to tick, with its words beside it.
 *
 * The other way round from `Field`: here the words sit after the box and the
 * whole thing is one target, so the words are inside the label element and no
 * identifier has to travel anywhere.
 */
export function Tick({
  checked,
  onChange,
  children,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={'inline-flex cursor-pointer items-center gap-2 ' + (className ?? '')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-lapis"
      />
      <span className="text-[12.5px] text-sand">{children}</span>
    </label>
  );
}
