import path from 'node:path';
import threads from 'node:worker_threads';
import { DOMContentExtractor, HTMLTemplateProcessor } from '@lugu-manus/shrink-dom';
import { JSDOM } from 'jsdom';

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
      const domContentExtractor = new DOMContentExtractor();
      const dom = new JSDOM(annotatedHTML);
      const domContent = domContentExtractor.extract(dom.window.document.body);
      const htmlTemplateProcessor = new HTMLTemplateProcessor();
      threads.parentPort?.postMessage(
        htmlTemplateProcessor.processHTML((domContent as HTMLElement).outerHTML),
      );
    } catch (error) {
      threads.parentPort?.postMessage({ error: String(error) });
    }
  });
}
export default threads.isMainThread ? shrinkHtmlMainThread : shrinkHtmlWorkerThread();
