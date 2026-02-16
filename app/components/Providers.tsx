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

    // Log de advertencia si falta la API Key
    if (!apiKey && typeof window !== 'undefined') {
        console.warn("⚠️  NEXT_PUBLIC_TW_API_KEY no está configurada. La integración con Trustless Work no funcionará.");
    }

    return (
        <SessionProvider>
            <TrustlessWorkConfig baseURL={baseURL} apiKey={apiKey}>
                {children}
            </TrustlessWorkConfig>
        </SessionProvider>
    );
}
