import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AppInstallContext = createContext(null);

export const useAppInstall = () => {
  const context = useContext(AppInstallContext);
  if (!context) {
    throw new Error("useAppInstall must be used within AppInstallProvider");
  }
  return context;
};

export const AppInstallProvider = ({ children }) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [installError, setInstallError] = useState("");

  useEffect(() => {
    const standaloneQuery = window.matchMedia
      ? window.matchMedia("(display-mode: standalone)")
      : null;
    const updateInstalledState = () => {
      setIsInstalled(
        Boolean(standaloneQuery?.matches) || window.navigator.standalone === true
      );
    };
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    updateInstalledState();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    if (standaloneQuery?.addEventListener) {
      standaloneQuery.addEventListener("change", updateInstalledState);
    } else {
      standaloneQuery?.addListener?.(updateInstalledState);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      if (standaloneQuery?.removeEventListener) {
        standaloneQuery.removeEventListener("change", updateInstalledState);
      } else {
        standaloneQuery?.removeListener?.(updateInstalledState);
      }
    };
  }, []);

  const openDialog = useCallback(() => {
    setInstallError("");
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) {
      return false;
    }

    const prompt = installPrompt;
    setInstallPrompt(null);

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setIsDialogOpen(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Rubavu Today PWA installation failed.", error);
      setInstallError("Installation could not be started. Try your browser menu.");
      return false;
    }
  }, [installPrompt]);

  const canInstall = Boolean(installPrompt);
  const value = useMemo(
    () => ({
      canInstall,
      closeDialog,
      installApp,
      installError,
      isDialogOpen,
      isInstalled,
      openDialog,
    }),
    [
      canInstall,
      closeDialog,
      installApp,
      installError,
      isDialogOpen,
      isInstalled,
      openDialog,
    ]
  );

  return (
    <AppInstallContext.Provider value={value}>
      {children}
    </AppInstallContext.Provider>
  );
};
