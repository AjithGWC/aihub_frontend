import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Apply the saved theme before first paint (light is the default)
const savedTheme = localStorage.getItem('ads_theme');
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
