import type { ETHSingleton } from '@imkey/web3-provider';

export interface ImKeyBridgeInterface {
  unlock(): Promise<void | string>;
  cleanUp(): Promise<void>;
  invokeApp<
    Method extends Extract<
      keyof ETHSingleton,
      'getAddress' | 'signMessage' | 'signTransaction'
    > &
      string
  >(
    method: Method,
    params: Parameters<ETHSingleton[Method]>
  ): Promise<ReturnType<ETHSingleton[Method]>>;
}
