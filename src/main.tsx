import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{color: 'red', background: 'white', padding: '20px', position: 'absolute', inset: 0, zIndex: 9999}}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener('error', (e) => {
  document.body.innerHTML += `<div style="color:red; background:white; padding:20px; position:absolute; top:0; left:0; z-index:9999; font-size:16px;">
    <b>Global Error:</b> ${e.message}<br/>${e.error?.stack?.replace(/\n/g, '<br/>')}
  </div>`;
});

window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML += `<div style="color:red; background:white; padding:20px; position:absolute; top:0; left:0; z-index:9999; font-size:16px;">
    <b>Unhandled Rejection:</b> ${e.reason}
  </div>`;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
