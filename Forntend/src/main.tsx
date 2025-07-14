import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// import './index.css'
import "../src/assets/style/main.scss";
import App from "./App.tsx";
import { ThemeProvider } from "react-bootstrap";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
    <App />
    </ThemeProvider>
  </StrictMode>
);
