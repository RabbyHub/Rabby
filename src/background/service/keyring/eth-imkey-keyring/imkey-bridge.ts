import { ETHSingleton } from '@imkey/web3-provider';
import { ImKeyBridgeInterface } from './imkey-bridge-interface';

export default class ImKeyBridge implements ImKeyBridgeInterface {
  app: ETHSingleton | null = null;

  private async makeApp(): Promise<void> {
    const eth = await ETHSingleton.getInstance();
    await eth.init();
    this.app = eth;
  }

  private isUnlocked() {
    return !!this.app;
  }
  unlock() {
    if (this.isUnlocked()) {
      return Promise.resolve('already unlocked');
    }
    return this.makeApp();
  }

  async cleanUp() {
    try {
      await this.app?.close();
    } catch (e) {
      console.error(e);
    }
    this.app = null;
  }

  loopCount = 0;

  invokeApp: ImKeyBridgeInterface['invokeApp'] = async (method, params) => {
    if (!this.app) {
      await this.makeApp();
    }
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const res = await this.app![method](...params);
      return res as any;
    } catch (e: any) {
      if (
        e.message.includes('Cannot read properties of undefined') ||
        e.message.includes('The device was disconnected')
      ) {
        this.loopCount++;
        // prevent infinite loop
        if (this.loopCount > 5) {
          this.loopCount = 0;
          throw new Error('device disconnected');
        }
        await this.cleanUp();
        return this.invokeApp(method, params);
      } else {
        throw e;
      }
    }
  };
}
