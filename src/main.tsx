import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CommonToastContainer } from "./components/CommonToastContainer";
import { ScrollToTop } from "./components/ScrollToTop";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

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
