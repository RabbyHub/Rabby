import { CHAINS, GASPRICE_RANGE } from 'consts';
import { Tx } from 'background/service/openapi';

export const validateGasPriceRange = (tx: Tx) => {
  const chain = Object.values(CHAINS).find((chain) => chain.id === tx.chainId);
  if (!chain) return true;
  const [min, max] = GASPRICE_RANGE[chain.enum];
  if (Number(tx.gasPrice) / 1e9 < min) throw new Error('GasPrice too low');
  if (Number(tx.gasPrice) / 1e9 > max) throw new Error('GasPrice too high');
  return true;
};
