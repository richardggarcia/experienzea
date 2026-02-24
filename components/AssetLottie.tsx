"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function AssetLottie({
    type,
    context = "landing",
}: {
    type: string;
    context?: "landing" | "nft";
}) {
    const [animationData, setAnimationData] = useState(null);

    useEffect(() => {
        const normalizedType = (type || "").toLowerCase();
        const candidatesByType: Record<string, string[]> =
            context === "nft"
                ? {
                    auto: ["nft-auto.json", "car.json", "hero.json"],
                    car: ["nft-auto.json", "car.json", "hero.json"],
                    vehiculo: ["nft-auto.json", "car.json", "hero.json"],
                    casa: ["nft-casa.json", "factory.json", "hero.json"],
                    house: ["nft-casa.json", "factory.json", "hero.json"],
                    departamento: ["nft-departamento.json", "factory.json", "hero.json"],
                    inmueble: ["nft-casa.json", "nft-departamento.json", "factory.json", "hero.json"],
                    tractor: ["nft-tractor.json", "tractor.json", "hero.json"],
                    maquinaria: ["nft-tractor.json", "tractor.json", "hero.json"],
                    otro: ["nft-otro.json", "hero.json"],
                }
                : {
                    car: ["car.json", "hero.json"],
                    tractor: ["tractor.json", "hero.json"],
                    house: ["factory.json", "hero.json"],
                    silo: ["factory.json", "hero.json"],
                    invoice: ["factory.json", "hero.json"],
                    art: ["factory.json", "hero.json"],
                    farm: ["hero.json"],
                };

        const filesToTry =
            candidatesByType[normalizedType] ||
            (context === "nft" ? ["nft-otro.json", "hero.json"] : ["hero.json"]);
        let cancelled = false;

        const loadAnimation = async () => {
            for (const fileName of filesToTry) {
                try {
                    const res = await fetch(`/lotties/${fileName}`);
                    if (!res.ok) continue;
                    const data = await res.json();
                    if (!cancelled) {
                        setAnimationData(data);
                    }
                    return;
                } catch {
                    // Try next fallback animation
                }
            }
            if (!cancelled) {
                setAnimationData(null);
            }
        };

        loadAnimation();
        return () => {
            cancelled = true;
        };
    }, [type]);

    if (!animationData) return null;

    return <Lottie animationData={animationData} loop={true} className="w-full h-full" />;
}
