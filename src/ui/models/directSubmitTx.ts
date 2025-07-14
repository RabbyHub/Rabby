import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';

export const directSubmitTx = createModel<RootModel>()({
  name: 'directSubmitTx',

  state: {
    GasTipsComponent: null,
    directSigning: false,
  } as {
    miniApprovalGasState?: {
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
    };
    GasTipsComponent?: React.ReactNode | null;
    directSigning?: boolean;
  },

  reducers: {
    setState(state, payload: Partial<typeof state>) {
      return { ...state, ...payload };
    },
    reset() {
      return {
        GasTipsComponent: null,
        directSigning: false,
      };
    },
    updateMiniApprovalGasState(
      state,
      payload: Partial<typeof state.miniApprovalGasState>
    ) {
      return {
        ...state,
        miniApprovalGasState: {
          ...state.miniApprovalGasState,
          ...payload,
        },
      };
    },
    resetMiniApprovalGasState(state) {
      return {
        ...state,
        miniApprovalGasState: undefined,
      };
    },
  },
});
