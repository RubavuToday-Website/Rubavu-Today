import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AppInstallProvider, useAppInstall } from "./AppInstallContext";

const InstallProbe = () => {
  const { canInstall, installApp, isInstalled } = useAppInstall();

  return (
    <>
      <span data-testid="install-available">{String(canInstall)}</span>
      <span data-testid="installed">{String(isInstalled)}</span>
      <button type="button" onClick={installApp}>
        Install test app
      </button>
    </>
  );
};

describe("AppInstallProvider", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("offers the browser install prompt and updates the installed state", async () => {
    render(
      <AppInstallProvider>
        <InstallProbe />
      </AppInstallProvider>
    );

    const installEvent = new Event("beforeinstallprompt", { cancelable: true });
    const prompt = jest.fn().mockResolvedValue(undefined);
    Object.defineProperties(installEvent, {
      prompt: { value: prompt },
      userChoice: { value: Promise.resolve({ outcome: "accepted" }) },
    });

    await act(async () => {
      window.dispatchEvent(installEvent);
    });

    expect(installEvent.defaultPrevented).toBe(true);
    expect(screen.getByTestId("install-available")).toHaveTextContent("true");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Install test app" }));
    });

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("installed")).toHaveTextContent("true");
    expect(screen.getByTestId("install-available")).toHaveTextContent("false");
  });
});
