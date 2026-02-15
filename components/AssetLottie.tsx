"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function AssetLottie({ type }: { type: string }) {
    const [animationData, setAnimationData] = useState(null);

    useEffect(() => {
        // Logic to load different JSONs based on type
        let fileName = 'hero.json';
        if (type === 'house' || type === 'silo') fileName = 'house.json';
        if (type === 'car') fileName = 'car.json';
        if (type === 'tractor') fileName = 'hero.json';

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
