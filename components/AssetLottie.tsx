"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function AssetLottie({ type }: { type: 'tractor' | 'house' | 'car' }) {
    const [animationData, setAnimationData] = useState(null);

    useEffect(() => {
        // Logic to load different JSONs based on type
        // Ideally user provides: /lotties/house.json, /lotties/car.json
        // For now we fallback to hero.json (tractor) or placeholders if missing
        const fileName = type === 'house' ? 'house.json' : type === 'car' ? 'car.json' : 'hero.json';

        fetch(`/lotties/${fileName}`)
            .then(res => {
                if (!res.ok) throw new Error("No lottie found");
                return res.json();
            })
            .then(setAnimationData)
            .catch(() => {
                // If custom lottie fails, we might want to fail silently or show nothing
                // But to "show off", we can just load the tractor one as placeholder if user hasn't uploaded others yet
                if (type !== 'tractor') {
                    console.log(`Missing ${fileName}, defaulting...`);
                }
            });
    }, [type]);

    if (!animationData) return null;

    return <Lottie animationData={animationData} loop={true} className="w-full h-full" />;
}
