import type { StakingTxReceipt } from './tx';

const ZERO_ADDRESS_TOPIC =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ERC721_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const normalizeAddress = (address?: unknown) =>
  typeof address === 'string' ? address.toLowerCase() : '';

const normalizeAddressTopic = (address: string) =>
  `0x${address.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`;

const getReceiptLogs = (receipt: StakingTxReceipt | null) =>
  Array.isArray(receipt?.logs) ? receipt?.logs : [];

const getLogTopics = (log: unknown) =>
  Array.isArray((log as { topics?: string[] }).topics)
    ? ((log as { topics?: string[] }).topics as string[])
    : [];

const isReceiptTargetLog = (receipt: StakingTxReceipt | null, log: unknown) => {
  const receiptTo = normalizeAddress(receipt?.to);
  if (!receiptTo) {
    return true;
  }

  return normalizeAddress((log as { address?: string }).address) === receiptTo;
};

const tokenIdFromTopic = (topic?: string) => {
  if (!topic) {
    return '';
  }

  try {
    return BigInt(topic).toString();
  } catch {
    return '';
  }
};

export const getMintedUniv3TokenId = (
  receipt: StakingTxReceipt | null,
  accountAddress: string
) => {
  const toTopic = normalizeAddressTopic(accountAddress);

  for (const log of getReceiptLogs(receipt)) {
    const topics = getLogTopics(log);
    if (
      topics[0]?.toLowerCase() === ERC721_TRANSFER_TOPIC &&
      topics[1]?.toLowerCase() === ZERO_ADDRESS_TOPIC &&
      topics[2]?.toLowerCase() === toTopic
    ) {
      return tokenIdFromTopic(topics[3]);
    }
  }

  return '';
};

export const getBurnedUniv3TokenId = ({
  receipt,
  accountAddress,
}: {
  receipt: StakingTxReceipt | null;
  accountAddress: string;
}) => {
  const fromTopic = normalizeAddressTopic(accountAddress);

  for (const log of getReceiptLogs(receipt)) {
    if (!isReceiptTargetLog(receipt, log)) {
      continue;
    }

    const topics = getLogTopics(log);
    if (
      topics[0]?.toLowerCase() === ERC721_TRANSFER_TOPIC &&
      topics[1]?.toLowerCase() === fromTopic &&
      topics[2]?.toLowerCase() === ZERO_ADDRESS_TOPIC
    ) {
      const tokenId = tokenIdFromTopic(topics[3]);
      if (tokenId) {
        return tokenId;
      }
    }
  }

  return '';
};

export const hasBurnedUniv3TokenId = ({
  receipt,
  accountAddress,
  tokenId,
}: {
  receipt: StakingTxReceipt | null;
  accountAddress: string;
  tokenId?: string;
}) => {
  if (!tokenId) {
    return false;
  }

  const fromTopic = normalizeAddressTopic(accountAddress);

  return getReceiptLogs(receipt).some((log) => {
    if (!isReceiptTargetLog(receipt, log)) {
      return false;
    }

    const topics = getLogTopics(log);
    return (
      topics[0]?.toLowerCase() === ERC721_TRANSFER_TOPIC &&
      topics[1]?.toLowerCase() === fromTopic &&
      topics[2]?.toLowerCase() === ZERO_ADDRESS_TOPIC &&
      tokenIdFromTopic(topics[3]) === tokenId
    );
  });
};
