"use client";
import { useState, useEffect, useRef } from 'react';
import {
    StellarWalletsKit,
    WalletNetwork,
    allowAllModules,
    FREIGHTER_ID
} from '@creit.tech/stellar-wallets-kit';

// Singleton instance - se inicializa lazy solo en el cliente
let kitInstance: StellarWalletsKit | null = null;

function getKit(): StellarWalletsKit {
    if (typeof window === 'undefined') {
        throw new Error('StellarWalletsKit can only be used in the browser');
    }
    
    if (!kitInstance) {
        kitInstance = new StellarWalletsKit({
            network: WalletNetwork.TESTNET,
            selectedWalletId: FREIGHTER_ID,
            modules: allowAllModules(),
        });
    }
    return kitInstance;
}

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const kitRef = useRef<StellarWalletsKit | null>(null);

    useEffect(() => {
        // Solo inicializar en el cliente
        if (typeof window !== 'undefined') {
            kitRef.current = getKit();
            
            // Restore session
            const stored = localStorage.getItem('wallet_address');
            if (stored) {
                setAddress(stored);
            }
        }
    }, []);

    const connect = async (): Promise<string | null> => {
        if (typeof window === 'undefined' || !kitRef.current) {
            console.error('Wallet can only be connected in the browser');
            return null;
        }
        
        setIsConnecting(true);
        return new Promise(async (resolve) => {
            try {
                await kitRef.current!.openModal({
                    onWalletSelected: async (option) => {
                        try {
                            kitRef.current!.setWallet(option.id);
                            const { address } = await kitRef.current!.getAddress();
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
        if (typeof window !== 'undefined') {
            localStorage.removeItem('wallet_address');
        }
    };

    return { address, connect, disconnect, isConnecting };
}
