"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import TractorAnimation from "./TractorAnimation";

// Dynamic import for Lottie to avoid SSR issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function LottieHero() {
    const [animationData, setAnimationData] = useState<any>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // Attempt to load user provided JSON
        fetch("/lotties/hero.json")
            .then(res => {
                if (!res.ok) throw new Error("Not found");
                return res.json();
            })
            .then(data => {
                setAnimationData(data);
                setLoaded(true);
            })
            .catch((err) => {
                console.log("No custom Lottie found, using default SVG fallback", err);
                setLoaded(true);
            });
    }, []);

    if (!loaded) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white/20 border-t-cyan-400 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (animationData) {
        return <Lottie animationData={animationData} loop={true} className="w-full h-full" />;
    }

    return <TractorAnimation />;
}
