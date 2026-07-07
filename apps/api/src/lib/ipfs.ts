import crypto from 'crypto';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud';

// Pinata API helpers (using REST API instead of SDK for flexibility)
const PINATA_BASE_URL = 'https://api.pinata.cloud';

async function pinataRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('Pinata API keys not configured');
  }

  const response = await fetch(`${PINATA_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata API error: ${response.status} ${error}`);
  }

  return response.json();
}

export async function uploadToIPFS(
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<{
  ipfsHash: string;
  ipfsUrl: string;
  gatewayUrl: string;
  fileSizeBytes: number;
  fileHash: string;
}> {
  // Calculate SHA-256 hash
  const fileHash = crypto.createHash('sha256').update(file).digest('hex');

  // Create FormData for Pinata
  const formData = new FormData();
  const blob = new Blob([file], { type: mimeType });
  formData.append('file', blob, filename);

  // Pin with metadata
  const metadata = JSON.stringify({
    name: filename,
    keyvalues: {
      fileHash,
      mimeType,
    },
  });
  formData.append('pinataMetadata', metadata);

  const result = await pinataRequest('/pinning/pinFileToIPFS', {
    method: 'POST',
    body: formData,
  });

  return {
    ipfsHash: result.IpfsHash,
    ipfsUrl: `ipfs://${result.IpfsHash}`,
    gatewayUrl: `${PINATA_GATEWAY}/ipfs/${result.IpfsHash}`,
    fileSizeBytes: file.length,
    fileHash,
  };
}

export async function getFromIPFS(cid: string): Promise<Buffer> {
  const response = await fetch(`${PINATA_GATEWAY}/ipfs/${cid}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function getSignedUrl(cid: string, expiresIn: number = 3600): Promise<string> {
  try {
    const result = await pinataRequest(
      `/pinning/signature?expires=${expiresIn}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid }),
      }
    );
    return result.url;
  } catch {
    // Fallback: return gateway URL directly
    return `${PINATA_GATEWAY}/ipfs/${cid}`;
  }
}

export async function isPinned(cid: string): Promise<boolean> {
  try {
    const result = await pinataRequest(`/data/pinList?hashContains=${cid}&pageLimit=1`);
    return result.count > 0;
  } catch {
    return false;
  }
}

export function getGatewayUrl(cid: string): string {
  return `${PINATA_GATEWAY}/ipfs/${cid}`;
}
