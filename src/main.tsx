import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { NovelProvider } from "./contexts/NovelContext";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <NovelProvider>
      <App />
    </NovelProvider>
  </React.StrictMode>
);