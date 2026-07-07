// ============================================================
// Jingga Shared Constants
// ============================================================

export const STELLAR_NETWORK = 'testnet' as const;
export const STELLAR_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015' as const;
export const STELLAR_HORIZON_URL = 'https://horizon-testnet.stellar.org' as const;
export const STELLAR_FRIENDBOT_URL = 'https://friendbot.stellar.org' as const;

export const STELLAR_ASSET_CODE_PREFIX = 'JINGGA' as const;

export const MAX_FILE_SIZE_MB = 50;
export const MAX_COVER_SIZE_MB = 5;
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ROYALTY_BASIS_POINTS = 10000 as const;

export const KARYA_CATEGORIES = ['fiksi', 'paper', 'puisi', 'non-fiksi'] as const;

export const STELLAR_EXPLORER_TESTNET_URL = 'https://stellar.expert/testnet' as const;
