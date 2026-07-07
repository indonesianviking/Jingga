// ============================================================
// Jingga Shared Types
// ============================================================

// --- User ---
export type UserRole = 'penulis' | 'pembaca' | 'keduanya';

export interface User {
  id: string;
  wallet_address: string;
  nama: string;
  email?: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// --- Karya ---
export type KaryaCategory = 'fiksi' | 'paper' | 'puisi' | 'non-fiksi';
export type KaryaStatus = 'draft' | 'published' | 'archived';

export interface Karya {
  id: string;
  judul: string;
  deskripsi: string;
  kategori: KaryaCategory;
  harga: number;
  file_hash: string;
  ipfs_link: string;
  stellar_asset_code: string;
  issuer_wallet: string;
  cover_image_url?: string;
  file_size_bytes?: number;
  file_type?: string;
  status: KaryaStatus;
  total_sales: number;
  total_revenue: number;
  stellar_tx_hash?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

// --- Transaction ---
export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'refunded';
export type PaymentMethod = 'direct' | 'claimable_balance' | 'path_payment';

export interface Transaction {
  id: string;
  karya_id: string;
  buyer_wallet: string;
  seller_wallet: string;
  jumlah: number;
  stellar_tx_hash: string;
  status: TransactionStatus;
  payment_method: PaymentMethod;
  created_at: string;
  confirmed_at?: string;
}

// --- Collaborator ---
export type CollaboratorRole = 'penulis' | 'editor' | 'ilustrator' | 'kolaborator';

export interface Collaborator {
  id: string;
  karya_id: string;
  wallet_address: string;
  nama?: string;
  persentase: number;
  role: CollaboratorRole;
  created_at: string;
}

// --- License ---
export type LicenseType = 'exclusive' | 'non-exclusive';

export interface License {
  id: string;
  karya_id: string;
  purchaser_wallet: string;
  original_author_wallet: string;
  license_type: LicenseType;
  territory: string;
  duration: string;
  resale_percentage: number;
  license_fee: number;
  stellar_tx_hash: string;
  status: 'active' | 'expired' | 'revoked';
  issued_at: string;
  expires_at?: string;
}

// --- API Response Types ---
export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}
