import { QueryClientProvider } from '@tanstack/react-query';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import { queryClient } from './utils/trpc';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
