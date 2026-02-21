type EscrowLikeAsset = {
    id: string;
    status: string;
    contractId?: string;
    contract_id?: string;
    created_at?: string;
};

type EscrowOptions = {
    statuses?: string[];
};

const DEFAULT_STATUSES = ["funding_requested", "funded"];

function getContractId(asset: EscrowLikeAsset): string {
    return asset.contractId || asset.contract_id || "";
}

function getSortedGroup<T extends EscrowLikeAsset>(group: T[]): T[] {
    return [...group].sort((a, b) => {
        const aDate = a.created_at || "";
        const bDate = b.created_at || "";
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        return a.id.localeCompare(b.id);
    });
}

export function buildEscrowActionOwnerMap<T extends EscrowLikeAsset>(
    assets: T[],
    options: EscrowOptions = {}
): Map<string, boolean> {
    const statuses = options.statuses || DEFAULT_STATUSES;
    const grouped = new Map<string, T[]>();
    const owners = new Map<string, boolean>();

    assets.forEach((asset) => {
        const contractId = getContractId(asset);
        if (!contractId) return;
        if (!statuses.includes(asset.status)) return;
        const list = grouped.get(contractId) || [];
        list.push(asset);
        grouped.set(contractId, list);
    });

    grouped.forEach((group) => {
        const sorted = getSortedGroup(group);
        const leaderId = sorted[0]?.id;
        group.forEach((asset) => {
            owners.set(asset.id, asset.id === leaderId);
        });
    });

    return owners;
}

export function buildEscrowGroupsByLeaderId<T extends EscrowLikeAsset>(
    assets: T[],
    options: EscrowOptions = {}
): Map<string, T[]> {
    const statuses = options.statuses || DEFAULT_STATUSES;
    const groupedByContract = new Map<string, T[]>();
    const leaderToGroup = new Map<string, T[]>();

    assets.forEach((asset) => {
        const contractId = getContractId(asset);
        if (!contractId) return;
        if (!statuses.includes(asset.status)) return;
        const list = groupedByContract.get(contractId) || [];
        list.push(asset);
        groupedByContract.set(contractId, list);
    });

    groupedByContract.forEach((group) => {
        const sorted = getSortedGroup(group);
        const leaderId = sorted[0]?.id;
        if (leaderId) leaderToGroup.set(leaderId, sorted);
    });

    return leaderToGroup;
}

export function filterVisibleEscrowLeaderAssets<T extends EscrowLikeAsset>(
    assets: T[],
    ownerMap: Map<string, boolean>,
    options: EscrowOptions = {}
): T[] {
    const statuses = options.statuses || DEFAULT_STATUSES;
    return assets.filter((asset) => {
        if (!statuses.includes(asset.status)) return true;
        const contractId = getContractId(asset);
        if (!contractId) return true;
        return ownerMap.get(asset.id) ?? true;
    });
}
