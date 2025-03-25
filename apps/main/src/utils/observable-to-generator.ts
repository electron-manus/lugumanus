import type { Observable, Subscription } from 'rxjs';

export function observableToGenerator<T>(
  observable: Observable<T>,
): AsyncGenerator<T, void, unknown> {
  return (async function* () {
    const messages: T[] = [];
    let done = false;
    let resolvePromise: (() => void) | null = null;
    let messagePromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    const subscription: Subscription = observable.subscribe({
      next: (message) => {
        messages.push(message);
        if (resolvePromise) {
          resolvePromise();
          resolvePromise = null;
        }
      },
      complete: () => {
        done = true;
        if (resolvePromise) resolvePromise();
      },
      error: () => {
        done = true;
        if (resolvePromise) resolvePromise();
      },
    });

    try {
      while (!done) {
        while (messages.length > 0) {
          yield messages.shift() as T;
        }

        if (!done) {
          messagePromise = new Promise<void>((resolve) => {
            resolvePromise = resolve;
          });
          await messagePromise;
        }
      }
    } finally {
      subscription.unsubscribe();
    }
  })();
}
