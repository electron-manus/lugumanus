import type { Observable, Subscription } from 'rxjs';

export interface ObservableToGeneratorOptions<T> {
  bufferSize?: number;
  processBuffer?: (buffer: T[]) => T[];
}

export function observableToGenerator<T>(
  observable: Observable<T>,
  options: ObservableToGeneratorOptions<T> = {},
): AsyncGenerator<T, void, unknown> {
  const { bufferSize = 0, processBuffer = (buffer) => buffer } = options;

  return (async function* () {
    const messages: T[] = [];
    let buffer: T[] = [];
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
        if (bufferSize > 0) {
          while (messages.length > 0 && buffer.length < bufferSize) {
            buffer.push(messages.shift() as T);
          }

          if (buffer.length >= bufferSize || (done && buffer.length > 0)) {
            const processedBuffer = processBuffer([...buffer]);
            buffer = [];

            for (const item of processedBuffer) {
              yield item;
            }
          }
        } else {
          while (messages.length > 0) {
            yield messages.shift() as T;
          }
        }

        if (!done && (bufferSize === 0 || messages.length === 0)) {
          messagePromise = new Promise<void>((resolve) => {
            resolvePromise = resolve;
          });
          await messagePromise;
        }
      }

      // 处理缓冲区中剩余的消息
      if (bufferSize > 0 && buffer.length > 0) {
        const processedBuffer = processBuffer([...buffer]);
        for (const item of processedBuffer) {
          yield item;
        }
      }
    } finally {
      subscription.unsubscribe();
    }
  })();
}
