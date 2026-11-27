import React, { ReactNode, createContext, useContext, useState } from 'react';
import { useMemoizedFn } from 'ahooks';
import { Object } from 'ts-toolbelt';
import { WalletController as WalletControllerClass } from 'background/controller/wallet';
import { IExtractFromPromise } from './type';
import { CommonPopupComponentName } from '../views/CommonPopup';
import { PopupProps } from '../component/Popup';
import { AppChain } from '../hooks/useAppChain';

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

  // Stable, like the useState setters next to them, so consumers can list
  // them as hook dependencies without re-running on every popup change.
  const activePopup = useMemoizedFn((name: CommonPopupComponentName) => {
    setComponentName(name);
    setVisible(true);
  });

  const closePopup = useMemoizedFn(() => {
    setVisible(false);
    setComponentName(undefined);
  });

  const activeApprovalPopup = useMemoizedFn(() => {
    if (componentName === 'Approval' && visible === false) {
      setVisible(true);
      return true;
    }
    return false;
  });

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
  };
};

// `wallet` never changes, so it gets its own context: components that only call
// useWallet() (including the route roots) must not re-render whenever the
// common popup's visible/title/height state changes.
const WalletContext = createContext<WalletController | null>(null);

const CommonPopupViewContext = createContext<ReturnType<
  typeof useCommonPopupViewState
> | null>(null);

const WalletProvider = ({
  children,
  wallet,
}: {
  children?: ReactNode;
  wallet: WalletController;
}) => {
  const commonPopupView = useCommonPopupViewState();

  return (
    <WalletContext.Provider value={wallet}>
      <CommonPopupViewContext.Provider value={commonPopupView}>
        {children}
      </CommonPopupViewContext.Provider>
    </WalletContext.Provider>
  );
};

const useWallet = () =>
  (useContext(WalletContext) as unknown) as WalletControllerType;

const useCommonPopupView = () =>
  (useContext(CommonPopupViewContext) as unknown) as ReturnType<
    typeof useCommonPopupViewState
  >;

export { WalletProvider, useWallet, useCommonPopupView };
