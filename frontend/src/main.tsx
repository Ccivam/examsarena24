import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// In production, API calls go to the backend service URL.
// In dev, Vite proxy handles /api → localhost:5000.
export const API_BASE = window.location.hostname !== 'localhost'
  ? 'https://examsarena24-production.up.railway.app'
  : '';

if (API_BASE) {
  axios.defaults.baseURL = API_BASE;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
