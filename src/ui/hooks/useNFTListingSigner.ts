import { useMemoizedFn } from 'ahooks';

import { signatureStore } from '@/ui/component/MiniSignV2/state';
import { typedDataSignatureStore } from '@/ui/component/MiniSignV2/state/TypedDataSignatureManager';
import { getUiType, useWallet } from '@/ui/utils';
import type { Account } from '@/background/service/preference';
import type { MiniTypedData } from '@/ui/views/Approval/components/MiniSignTypedData/useTypedDataTask';
import type { Tx } from '@rabby-wallet/rabby-api/dist/types';
import type {
  GasSelectionOptions,
  SignerConfig,
} from '../component/MiniSignV2/domain/types';
import { ReactNode, useState } from 'react';
import { SimpleSignConfig, useMiniSigner } from './useSigner';
import { MINI_SIGN_ERROR } from '../component/MiniSignV2/state/SignatureManager';
import { useCurrentAccount } from './backgroundState/useAccount';

export type TxStep = {
  kind: 'tx';
  txs: Tx[];
};

export type TypedStep = {
  kind: 'typed';
  txs: MiniTypedData[];
};

export type MixedSignStep = TxStep | TypedStep;

export const useNFTListSigner = (
  params: Parameters<typeof useMiniSigner>[0]
) => {
  const wallet = useWallet();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wip, setWip] = useState(true);

  const {
    prefetch,
    openUI,
    close: closeTxsSign,
    resetGasStore,
  } = useMiniSigner(params);

  const resetState = useMemoizedFn(() => {
    // reset inner state
    resetGasStore();
    closeTxsSign();
    typedDataSignatureStore.close();
    setCurrentIndex(0);
    setWip(true);
  });

  const run = useMemoizedFn(
    async (
      steps: MixedSignStep[],
      options?: Omit<SimpleSignConfig, 'txs' | 'buildTxs'>
    ) => {
      const results: string[] = [];

      resetState();

      const txs = steps
        .filter((item) => item.kind === 'tx')
        .map((item) => item.txs)
        .flat() as Tx[];

      prefetch({ ...options, txs });

      for (let idx = 0; idx < steps.length; idx++) {
        const step = steps[idx];
        if (step.kind === 'tx') {
          const hashes = await openUI({
            ...options,
            txs,
            pauseAfter: 1,
          });
          results.push(...hashes);
        } else {
          const hashes = await typedDataSignatureStore.start(
            {
              txs: step.txs,
              config: {
                account: params.account,
                getContainer: options?.getContainer,
                mode: 'UI',
                title: options?.title,
              },
              wallet,
            },
            {}
          );
          results.push(...hashes);
          typedDataSignatureStore.close();
        }
        setCurrentIndex(idx + 1);
      }
      setWip(false);
      return results;
    }
  );

  return {
    run,
    currentIndex,
    isSigning: wip,
  } as const;
};

// const isDesktop = getUiType().isDesktop;

// const Test = () => {
//   const currentAccount = useCurrentAccount();
//   const { currentIndex, isSigning, run } = useMixedSigner({
//     account: currentAccount!,
//   });

//   const getContainer = isDesktop
//     ? '.js-rabby-desktop-swap-container'
//     : undefined;

//   console.log('current process index', currentIndex);

//   const signMixedTxs = async () => {
//     try {
//       const hashes = await run(
//         [
//           {
//             kind: 'tx',
//             txs: [
//               {
//                 chainId: 146,
//                 data:
//                   '0x095ea7b30000000000000000000000006131b5fae19ea4f9d964eac0408e4408b66337b50000000000000000000000000000000000000000000000000000000000002f44',
//                 from: currentAccount?.address,
//                 to: '0x29219dd400f2bf60e5a23d13be72b486d4038894',
//                 value: '0x',
//               } as Tx,
//             ],
//           },
//           {
//             kind: 'typed',
//             txs: [
//               {
//                 data: {
//                   domain: {
//                     chainId: '42161',
//                     name: 'Ether Mail',
//                     verifyingContract:
//                       '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
//                     version: '1',
//                   },
//                   message: {
//                     contents: 'Hello, Bob!',
//                     from: {
//                       name: 'Cow',
//                       wallets: [
//                         '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
//                         '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
//                       ],
//                     },
//                     to: [
//                       {
//                         name: 'Bob',
//                         wallets: [
//                           '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
//                           '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
//                           '0xB0B0b0b0b0b0B000000000000000000000000000',
//                         ],
//                       },
//                     ],
//                     attachment: '0x',
//                   },
//                   primaryType: 'Mail',
//                   types: {
//                     EIP712Domain: [
//                       { name: 'name', type: 'string' },
//                       { name: 'version', type: 'string' },
//                       { name: 'chainId', type: 'uint256' },
//                       { name: 'verifyingContract', type: 'address' },
//                     ],
//                     Group: [
//                       { name: 'name', type: 'string' },
//                       { name: 'members', type: 'Person[]' },
//                     ],
//                     Mail: [
//                       { name: 'from', type: 'Person' },
//                       { name: 'to', type: 'Person[]' },
//                       { name: 'contents', type: 'string' },
//                       { name: 'attachment', type: 'bytes' },
//                     ],
//                     Person: [
//                       { name: 'name', type: 'string' },
//                       { name: 'wallets', type: 'address[]' },
//                     ],
//                   },
//                 },
//                 from: currentAccount!.address,
//                 version: 'V4',
//               },
//             ],
//           },
//         ],
//         {
//           hiddenHardWareProcess: true,
//           getContainer: getContainer,
//         }
//       );
//       console.log('hashes', hashes);
//     } catch (error) {
//       if (error === MINI_SIGN_ERROR.USER_CANCELLED) {
//         //
//       } else {
//         //
//       }
//     }
//   };
// };
