import { createPersistStore } from 'background/utils';
import { CEX, DEX } from '@/constant';

export type RabbyPointsStore = {
  signatures: Record<string, string>;
  redirect2Points: boolean;
};

class RabbyPoints {
  store: RabbyPointsStore = {
    signatures: {},
    redirect2Points: false,
  };

  init = async () => {
    const storage = await createPersistStore<RabbyPointsStore>({
      name: 'RabbyPoints',
      template: {
        signatures: {},
        redirect2Points: false,
      },
    });

    this.store = storage || this.store;
  };
  setRedirect2Points = (redirect2Points: boolean) => {
    this.store.redirect2Points = redirect2Points;
  };

  setSignature = (addr: string, signature: string) => {
    this.store.signatures = {
      ...this.store.signatures,
      [addr.toLowerCase()]: signature,
    };
  };

  getSignature = (addr: string) => {
    return this.store.signatures[addr.toLowerCase()];
  };
}

export default new RabbyPoints();
