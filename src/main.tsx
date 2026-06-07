import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CommonToastContainer } from "./components/CommonToastContainer";
import { AuthProvider } from "./context/AuthContext";
import { ThemeBootstrapService } from "./services/ThemeBootstrapService";
import "./index.css";

ThemeBootstrapService.applyCachedTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <CommonToastContainer />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
