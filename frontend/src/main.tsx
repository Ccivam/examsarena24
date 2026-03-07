import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// In production, API calls go to the backend service URL.
// In dev, Vite proxy handles /api → localhost:5000.
if (window.location.hostname !== 'localhost') {
  axios.defaults.baseURL = 'https://examsarena24-production.up.railway.app';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
