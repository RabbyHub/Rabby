import * as Sentry from '@sentry/browser';
import Transaction from 'ethereumjs-tx';
import { TransactionFactory } from '@ethereumjs/tx';
import { bufferToHex, isHexString, addHexPrefix } from 'ethereumjs-util';
import { stringToHex } from 'web3-utils';
import { ethErrors } from 'eth-rpc-errors';
import { normalize as normalizeAddress } from 'eth-sig-util';
import cloneDeep from 'lodash/cloneDeep';
import {
  keyringService,
  permissionService,
  chainService,
  sessionService,
  openapiService,
  preferenceService,
  transactionWatchService,
  transactionHistoryService,
  i18n,
} from 'background/service';
import { notification } from 'background/webapi';
import { Session } from 'background/service/session';
import { Tx } from 'background/service/openapi';
import RpcCache from 'background/utils/rpcCache';
import Wallet from '../wallet';
import { CHAINS, CHAINS_ENUM, SAFE_RPC_METHODS } from 'consts';
import BaseController from '../base';

interface ApprovalRes extends Tx {
  type?: string;
  address?: string;
  uiRequestComponent?: string;
}

interface Web3WalletPermission {
  // The name of the method corresponding to the permission
  parentCapability: string;

  // The date the permission was granted, in UNIX epoch time
  date?: number;
}

const v1SignTypedDataVlidation = ({
  data: {
    params: [_, from],
  },
}) => {
  const currentAddress = preferenceService
    .getCurrentAccount()
    ?.address.toLowerCase();
  if (from.toLowerCase() !== currentAddress)
    throw ethErrors.rpc.invalidParams('from should be same as current address');
};

const signTypedDataVlidation = ({
  data: {
    params: [from, _],
  },
}) => {
  const currentAddress = preferenceService
    .getCurrentAccount()
    ?.address.toLowerCase();
  if (from.toLowerCase() !== currentAddress)
    throw ethErrors.rpc.invalidParams('from should be same as current address');
};

class ProviderController extends BaseController {
  ethRpc = (req) => {
    const {
      data: { method, params },
      session: { origin },
    } = req;

    if (
      !permissionService.hasPerssmion(origin) &&
      !SAFE_RPC_METHODS.includes(method)
    ) {
      throw ethErrors.provider.unauthorized();
    }

    const connected = permissionService.getConnectedSite(origin);
    let chainServerId = CHAINS[CHAINS_ENUM.ETH].serverId;

    if (connected) {
      chainServerId = CHAINS[connected.chain].serverId;
    }

    const currentAddress =
      preferenceService.getCurrentAccount()?.address.toLowerCase() || '0x';
    const cache = RpcCache.get(currentAddress, {
      method,
      params,
      chainId: chainServerId,
    });
    if (cache) return cache;

    const promise = openapiService
      .ethRpc(chainServerId, {
        origin: encodeURIComponent(origin),
        method,
        params,
      })
      .then((result) => {
        RpcCache.set(
          currentAddress,
          { method, params, result, chainId: chainServerId },
          method === 'eth_call' ? 10000 : undefined
        );
        return result;
      });
    RpcCache.set(
      currentAddress,
      { method, params, result: promise, chainId: chainServerId },
      method === 'eth_call' ? 10000 : undefined
    );
    return promise;
  };

  ethRequestAccounts = async ({ session: { origin } }) => {
    if (!permissionService.hasPerssmion(origin)) {
      throw ethErrors.provider.unauthorized();
    }

    const _account = await this.getCurrentAccount();
    const account = _account ? [_account.address] : [];
    sessionService.broadcastEvent('accountsChanged', account);

    return account;
  };

  @Reflect.metadata('SAFE', true)
  ethAccounts = async ({ session: { origin } }) => {
    if (!permissionService.hasPerssmion(origin)) {
      return [];
    }

    const account = await this.getCurrentAccount();
    return account ? [account.address] : [];
  };

  @Reflect.metadata('SAFE', true)
  ethCoinbase = async ({ session: { origin } }) => {
    if (!permissionService.hasPerssmion(origin)) {
      return null;
    }

    const account = await this.getCurrentAccount();
    return account ? account.address : null;
  };

  @Reflect.metadata('SAFE', true)
  ethChainId = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permissionService.getWithoutUpdate(origin);

