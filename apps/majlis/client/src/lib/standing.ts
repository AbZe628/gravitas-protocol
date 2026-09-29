import type { PassageStep } from './api.js';
import { useI18n } from './i18n.js';
import { nameOf, useMembers } from './members.js';

/**
 * What stands in a step's way, in words — and whom it still waits on, by name.
 *
 * The server says who by scholar id, as it does everywhere, and used to write
 * the ids into the sentence as well: the vote read *waiting on member-c,
 * member-d, member-e* on every screen that drew it. A sentence cannot turn an
 * id into a person, so the ids travel beside it and are named here, once, for
 * every screen that says where a step stands.
 */
export function useStanding(): (step: PassageStep | null | undefined) => string {
  const { t, say } = useI18n();
  const members = useMembers();
  return (step) => {
    if (!step) return '';
    const said = say(step.standing);
    const on = step.waitingOn?.length
      ? t('passage.waitingOn', { who: step.waitingOn.map((id) => nameOf(members, id)).join(', ') })
      : '';
    return [said, on].filter(Boolean).join(' ');
  };
}
