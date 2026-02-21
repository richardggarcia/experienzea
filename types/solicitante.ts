export interface Asset {
  id: string;
  type: 'vehiculo' | 'inmueble' | 'maquinaria' | 'otro';
  name: string;
  value: number;
  owner: string;
  owner_wallet?: string;
  ownerWallet?: string;
  status: 'pending_review' | 'approved' | 'tokenized' | 'funding_requested' | 'funded';
  contract_id?: string;
  contractId?: string;
  documents?: {
    insurance?: string;
    property?: string;
  };
  created_at?: string;
}

export interface LoanRequest {
  id: string;
  borrower_wallet: string;
  borrower_name?: string;
  amount_requested: number;
  collateral_value: number;
  ltv_ratio: number;
  asset_ids: string[];
  status: 'pending' | 'approved' | 'escrow_created' | 'funded';
  contract_id?: string;
  created_at?: string;
}
