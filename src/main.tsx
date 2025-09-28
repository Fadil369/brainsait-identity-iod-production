import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles/brainsait-theme.css';

// Enable React strict mode for development
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);