import path from 'node:path';
import threads from 'node:worker_threads';
import { JSDOM } from 'jsdom';
import { DOMContentExtractor, DOMShrinker } from 'shrink-dom';

async function shrinkHtmlMainThread(annotatedHTML: string) {
  const worker = new threads.Worker(path.resolve(import.meta.dirname, import.meta.filename));
  return new Promise((resolve, reject) => {
    worker.on('message', (result) => {
      resolve(result);
      worker.terminate();
    });
    worker.on('error', (error) => {
      reject(error);
      worker.terminate();
    });
    worker.postMessage(annotatedHTML);
  });
}

function shrinkHtmlWorkerThread() {
  threads.parentPort?.on('message', async (annotatedHTML: string) => {
    try {
      const dom = new JSDOM(annotatedHTML);
      const document = dom.window.document;
      const extractor = new DOMContentExtractor();
      const extractedDom = extractor.extract(document.documentElement);
      const shrinker = new DOMShrinker();
      if (!extractedDom) {
        throw new Error('Extracted DOM content is empty');
      }

      const isContentMeaningful = extractor.isContentMeaningful(extractedDom as HTMLElement);
      if (!isContentMeaningful) {
        throw new Error(
          'Content is not meaningful or there are too few valid nodes, switch to screenshot recognition',
        );
      }

      const result = shrinker.compressHTML(extractedDom as HTMLElement);
      threads.parentPort?.postMessage(result);
    } catch (error) {
      threads.parentPort?.postMessage({ error: String(error) });
    }
  });
}
export default threads.isMainThread ? shrinkHtmlMainThread : shrinkHtmlWorkerThread();
