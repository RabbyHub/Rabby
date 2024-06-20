/* eslint "react-hooks/exhaustive-deps": ["error"] */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { Trans, useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { useDebounce } from 'react-use';
import { Input, Form, Skeleton, message, Button, InputProps } from 'antd';
import abiCoderInst, { AbiCoder } from 'web3-eth-abi';
import { isValidAddress, intToHex, zeroAddress } from 'ethereumjs-util';

import styled from 'styled-components';
import {
  CHAINS,
  CHAINS_ENUM,
  KEYRING_PURPLE_LOGOS,
  KEYRING_CLASS,
  MINIMUM_GAS_LIMIT,
  CAN_ESTIMATE_L1_FEE_CHAINS,
  CAN_NOT_SPECIFY_INTRINSIC_GAS_CHAINS,
} from 'consts';
import {
  useRabbyDispatch,
  useRabbySelector,
  connectStore,
  useRabbyGetter,
} from 'ui/store';
import { Account, ChainGas } from 'background/service/preference';
import { isSameAddress, useWallet } from 'ui/utils';
import { query2obj } from 'ui/utils/url';
import { formatTokenAmount, splitNumberByStep } from 'ui/utils/number';
import AccountCard from '../Approval/components/AccountCard';
import TokenAmountInput from 'ui/component/TokenAmountInput';
import { GasLevel, TokenItem } from 'background/service/openapi';
import { PageHeader, AddressViewer } from 'ui/component';
import ContactEditModal from 'ui/component/Contact/EditModal';
import ContactListModal from 'ui/component/Contact/ListModal';
import GasReserved from './components/GasReserved';
import GasSelector from './components/GasSelector';
import IconWhitelist, {
  ReactComponent as RcIconWhitelist,
} from 'ui/assets/dashboard/whitelist.svg';
import IconContact, {
  ReactComponent as RcIconContact,
} from 'ui/assets/send-token/contact.svg';
import { ReactComponent as RcIconEdit } from 'ui/assets/edit-purple.svg';
import IconCopy from 'ui/assets/copy-no-border.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconCheck, {
  ReactComponent as RcIconCheck,
} from 'ui/assets/send-token/check.svg';
import IconTemporaryGrantCheckbox, {
  ReactComponent as RcIconTemporaryGrantCheckbox,
} from 'ui/assets/send-token/temporary-grant-checkbox.svg';

import './style.less';
import { getKRCategoryByType } from '@/utils/transaction';
import { filterRbiSource, useRbiSource } from '@/ui/utils/ga-event';
import { UIContactBookItem } from '@/background/service/contactBook';
import {
  findChain,
  findChainByEnum,
  findChainByID,
  makeTokenFromChain,
} from '@/utils/chain';
import ChainSelectorInForm from '@/ui/component/ChainSelector/InForm';
import AccountSearchInput from '@/ui/component/AccountSearchInput';
import { confirmAllowTransferToPromise } from './components/ModalConfirmAllowTransfer';
import { confirmAddToContactsModalPromise } from './components/ModalConfirmAddToContacts';
import { useContactAccounts } from '@/ui/hooks/useContact';
import {
  useCheckAddressType,
  useParseContractAddress,
} from '@/ui/hooks/useParseAddress';
import { isHex } from 'web3-utils';
import { Chain } from '@debank/common';
import IconAlertInfo from './alert-info.svg';
import { formatTxInputDataOnERC20 } from '@/ui/utils/transaction';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { customTestnetTokenToTokenItem } from '@/ui/utils/token';
import { copyAddress } from '@/ui/utils/clipboard';
import SwitchReserveGas from './components/SwitchReserveGas';

const abiCoder = (abiCoderInst as unknown) as AbiCoder;

const MaxButton = styled.div`
  font-size: 12px;
  line-height: 1;
  padding: 4px 5px;
  cursor: pointer;
  user-select: nonce;
  margin-left: 6px;
  background-color: rgba(134, 151, 255, 0.1);
  color: #8697ff;
`;

type SendTokenMessageForEoAProps = {
  active: boolean;
  formData: FormSendToken;
} & InputProps;
const SendTokenMessageForEoa = React.forwardRef<
  typeof Input,
  SendTokenMessageForEoAProps
