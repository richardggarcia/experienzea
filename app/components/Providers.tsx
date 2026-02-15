"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { TrustlessWorkConfig, development, mainNet, baseURL } from "@trustless-work/escrow";

export function Providers({ children }: { children: ReactNode }) {
    const resolveBaseURL = (): baseURL => {
        const envBaseURL = process.env.NEXT_PUBLIC_TW_BASE_URL;
        if (envBaseURL === mainNet || envBaseURL === development) {
            return envBaseURL;
        }
        return development;
    };

    const baseURL = resolveBaseURL();
    const apiKey = process.env.NEXT_PUBLIC_TW_API_KEY || "";

    return (
        <SessionProvider>
            <TrustlessWorkConfig baseURL={baseURL} apiKey={apiKey}>
                {children}
            </TrustlessWorkConfig>
        </SessionProvider>
    );
}
