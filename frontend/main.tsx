// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom/client";
import "@/css/index.css";
import App from "@/App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { setupGlobalAxiosNormalizer } from "./services/http-normalizer";

setupGlobalAxiosNormalizer();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);

