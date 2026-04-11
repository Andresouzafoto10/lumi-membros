import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";

import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import { applyDefaultTheme, applyCachedTheme, fetchAndApplyTheme } from "./lib/applyTheme";

const queryClient = new QueryClient();

function render() {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HelmetProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <AuthProvider>
                  <App />
                  <Toaster richColors position="bottom-right" />
                </AuthProvider>
              </BrowserRouter>
            </QueryClientProvider>
          </ThemeProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// 1. Apply hardcoded teal default IMMEDIATELY — guarantees correct color
//    even before cache check or network fetch completes
applyDefaultTheme();

// 2. Try applying theme from localStorage cache (instant, overrides default)
const hasCachedTheme = applyCachedTheme();

if (hasCachedTheme) {
  // Cache hit — render immediately with correct colors
  render();
} else {
  // First visit (no cache) — fetch theme from Supabase before rendering
  fetchAndApplyTheme().finally(render);
}
