// TOKEN STANDARDS
export const TOKEN_STANDARD = {
  ERC721: 'ERC721',
  ERC1155: 'ERC1155',
  ERC20: 'ERC20',
} as const;

export type TOKEN_STANDARD = keyof typeof TOKEN_STANDARD;

// TOKEN INTERFACE IDS
export const ERC_INTERFACE_ID = {
  ERC721_INTERFACE_ID: '0x80ac58cd',
  ERC721_METADATA_INTERFACE_ID: '0x5b5e139f',
  ERC721_ENUMERABLE_INTERFACE_ID: '0x780e9d63',
  ERC1155_INTERFACE_ID: '0xd9b67a26',
  ERC1155_METADATA_URI_INTERFACE_ID: '0x0e89341c',
  ERC1155_TOKEN_RECEIVER_INTERFACE_ID: '0x4e2312e0',
} as const;

export type ERC_INTERFACE_ID = keyof typeof ERC_INTERFACE_ID;

// export const IPFS_DEFAULT_GATEWAY_URL = 'https://cloudflare-ipfs.com/ipfs/';
export const IPFS_DEFAULT_GATEWAY_URL = 'https://ipfs.io/ipfs/';
