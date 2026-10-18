import "react-app-polyfill/stable";
import "whatwg-fetch";
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import rubavuIcon from './Rubavu.jpeg';

document.querySelector('link[rel="icon"]')?.setAttribute('href', rubavuIcon);
document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', rubavuIcon);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
  navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/sw.js`).catch((error) => {
    console.error("Rubavu Today service worker registration failed.", error);
  });
}



reportWebVitals();
