import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initializeApp } from "./utils/capacitor";

// Set viewport for mobile
const metaViewport = document.createElement('meta');
metaViewport.name = 'viewport';
metaViewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no';
document.head.appendChild(metaViewport);

// Prevent context menu on mobile
document.addEventListener('contextmenu', (e) => {
  if (window.Capacitor) {
    e.preventDefault();
  }
});

// Initialize Capacitor
initializeApp();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);