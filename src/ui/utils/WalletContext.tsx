import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { Object } from 'ts-toolbelt';
import { WalletController as WalletControllerClass } from 'background/controller/wallet';
import { IExtractFromPromise } from './type';
import { CommonPopupComponentName } from '../views/CommonPopup';
import { PopupProps } from '../component/Popup';
import { AppChain } from '../hooks/useAppChain';
import { ApprovalBinding } from './approval-context';
import {
  currentBinding,
  dropBinding,
  pushBinding,
} from './approval-binding-stack';

// TODO: implement here but not used now to avoid too much ts checker error.
// we will use it on almost biz store ready.
export type WalletControllerType = Object.Merge<
  {
    [key in keyof WalletControllerClass]: WalletControllerClass[key] extends (
      ...args: infer ARGS
    ) => infer RET
      ? <T extends IExtractFromPromise<RET> = IExtractFromPromise<RET>>(
          ...args: ARGS
        ) => Promise<IExtractFromPromise<T>>
      : WalletControllerClass[key];
  },
  Record<string, <T = any>(...params: any) => Promise<T>>
>;

export type WalletController = Object.Merge<
  {
    openapi: {
      [key: string]: <T = any>(...params: any) => Promise<T>;
    };
  },
  Record<string, <T = any>(...params: any) => Promise<T>>
>;

const useCommonPopupViewState = () => {
  const [componentName, setComponentName] = useState<
    CommonPopupComponentName | false
  >();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState<React.ReactNode>('Sign');
  const [height, setHeight] = useState<number | 'auto' | 'fit-content'>(360);
  const [className, setClassName] = useState<'isConnectView' | undefined>();
  const [account, setAccount] = useState<{
    address: string;
    brandName: string;
    realBrandName?: string;
    chainId?: number;
    type: string;
  }>();
  const [data, setData] = useState<any>();
  const [apps, setApps] = useState<AppChain[]>();
  const [popupProps, setPopupProps] = useState<PopupProps | undefined>();
  // The approvals this window is currently showing, published by the approval
  // pages themselves (see ApprovalUtilsProvider). Popups mount outside those
  // trees but inside the same window, so this is how they learn what they are
  // acting on; a window with no approval page keeps the stack empty.
  //
  // It is a stack because two containers can be mounted at once - the route and
  // the approval popup - and whichever unmounts first must hand back to the
  // other rather than leaving the window unbound.
  const [bindings, setBindings] = useState<ApprovalBinding[]>([]);
  const approvalBinding = currentBinding(bindings);

  const publishApprovalBinding = useCallback((binding: ApprovalBinding) => {
    setBindings((current) => pushBinding(current, binding));
    return () => setBindings((current) => dropBinding(current, binding));
  }, []);

  const activePopup = (name: CommonPopupComponentName) => {
    setComponentName(name);
    setVisible(true);
  };

  const closePopup = () => {
    setVisible(false);
    setComponentName(undefined);
  };

  const activeApprovalPopup = () => {
    if (componentName === 'Approval' && visible === false) {
      setVisible(true);
      return true;
    }
    return false;
  };

  return {
    visible,
    setVisible,
    closePopup,
    componentName,
    activePopup,
    title,
    setTitle,
    height,
    setHeight,
    className,
    setClassName,
    account,
    setAccount,
    activeApprovalPopup,
    data,
    setData,
    popupProps,
    setPopupProps,
    apps,
    setApps,
    approvalBinding,
    publishApprovalBinding,
  };
};

const WalletContext = createContext<{
  wallet: WalletController;
  commonPopupView: ReturnType<typeof useCommonPopupViewState>;
} | null>(null);

const WalletProvider = ({
  children,
  wallet,
}: {
  children?: ReactNode;
  wallet: WalletController;
}) => {
  const commonPopupView = useCommonPopupViewState();

  return (
    <WalletContext.Provider value={{ wallet, commonPopupView }}>
      {children}
    </WalletContext.Provider>
  );
};

const useWallet = () => {
  const { wallet } = (useContext(WalletContext) as unknown) as {
    wallet: WalletControllerType;
  };

  return wallet;
};

const useCommonPopupView = () => {
  const { commonPopupView } = (useContext(WalletContext) as unknown) as {
    commonPopupView: ReturnType<typeof useCommonPopupViewState>;
  };

  return commonPopupView;
};

export { WalletProvider, useWallet, useCommonPopupView };
