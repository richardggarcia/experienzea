"use client";
import { useState, useEffect } from 'react';
import {
    StellarWalletsKit,
    WalletNetwork,
    allowAllModules,
    FREIGHTER_ID
} from '@creit.tech/stellar-wallets-kit';

// Singleton instance to prevent multiple initializations
const kit = new StellarWalletsKit({
    network: WalletNetwork.TESTNET,
    selectedWalletId: FREIGHTER_ID,
    modules: allowAllModules(),
});

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        // Restore session
        const stored = typeof window !== 'undefined' ? localStorage.getItem('wallet_address') : null;
        if (stored) {
            setAddress(stored);
        }
    }, []);

    const connect = async (): Promise<string | null> => {
        setIsConnecting(true);
        return new Promise(async (resolve) => {
            try {
                await kit.openModal({
                    onWalletSelected: async (option) => {
                        try {
                            kit.setWallet(option.id);
                            const { address } = await kit.getAddress();
                            setAddress(address);
                            localStorage.setItem('wallet_address', address);
                            resolve(address);
                        } catch (error) {
                            console.error("Wallet connection error:", error);
                            resolve(null);
                        } finally {
                            setIsConnecting(false);
                        }
                    }
                });
            } catch (err) {
                console.error("Error opening wallet modal:", err);
                setIsConnecting(false);
                resolve(null);
            }
        });
    };

    const disconnect = () => {
        setAddress(null);
        localStorage.removeItem('wallet_address');
    };

    return { address, connect, disconnect, isConnecting };
}
