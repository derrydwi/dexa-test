import "@fontsource-variable/dm-sans";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/app";
import "./styles/layout.css";
import "./styles/tokens.css";

const root = document.getElementById("root")!;
// Radix hides the app behind portaled modal controls. Also prevent background
// focus with native inert, including in Firefox and assistive technologies.
new MutationObserver(() => {
  root.inert = root.getAttribute("aria-hidden") === "true";
}).observe(root, { attributes: true, attributeFilter: ["aria-hidden"] });
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
