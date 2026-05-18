import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { SettingsProvider } from './SettingsContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </ErrorBoundary>,
);
