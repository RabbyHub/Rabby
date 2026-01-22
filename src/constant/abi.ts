export const ERC20ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [
      {
        name: '',
        type: 'string',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        name: '_spender',
        type: 'address',
      },
      {
        name: '_value',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        name: '_from',
        type: 'address',
      },
      {
        name: '_to',
        type: 'address',
      },
      {
        name: '_value',
        type: 'uint256',
      },
    ],
    name: 'transferFrom',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        name: '',
        type: 'uint8',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        name: '',
        type: 'string',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {
        name: '_to',
        type: 'address',
      },
      {
        name: '_value',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address',
      },
      {
        name: '_spender',
        type: 'address',
      },
    ],
    name: 'allowance',
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    payable: true,
    stateMutability: 'payable',
    type: 'fallback',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        name: 'spender',
        type: 'address',
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
];

export const ERC721ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'approved',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      { indexed: false, internalType: 'bool', name: 'approved', type: 'bool' },
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ internalType: 'address', name: 'operator', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'isApprovedForAll',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'operator', type: 'address' },
      {
        internalType: 'bool',
        name: '_approved',
        type: 'bool',
      },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const ERC1155ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'values',
        type: 'uint256[]',
      },
    ],
    name: 'TransferBatch',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'TransferSingle',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'value',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'URI',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'accounts',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
    ],
    name: 'balanceOfBatch',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'isApprovedForAll',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'safeBatchTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4',
      },
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'uri',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const SeaportABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'conduitController',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'BadContractSignature',
    type: 'error',
  },
  {
    inputs: [],
    name: 'BadFraction',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'BadReturnValueFromERC20OnTransfer',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint8',
        name: 'v',
        type: 'uint8',
      },
    ],
    name: 'BadSignatureV',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CannotCancelOrder',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ConsiderationCriteriaResolverOutOfRange',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ConsiderationLengthNotEqualToTotalOriginal',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'orderIndex',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'considerationIndex',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'shortfallAmount',
        type: 'uint256',
      },
    ],
    name: 'ConsiderationNotMet',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CriteriaNotEnabledForItem',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'identifiers',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
    ],
    name: 'ERC1155BatchTransferGenericFailure',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'EtherTransferGenericFailure',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InexactFraction',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InsufficientEtherSupplied',
    type: 'error',
  },
  {
    inputs: [],
    name: 'Invalid1155BatchTransferEncoding',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidBasicOrderParameterEncoding',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'conduit',
        type: 'address',
      },
    ],
    name: 'InvalidCallToConduit',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'conduitKey',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'conduit',
        type: 'address',
      },
    ],
    name: 'InvalidConduit',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'InvalidContractOrder',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'InvalidERC721TransferAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidFulfillmentComponentData',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'InvalidMsgValue',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidNativeOfferItem',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidProof',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'InvalidRestrictedOrder',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidSignature',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidSigner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'startTime',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'endTime',
        type: 'uint256',
      },
    ],
    name: 'InvalidTime',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'fulfillmentIndex',
        type: 'uint256',
      },
    ],
    name: 'MismatchedFulfillmentOfferAndConsiderationComponents',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'enum Side',
        name: 'side',
        type: 'uint8',
      },
    ],
    name: 'MissingFulfillmentComponentOnAggregation',
    type: 'error',
  },
  {
    inputs: [],
    name: 'MissingItemAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'MissingOriginalConsiderationItems',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'NoContract',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NoReentrantCalls',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NoSpecifiedOrdersAvailable',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OfferAndConsiderationRequiredOnFulfillment',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OfferCriteriaResolverOutOfRange',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'OrderAlreadyFilled',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'enum Side',
        name: 'side',
        type: 'uint8',
      },
    ],
    name: 'OrderCriteriaResolverOutOfRange',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'OrderIsCancelled',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'OrderPartiallyFilled',
    type: 'error',
  },
  {
    inputs: [],
    name: 'PartialFillsNotEnabledForOrder',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'identifier',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'TokenTransferGenericFailure',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'orderIndex',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'considerationIndex',
        type: 'uint256',
      },
    ],
    name: 'UnresolvedConsiderationCriteria',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'orderIndex',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'offerIndex',
        type: 'uint256',
      },
    ],
    name: 'UnresolvedOfferCriteria',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UnusedItemParameters',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newCounter',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'offerer',
        type: 'address',
      },
    ],
    name: 'CounterIncremented',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'offerer',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'zone',
        type: 'address',
      },
    ],
    name: 'OrderCancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'offerer',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'zone',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'enum ItemType',
            name: 'itemType',
            type: 'uint8',
          },
          {
            internalType: 'address',
            name: 'token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'identifier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256',
          },
        ],
        indexed: false,
        internalType: 'struct SpentItem[]',
        name: 'offer',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'enum ItemType',
            name: 'itemType',
            type: 'uint8',
          },
          {
            internalType: 'address',
            name: 'token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'identifier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256',
          },
          {
            internalType: 'address payable',
            name: 'recipient',
            type: 'address',
          },
        ],
        indexed: false,
        internalType: 'struct ReceivedItem[]',
        name: 'consideration',
        type: 'tuple[]',
      },
    ],
    name: 'OrderFulfilled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'zone',
            type: 'address',
          },
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'startAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endAmount',
                type: 'uint256',
              },
            ],
            internalType: 'struct OfferItem[]',
            name: 'offer',
            type: 'tuple[]',
          },
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'startAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endAmount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ConsiderationItem[]',
            name: 'consideration',
            type: 'tuple[]',
          },
          {
            internalType: 'enum OrderType',
            name: 'orderType',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'startTime',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'endTime',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'zoneHash',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'salt',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'totalOriginalConsiderationItems',
            type: 'uint256',
          },
        ],
        indexed: false,
        internalType: 'struct OrderParameters',
        name: 'orderParameters',
        type: 'tuple',
      },
    ],
    name: 'OrderValidated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32[]',
        name: 'orderHashes',
        type: 'bytes32[]',
      },
    ],
    name: 'OrdersMatched',
    type: 'event',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'zone',
            type: 'address',
          },
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'startAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endAmount',
                type: 'uint256',
              },
            ],
            internalType: 'struct OfferItem[]',
            name: 'offer',
            type: 'tuple[]',
          },
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'startAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endAmount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ConsiderationItem[]',
            name: 'consideration',
            type: 'tuple[]',
          },
          {
            internalType: 'enum OrderType',
            name: 'orderType',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'startTime',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'endTime',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'zoneHash',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'salt',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'counter',
            type: 'uint256',
          },
        ],
        internalType: 'struct OrderComponents[]',
        name: 'orders',
        type: 'tuple[]',
      },
    ],
    name: 'cancel',
    outputs: [
      {
        internalType: 'bool',
        name: 'cancelled',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'uint120',
            name: 'numerator',
            type: 'uint120',
          },
          {
            internalType: 'uint120',
            name: 'denominator',
            type: 'uint120',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'extraData',
            type: 'bytes',
          },
        ],
        internalType: 'struct AdvancedOrder',
        name: 'advancedOrder',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'enum Side',
            name: 'side',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'index',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'identifier',
            type: 'uint256',
          },
          {
            internalType: 'bytes32[]',
            name: 'criteriaProof',
            type: 'bytes32[]',
          },
        ],
        internalType: 'struct CriteriaResolver[]',
        name: 'criteriaResolvers',
        type: 'tuple[]',
      },
      {
        internalType: 'bytes32',
        name: 'fulfillerConduitKey',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
    ],
    name: 'fulfillAdvancedOrder',
    outputs: [
      {
        internalType: 'bool',
        name: 'fulfilled',
        type: 'bool',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'uint120',
            name: 'numerator',
            type: 'uint120',
          },
          {
            internalType: 'uint120',
            name: 'denominator',
            type: 'uint120',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'extraData',
            type: 'bytes',
          },
        ],
        internalType: 'struct AdvancedOrder[]',
        name: 'advancedOrders',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'enum Side',
            name: 'side',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'index',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'identifier',
            type: 'uint256',
          },
          {
            internalType: 'bytes32[]',
            name: 'criteriaProof',
            type: 'bytes32[]',
          },
        ],
        internalType: 'struct CriteriaResolver[]',
        name: 'criteriaResolvers',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'itemIndex',
            type: 'uint256',
          },
        ],
        internalType: 'struct FulfillmentComponent[][]',
        name: 'offerFulfillments',
        type: 'tuple[][]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'itemIndex',
            type: 'uint256',
          },
        ],
        internalType: 'struct FulfillmentComponent[][]',
        name: 'considerationFulfillments',
        type: 'tuple[][]',
      },
      {
        internalType: 'bytes32',
        name: 'fulfillerConduitKey',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'maximumFulfilled',
        type: 'uint256',
      },
    ],
    name: 'fulfillAvailableAdvancedOrders',
    outputs: [
      {
        internalType: 'bool[]',
        name: 'availableOrders',
        type: 'bool[]',
      },
      {
        components: [
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifier',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
        ],
        internalType: 'struct Execution[]',
        name: 'executions',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct Order[]',
        name: 'orders',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'itemIndex',
            type: 'uint256',
          },
        ],
        internalType: 'struct FulfillmentComponent[][]',
        name: 'offerFulfillments',
        type: 'tuple[][]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'itemIndex',
            type: 'uint256',
          },
        ],
        internalType: 'struct FulfillmentComponent[][]',
        name: 'considerationFulfillments',
        type: 'tuple[][]',
      },
      {
        internalType: 'bytes32',
        name: 'fulfillerConduitKey',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'maximumFulfilled',
        type: 'uint256',
      },
    ],
    name: 'fulfillAvailableOrders',
    outputs: [
      {
        internalType: 'bool[]',
        name: 'availableOrders',
        type: 'bool[]',
      },
      {
        components: [
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifier',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
        ],
        internalType: 'struct Execution[]',
        name: 'executions',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'considerationToken',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'considerationIdentifier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'considerationAmount',
            type: 'uint256',
          },
          {
            internalType: 'address payable',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'zone',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'offerToken',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'offerIdentifier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'offerAmount',
            type: 'uint256',
          },
          {
            internalType: 'enum BasicOrderType',
            name: 'basicOrderType',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'startTime',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'endTime',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'zoneHash',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'salt',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'offererConduitKey',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 'fulfillerConduitKey',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'totalOriginalAdditionalRecipients',
            type: 'uint256',
          },
          {
            components: [
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct AdditionalRecipient[]',
            name: 'additionalRecipients',
            type: 'tuple[]',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct BasicOrderParameters',
        name: 'parameters',
        type: 'tuple',
      },
    ],
    name: 'fulfillBasicOrder',
    outputs: [
      {
        internalType: 'bool',
        name: 'fulfilled',
        type: 'bool',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct Order',
        name: 'order',
        type: 'tuple',
      },
      {
        internalType: 'bytes32',
        name: 'fulfillerConduitKey',
        type: 'bytes32',
      },
    ],
    name: 'fulfillOrder',
    outputs: [
      {
        internalType: 'bool',
        name: 'fulfilled',
        type: 'bool',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'contractOfferer',
        type: 'address',
      },
    ],
    name: 'getContractOffererNonce',
    outputs: [
      {
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'offerer',
        type: 'address',
      },
    ],
    name: 'getCounter',
    outputs: [
      {
        internalType: 'uint256',
        name: 'counter',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'zone',
            type: 'address',
          },
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'startAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endAmount',
                type: 'uint256',
              },
            ],
            internalType: 'struct OfferItem[]',
            name: 'offer',
            type: 'tuple[]',
          },
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'startAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endAmount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ConsiderationItem[]',
            name: 'consideration',
            type: 'tuple[]',
          },
          {
            internalType: 'enum OrderType',
            name: 'orderType',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'startTime',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'endTime',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'zoneHash',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'salt',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'counter',
            type: 'uint256',
          },
        ],
        internalType: 'struct OrderComponents',
        name: 'order',
        type: 'tuple',
      },
    ],
    name: 'getOrderHash',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'getOrderStatus',
    outputs: [
      {
        internalType: 'bool',
        name: 'isValidated',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'isCancelled',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'totalFilled',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'totalSize',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'incrementCounter',
    outputs: [
      {
        internalType: 'uint256',
        name: 'newCounter',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'information',
    outputs: [
      {
        internalType: 'string',
        name: 'version',
        type: 'string',
      },
      {
        internalType: 'bytes32',
        name: 'domainSeparator',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'conduitController',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'uint120',
            name: 'numerator',
            type: 'uint120',
          },
          {
            internalType: 'uint120',
            name: 'denominator',
            type: 'uint120',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'extraData',
            type: 'bytes',
          },
        ],
        internalType: 'struct AdvancedOrder[]',
        name: 'orders',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'enum Side',
            name: 'side',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'index',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'identifier',
            type: 'uint256',
          },
          {
            internalType: 'bytes32[]',
            name: 'criteriaProof',
            type: 'bytes32[]',
          },
        ],
        internalType: 'struct CriteriaResolver[]',
        name: 'criteriaResolvers',
        type: 'tuple[]',
      },
      {
        components: [
          {
            components: [
              {
                internalType: 'uint256',
                name: 'orderIndex',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'itemIndex',
                type: 'uint256',
              },
            ],
            internalType: 'struct FulfillmentComponent[]',
            name: 'offerComponents',
            type: 'tuple[]',
          },
          {
            components: [
              {
                internalType: 'uint256',
                name: 'orderIndex',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'itemIndex',
                type: 'uint256',
              },
            ],
            internalType: 'struct FulfillmentComponent[]',
            name: 'considerationComponents',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct Fulfillment[]',
        name: 'fulfillments',
        type: 'tuple[]',
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
    ],
    name: 'matchAdvancedOrders',
    outputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifier',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
        ],
        internalType: 'struct Execution[]',
        name: 'executions',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct Order[]',
        name: 'orders',
        type: 'tuple[]',
      },
      {
        components: [
          {
            components: [
              {
                internalType: 'uint256',
                name: 'orderIndex',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'itemIndex',
                type: 'uint256',
              },
            ],
            internalType: 'struct FulfillmentComponent[]',
            name: 'offerComponents',
            type: 'tuple[]',
          },
          {
            components: [
              {
                internalType: 'uint256',
                name: 'orderIndex',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'itemIndex',
                type: 'uint256',
              },
            ],
            internalType: 'struct FulfillmentComponent[]',
            name: 'considerationComponents',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct Fulfillment[]',
        name: 'fulfillments',
        type: 'tuple[]',
      },
    ],
    name: 'matchOrders',
    outputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifier',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
        ],
        internalType: 'struct Execution[]',
        name: 'executions',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: 'contractName',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct Order[]',
        name: 'orders',
        type: 'tuple[]',
      },
    ],
    name: 'validate',
    outputs: [
      {
        internalType: 'bool',
        name: 'validated',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    stateMutability: 'payable',
    type: 'receive',
  },
] as const;
