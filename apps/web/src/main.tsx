import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { AuthProvider } from './hooks/useAuth';
import { openFile } from './lib/api';
import { App } from './App';
import '@fontsource-variable/inter';
import '@fontsource-variable/inter-tight';
import './index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

// Document links are written as /api/...; open them through the signed-in request instead.
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0) return;
  const a = (e.target as Element | null)?.closest?.('a[href^="/api/"]') as HTMLAnchorElement | null;
  if (!a) return;
  e.preventDefault();
  openFile(a.getAttribute('href')!.replace(/^\/api/, ''));
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
