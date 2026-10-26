import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CommonToastContainer } from "./components/CommonToastContainer";
import { ScrollToTop } from "./components/ScrollToTop";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

// Pages ab lazy chunks hain: naya deploy hone par purane tab ka chunk (purana hash)
// server par nahi milta. Ek baar page reload karke naya build lo — guarded taaki
// chunk sach me gayab ho to reload loop na bane (60s me ek hi reload).
const CHUNK_RELOAD_KEY = "billing_chunk_reload_at";
window.addEventListener("vite:preloadError", (event) => {
  try {
    const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
    if (Date.now() - lastReloadAt < 60_000) {
      return;
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <App />
        <CommonToastContainer />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