>(({ active, formData }, ref) => {
  const { t } = useTranslation();

  const { messageDataForSendToEoa = '' } = formData;

  const { withInputData, currentIsHex, currentData, hexData } = useMemo(() => {
    return formatTxInputDataOnERC20(messageDataForSendToEoa);
  }, [messageDataForSendToEoa]);

  return (
    <div className={clsx('section', !active && 'hidden')}>
      <div className="section-title flex justify-between items-center">
        {/* Message */}
        {t('page.sendToken.sectionMsgDataForEOA.title')}
      </div>

      <div className="messagedata-input-wrapper">
        <Form.Item name="messageDataForSendToEoa">
          <Input.TextArea
            ref={ref as any}
            placeholder={t('page.sendToken.sectionMsgDataForEOA.placeholder')}
            autoSize={{ minRows: 1 }}
            className="min-h-[40px] max-h-[84px] padding-12px overflow-y-auto"
          />
        </Form.Item>
      </div>

      {withInputData && (
        <div className="messagedata-parsed-input text-[12px]">
          {currentIsHex ? (
            <>
              <span className="text-r-neutral-body">
                {/* The current input is Original Data. UTF-8 is: */}
                {t('page.sendToken.sectionMsgDataForEOA.currentIsOriginal')}
              </span>
              <p className="mt-3 mb-0 break-all text-r-neutral-foot">
                {currentData}
              </p>
            </>
          ) : (
            <>
              <span className="text-r-neutral-body">
                {/* The current input is UTF-8. Original Data is: */}
                {t('page.sendToken.sectionMsgDataForEOA.currentIsUTF8')}
              </span>
              <p className="mt-3 mb-0 break-all text-r-neutral-foot">
                {hexData}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
});

type SendTokenMessageForContractProps = {
  active: boolean;
  formData: FormSendToken;
  userAddress?: string;
  chain?: Chain | null;
} & InputProps;
const SendTokenMessageForContract = React.forwardRef<
  typeof Input,
  SendTokenMessageForContractProps
>(({ active, formData, userAddress, chain }, ref) => {
  const { t } = useTranslation();

  const { messageDataForContractCall: maybeHex = '' } = formData;

  const { currentIsHex, hexData } = useMemo(() => {
    const result = { currentIsHex: false, hexData: '' };

    if (!maybeHex) return result;

    result.currentIsHex = maybeHex.startsWith('0x') && isHex(maybeHex);
    result.hexData = maybeHex;

    return result;
  }, [maybeHex]);

  const {
    explain,
    isLoadingExplain,
    loadingExplainError,
    contractCallPlainText,
  } = useParseContractAddress({
    userAddress,
    contractAddress: formData.to,
    chain: chain || null,
    inputDataHex: hexData,
  });

  const parseContractError = loadingExplainError || !explain?.abi;

  return (
    <div className={clsx('section', !active && 'hidden')}>
      <div className="section-title flex justify-between items-center">
        {/* Message */}
        {t('page.sendToken.sectionMsgDataForContract.title')}
      </div>

      <div className="messagedata-input-wrapper">
        <Form.Item name="messageDataForContractCall">
          <Input.TextArea
            ref={ref as any}
            placeholder={t(
              'page.sendToken.sectionMsgDataForContract.placeholder'
            )}
            autoSize={{ minRows: 1 }}
            className="min-h-[40px] max-h-[84px] padding-12px overflow-y-auto text-[12px] text-[#192945]"
          />
        </Form.Item>
      </div>

      {!!maybeHex && (
        <div className="messagedata-parsed-input text-[12px]">
          {!currentIsHex ? (
            <>
              <span className="mt-16 text-r-red-default">
                {/* Only supported hex data */}
                {t('page.sendToken.sectionMsgDataForContract.notHexData')}
              </span>
            </>
          ) : (
            <>
              {!parseContractError && (
                <span className="mt-16 mb-8 text-r-neutral-body">
                  {/* Contract call simulation: */}
                  {t('page.sendToken.sectionMsgDataForContract.simulation')}
                </span>
              )}
              {isLoadingExplain ? (
                <Skeleton.Button
                  active
                  className="block min-w-[50px] w-[50%] h-[24px] mt-3"
                />
              ) : (
                <>
                  {parseContractError && (
                    <span className="flex items-center text-r-red-default">
                      <img src={IconAlertInfo} className="w-14 h-14 mr-[3px]" />
                      <span>
                        {/* Fail to decode contract call */}
                        {t(
                          'page.sendToken.sectionMsgDataForContract.parseError'
                        )}
                      </span>
                    </span>
                  )}
                  {!loadingExplainError && contractCallPlainText && (
                    <p className="mt-3 mb-0 break-all text-r-neutral-foot">
                      {contractCallPlainText}
                    </p>
                  )}
                </>
              )}
            </>
          )}
          {/* {explain ? (
              <PreExecTransactionExplain
                className="mt-3"
                explain={explain}
                // onView={handleView}
                isViewLoading={isLoadingExplain}
              />
            ) : (
              <Skeleton.Button active style={{ width: '100%', height: 25 }} />
            )} */}
        </div>
      )}
    </div>
  );
});

// interface CustomTestnetTokenItem extends CustomTestnetToken {
//   chain: string;
//   raw_amount: string;
//   raw_amount_hex_str?: string;
// }

type FormSendToken = {
  to: string;
  amount: string;
  messageDataForSendToEoa: string;
  messageDataForContractCall: string;
};
const SendToken = () => {
  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  const [chain, setChain] = useState(CHAINS_ENUM.ETH);

  const chainItem = useMemo(() => findChain({ enum: chain }), [chain]);
  const { t } = useTranslation();
  const [tokenAmountForGas, setTokenAmountForGas] = useState('0');
  const { useForm } = Form;
  const history = useHistory();
  const dispatch = useRabbyDispatch();

  const rbisource = useRbiSource();

  const [form] = useForm<FormSendToken>();
  const [formSnapshot, setFormSnapshot] = useState(form.getFieldsValue());
  const [contactInfo, setContactInfo] = useState<null | UIContactBookItem>(
    null
  );
  const [currentToken, setCurrentToken] = useState<TokenItem>({
    id: 'eth',
    chain: 'eth',
    name: 'ETH',
    symbol: 'ETH',
    display_symbol: null,
    optimized_symbol: 'ETH',
    decimals: 18,
    logo_url:
      'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
    price: 0,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    time_at: 0,
    amount: 0,
  });

  const [safeInfo, setSafeInfo] = useState<{
    chainId: number;
    nonce: number;
  } | null>(null);
  const persistPageStateCache = useCallback(
    async (nextStateCache?: {
      values?: FormSendToken;
      currentToken?: TokenItem | null;
      safeInfo?: {
        chainId: number;
        nonce: number;
      };
    }) => {
      await wallet.setPageStateCache({
        path: history.location.pathname,
        search: history.location.search,
        params: {},
        states: {
          values: form.getFieldsValue(),
          currentToken,
          safeInfo,
          ...nextStateCache,
        },
      });
    },
    [wallet, history, form, currentToken, safeInfo]
  );
  const [inited, setInited] = useState(false);
  const [gasList, setGasList] = useState<GasLevel[]>([]);
  const [sendAlianName, setSendAlianName] = useState<string | null>(null);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showListContactModal, setShowListContactModal] = useState(false);
  const [editBtnDisabled, setEditBtnDisabled] = useState(true);
  const [cacheAmount, setCacheAmount] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceWarn, setBalanceWarn] = useState<string | null>(null);

  const [
    { showGasReserved, clickedMax, isEstimatingGas },
    setSendMaxInfo,
  ] = useState({
    showGasReserved: false,
    clickedMax: false,
    isEstimatingGas: false,
  });
  const setShowGasReserved = useCallback((show: boolean) => {
    setSendMaxInfo((prev) => ({
      ...prev,
      showGasReserved: show,
    }));
  }, []);
  const cancelClickedMax = useCallback(() => {
    setSendMaxInfo((prev) => ({ ...prev, clickedMax: false }));
  }, []);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showWhitelistAlert, setShowWhitelistAlert] = useState(false);
  const [gasSelectorVisible, setGasSelectorVisible] = useState(false);
  const [selectedGasLevel, setSelectedGasLevel] = useState<GasLevel | null>(
    null
  );
  const [estimateGas, setEstimateGas] = useState(0);
  const [temporaryGrant, setTemporaryGrant] = useState(false);
  const [gasPriceMap, setGasPriceMap] = useState<
    Record<string, { list: GasLevel[]; expireAt: number }>
  >({});
  const [isGnosisSafe, setIsGnosisSafe] = useState(false);

  const { whitelist, whitelistEnabled } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
    whitelistEnabled: s.whitelist.enabled,
  }));

  const {
    getAddressNote,
    isAddrOnContactBook,
    fetchContactAccounts,
  } = useContactAccounts();

  const {
    toAddressIsValid,
    toAddressInWhitelist,
    toAddressInContactBook,
  } = useMemo(() => {
    return {
      toAddressIsValid: !!formSnapshot.to && isValidAddress(formSnapshot.to),
      toAddressInWhitelist: !!whitelist.find((item) =>
        isSameAddress(item, formSnapshot.to)
      ),
      toAddressInContactBook: isAddrOnContactBook(formSnapshot.to),
    };
  }, [whitelist, isAddrOnContactBook, formSnapshot]);

  const whitelistAlertContent = useMemo(() => {
    if (!whitelistEnabled) {
      return {
        content: t('page.sendToken.whitelistAlert__disabled'),
        success: true,
      };
    }
    if (toAddressInWhitelist) {
      return {
        content: t('page.sendToken.whitelistAlert__whitelisted'),
        success: true,
      };
    }
    if (temporaryGrant) {
      return {
        content: t('page.sendToken.whitelistAlert__temporaryGranted'),
        success: true,
      };
    }
    return {
      success: false,
      content: (
        <>
          <Trans t={t} i18nKey="page.sendToken.whitelistAlert__notWhitelisted">
            The address is not whitelisted.
            <br /> I agree to grant temporary permission to transfer.
          </Trans>
        </>
      ),
    };
  }, [t, temporaryGrant, toAddressInWhitelist, whitelistEnabled]);

  const canSubmit =
    isValidAddress(form.getFieldValue('to')) &&
    !balanceError &&
    new BigNumber(form.getFieldValue('amount')).gte(0) &&
    !isLoading &&
    (!whitelistEnabled || temporaryGrant || toAddressInWhitelist);
  const isNativeToken =
    !!chainItem && currentToken?.id === chainItem.nativeTokenAddress;

  const fetchGasList = useCallback(async () => {
    const list: GasLevel[] = chainItem?.isTestnet
      ? await wallet.getCustomTestnetGasMarket({ chainId: chainItem.id })
      : await wallet.openapi.gasMarket(chainItem?.serverId || '');
    return list;
  }, [wallet, chainItem]);

  useDebounce(
    async () => {
      const targetChain = findChainByEnum(chain)!;
      let gasList: GasLevel[];
      if (
        gasPriceMap[targetChain.enum] &&
        gasPriceMap[targetChain.enum].expireAt > Date.now()
      ) {
        gasList = gasPriceMap[targetChain.enum].list;
      } else {
        gasList = await fetchGasList();
        setGasPriceMap({
          ...gasPriceMap,
          [targetChain.enum]: {
            list: gasList,
            expireAt: Date.now() + 300000, // cache gasList for 5 mins
          },
        });
      }
    },
    500,
    [chain]
  );

  const { addressType } = useCheckAddressType(formSnapshot.to, chainItem);

  const {
    isShowMessageDataForToken,
    isShowMessageDataForContract,
  } = useMemo(() => {
    return {
      isShowMessageDataForToken: isNativeToken && addressType === 'EOA',
      isShowMessageDataForContract: isNativeToken && addressType === 'CONTRACT',
    };
  }, [isNativeToken, addressType]);

  const handleSubmit = async ({
    to,
    amount,
    messageDataForSendToEoa,
    messageDataForContractCall,
  }: FormSendToken) => {
    setIsSubmitLoading(true);
    const chain = findChain({
      serverId: currentToken.chain,
    })!;
    const sendValue = new BigNumber(amount)
      .multipliedBy(10 ** currentToken.decimals)
      .decimalPlaces(0, BigNumber.ROUND_DOWN);
    const dataInput = [
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          {
            type: 'address',
            name: 'to',
          },
          {
            type: 'uint256',
            name: 'value',
          },
        ] as any[],
      } as const,
      [to, sendValue.toFixed(0)] as any[],
    ] as const;
    const params: Record<string, any> = {
      chainId: chain.id,
      from: currentAccount!.address,
      to: currentToken.id,
      value: '0x0',
      data: abiCoder.encodeFunctionCall(dataInput[0], dataInput[1]),
      isSend: true,
    };
    if (safeInfo?.nonce != null) {
      params.nonce = safeInfo.nonce;
    }
    if (isNativeToken) {
      params.to = to;
      delete params.data;

      if (isShowMessageDataForToken && messageDataForSendToEoa) {
        const encodedValue = formatTxInputDataOnERC20(messageDataForSendToEoa)
          .hexData;

        params.data = encodedValue;
      } else if (isShowMessageDataForContract && messageDataForContractCall) {
        params.data = messageDataForContractCall;
      }

      params.value = `0x${sendValue.toString(16)}`;
      // L2 has extra validation fee so we can not set gasLimit as 21000 when send native token
      const couldSpecifyIntrinsicGas = !CAN_NOT_SPECIFY_INTRINSIC_GAS_CHAINS.includes(
        chain.enum
      );

      try {
        const code = await wallet.requestETHRpc<any>(
          {
            method: 'eth_getCode',
            params: [to, 'latest'],
          },
          chain.serverId
        );
        const notContract = !!code && (code === '0x' || code === '0x0');

        let gasLimit = 0;

        if (estimateGas) {
          gasLimit = estimateGas;
        }

        /**
         * we don't need always fetch estimateGas, if no `params.gas` set below,
         * `params.gas` would be filled on Tx Page.
         */
        if (gasLimit > 0) {
          params.gas = intToHex(gasLimit);
        } else if (notContract && couldSpecifyIntrinsicGas) {
          params.gas = intToHex(21000);
        }
      } catch (e) {
        if (couldSpecifyIntrinsicGas) {
          params.gas = intToHex(21000);
        }
      }

      if (
        isShowMessageDataForToken &&
        (messageDataForContractCall || messageDataForSendToEoa)
      ) {
        delete params.gas;
      }
      setIsSubmitLoading(false);
      if (showGasReserved) {
        params.gasPrice = selectedGasLevel?.price;
      }
    }
    try {
      await wallet.setLastTimeSendToken(currentAccount!.address, currentToken);
      await persistPageStateCache();
      matomoRequestEvent({
        category: 'Send',
        action: 'createTx',
        label: [
          chain.name,
          getKRCategoryByType(currentAccount?.type),
          currentAccount?.brandName,
          'token',
          filterRbiSource('sendToken', rbisource) && rbisource, // mark source module of `sendToken`
        ].join('|'),
      });

      wallet.sendRequest({
        method: 'eth_sendTransaction',
        params: [params],
        $ctx: {
          ga: {
            category: 'Send',
            source: 'sendToken',
            trigger: filterRbiSource('sendToken', rbisource) && rbisource, // mark source module of `sendToken`
          },
        },
      });
      window.close();
    } catch (e) {
      message.error(e.message);
      console.error(e);
    }
  };

  const handleConfirmContact = (account: UIContactBookItem) => {
    setShowListContactModal(false);
    setShowEditContactModal(false);
    setContactInfo(account);
    const values = form.getFieldsValue();
    const to = account ? account.address : '';
    if (!account) return;
    form.setFieldsValue({
      ...values,
      to,
    });
    handleFormValuesChange(null, {
      ...values,
      to,
    });
  };

  const handleCancelContact = () => {
    setShowListContactModal(false);
  };

  const handleCancelEditContact = () => {
    setShowEditContactModal(false);
  };

  const handleListContact = () => {
    setShowListContactModal(true);
  };

  const handleEditContact = () => {
    if (editBtnDisabled) return;
    setShowEditContactModal(true);
  };

  const handleFormValuesChange = useCallback(
    async (
      changedValues,
      { to, amount, ...restForm }: FormSendToken,
      opts?: {
        token?: TokenItem;
        isInitFromCache?: boolean;
      }
    ) => {
      const { token, isInitFromCache } = opts || {};
      if (changedValues && changedValues.to) {
        setTemporaryGrant(false);
      }

      if ((!isInitFromCache && changedValues?.to) || (!changedValues && to)) {
        restForm.messageDataForSendToEoa = '';
        restForm.messageDataForContractCall = '';
      }

      const targetToken = token || currentToken;
      if (!to || !isValidAddress(to)) {
        setEditBtnDisabled(true);
        setShowWhitelistAlert(false);
      } else {
        setShowWhitelistAlert(true);
        setEditBtnDisabled(false);
      }
      let resultAmount = amount;
      if (!/^\d*(\.\d*)?$/.test(amount)) {
        resultAmount = cacheAmount;
      }

      if (amount !== cacheAmount) {
        if (showGasReserved && Number(resultAmount) > 0) {
          setShowGasReserved(false);
        } /*  else if (isNativeToken && !isGnosisSafe) {
      const gasCostTokenAmount = await calcGasCost();
      if (
        new BigNumber(targetToken.raw_amount_hex_str || 0)
          .div(10 ** targetToken.decimals)
          .minus(amount)
          .minus(gasCostTokenAmount)
          .lt(0)
      ) {
        setBalanceWarn(t('page.sendToken.balanceWarn.gasFeeReservation'));
      } else {
        setBalanceWarn(null);
      }
    } */
      }

      if (
        new BigNumber(resultAmount || 0).isGreaterThan(
          new BigNumber(targetToken.raw_amount_hex_str || 0).div(
            10 ** targetToken.decimals
          )
        )
      ) {
        // Insufficient balance
        setBalanceError(t('page.sendToken.balanceError.insufficientBalance'));
      } else {
        setBalanceError(null);
      }
      const nextFormValues = {
        ...restForm,
        to,
        amount: resultAmount,
      };

      await persistPageStateCache({
        values: nextFormValues,
        currentToken: targetToken,
      });

      form.setFieldsValue(nextFormValues);
      setFormSnapshot(nextFormValues);
      setCacheAmount(resultAmount);
      const alianName = await wallet.getAlianName(to.toLowerCase());
      if (alianName) {
        setContactInfo({ address: to, name: alianName });
        setShowContactInfo(true);
      } else if (contactInfo) {
        setContactInfo(null);
      }
    },
    [
      cacheAmount,
      contactInfo,
      currentToken,
      form,
      persistPageStateCache,
      setShowGasReserved,
      showGasReserved,
      t,
      wallet,
    ]
  );

  const loadCurrentToken = useCallback(
    async (id: string, chainId: string, address: string) => {
      const chain = findChain({
        serverId: chainId,
      });
      let result: TokenItem | null = null;
      if (chain?.isTestnet) {
        const res = await wallet.getCustomTestnetToken({
          address,
          chainId: chain.id,
          tokenId: id,
        });
        if (res) {
          result = customTestnetTokenToTokenItem(res);
        }
      } else {
        result = await wallet.openapi.getToken(address, chainId, id);
      }
      if (result) {
        setCurrentToken(result);
      }
      setIsLoading(false);

      return result;
    },
    [wallet]
  );

  const handleAmountChange = useCallback(() => {
    cancelClickedMax();
  }, [cancelClickedMax]);

  const handleCurrentTokenChange = useCallback(
    async (token: TokenItem) => {
      cancelClickedMax();
      if (showGasReserved) {
        setShowGasReserved(false);
      }
      const account = (await wallet.syncGetCurrentAccount())!;
      const values = form.getFieldsValue();
      if (token.id !== currentToken.id || token.chain !== currentToken.chain) {
        form.setFieldsValue({
          ...values,
          amount: '',
        });
      }
      const chainItem = findChain({ serverId: token.chain });
      setChain(chainItem?.enum ?? CHAINS_ENUM.ETH);
      setCurrentToken(token);
      setEstimateGas(0);
      await persistPageStateCache({ currentToken: token });
      setBalanceError(null);
      setBalanceWarn(null);
      setIsLoading(true);
      loadCurrentToken(token.id, token.chain, account.address);
    },
    [
      currentToken.chain,
      currentToken.id,
      form,
      loadCurrentToken,
      persistPageStateCache,
      setShowGasReserved,
      showGasReserved,
      wallet,
      cancelClickedMax,
    ]
  );

  const ethEstimateGas = useCallback(async () => {
    const result = {
      gasNumber: 0,
      gasNumHex: intToHex(0),
    };

    if (!currentAccount?.address) return result;
    if (!chainItem) return result;

    const to = form.getFieldValue('to');

    const _gasUsed = await wallet.requestETHRpc<string>(
      {
        method: 'eth_estimateGas',
        params: [
          {
            from: currentAccount.address,
            to: to && isValidAddress(to) ? to : zeroAddress(),
            value: currentToken.raw_amount_hex_str,
          },
        ],
      },
      chainItem.serverId
    );
    const gasUsed = chainItem.isTestnet
      ? new BigNumber(_gasUsed).multipliedBy(1.5).integerValue().toNumber()
      : _gasUsed;

    result.gasNumber = Number(gasUsed);
    result.gasNumHex =
      typeof gasUsed === 'string' ? gasUsed : intToHex(gasUsed);

    return result;
  }, [
    wallet,
    currentAccount,
    chainItem,
    form,
    currentToken.raw_amount_hex_str,
  ]);

  const handleGasChange = useCallback(
    (gas: GasLevel, updateTokenAmount = true, gasLimit = MINIMUM_GAS_LIMIT) => {
      setSelectedGasLevel(gas);
      const gasTokenAmount = new BigNumber(gas.price).times(gasLimit).div(1e18);
      setTokenAmountForGas(gasTokenAmount.toFixed());
      if (updateTokenAmount) {
        const values = form.getFieldsValue();
        const diffValue = new BigNumber(currentToken.raw_amount_hex_str || 0)
          .div(10 ** currentToken.decimals)
          .minus(gasTokenAmount);
        if (diffValue.lt(0)) {
          setShowGasReserved(false);
        }
        const newValues = {
          ...values,
          amount: diffValue.gt(0) ? diffValue.toFixed() : '0',
        };
        form.setFieldsValue(newValues);
      }
      return gasTokenAmount;
    },
    [
      currentToken.decimals,
      currentToken.raw_amount_hex_str,
      form,
      setShowGasReserved,
    ]
  );

  const isReserveGasOnSendToken = useRabbyGetter(
    (s) => s.preference.isReserveGasOnSendToken
  );

  const couldReserveGas = isNativeToken && !isGnosisSafe;

  const handleMaxInfoChanged = useCallback(
    async (needReserveGasOnSendToken?: boolean) => {
      if (!currentAccount) return;
      setSendMaxInfo((prev) => ({ ...prev, clickedMax: true }));

      if (isLoading) return;
      if (showGasReserved && typeof needReserveGasOnSendToken !== 'boolean')
        return;
      if (isEstimatingGas) return;

      const tokenBalance = new BigNumber(
        currentToken.raw_amount_hex_str || 0
      ).div(10 ** currentToken.decimals);
      let amount = tokenBalance.toFixed();
      const to = form.getFieldValue('to');

      if (couldReserveGas && needReserveGasOnSendToken) {
        setShowGasReserved(true);
        setSendMaxInfo((prev) => ({ ...prev, isEstimatingGas: true }));
        try {
          const list = await fetchGasList();
          setGasList(list);
          let instant = list[0];
          for (let i = 1; i < list.length; i++) {
            if (list[i].price > instant.price) {
              instant = list[i];
            }
          }
          const { gasNumber } = await ethEstimateGas();
          setEstimateGas(gasNumber);

          let gasTokenAmount = handleGasChange(instant, false, gasNumber);
          if (CAN_ESTIMATE_L1_FEE_CHAINS.includes(chain)) {
            const l1GasFee = await wallet.fetchEstimatedL1Fee(
              {
                txParams: {
                  chainId: chainItem.id,
                  from: currentAccount.address,
                  to: to && isValidAddress(to) ? to : zeroAddress(),
                  value: currentToken.raw_amount_hex_str,
                  gas: intToHex(21000),
                  gasPrice: `0x${new BigNumber(instant.price).toString(16)}`,
                  data: '0x',
                },
              },
              chain
            );
            gasTokenAmount = gasTokenAmount
              .plus(new BigNumber(l1GasFee).div(1e18))
              .times(1.1);
          }
          const tokenForSend = tokenBalance.minus(gasTokenAmount);
          amount = tokenForSend.gt(0) ? tokenForSend.toFixed() : '0';
          if (tokenForSend.lt(0)) {
            setShowGasReserved(false);
          }
        } catch (e) {
          if (!isGnosisSafe) {
            // // Gas fee reservation required
            // setBalanceWarn(t('page.sendToken.balanceWarn.gasFeeReservation'));
            setShowGasReserved(false);
          }
        } finally {
          setSendMaxInfo((prev) => ({ ...prev, isEstimatingGas: false }));
        }
      }

      const values = form.getFieldsValue();
      const newValues = {
        ...values,
        amount,
      };
      form.setFieldsValue(newValues);
      handleFormValuesChange(null, newValues);
    },
    [
      chain,
      chainItem?.id,
      currentAccount,
      currentToken.decimals,
      currentToken.raw_amount_hex_str,
      ethEstimateGas,
      fetchGasList,
      form,
      handleFormValuesChange,
      handleGasChange,
      couldReserveGas,
      isGnosisSafe,
      isLoading,
      setShowGasReserved,
      showGasReserved,
      isEstimatingGas,
      wallet,
    ]
  );

  const handleClickMaxButton = useCallback(() => {
    handleMaxInfoChanged(isReserveGasOnSendToken);
  }, [isReserveGasOnSendToken, handleMaxInfoChanged]);

  const onSwitchReserveGas = useCallback(
    async (isReserveGasOnSendToken: boolean) => {
      if (clickedMax) {
        handleMaxInfoChanged(isReserveGasOnSendToken);
      }
    },
    [clickedMax, handleMaxInfoChanged]
  );

  const handleChainChanged = useCallback(
    async (val: CHAINS_ENUM) => {
      setSendMaxInfo((prev) => ({ ...prev, clickedMax: false }));

      const account = (await wallet.syncGetCurrentAccount())!;
      const chain = findChain({
        enum: val,
      });
      if (!chain) {
        return;
      }
      setChain(val);
      setCurrentToken({
        id: chain.nativeTokenAddress,
        decimals: chain.nativeTokenDecimals,
        logo_url: chain.nativeTokenLogo,
        symbol: chain.nativeTokenSymbol,
        display_symbol: chain.nativeTokenSymbol,
        optimized_symbol: chain.nativeTokenSymbol,
        is_core: true,
        is_verified: true,
        is_wallet: true,
        amount: 0,
        price: 0,
        name: chain.nativeTokenSymbol,
        chain: chain.serverId,
        time_at: 0,
      });
      setEstimateGas(0);

      let nextToken: TokenItem | null = null;
      try {
        nextToken = await loadCurrentToken(
          chain.nativeTokenAddress,
          chain.serverId,
          account.address
        );
      } catch (error) {
        console.error(error);
      }

      const values = form.getFieldsValue();
      form.setFieldsValue({
        ...values,
        amount: '',
      });
      setShowGasReserved(false);
      handleFormValuesChange(
        { amount: '' },
        {
          ...values,
          amount: '',
        },
        {
          ...(nextToken && { token: nextToken }),
        }
      );
    },
    [form, handleFormValuesChange, loadCurrentToken, setShowGasReserved, wallet]
  );

  const handleCopyContactAddress = () => {
    copyAddress(currentToken.id);
  };

  const handleClickBack = () => {
    const from = (history.location.state as any)?.from;
    if (from) {
      history.replace(from);
    } else {
      history.replace('/');
    }
  };

  const initByCache = async () => {
    const account = (await wallet.syncGetCurrentAccount())!;
    const qs = query2obj(history.location.search);

    if (qs.token) {
      const [tokenChain, id] = qs.token.split(':');
      if (!tokenChain || !id) return;

      const target = findChain({
        serverId: tokenChain,
      });
      if (!target) {
        loadCurrentToken(currentToken.id, currentToken.chain, account.address);
        return;
      }
      setChain(target.enum);
      loadCurrentToken(id, tokenChain, account.address);
    } else if ((history.location.state as any)?.safeInfo) {
      const safeInfo: {
        nonce: number;
        chainId: number;
      } = (history.location.state as any)?.safeInfo;

      const chain = findChainByID(safeInfo.chainId);
      let nativeToken: TokenItem | null = null;
      if (chain) {
        setChain(chain.enum);
        nativeToken = await loadCurrentToken(
          chain.nativeTokenAddress,
          chain.serverId,
          account.address
        );
      }
      setSafeInfo(safeInfo);
      persistPageStateCache({
        safeInfo,
        currentToken: nativeToken || currentToken,
      });
    } else {
      let tokenFromOrder: TokenItem | null = null;

      const lastTimeToken = await wallet.getLastTimeSendToken(account.address);
      if (lastTimeToken) {
        setCurrentToken(lastTimeToken);
      } else {
        const { firstChain } = await dispatch.chains.getOrderedChainList({
          supportChains: undefined,
        });
        tokenFromOrder = firstChain ? makeTokenFromChain(firstChain) : null;
        if (firstChain) setCurrentToken(tokenFromOrder!);
      }

      let needLoadToken: TokenItem =
        lastTimeToken || tokenFromOrder || currentToken;
      if (await wallet.hasPageStateCache()) {
        const cache = await wallet.getPageStateCache();
        if (cache?.path === history.location.pathname) {
          if (cache.states.values) {
            form.setFieldsValue(cache.states.values);
            handleFormValuesChange(cache.states.values, form.getFieldsValue(), {
              token: cache.states.currentToken,
              isInitFromCache: true,
            });
          }
          if (cache.states.currentToken) {
            setCurrentToken(cache.states.currentToken);
            needLoadToken = cache.states.currentToken;
          }
          if (cache.states.safeInfo) {
            setSafeInfo(cache.states.safeInfo);
          }
        }
      }

      if (chainItem && needLoadToken.chain !== chainItem.serverId) {
        const target = findChain({ serverId: needLoadToken.chain });
        if (target?.enum) {
          setChain(target.enum);
        }
      }
      loadCurrentToken(needLoadToken.id, needLoadToken.chain, account.address);
    }
  };

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();
    dispatch.whitelist.getWhitelistEnabled();
    dispatch.whitelist.getWhitelist();
    dispatch.contactBook.getContactBookAsync();
    if (!account) {
      history.replace('/');
      return;
    }
    setCurrentAccount(account);

    if (account.type === KEYRING_CLASS.GNOSIS) {
      setIsGnosisSafe(true);
    }

    setInited(true);
  };

  useEffect(() => {
    if (inited) {
      initByCache();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inited]);

  const getAlianName = async () => {
    const alianName = await wallet.getAlianName(currentAccount?.address || '');
    setSendAlianName(alianName || '');
  };

  const handleGasSelectorClose = () => {
    setGasSelectorVisible(false);
  };

  const handleClickAllowTransferTo = () => {
    if (!whitelistEnabled || temporaryGrant || toAddressInWhitelist) return;

    const toAddr = form.getFieldValue('to');
    confirmAllowTransferToPromise({
      wallet,
      toAddr,
      showAddToWhitelist: !!toAddressInContactBook,
      // Enter the Password to Confirm
      title: t('page.sendToken.modalConfirmAllowTransferTo.title'),
      // Cancel
      cancelText: t('page.sendToken.modalConfirmAllowTransferTo.cancelText'),
      // Confirm
      confirmText: t('page.sendToken.modalConfirmAllowTransferTo.confirmText'),
      onFinished(result) {
        dispatch.whitelist.getWhitelist();
        setTemporaryGrant(true);
      },
    });
  };

  const handleClickAddContact = () => {
    if (toAddressInContactBook) return;

    const toAddr = form.getFieldValue('to');
    confirmAddToContactsModalPromise({
      wallet,
      initAddressNote: getAddressNote(toAddr),
      addrToAdd: toAddr,
      title: t('page.sendToken.modalConfirmAddToContacts.title'),
      confirmText: t('page.sendToken.modalConfirmAddToContacts.confirmText'),
      async onFinished(result) {
        await dispatch.contactBook.getContactBookAsync();
        // trigger fetch contactInfo
        const values = form.getFieldsValue();
        handleFormValuesChange(null, { ...values });
        await Promise.allSettled([
          fetchContactAccounts(),
          // trigger get balance of address
          wallet.getInMemoryAddressBalance(result.contactAddrAdded, true),
        ]);
      },
    });
  };

  useEffect(() => {
    init();
    return () => {
      wallet.clearPageStateCache();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentAccount) {
      getAlianName();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount]);

  const { balanceNumText } = useMemo(() => {
    const balanceNum = new BigNumber(currentToken.raw_amount_hex_str || 0).div(
      10 ** currentToken.decimals
    );
    const decimalPlaces = clickedMax || selectedGasLevel ? 8 : 4;

    return {
      balanceNumText: formatTokenAmount(
        balanceNum.toFixed(decimalPlaces, BigNumber.ROUND_FLOOR),
        decimalPlaces
      ),
    };
  }, [
    currentToken.raw_amount_hex_str,
    currentToken.decimals,
    clickedMax,
    selectedGasLevel,
  ]);

  return (
    <div className="send-token">
      <PageHeader onBack={handleClickBack} forceShowBack>
        {t('page.sendToken.header.title')}
      </PageHeader>
      <Form
        form={form}
        className="send-token-form"
        onFinish={handleSubmit}
        onValuesChange={handleFormValuesChange}
        initialValues={{
          to: '',
          amount: '',
        }}
      >
        <div className="flex-1 overflow-auto">
          <div className="section relative">
            <div className={clsx('section-title')}>
              {t('page.sendToken.sectionChain.title')}
            </div>
            <ChainSelectorInForm
              value={chain}
              onChange={handleChainChanged}
              disabledTips={'Not supported'}
              supportChains={undefined}
              readonly={!!safeInfo}
            />
            <div className={clsx('section-title mt-[10px]')}>
              {t('page.sendToken.sectionFrom.title')}
            </div>
            <AccountCard
              icons={{
                mnemonic: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.MNEMONIC],
                privatekey: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.PRIVATE_KEY],
                watch: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.WATCH],
              }}
              alianName={sendAlianName}
              isHideAmount={chainItem?.isTestnet}
            />
            <div className="section-title">
              <span className="section-title__to">
                {t('page.sendToken.sectionTo.title')}
              </span>
              <div className="flex flex-1 justify-end items-center">
                {showContactInfo && !!contactInfo && (
                  <div
                    className={clsx('contact-info', {
                      disabled: editBtnDisabled,
                    })}
                    onClick={handleEditContact}
                  >
                    {contactInfo && (
                      <>
                        <ThemeIcon
                          src={RcIconEdit}
                          className="icon icon-edit"
                        />
                        <span
                          title={contactInfo.name}
                          className="inline-block align-middle truncate max-w-[240px]"
                        >
                          {contactInfo.name}
                        </span>
                      </>
                    )}
                  </div>
                )}
                <ThemeIcon
                  className="icon icon-contact"
                  src={whitelistEnabled ? RcIconWhitelist : RcIconContact}
                  onClick={handleListContact}
                />
              </div>
            </div>
            <div className="to-address">
              <Form.Item
                name="to"
                rules={[
                  {
                    required: true,
                    message: t('page.sendToken.sectionTo.addrValidator__empty'),
                  },
                  {
                    validator(_, value) {
                      if (!value) return Promise.resolve();
                      if (value && isValidAddress(value)) {
                        // setAmountFocus(true);
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error(
                          t('page.sendToken.sectionTo.addrValidator__invalid')
                        )
                      );
                    },
                  },
                ]}
              >
                <AccountSearchInput
                  placeholder={t(
                    'page.sendToken.sectionTo.searchInputPlaceholder'
                  )}
                  autoComplete="off"
                  autoFocus
                  spellCheck={false}
                  onSelectedAccount={(account) => {
                    const nextVals = {
                      ...form.getFieldsValue(),
                      to: account.address,
                    };
                    handleFormValuesChange({ to: nextVals.to }, nextVals);
                    form.setFieldsValue(nextVals);
                  }}
                />
              </Form.Item>
              {toAddressIsValid && !toAddressInContactBook && (
                <div className="tip-no-contact font-normal text-[12px] text-r-neutral-body pt-[12px]">
                  <Trans i18nKey="page.sendToken.addressNotInContract" t={t}>
                    Not on address list.{' '}
                    <span
                      onClick={handleClickAddContact}
                      className={clsx(
                        'ml-[2px] underline cursor-pointer text-r-blue-default'
                      )}
                    >
                      Add to contacts
                    </span>
                  </Trans>
                </div>
              )}
            </div>
          </div>
          <div className="section">
            <div className="section-title flex justify-between items-center">
              <div className="token-balance whitespace-pre-wrap">
                {isLoading ? (
                  <Skeleton.Input active style={{ width: 100 }} />
                ) : (
                  <>
                    {t('page.sendToken.sectionBalance.title')}:{' '}
                    <span
                      className="truncate max-w-[90px]"
                      title={balanceNumText}
                    >
                      {balanceNumText}
                    </span>
                  </>
                )}
                {currentToken.amount > 0 && (
                  <MaxButton onClick={handleClickMaxButton}>
                    {t('page.sendToken.max')}
                  </MaxButton>
                )}
              </div>
              {/* {showGasReserved &&
                (selectedGasLevel ? (
                  <GasReserved
                    token={currentToken}
                    amount={tokenAmountForGas}
                    onClickAmount={handleClickGasReserved}
                  />
                ) : (
                  <Skeleton.Input active style={{ width: 180 }} />
                ))} */}
              {/* {showGasReserved && !selectedGasLevel && (
                <Skeleton.Input active style={{ width: 120 }} />
              )} */}
              {!clickedMax && (balanceError || balanceWarn) ? (
                <div className="balance-error">
                  {balanceError || balanceWarn}
                </div>
              ) : null}
              {clickedMax && couldReserveGas && (
                <SwitchReserveGas
                  loading={isEstimatingGas}
                  disabled={isEstimatingGas || !couldReserveGas}
                  onChange={onSwitchReserveGas}
                />
              )}
            </div>
            <Form.Item name="amount">
              {currentAccount && chainItem && (
                <TokenAmountInput
                  token={currentToken}
                  onChange={handleAmountChange}
                  onTokenChange={handleCurrentTokenChange}
                  chainId={chainItem.serverId}
                  excludeTokens={[]}
                  inlinePrize
                />
              )}
            </Form.Item>
            <div className="token-info">
              {!isNativeToken ? (
                <div className="section-field">
                  <span>
                    {t('page.sendToken.tokenInfoFieldLabel.contract')}
                  </span>
                  <span className="flex">
                    <AddressViewer
                      address={currentToken.id}
                      showArrow={false}
                    />
                    <img
                      src={IconCopy}
                      className="icon icon-copy"
                      onClick={handleCopyContactAddress}
                    />
                  </span>
                </div>
              ) : (
                ''
              )}
              <div className="section-field">
                <span>{t('page.sendToken.tokenInfoFieldLabel.chain')}</span>
                <span>
                  {
                    findChain({
                      serverId: currentToken?.chain,
                    })?.name
                  }
                </span>
              </div>
              {!chainItem?.isTestnet ? (
                <div className="section-field">
                  <span>{t('page.sendToken.tokenInfoPrice')}</span>
                  <span>
                    ${splitNumberByStep((currentToken.price || 0).toFixed(2))}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          <SendTokenMessageForEoa
            active={isShowMessageDataForToken}
            formData={formSnapshot}
          />
          <SendTokenMessageForContract
            active={isShowMessageDataForContract}
            formData={formSnapshot}
            chain={findChainByEnum(chain)}
            userAddress={currentAccount?.address}
          />
        </div>

        <div className="footer">
          {showWhitelistAlert && (
            <div
              className={clsx(
                'whitelist-alert',
                !whitelistEnabled || whitelistAlertContent.success
                  ? 'granted'
                  : 'cursor-pointer'
              )}
              onClick={handleClickAllowTransferTo}
            >
              <p className="whitelist-alert__content text-center">
                {whitelistEnabled && (
                  <ThemeIcon
                    src={
                      whitelistAlertContent.success
                        ? RcIconCheck
                        : RcIconTemporaryGrantCheckbox
                    }
                    className="icon icon-check inline-block relative -top-1"
                  />
                )}
                {whitelistAlertContent.content}
              </p>
            </div>
          )}
          <div className="btn-wrapper w-[100%] px-[20px] flex justify-center">
            <Button
              disabled={!canSubmit}
              type="primary"
              htmlType="submit"
              size="large"
              className="w-[100%] h-[48px]"
              loading={isSubmitLoading}
            >
              {t('page.sendToken.sendButton')}
            </Button>
          </div>
        </div>
      </Form>
      <ContactEditModal
        visible={showEditContactModal}
        address={form.getFieldValue('to')}
        onOk={handleConfirmContact}
        onCancel={handleCancelEditContact}
        isEdit={!!contactInfo}
      />
      <ContactListModal
        visible={showListContactModal}
        onCancel={handleCancelContact}
        onOk={handleConfirmContact}
      />

      <GasSelector
        visible={gasSelectorVisible}
        onClose={handleGasSelectorClose}
        chainId={chainItem?.id || CHAINS.ETH.id}
        onChange={(val) => {
          setGasSelectorVisible(false);
          handleGasChange(val);
        }}
        gasList={gasList}
        gas={selectedGasLevel}
        token={currentToken}
      />
    </div>
  );
};

export default connectStore()(SendToken);
