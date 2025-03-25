import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink, httpSubscriptionLink, splitLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
// @ts-ignore
import type { AppRouter } from '../../../main/src/app-router';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// @ts-ignore
const trpcClient = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => op.type === 'subscription',
      true: httpSubscriptionLink({
        url: 'handle://lugu', // 替换为你实际的WebSocket URL
      }),
      false: httpBatchLink({
        url: 'handle://lugu',
      }),
    }),
  ],
});

// @ts-ignore
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
