/**
 * What a screen had, kept past the drawing of it.
 *
 * A list drawn a second time — in the column beside the work, or on the way
 * back to it — should open as it was left: the rows it had, narrowed the way
 * the member narrowed them. React forgets both the moment the screen goes, so
 * they are kept here, under the screen's name, for as long as the page is
 * open. Nothing is written anywhere the next person to use this window could
 * read it; a page load starts empty.
 */
const store = new Map<string, unknown>();

export function keep<T>(name: string, value: T): void {
  store.set(name, value);
}

export function kept<T>(name: string): T | undefined {
  return store.get(name) as T | undefined;
}

/** Forget all of it — on signing out, and before every test. */
export function forgetKept(): void {
  store.clear();
}
