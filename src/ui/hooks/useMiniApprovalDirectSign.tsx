import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import { useCallback } from 'react';
import { createContextState } from './contextState';
import React from 'react';

export const [
  MiniApprovalGasProvider,
  useMiniApprovalGas,
  useSetMiniApprovalGas,
] = createContextState<
  | {
      noCustomRPC?: boolean;
      showGasLevelPopup?: boolean;
      loading?: boolean;
      changedCustomGas?: boolean;
      externalPanelSelection?: (gas: GasLevel) => void;
      gasList?: GasLevel[] | null;
      gasMethod?: 'native' | 'gasAccount';
      handleClickEdit?: () => void;
      isDisabledGasPopup?: boolean;
      onChangeGasMethod?: (method: 'native' | 'gasAccount') => void;
      selectedGas?: GasLevel | null;
      gasCostUsdStr?: string;
      gasUsdList?: {
        slow: string;
        normal: string;
        fast: string;
      };
      gasIsNotEnough?: {
        slow: boolean;
        normal: boolean;
        fast: boolean;
      };
      gasAccountIsNotEnough?: {
        slow: [boolean, string];
        normal: [boolean, string];
        fast: [boolean, string];
      };
      disabledProcess?: boolean;

      gasAccountCost?: {
        total_cost: number;
        tx_cost: number;
        gas_cost: number;
        estimate_tx_cost: number;
      };
    }
  | undefined
>(undefined);

export const [
  DirectSigningProvider,
  useDirectSigning,
  useSetDirectSigning,
] = createContextState(false);

export const [
  GasTipsComponentProvider,
  useGetGasTipsComponent,
  useSetGasTipsComponent,
] = createContextState<React.ReactNode>(null);

export const DirectSubmitProvider = ({
  children,
}: React.PropsWithChildren<unknown>) => (
  <MiniApprovalGasProvider>
    <DirectSigningProvider>
      <GasTipsComponentProvider>{children}</GasTipsComponentProvider>
    </DirectSigningProvider>
  </MiniApprovalGasProvider>
);

export const useDirectSigningDisabledProcess = () =>
  useMiniApprovalGas()?.disabledProcess;

export const useResetDirectSignState = () => {
  const setMiniApprovalGasState = useSetMiniApprovalGas();
  const setGasRelativeComponent = useSetGasTipsComponent();

  const setDirectSigning = useSetDirectSigning();

  const resetState = useCallback(() => {
    setMiniApprovalGasState(undefined);
    setDirectSigning(false);
    setGasRelativeComponent(null);
  }, [setDirectSigning, setMiniApprovalGasState, setGasRelativeComponent]);

  return resetState;
};

export const AbortedDirectSubmitErrorCode = 'AbortedDirectSubmitError';
export class AbortedDirectSubmitError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: string = AbortedDirectSubmitErrorCode,
    statusCode?: number
  ) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export const isAbortedDirectSubmitError = (e: any) => {
  if (
    e instanceof AbortedDirectSubmitError &&
    e.code === AbortedDirectSubmitErrorCode
  ) {
    return true;
  }
  return false;
};

export const useStartDirectSigning = () => {
  const setDirectSigning = useSetDirectSigning();

  return useCallback(async () => {
    // const waitingDirectSignReSult = () =>
    //   new Promise<void>((resolve, reject) => {
    //     eventBus.once(EVENTS.DIRECT_SIGN, ({ error }) => {
    //       setDirectSigning(false);
    //       if (!error) {
    //         resolve();
    //       } else {
    //         reject(error);
    //       }
    //     });
    //   });
    setDirectSigning(true);
    // await waitingDirectSignReSult();
  }, [setDirectSigning]);
};