    return CHAINS[site?.chain || CHAINS_ENUM.ETH].hex;
  };

  @Reflect.metadata('SAFE', true)
  netVersion = ({ session }: { session: Session }) => {
    const origin = session.origin;
    const site = permissionService.getWithoutUpdate(origin);

    return CHAINS[site?.chain || CHAINS_ENUM.ETH].network;
  };

  @Reflect.metadata('APPROVAL', [
    'SignTx',
    ({
      data: {
        params: [tx],
      },
      session,
    }) => {
      const currentAddress = preferenceService
        .getCurrentAccount()
        ?.address.toLowerCase();
      const currentChain = permissionService.isInternalOrigin(session.origin)
        ? Object.values(CHAINS).find((chain) => chain.id === tx.chainId)!.enum
        : permissionService.getConnectedSite(session.origin)?.chain;
      if (tx.from.toLowerCase() !== currentAddress) {
        throw ethErrors.rpc.invalidParams(
          'from should be same as current address'
        );
      }
      if (
        'chainId' in tx &&
        (!currentChain || Number(tx.chainId) !== CHAINS[currentChain].id)
      ) {
        throw ethErrors.rpc.invalidParams(
          'chainId should be same as current chainId'
        );
      }
    },
  ])
  ethSendTransaction = async (options: {
    data: {
      params: any;
    };
    session: Session;
    approvalRes: ApprovalRes;
    pushed: boolean;
    result: any;
  }) => {
    if (options.pushed) return options.result;
    const {
      data: {
        params: [txParams],
      },
      session: { origin },
      approvalRes,
    } = cloneDeep(options);
    const keyring = await this._checkAddress(txParams.from);
    delete approvalRes.address;
    delete approvalRes.type;
    delete approvalRes.uiRequestComponent;
    const tx = new Transaction(approvalRes);
    const signedTx = await keyringService.signTransaction(
      keyring,
      tx,
      txParams.from
    );
    const onTranscationSubmitted = (hash: string) => {
      const chain = permissionService.isInternalOrigin(origin)
        ? Object.values(CHAINS).find(
            (chain) => chain.id === approvalRes.chainId
          )!.enum
        : permissionService.getConnectedSite(origin)!.chain;
      const cacheExplain = transactionHistoryService.getExplainCache({
        address: txParams.from,
        chainId: Number(approvalRes.chainId),
        nonce: Number(approvalRes.nonce),
      });
      transactionHistoryService.addTx(
        {
          rawTx: approvalRes,
          createdAt: Date.now(),
          isCompleted: false,
          hash,
          failed: false,
        },
        cacheExplain
      );
      transactionWatchService.addTx(
        `${txParams.from}_${approvalRes.nonce}_${chain}`,
        {
          nonce: approvalRes.nonce,
          hash,
          chain,
        }
      );
    };
    if (typeof signedTx === 'string') {
      onTranscationSubmitted(signedTx);
      return signedTx;
    }
    const buildTx = TransactionFactory.fromTxData({
      ...approvalRes,
      r: addHexPrefix(signedTx.r),
      s: addHexPrefix(signedTx.s),
      v: addHexPrefix(signedTx.v),
    });

    // Report address type(not sensitive information) to sentry when tx signatuure is invalid
    if (!buildTx.verifySignature()) {
      if (!buildTx.v) {
        Sentry.captureException(new Error(`v missed, ${keyring.type}`));
      } else if (!buildTx.s) {
        Sentry.captureException(new Error(`s midded, ${keyring.type}`));
      } else if (!buildTx.r) {
        Sentry.captureException(new Error(`r midded, ${keyring.type}`));
      } else {
        Sentry.captureException(
          new Error(`invalid signature, ${keyring.type}`)
        );
      }
    }
    try {
      const hash = await openapiService.pushTx({
        ...approvalRes,
        r: bufferToHex(signedTx.r),
        s: bufferToHex(signedTx.s),
        v: bufferToHex(signedTx.v),
        value: approvalRes.value || '0x0',
      });

      onTranscationSubmitted(hash);

      return hash;
    } catch (e) {
      const errMsg = e.message || JSON.stringify(e);
      notification.create(undefined, i18n.t('Transaction push failed'), errMsg);
      throw new Error(errMsg);
    }
  };

  @Reflect.metadata('APPROVAL', [
    'SignText',
    ({
      data: {
        params: [_, from],
      },
    }) => {
      const currentAddress = preferenceService
        .getCurrentAccount()
        ?.address.toLowerCase();
      if (from.toLowerCase() !== currentAddress)
        throw ethErrors.rpc.invalidParams(
          'from should be same as current address'
        );
    },
  ])
  personalSign = async ({
    data: {
      params: [data, from],
    },
  }) => {
    data = data = isHexString(data) ? data : stringToHex(data);
    const keyring = await this._checkAddress(from);

    return keyringService.signPersonalMessage(keyring, { data, from });
  };

  private _signTypedData = async (from, data, version) => {
    const keyring = await this._checkAddress(from);
    let _data = data;
    if (version !== 'V1') {
      if (typeof data === 'string') {
        _data = JSON.parse(data);
      }
    }

    return keyringService.signTypedMessage(
      keyring,
      { from, data: _data },
      { version }
    );
  };

  @Reflect.metadata('APPROVAL', ['SignTypedData', v1SignTypedDataVlidation])
  ethSignTypedData = async ({
    data: {
      params: [data, from],
    },
  }) => this._signTypedData(from, data, 'V1');

  ethGetBlockByNumber = () => {
    return {
      jsonrpc: '2.0',
      id: 2496202763985442,
      result: {
        difficulty: '0x13',
        extraData:
          '0xd783010a0883626f7288676f312e31352e37856c696e757800000000000000001d079fa7d1fdede8940aefde3d561d9f566026e7999c09f5db27d077bca390294f987beed235353321894fce20b9799016685f6df5ca0f33851ab7480084dd2e01',
        gasLimit: '0x1339165',
        gasUsed: '0x1334259',
        hash:
          '0x2b0e180cb53974dccd835d2c4723de07f0fae410b9751a33a95eb79b7600a352',
        logsBloom:
          '0x36bc1a20f390cec5c67a8cc98c32793410e677504c769619644eb28ef32f7d618a8db0229e9220c810317492d7dfd1552b4781c51dd2e13821b20325a2262605085a55f4c98f695104335b2fe76589b2921685b2234d282a331f2d9bcdeb06849517c696567d877398b008a46f497c608029e6c2f8c98639c8197c34836742d7b8a16f436d3be7d080963162bccade48ed2335e590901028519a3746d136b444664c28cd382587d4838acd92b1a26d88606009c2b8a0959531a9e46e0c44614eb3660ca64406876aaa0384222a961963b2747d03a88981b0b692afb6440260c237331ec9b21c24464cb42b6a19964897d7d7a62e50bc005800d38d4c22123d08',
        miner: '0x7b5000af8ab69fd59eb0d4f5762bff57c9c04385',
        mixHash:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        nonce: '0x0000000000000000',
        number: '0x11aa907',
        parentHash:
          '0x4d63512704427c68ec3c09cb949918cd4256f363796696d5610c3ef395ae57cf',
        receiptsRoot:
          '0x533504bdad8dae167624ca89b2d21340f7e3c0d4efe2cac912c377ed3b3e44c8',
        sha3Uncles:
          '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
        size: '0x13c1a',
        stateRoot:
          '0xe749f1c9e12f75167912a25d70fef638b402c26accf72bf8f6686f29f9b0033b',
        timestamp: '0x612ba6bd',
        totalDifficulty: '0xc6e7e89',
        transactions: [
          '0x4d001c1aa86794217f73a0f494afbd352483c270adafe442e16b4018c21e879b',
          '0xcc27c600d267d0e45e0dae97a2c57701df6e6f61c25b7f47c441e4363956c78a',
          '0x9e2eb5d9084e0669d0b7d425946105eb9667093d211ab28d839bea22b86a8082',
          '0x1f078c280e8c0aa90ce1c8a1a742f45054fd454cbf513c6f6f17c34e730d3693',
          '0x0cb215749e87b1fa8fea9ce73837051e66dbfae48af6abee79d916731424ec63',
          '0xbe7e23af6a324d7e0ba4f2c04ab93a9a33ff5a2ce2927b50a9441394b1e67708',
          '0x4c1881a188334f968ed342be453e1d5c1bdf56a5771c780c1f5d77135384b080',
          '0x5350ce20ac528ac24f9fd315c0123bbe258e6e5b25f67a51a57212e09c0bca8d',
          '0x7e66d54808ace62c86033bb7e6109304e8fa53b77768a8bff59eb71ccef052e8',
          '0x6295a2a7d215794174d59989e66214f89aa30d655e3633456982152dba3d82d5',
          '0x5944a0b1a6f09fcd49fe44e3f5de2b05841393e143ed3930c4c8db2466254260',
          '0x07048bc477270a3be5b42ee9f39878264cb8f500ad2ccfb7e9e22bc3fe592207',
          '0xab45cd239b2d537654aa218c39c7bd53fd1d8a93f06b577eb55e3e6ac5d9a7aa',
          '0xb8eb6b235dc7810481e9d6bd9870408169ec4ff4203a55e4fb9bc1eb0aa50d70',
          '0x5958f6c8edaad4f28060d80e6f6bc6d9bacec326b3e28cafbf59f9fec13ebeef',
          '0x96cb8a8aab923b95a1b70c9bd881f358e4db9f534f54a7bf80b0c88872815b2d',
          '0xe8acfaddadf7b568811d0653229f7689b462af717cf407947cb87ff921a1dbc9',
          '0x482e96ea7961cee73377e992428d0d1dc271a23148680998333bbb984189cc9f',
          '0xf7c153657ac4c870ee9ec3385b811f41cff1cb26f6ca7038d6e38e49ed8e0153',
          '0x12301e25cff8b77f5fcca3275dcc4e4f2a046e2e698b0e0da24350897a85794d',
          '0xcca715bc740bce1a73fd45fbff6bdf911b864b678993f51475431f20d80a867b',
          '0x0519a9c31facb50d9469adff0d14416bfdfd032bb884e1577683a3cad1e06b6d',
          '0xcd28f3bd5816b4ec1b044022928ad47235289da998a0e09f05cef8ac79cfd8c5',
          '0xd4d1df940dc33f1ea23c5dd9048c831a22bbcf7c1362545ccd9fa74ce8aefea9',
          '0x477c3fa0b56b9106ad38e44352ea291871d8bfe65e0a2894220ac323c1e5df33',
          '0xaa30eb2891b67f5ee34b647191cb5f739071af34040c290b3dfca1c7e2a281c3',
          '0x4ba12807851eda0010110687f3fead95b047488178f9af23b52955586e912f42',
          '0x049403c7442cf6a3a161238cdf8341b8e6ebad654cd63bdbe1497d51549250fb',
          '0x51a8012f7b87c6bda1edeb72650692e86d51fa07c9670855a45811a736dd507a',
          '0x5e32487c843cfbe0b4b185e41cf9082613751e01b86ae01bfa782c20e259ec09',
          '0x729119715a1a25f7655abdddbb4634e5265a56ec48ff63170da2b06bb1ff7da7',
          '0x0608d6dbdd713c8f71a5e247f7939735ff73337c8c3dc14ae5c0f8bc9dc5d1a0',
          '0xff7bdd6d55727e00bec4950890999cce484a1ab28bc5ac05a8f878ed8eb40851',
          '0x88da1aa27df1e27bd14f635ead5206fe005ae2dfdd3350fa4f26057114227ae5',
          '0xd98e6323215b89af47d4dff86a0fc08dcc9f55cc64da872b275a77263f76a483',
          '0x916eee3956d88a3f3b9d19fcdf5d9da3d9b7746380039e14f913ae04e028bf62',
          '0x0e9e5f097157f86c478ed87fff7662b35c7063071857ccb1c7058aa1f4c6654c',
          '0x9b1f3f37feec825eac587f42ad9ca5595e1193de7df72ebe0f78f859da169c82',
          '0xf6132e496930892d7960f3c4d8cb83caaf1329a56e7a27b92f57580f78e11859',
          '0x86fcbd0bc8c436f7b57672ab3169c0756d84969f9063f697d6b2b8353916dbe5',
          '0x40cee834af8af2762face673232f18b62855d5f3bf73bc278a9cdafd409f78ef',
          '0x3620f0cb7204cea16d1e91ea962cca038db8128eb006b5f042b6734d3cc7e9e5',
          '0x36471623a95c7e5244b5678bbd0b4301c3ee447a9262d9621dec97974ab55967',
          '0xbb93e0ce2f6762ddf7438efb40e7bd4bf8d6104237bb6b8e95b5c8b7454782f7',
          '0x8aa8472a8f8fb896e17d5adf6ef584052b256d1dd0ae517737bed56cdbe9e893',
          '0xfc87deb9fd07a96ed5b2b673dcd7e1f15b8b68b7c9e36a450db3d8e5a82cb52e',
          '0x66d49c8a119ab528b4f5f71c0cadfd16f5d71d4da04c99c02e16946885a568e0',
          '0x9b46f3d3df1f1980175b0552016c8bb95dfc5c8094f9c57cbefc3046e3377eef',
          '0x9eace083487dec90b0f9ebcaa6ace8b8a21e04fa5ad7870aabfb1c4e06c8584a',
          '0x39aadde263e2562975c73a3d8149cdd91201d0a484c228141bb6e6945dd23763',
          '0xbe718465861e1d18fb5fa2931a261b546d3a124ffab102c2d006de21371336ef',
          '0x476c8fe4c7ee2b0b59dc188947655fbd11416db49e08a21757da06c4f47f7712',
          '0xc56045a20b560bde694b2a5b7311a16662093ca0d5267ab7134b59b6e6635348',
          '0xfb4ee1d9adc77070fc16fdd6b11b4ee8a6a6a80e71747b8b5a3e1d889b8a9148',
          '0x4d4b3eeb66d502b230e9903d39ded79565bbd474fe471d15b9582effdd16bb06',
          '0xede7f1d5d74c4cbb6be3a305c0066dc6c4d6dd8ca4d1bd0ebee849a5d369a0a4',
          '0xfe8e4a5875ffc30182a2bf97893eb460947eb8dac929cdd1544fc7b8378b5faf',
          '0x72cb5b0e4ec9cdf36addf92c9beaff00e6271e4500ea91b34f101f806502cdfb',
          '0xeddce87c3874b4570c30567150ccc8db5aaab52acd149c86628d036886c24131',
          '0x826f21879a8057911bf3808026346814e90d010bfc77cc6128963e94bfaad1c8',
          '0xfc438cacebe9ff608e4cf0929ba145303cc309ee59830428deee28acbc831f59',
          '0x1a42ec1ff0337a7e890135d5abbd291e297d5005bbde8e116021924b0813429d',
          '0xe77982a42b36738b3100644bfb1de0c495d1a305e7d7b433ebe684c0d1ce890a',
          '0xfc37902474234f65fd2d1dd6e94102fb4374ca8390b2087a150c45997870ec67',
          '0x71444b002197c328163f6276fe6eccdfb351cc00297e4b7d29344daef1423357',
          '0x18b8ec1dc2924fb45468c0c4b0ac138bc9b86c6456e44e8ac56eabee850d3073',
          '0x2a4f625993dd6e72165e87935153d4b795f174ea609179a2f63e50e1ff4d8343',
          '0x8d1288ac36c3edbc5188e38c225820fac134e7627f5f623e5a88615c15fb6492',
          '0x70b24a22d63f9f1f4048a7c99cb49ad42d77a35eab415fe367f6f898c571dd56',
          '0xeaa1129cdb9e5963d01051e8f5bd03139a35dc98aca3c13b45be57575753709b',
          '0x794c2fdcbb1f9032362b312eb4b6117046dbfa2630f0f830b3dd0df87aafe754',
          '0x990aa9549a7bc06482c991a86fc11f9e5337a2b82b5accc311a374d46f529dba',
          '0xd3ad02fed691bd4c0429fab0af9d8ac85b480dd17b5dacff9882bf0105187ca4',
          '0x760600ef75f801ecd4a8d3687a1020a14f3f1d285afdefc877e01e24889eec77',
          '0x43b7d9d89bac06d7160c3cc28d18a9da5ab77e07560e26863a756a6421c99a6f',
          '0xdda9079ed24e3cc0bd8694959841085174a497e3e89b3843e7a73696a3bdef94',
          '0x656f4cc9e0837a559e0d6bfc272001b1f67c264c974d461bb86c3ed71de8892e',
          '0x61cb2a04ef6612496d0a4dc729ff4d4693a2168f89ff656df128d1d30002c90d',
          '0x47cd5ef4e16ef5f48994f5cc4c852d39d921f319a6467d1154797b875bdca31f',
          '0xeecae0d7d5bf5b793a235e797461c46d8d1203e7ac5512cb6030c3d7e77ff5de',
          '0x1904e3f5ab4b1024ec0b88ecdc9322140c05686725e219975dadcbd0b2715ff4',
          '0x017be1e14f566c0f8df794c339c4bd653e29a309f6be98470865905cf8dd8026',
          '0xa10a7ead549d6e8b7c5ae5b25c2699291b7fa3d8a8ab228ea6d61e0c73f89552',
          '0xfb592595ed614bfeb7a945280b838905cdd6372ffbfcb38ab717313b96badb67',
          '0x115741a753a8a313a779977e4c103a30344c65e40aeb033af3f4d95fbb6092b0',
          '0x84f8bf492c3fab32d9997dc31d45b72832376b11835dca37154799cb552d90d1',
          '0x58e6a76f5c7fdd186259c2c5f58153307caf573f829e3aaaa1ed6313db5c19ef',
          '0x5a236536e908047c26d089b070671c3c9e8d60c4580f78b30db380ceb5161e26',
          '0x7b64cf2e9c81a8ec68adce38d7e76696b9df706cc2aa47e76fbf25d9634325a3',
          '0xb789a4edf6af7c891b6ec87759b87796b05d89e5159b7b60945cab16d26e0ecd',
          '0x227779335537d30d6e730f199b27616af3636a900dabaa4752b659ba0b200893',
          '0x9233fc35b78993e7736689ffe346815bf70bb4b8e8968a291c5c05a8254dd386',
          '0x1e9b9c9f8e2590e0bdf7b61bcf3c191d02b490c2dfa5e94a82caf9d4119f17ab',
          '0x5444cbcc6451992a1e9da80fcb5d78073902ec7aab9d23b18234db6b9e108bdf',
          '0x52f2438ab40e3414e73bb4a84d078a4d3185d32328e920635d65129a83e6eccb',
          '0x8afe8f750b01ecf055b4ffbcc486586bb0c5c4b342b73ef323a4571a172a738c',
          '0x02adfda61d18f2d14a36eceadba78cf785eac2791db5afe064c180450f1f3e4a',
          '0xadeea3af08358b26829a8a8c0c3c4c5c1cac8da2c58b6deb1f3104fcb6daf5ed',
          '0xfd449f8fe674d7f9dfbaaf50a9962c69d7283a26bdd326a3d5770f4f2f002cb7',
          '0xd9d27dfd753f4994124c51e2b4837d90ede8231840b34687551d65c0698a4e33',
          '0xd0c1c69bfc6bf9e61713773f66a9373540c617d13f16fa4b6ec6d8f19b98894b',
          '0x490ccfc1c22c94c457784bb6315e40d89f4070f875faff457c932e70d009f817',
          '0x432a7f3e39cfd250ab6a44ec7256207715d986975b4214a506e21cbcece451be',
          '0x449149b0bd5cc015adb95a329176fd67dc2df9c473ece1e1f6af8455254f1c88',
          '0xd4eabf747773853051dfd11b584e9034b620d5c5bee6ec29fa1f7e4a4685652f',
          '0x183743fcb343e75a072c34b29dec6e4d3f2b57feda8a159a7b058bca1c7cf18a',
          '0x759bd7f94437ab326f6e8602dd48ce37528bf56e433f288ba0edece741391b44',
          '0xe084f67d6ca3155fcec4111e84f3b86bce065c72ceedff00c4db76d5a99fc391',
          '0xc4a84859b82ae41e2064c986327858446678f660b9ed05b207b408f4f20e25f1',
          '0x9ad28088171242e8077100e291329efacb4a0cdf6036cd5371c9b931b2fba32d',
          '0x21a062b9b66296e1faaf2185bea847e7920aeda1dd2f1b8a7f9b949b0cc88876',
          '0xd42745ac5dc175ad464e2701e6952160c543e4a4938c99c7afa20513d7f5f36b',
          '0xca2953e46ba472551a7f4d93bbbb09d9ae191df9c7ce5c2b1ec9715fc244a892',
          '0x00ff3838e26edb2d042eed53f13cefa50a903f6723af98ca8024af17775898a6',
          '0xd98732b557b8da6366457b3468ad9059c73f2ff3fed61c2b38666fc108d58455',
          '0xcd17e52c31cbbc9c7da32f18b8e075c07ba39af03ac65b69a03ffe390cda6d23',
          '0x0632ed453740ee1176e60d4b6ef65033af82ed4a5e135aa4f3ec2dde843c6a69',
          '0x2f2eba1c9f4a8a45476c690d6e64c679141d4c08697c3245f79caf342a1e38b5',
          '0x30817652566f236809201388340c84667854a5e53cae8c752e42190413eba99b',
          '0x992ebcd21844af199208375bbf207d59ec95b184fff7ded43c6949a03ac6c79a',
          '0x0584ffef4c84319b2c186ed0e3b7c88ee3bf73f9466a6532213b4d1155ce0e6c',
          '0x9a78e5e261be30f8dc9aad130788935f1ea503aff8631311da1438a75ab8e641',
          '0x71c2ea98697f39e909ca7b20f625f7fc095c0d33c2b44ef0fd48a2d575e3de82',
          '0xd8d4d272bdebf06f8e46f45307320653285390994a274e8be7369484c7f1f33b',
          '0xf57029f4f7d480ce2bb12ac08378ccef6b50fa5995d97413a03b25a435b01aa6',
          '0xa5b45e0fe5ae52b4126b0652ac1c03d4223f8909f6572a5dcb2c2b890ece9fd4',
          '0x19b35c462a10f54008f3605447f5439dadf2d6db22d8eac5c568189f38871d6f',
          '0xd548db9740e64d75225fd44c9ee3bfb9cc554d39a60a4e4f24171540e7d5731d',
          '0x4b595c5f54a6666e367f5de6c23268a102e616453fcae9b6401e52f013a15eaa',
          '0x448e470284658e09034e6baa4768164afef06c3aa3a3bb4d91d5805b567f7121',
          '0xc0d2e0d9566aa510ebb22cc7a4a816e6f9912b9f61f4177a13af2448ce724274',
          '0xd7c6c2f3abf40c0fd4ec7c10caec37e64a39c13fd38cb5d96866cc26d92b2761',
          '0xcb22c24f47db0cd78b7b2f636f4ecd6693242b95acb7a102d81f5c24c898cbd0',
          '0x24e9c87cc89f1d11d6b85ef0a6a60c8d2429c705575d2975801216707f9b3259',
          '0xd00abc51f16e2cd61972f0f5e80abc1593f7a6e26eb694febfdcc599e0c32e94',
          '0x7e43a31d745f91ea121c03ad5359e92b052945a74da38dd84e66ba042ff17705',
          '0x1cda8bcdcb5d278417195389e65df950e155896c6263a65b82af4503fb94bbd0',
          '0x8c8856f114c210243aa23da190d889ca6f9b13cab00ca1e47f7b09dba0430b4d',
          '0xd10bf80cfac78cacbab05729ac9e8423a63decfd5487a8ace3262a3fe8d39a4e',
          '0xfb0920e8afe716ef62948ac9377105fddd586e3bee111aed4cbb3d08d1026f3c',
          '0xa31307d1deb6d3b8ef4a402a71f70e627bae81a503c6ff86a42a3c16704be8ed',
          '0x62a6fd7ddf267014561d20ecc11aa7c84b913082ef1866de61dc81fc8dd7b29b',
          '0x0e49cf7af87a473ae1f3518802f354e62f7d311cea04a07cf9e6737e916e2810',
          '0xa2f0c8d66332af7c4a1f3d09d91c040a44d848aff5e37b559bc2026acb857368',
          '0x2d25131203bac4f44b70c28e051526069b17e9f62107ca9fcbba7af9ef03f9f3',
          '0x834b890c344b265fc166ab045287d7385db795c40fab312ce5f9c955acf84b08',
          '0x441d22f9d1f5820a603071f5f67803b9daa7fdbe600932ba06adee608c7d6c37',
          '0xd5724749aa392187737b7df3302c4bde791ef878adac63a1730d27fcf44357b7',
          '0xe74338187edc756afad956f490dd93411dfed81c3a599813f9daa32c270180b4',
          '0x25b5c98fa454f01a518c34c3efdff868c0e064fef65f9d7d57a034ea2d662394',
          '0x7f5609bb74ba178e85c42fe8cae302bf6f7ea78b6b79c715ecf5a26669f1e955',
          '0x4af9cdea29777bc0d6fd39e5c3ada703785072595147bbfbfdbc749c60c14bab',
          '0xaa8d3ae2fbe3b2aff6f4f0a2641c5dc1ee345000336f0478b5b8f288fe13ff1a',
          '0x50f3086bc24c765332a9d56f8ee002360320da7edcffa65f32ae776d60ed05dc',
          '0xac392c1356cf6bf18198481ea310d8cf635ea744042ae8b455bf14a39dc5263d',
          '0xc7a0918d1b3d06b2e5d50ef0452a582017c5b6c03b2b5bd844c063b6d70eaf4b',
          '0x8cd46f8415681aa717f5638d3c3e377b45de909ae41729353b5704e335c43f30',
          '0x73211178fba670d9a0df7e454793d6348bfdc9f89d752c000d4c4dfb7fe5e5d6',
          '0x0c3e928268f5cf90619a764399fb7e1219e3fba3dddf28be702944a798aa799a',
          '0x0ff5cd8093dd9e298d53e419ff4e871619784c152837c70200319d3c2311492b',
          '0x62d638965739f90bac112d023da2043e32a553a01936ad50ba7c86981ec00080',
          '0x040ea7541a9ee5c5cb6ad93e7ebe5961c3667cd23c6fbcebc026efc5e9699ec2',
          '0x8757a64e1317100b1069b5d044f02855ef86d3feeb6bbd9b4f65dbe79c4f7cf1',
          '0x3a25e84715c4714eb1e4f874359bac8daecb3b4aff7fab637c6a664e8e69d1cf',
          '0x60c38bb565dc2506f03cc694fcfdfcea29d72c40ff20800a39730661911f5c52',
          '0x8a1072831c4fd4147660dddf50c4891ba68a38c0fa3341bd9b21b2e07e9455e1',
          '0x400a0b977d503142da9e8c07142e085bc4860e8f1220d9b8e45ca8f78b773650',
          '0x677e2fe0399476021a0f202b2213f9a356a31fd9a0388a3cd61fff713448a952',
          '0xb94089bd0f23ad594e874121adbe2deaee87328bd1d6b187c4f8281e45ab71b0',
          '0x1973134e574bc5332995b2d45d99c143165185106a8361193f625dce83b4d984',
          '0x3fbad71f77a421d88832992840f5d2910d1406788ba10c0a816377e9a8d77718',
          '0xde3d34d34116be7948bcc540ad97d6ffef8e7e96fd716887a3ba67aa96cf09e3',
          '0x3bb6ea8fbf2cadb692e84a13791e78343b8d92acc3a2cff8030b508a547717f9',
          '0x84c0b20757429309bcd55bb826aa6357ace243a0fa3467f759ea86946769f91e',
          '0x0557f1f5dc8faf96710b0b7f459383ea94717a4fa492c96674ae97fd944dffdb',
          '0x1fd54dac27e34448b43fd09e25ae727d01b7c7004e546636574a7b4d24f53ae8',
          '0xdd68dee22b45022e4d8fafdfaa387ca75330bb5c3d391a711ffb687a1b8292e7',
          '0x9b7eeb644410b22f9e9128e4c4d3171dabbc0d4999db6b9bae118319cdd47a33',
          '0x4521ccee458fa4d7d8ab2dcfc943eb9b83802aca0977ed3f1c7c0cffcf80fffc',
          '0x7eee9124eab9c9644b80e5d685f13dece47d22e9ea0a4b06e7fcff553f3a1e55',
          '0xd262e98f5f653f8a0ed510c0b55769fe00e26fcf8a86d214b9bb4235e24950a3',
          '0xaaf7d79b0459f5af7a849603350c25ce581c0fe2a866c8a88c7cc88e68ecf783',
          '0x000b30f7dda335dd9d35f6311264a8bf5c33afd1fa3b87084b6bbba45b2f7131',
          '0x2db294e968d1fd0320aa0bd23f2f6504decaa03e2a496ab9e7ca95e1b2c93e83',
          '0x31429a9ffea436e2865c7f2e91f586210b069097c0ed7da007896a7f93913a49',
          '0x602b78ba3e6e00bf2270a5746dde11152652e9a7c6b7b82a2542caf1200ad7d7',
          '0x45b8dd63d8f63f02668f9e8b3099c075bb5d7d0efe83ee87167e7420b4bf8709',
          '0xed9057122e39b0ce75c5b65f9f25ed8a4113ed2481590583ccc217767f8ea28d',
          '0x0d2a08503ccfc57672685903c30482195a111e1f8ee3ec63c3068b82e5b61a83',
          '0x300536b6248b62e2ed43b01ac14ab98f695e2d2a6e69fe650e14543412f0b2f8',
          '0xab7657781064be9d5653f65a80abdddea137505e08483b87bb7ada8d0a538ba7',
          '0xf29f66e6a1ac985a7e57c3f59de084d3e3e39207b0e04bcb51af40d60aae4fb1',
          '0x2bfe3edf6d897b596626d6a4c14608bc3ae723f741c756111569101dc463ffa8',
          '0x5e81b5dbf4445b0c1fc517a61cef370473c4354a37ad9ed734f4bb1816bb5147',
          '0x7afb0be040953239f53d0a3632ad5fd606f68096d5d747c57a97dca403ce0006',
          '0x66744dc96ea42b7da5c0fa5e09175d258a8afaaabc8506901d2b471c82e9a1a9',
          '0x3b0791aed64c172ffd6fe689d2ecae14d02d5df39f8b01f815f0b74c93351764',
          '0x061d97bf9dd1324fff4a20a4791583ba51a2ccf386a99ec90b1904a77c52b299',
          '0x7763447a0080ac31af3a7b741ebdca13841679736bb54540e81bd44388d0049a',
          '0x3dc5961eb6dd97d11bb3e6ee5beed14caaeafe9ae7fe4f11ce299ab58eaaf155',
          '0x24ea1e2913a1e815ba38a7d1ddf884b834f2d81de67c67e08ad969ad738bda8f',
          '0x1640f672956b62a740e854533bae9df00d75b3dbe654d431b54c769b4c817573',
          '0x8335486034eaa126f9fb5edb3674c79d193ac28a14b688b506276b4c60a5f085',
          '0x93b340a54084b4e6d9d7e9607229e667b580ecd4feaf450262914bcadbc17982',
          '0x8a68be645b9ba0bce7020d0283abd188f79b5dc05b50aa6bd55544021056e799',
          '0x7ebf786538a0f4eac4d8e5312b865bc54d96ece9b6188161f1d69fff90eece2e',
          '0x9fce0de39299167a4989bac63df58889ed6c823abe70c97950ff5a17f00e914d',
          '0x47ff5f8ce2012c51498a67e996cd16665d8583d351780d1a71f8d432419a18df',
          '0x2f38dfbe7c96f3ade699b64ebb15d4c141fc6e6936d80b21156dd89cd68b955c',
          '0xb88640f70a1a808ab2e5afc07e41361128409e603663efbb5c26ca71c286e12e',
          '0xee5ffb65c0b88389f048b6f3c9238dc2a1f4da64ea458a0079ee814d7bc2b100',
          '0xa9220b2242edb46f61cffa733fcfb4d2864be53e902a155f82b296681977ee6b',
          '0xb6102b3182028100644d14a9880ba3405f3c15de7ab75b3188637cabb5877a06',
          '0x6a9ead9a5337658179f097e05c15e85f60dca24ed21b0040cb725b09830b9077',
          '0x86e342c0fe4db08b54ac993907795e1440e70828071b9900823815113977443b',
          '0xddeaf2708dea2f2326248f23ba3bf0a632ed6b9b670b9880673d971e6555224d',
          '0x9efcc08176272c2217e7789f8666420127ca461ec86a4617a3e9c20c18aa2eb6',
          '0xc3379c2d52885f20f7feb59be391901fcf497cbad4e9685d2159745e4439153d',
          '0xc00a18b2b850de1eee8ba45be3c0d7ff53e5022dc2ff73888925e6bafbdbacb9',
          '0x6f989b92e2b78d846451d199f3218bcd3a6ed4d41cb756fe0fdd9a95a4fc6434',
          '0x539b2e2f268cb523435728ec4bccf5cebf1c20b2ed1fbd337272f33c52618765',
          '0x81562c1fce9f105b50cb2e1b56d2bc1a0f0cd5b62f7c963ab0b3abb1ec0f2062',
          '0x4d9cb80d8b09275008192ad87ad87f0852e5388b1b1a620d7c4e7147c11e6090',
          '0x31fb1964200391d7a6f7e0527a51fd7c64bdb412e5ab9e40384ecd872e56df00',
          '0x91ba21be41295425257980bfe70acb8b5ec0f022d30aecffedf9728129c51206',
          '0xe9e58733fd1cd5cc38f3e2196721c3ad474a603cdb4356a2cbc09df04eb099cf',
          '0xa7803b274e3ee6d14a29a4dd25d61e7f3d1c22b7f4b51a225efe5c3021e3c063',
          '0x5e30b01ef4657b06fb620b391cd2d3362ff8dee2403228261393fa8638952fa7',
          '0xbd2dbfb8ddcc0d1c1663d2fd1760f1b784adfec9f84f8f35787abbdb7fb96264',
          '0x48232998ad865ea59f5efcfe608ed14b618024ed5e64393b4caaf2fcca163e48',
          '0x5338d84b7d7cffa8c47283c6184830d7ccc2b7e026980e03c35ade3de6bfdea7',
          '0x5c6628700b46dfea088b847cc7e3321a08956f405f89a3ea3977f11a789c72a3',
        ],
        transactionsRoot:
          '0x2d5081e1e72ce8d5bf51760237e5cd6e5c07dae4f74c887dd269e10916ba55c8',
        uncles: [],
      },
    };
  };

  @Reflect.metadata('APPROVAL', ['SignTypedData', v1SignTypedDataVlidation])
  ethSignTypedDataV1 = async ({
    data: {
      params: [data, from],
    },
  }) => this._signTypedData(from, data, 'V1');

  @Reflect.metadata('APPROVAL', ['SignTypedData', signTypedDataVlidation])
  ethSignTypedDataV3 = async ({
    data: {
      params: [from, data],
    },
  }) => this._signTypedData(from, data, 'V3');

  @Reflect.metadata('APPROVAL', ['SignTypedData', signTypedDataVlidation])
  ethSignTypedDataV4 = async ({
    data: {
      params: [from, data],
    },
  }) => this._signTypedData(from, data, 'V4');

  @Reflect.metadata('APPROVAL', [
    'AddChain',
    ({
      data: {
        params: [chainParams],
      },
      session: { origin },
    }) => {
      return (
        chainService
          .getEnabledChains()
          .some((chain) => chain.hex === chainParams.chainId) &&
        CHAINS[permissionService.getConnectedSite(origin)!.chain]?.hex ===
          chainParams.chainId
      );
    },
    { height: 390 },
  ])
  walletAddEthereumChain = ({
    data: {
      params: [chainParams],
    },
    session: { origin },
  }) => {
    const chain = Object.values(CHAINS).find(
      (value) => value.hex === chainParams.chainId
    );

    if (!chain) {
      throw new Error('This chain is not supported by Rabby yet.');
    }

    permissionService.updateConnectSite(
      origin,
      {
        chain: chain.enum,
      },
      true
    );

    chainService.enableChain(chain.enum);

    sessionService.broadcastEvent(
      'chainChanged',
      {
        chain: chain.hex,
        networkVersion: chain.network,
      },
      origin
    );
    return null;
  };

  walletSwitchEthereumChain = this.walletAddEthereumChain;

  walletRequestPermissions = ({ data: { params: permissions } }) => {
    const result: Web3WalletPermission[] = [];
    if ('eth_accounts' in permissions?.[0]) {
      result.push({ parentCapability: 'eth_accounts' });
    }
    return result;
  };

  @Reflect.metadata('SAFE', true)
  walletGetPermissions = ({ session: { origin } }) => {
    const result: Web3WalletPermission[] = [];
    if (Wallet.isUnlocked() && Wallet.getConnectedSite(origin)) {
      result.push({ parentCapability: 'eth_accounts' });
    }
    return result;
  };

  private _checkAddress = async (address) => {
    // eslint-disable-next-line prefer-const
    let { address: currentAddress, type } =
      (await this.getCurrentAccount()) || {};
    currentAddress = currentAddress?.toLowerCase();
    if (
      !currentAddress ||
      currentAddress !== normalizeAddress(address).toLowerCase()
    ) {
      throw ethErrors.rpc.invalidParams({
        message:
          'Invalid parameters: must use the current user address to sign',
      });
    }
    const keyring = await keyringService.getKeyringForAccount(
      currentAddress,
      type
    );

    return keyring;
  };
}

export default new ProviderController();
