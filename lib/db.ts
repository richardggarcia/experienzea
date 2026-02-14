// Mock Database - Reemplazar con Supabase/PostgreSQL en producción
// Esta DB vive en memoria del servidor (se borra al reiniciar)

export interface AssetDB {
    id: string;
    type: 'tractor' | 'car' | 'house';
    name: string;
    value: number;
    owner: string;
    ownerWallet?: string;
    status: 'pending_review' | 'approved' | 'tokenized' | 'funding_requested';
    contractId?: string;
    submittedAt: string;
    documents: {
        insurance?: string;
        property?: string;
    };
}

// Base de datos en memoria (se reinicia con el servidor)
export const mockDB: AssetDB[] = [
    // Datos de ejemplo para demo
    {
        id: "demo-1",
        type: "tractor",
        name: "John Deere 5075E",
        value: 45000,
        owner: "Juan Pérez",
        ownerWallet: "GABC123...",
        status: "pending_review",
        submittedAt: new Date().toISOString(),
        documents: {
            insurance: "/api/download?key=assets/demo-1/insurance/seguro.jpg",
            property: "/api/download?key=assets/demo-1/property/titulo.pdf"
        }
    }
];

// API simple
export const DB = {
    getAll: () => [...mockDB],
    
    getById: (id: string) => mockDB.find(a => a.id === id),
    
    create: (asset: Omit<AssetDB, 'submittedAt'>) => {
        const newAsset = {
            ...asset,
            submittedAt: new Date().toISOString()
        };
        mockDB.push(newAsset);
        return newAsset;
    },
    
    update: (id: string, updates: Partial<AssetDB>) => {
        const index = mockDB.findIndex(a => a.id === id);
        if (index !== -1) {
            mockDB[index] = { ...mockDB[index], ...updates };
            return mockDB[index];
        }
        return null;
    },
    
    delete: (id: string) => {
        const index = mockDB.findIndex(a => a.id === id);
        if (index !== -1) {
            mockDB.splice(index, 1);
            return true;
        }
        return false;
    }
};
