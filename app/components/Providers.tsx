"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { TrustlessWorkConfig, baseURL } from "@trustless-work/escrow";

export function Providers({ children }: { children: ReactNode }) {
    // The SDK type only allows official TW URLs, but runtime accepts same-origin proxy.
    const twProxyBaseURL = "/api/tw" as unknown as baseURL;
    // Never expose Trustless Work API keys in the browser.
    const apiKey = "";

    return (
        <SessionProvider>
            <TrustlessWorkConfig baseURL={twProxyBaseURL} apiKey={apiKey}>
                {children}
            </TrustlessWorkConfig>
        </SessionProvider>
    );
}
