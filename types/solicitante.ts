export interface Asset {
  id: string;
  type: 'auto' | 'casa' | 'departamento' | 'tractor' | 'otro' | 'vehiculo' | 'inmueble' | 'maquinaria';
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
    receipt_asset_id?: string;
    receipt_token_id?: string;
    receipt_tx_hash?: string;
    receipt_loan_id?: string;
    receipt_minted_at?: string;
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
