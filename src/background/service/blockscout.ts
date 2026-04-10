import { isAddress } from 'viem';
import { http } from '../utils/http';

const BENS_ROOTSTOCK_DOMAIN_API =
  'https://bens.services.blockscout.com/api/v1/30/domains';

type DomainResolveResult = {
  addr: string;
  name: string;
};

class BlockscoutService {
  private extractResolvedAddress(payload: any): string | null {
    const resolvedAddress = payload?.resolved_address?.hash;

    if (
      typeof resolvedAddress === 'string' &&
      isAddress(resolvedAddress.toLowerCase())
    ) {
      return resolvedAddress;
    }

    return null;
  }

  getRnsAddressByName = async (
    rnsName: string
  ): Promise<DomainResolveResult | null> => {
    const normalizedName = rnsName.trim().toLowerCase();
    if (!normalizedName || !normalizedName.endsWith('.rsk')) {
      return null;
    }

    const encodedName = encodeURIComponent(normalizedName);
    const { data } = await http.get(
      `${BENS_ROOTSTOCK_DOMAIN_API}/${encodedName}`
    );

    const addr = this.extractResolvedAddress(data);

    if (!addr) {
      return null;
    }

    return {
      addr,
      name: normalizedName,
    };
  };
}

const blockscoutService = new BlockscoutService();

export default blockscoutService;
