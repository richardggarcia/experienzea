"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LucideIcon } from "lucide-react";

// Dynamic import for Lottie to prevent SSR hydration mismatches
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface LottieIconProps {
    name: string; // The filename of the JSON in /public/lotties without extension
    fallbackIcon?: LucideIcon; // Lucide Icon to show if Lottie fails
    className?: string;
}

export default function LottieIcon({ name, fallbackIcon: Icon, className = "w-24 h-24" }: LottieIconProps) {
    const [animationData, setAnimationData] = useState<any>(null);
    const [error, setError] = useState(false);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        fetch(`/lotties/${name.toLowerCase()}.json`)
            .then(res => {
                if (!res.ok) throw new Error("Not found");
                return res.json();
            })
            .then(data => setAnimationData(data))
            .catch(() => setError(true));
    }, [name]);

    if (error || !animationData) {
        return Icon ? (
            <Icon className={`${className} transition-all duration-300`} />
        ) : (
            <div className={`${className} bg-white/5 rounded-full animate-pulse`} />
        );
    }

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative flex items-center justify-center transform transition-transform hover:scale-110 duration-300"
        >
            <Lottie
                animationData={animationData}
                loop={true}
                className={className}
            />
        </div>
    );
}
