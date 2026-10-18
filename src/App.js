import React from "react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { RadioProvider } from "./context/RadioContext";
import { AppInstallProvider } from "./context/AppInstallContext";
import AppRoutes from "./routes/AppRoutes";
import AppDownloadDialog from "./components/common/AppDownloadDialog";

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider>
              <RadioProvider>
                <AppInstallProvider>
                  <AppRoutes />
                  <AppDownloadDialog />
                </AppInstallProvider>
              </RadioProvider>
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
