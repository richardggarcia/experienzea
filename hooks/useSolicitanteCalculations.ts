import { useMemo } from 'react';
import {
  buildEscrowActionOwnerMap,
  buildEscrowGroupsByLeaderId,
} from '@/lib/escrowGrouping';
import type { Asset, LoanRequest } from '@/types/solicitante';

export function useSolicitanteCalculations(
  assets: Asset[],
  loanRequests: LoanRequest[],
  selectedAssetIds: Set<string>
) {
  const collateralEligibleAssets = useMemo(
    () => assets.filter((a) => a.status === 'tokenized' || a.status === 'funded'),
    [assets]
  );

  const selectedAssets = useMemo(
    () => collateralEligibleAssets.filter((a) => selectedAssetIds.has(a.id)),
    [collateralEligibleAssets, selectedAssetIds]
  );

  const totalAssetValue = useMemo(
    () => selectedAssets.reduce((sum, asset) => sum + asset.value, 0),
    [selectedAssets]
  );

  const escrowActionOwnerByAssetId = useMemo(
    () => buildEscrowActionOwnerMap(assets),
    [assets]
  );

  const escrowGroupedAssetsByLeaderId = useMemo(
    () => buildEscrowGroupsByLeaderId(assets),
    [assets]
  );

  const escrowLeaderByContractId = useMemo(() => {
    const map = new Map<string, Asset>();
    escrowGroupedAssetsByLeaderId.forEach((group, leaderId) => {
      const leader = group.find((item) => item.id === leaderId) || group[0];
      const contractId = leader?.contractId || leader?.contract_id;
      if (leader && contractId) {
        map.set(contractId, leader);
      }
    });
    return map;
  }, [escrowGroupedAssetsByLeaderId]);

  const loanRequestByContractId = useMemo(() => {
    const map = new Map<string, LoanRequest>();
    loanRequests.forEach((loan) => {
      if (loan.contract_id) {
        map.set(loan.contract_id, loan);
      }
    });
    return map;
  }, [loanRequests]);

  const loanAmountByAssetId = useMemo(() => {
    const map = new Map<string, number>();
    loanRequests.forEach((loan) => {
      loan.asset_ids.forEach((assetId) => {
        map.set(assetId, loan.amount_requested);
      });
    });
    return map;
  }, [loanRequests]);

  const committedAmountOnSelection = useMemo(() => {
    if (selectedAssetIds.size === 0) return 0;
    return loanRequests
      .filter((loan) => ['pending', 'approved', 'escrow_created', 'funded'].includes(loan.status))
      .filter((loan) => (loan.asset_ids || []).some((id) => selectedAssetIds.has(id)))
      .reduce((sum, loan) => sum + (loan.amount_requested || 0), 0);
  }, [loanRequests, selectedAssetIds]);

  const grossCreditLimit = totalAssetValue * 0.7;
  const maxCreditLimitRaw = Math.max(0, grossCreditLimit - committedAmountOnSelection);
  const maxCreditLimit = Math.floor(maxCreditLimitRaw);

  const tokenizedOnlyValue = useMemo(
    () => assets.filter((a) => a.status === 'tokenized').reduce((sum, asset) => sum + asset.value, 0),
    [assets]
  );

  const liquidityAvailableToday = Math.floor(tokenizedOnlyValue * 0.7);

  const totalBackedValue = useMemo(
    () =>
      assets
        .filter((a) => a.status === 'tokenized' || a.status === 'funding_requested' || a.status === 'funded')
        .reduce((sum, asset) => sum + asset.value, 0),
    [assets]
  );

  const pendingReviewAssets = useMemo(
    () => assets.filter((a) => a.status === 'pending_review'),
    [assets]
  );
  const pendingReviewValue = useMemo(
    () => pendingReviewAssets.reduce((sum, asset) => sum + asset.value, 0),
    [pendingReviewAssets]
  );

  const liquidatedAmount = useMemo(
    () => loanRequests.filter((loan) => loan.status === 'funded').reduce((sum, loan) => sum + (loan.amount_requested || 0), 0),
    [loanRequests]
  );

  const isEscrowActionOwner = (asset: Asset) => {
    const contractId = asset.contractId || asset.contract_id;
    if (!contractId) return true;
    return escrowActionOwnerByAssetId.get(asset.id) ?? true;
  };

  const getLoanAmountForAsset = (asset: Asset) => {
    const contractId = asset.contractId || asset.contract_id;
    if (contractId) {
      const contractLoan = loanRequestByContractId.get(contractId);
      if (contractLoan?.amount_requested) {
        return contractLoan.amount_requested;
      }
    }
    return loanAmountByAssetId.get(asset.id) ?? asset.value;
  };

  const getCollateralTotalForAsset = (asset: Asset) => {
    const grouped = escrowGroupedAssetsByLeaderId.get(asset.id);
    if (grouped && grouped.length > 0) {
      return grouped.reduce((sum, item) => sum + item.value, 0);
    }
    return asset.value;
  };

  const getCollateralNamesForAsset = (asset: Asset) => {
    const grouped = escrowGroupedAssetsByLeaderId.get(asset.id);
    if (grouped && grouped.length > 0) {
      return grouped.map((item) => item.name).join(', ');
    }
    return asset.name;
  };

  const getEscrowLeaderAsset = (asset: Asset) => {
    const contractId = asset.contractId || asset.contract_id;
    if (!contractId) return null;
    return escrowLeaderByContractId.get(contractId) || null;
  };

  return {
    collateralEligibleAssets,
    selectedAssets,
    totalAssetValue,
    committedAmountOnSelection,
    grossCreditLimit,
    maxCreditLimit,
    liquidityAvailableToday,
    totalBackedValue,
    pendingReviewAssets,
    pendingReviewValue,
    liquidatedAmount,
    escrowGroupedAssetsByLeaderId,
    isEscrowActionOwner,
    getLoanAmountForAsset,
    getCollateralTotalForAsset,
    getCollateralNamesForAsset,
    getEscrowLeaderAsset,
  };
}
