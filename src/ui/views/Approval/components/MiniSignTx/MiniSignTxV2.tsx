import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { intToHex, noop, useWallet } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import _ from 'lodash';

import GasSelectorHeader, {
  GasSelectorResponse,
} from '../TxComponents/GasSelectorHeader';
import BalanceChange from '../TxComponents/BalanceChange';
import { SpeedUpCancelHeader } from './SpeedUpCancalHeader';
import { Divide } from '../Divide';
import { normalizeTxParams } from '../SignTx';
import { Modal, Popup } from '@/ui/component';
import { MiniApprovalPopupContainer } from '../Popup/MiniApprovalPopupContainer';
import { ReactComponent as LedgerSVG } from 'ui/assets/walletlogo/ledger.svg';
import { ReactComponent as OneKeySVG } from 'ui/assets/walletlogo/onekey.svg';
import { isLedgerLockError } from '@/ui/utils/ledger';
import { INTERNAL_REQUEST_SESSION, KEYRING_CLASS } from 'consts';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useAsync } from 'react-use';
import BigNumber from 'bignumber.js';
import {
  useGasAccountInfo,
  useGasAccountSign,
} from '@/ui/views/GasAccount/hooks';
import { BalanceChangeLoading } from './BalanceChangeLoanding';
import clsx from 'clsx';
import { checkGasAndNonce, explainGas } from '@/utils/transaction';
import { MiniFooterBar } from './MiniFooterBar';
import { useMemoizedFn } from 'ahooks';
import { ApprovalUtilsProvider } from '../../hooks/useApprovalUtils';
import { useSignatureStore } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { signatureStore } from '@/ui/component/MiniSignV2/state';
import { MiniSecurityHeader } from '@/ui/component/MiniSignV2/components';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import useDebounceValue from '@/ui/hooks/useDebounceValue';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { ModalProps } from 'antd';

const MiniSignTxV2 = ({ isDesktop }: { isDesktop?: boolean }) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const { isDarkTheme } = useThemeMode();
  const { tokenDetail } = useRabbySelector((s) => ({
    tokenDetail: s.sign.tokenDetail,
  }));
  const dispatch = useRabbyDispatch();

  const state = useSignatureStore();

  const { ctx, config, error, status } = state;
  const currentAccount = config?.account;
  const _visible = React.useMemo(() => {
    const isDirectSignAccount = [
      KEYRING_CLASS.MNEMONIC,
      KEYRING_CLASS.PRIVATE_KEY,
    ].includes(config?.account.type as any);

    if (ctx?.mode === 'ui') {
      return ['ui-open', 'signing', 'error'].includes(status);
    }
    if (ctx?.mode === 'direct' && status !== 'ready') {
      return isDirectSignAccount ? false : true;
    }
    return false;
  }, [status, ctx?.mode]);
  const visible = useDebounceValue(_visible, 100);
  const loading =
    status === 'prefetching' || status === 'signing' || !ctx?.txsCalc.length;

  useGasAccountInfo();
  const { sig, accountId: gasAccountAddress } = useGasAccountSign();

  const { value } = useAsync(() => {
    let msg = error?.description || '';
    const getLedgerError = (description: string) => {
      if (isLedgerLockError(description)) {
        return t('page.signFooterBar.ledger.unlockAlert');
      } else if (
        description.includes('0x6e00') ||
        description.includes('0x6b00')
      ) {
        return t('page.signFooterBar.ledger.updateFirmwareAlert');
      } else if (description.includes('0x6985')) {
        return t('page.signFooterBar.ledger.txRejectedByLedger');
      }
      return description;
    };
    if (currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER) {
      msg = getLedgerError(msg);
    }
    return msg
      ? wallet.getTxFailedResult(msg)
      : Promise.resolve(['', 'origin']);
  }, [error, currentAccount?.type]);

  const handleChangeGasMethod = useCallback(
    async (method: 'native' | 'gasAccount') => {
      try {
        signatureStore.setGasMethod(method);
      } catch (error) {
        console.error('Gas method change error:', error);
      }
    },
    [ctx?.selectedGas, wallet]
  );

  const handleGasChange = useCallback(
    async (gas) => {
      try {
        await signatureStore.updateGasLevel(gas, wallet);
      } catch (error) {
        console.error('Gas change error:', error);
      }
    },
    [wallet]
  );

  const isReady = (ctx?.txsCalc?.length || 0) > 0;
  const chain = findChain({ id: ctx?.chainId })!;
  const nativeTokenBalance = ctx?.nativeTokenBalance || '0x0';
  const support1559 = !!ctx?.is1559;

  const checkGasLevelIsNotEnough = useMemoizedFn(
    (
      gas: GasSelectorResponse,
      type?: 'gasAccount' | 'native'
    ): Promise<[boolean, number]> => {
      const initdTxs = ctx?.txsCalc || [];
      let _txsResult = initdTxs;
      if (!isReady || !initdTxs.length) {
        return Promise.resolve([true, 0]);
      }

      return Promise.all(
        initdTxs.map(async (item) => {
          const tx = {
            ...item.tx,
            ...(ctx?.is1559
              ? {
                  maxFeePerGas: intToHex(Math.round(gas.price || 0)),
                  maxPriorityFeePerGas:
                    gas.maxPriorityFee <= 0
                      ? item.tx.maxFeePerGas
                      : intToHex(Math.round(gas.maxPriorityFee)),
                }
              : { gasPrice: intToHex(Math.round(gas.price)) }),
          };
          return {
            ...item,
            tx,
            gasCost: await explainGas({
              gasUsed: item.gasUsed,
              gasPrice: gas.price,
              chainId: chain.id,
              nativeTokenPrice: item.preExecResult.native_token.price,
              wallet,
              tx,
              gasLimit: item.gasLimit,
              account: currentAccount!,
              preparedL1Fee: item.L1feeCache,
            }),
          };
        })
      ).then((arr) => {
        let balance = ctx?.nativeTokenBalance || '';
        _txsResult = arr;

        if (!_txsResult.length) {
          return [true, 0];
        }

        if (type === 'native') {
          const checkResult = _txsResult.map((item, index) => {
            const result = checkGasAndNonce({
              recommendGasLimitRatio: item.recommendGasLimitRatio,
              recommendGasLimit: item.gasLimit,
              recommendNonce: item.tx.nonce,
              tx: item.tx,
              gasLimit: item.gasLimit,
              nonce: item.tx.nonce,
              isCancel: isCancel,
              gasExplainResponse: item.gasCost,
              isSpeedUp: isSpeedUp,
              isGnosisAccount: false,
              nativeTokenBalance: balance,
            });
            balance = new BigNumber(balance)
              .minus(new BigNumber(item.tx.value || 0))
              .minus(new BigNumber(item.gasCost.maxGasCostAmount || 0))
              .toFixed();
            return result;
          });
          return [_.flatten(checkResult)?.some((e) => e.code === 3001), 0] as [
            boolean,
            number
          ];
        }
        return wallet.openapi
          .checkGasAccountTxs({
            sig: sig || '',
            account_id: gasAccountAddress || config!.account.address,
            tx_list: arr.map((item, index) => {
              return {
                ...item.tx,
                gas: item.gasLimit,
                gasPrice: intToHex(gas.price),
              };
            }),
          })
          .then((gasAccountRes) => {
            return [
              !gasAccountRes.balance_is_enough,
              (gasAccountRes.gas_account_cost.estimate_tx_cost || 0) +
                (gasAccountRes.gas_account_cost?.gas_cost || 0),
            ];
          });
      });
    }
  );

  if (!ctx || !config?.account || !ctx?.txs?.length) return null;

  const { swapPreferMEVGuarded, isSpeedUp, isCancel } = normalizeTxParams(
    ctx.txs[0]
  );

  const handleToggleGasless = (value) => {
    signatureStore.toggleGasless(value);
  };
  const handleConfirm = (getContainer: ModalProps['getContainer']) => {
    if (!ctx?.txsCalc?.length) return;
    signatureStore.send({ wallet, getContainer }).catch(() => undefined);
  };

  const handleCancel = () => {
    signatureStore.close();
  };

  const handleRetry = (getContainer: ModalProps['getContainer']) => {
    signatureStore.retry({ wallet, getContainer }).catch(() => undefined);
  };

  const totalGasCost = ctx.txsCalc?.reduce(
    (sum, item) => {
      sum.gasCostAmount = sum.gasCostAmount.plus(
        item.gasCost?.gasCostAmount || 0
      );
      sum.gasCostUsd = sum.gasCostUsd.plus(item.gasCost?.gasCostUsd || 0);
      return sum;
    },
    {
      gasCostUsd: new BigNumber(0),
      gasCostAmount: new BigNumber(0),
      success: true,
    }
  ) || {
    gasCostUsd: new BigNumber(0),
    gasCostAmount: new BigNumber(0),
    success: true,
  };

  const [description, retryUpdateType] = value || ['', 'origin'];

  const content = config?.ga?.category
    ? retryUpdateType
      ? t('page.signFooterBar.qrcode.retryTxFailedBy', {
          category: config.ga.category,
        })
      : t('page.signFooterBar.qrcode.txFailedBy', {
          category: config.ga.category,
        })
    : t('page.signFooterBar.qrcode.txFailed');

  const brandIcon =
    currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER
      ? LedgerSVG
      : currentAccount?.type === KEYRING_CLASS.HARDWARE.ONEKEY
      ? OneKeySVG
      : null;

  const hdType =
    currentAccount!.type === KEYRING_CLASS.HARDWARE.LEDGER
      ? 'wired'
      : 'privatekey';

  const gasCalcMethod = async (price: number) => {
    const nativePrice = ctx?.nativeTokenPrice || 0;
    const amount =
      ctx?.txsCalc.reduce(
        (acc, i) => acc.plus(new BigNumber(i.gasUsed).times(price).div(1e18)),
        new BigNumber(0)
      ) || new BigNumber(0);
    return { gasCostUsd: amount.times(nativePrice), gasCostAmount: amount };
  };

  const canUseGasLess = !!ctx?.gasless?.is_gasless;
  let gasLessConfig =
    canUseGasLess && ctx?.gasless?.promotion
      ? ctx?.gasless?.promotion?.config
      : undefined;
  if (
    gasLessConfig &&
    ctx?.gasless?.promotion?.id === '0ca5aaa5f0c9217e6f45fe1d109c24fb'
  ) {
    gasLessConfig = { ...gasLessConfig, dark_color: '', theme_color: '' };
  }

  const isGasNotEnough = !!ctx?.isGasNotEnough;

  const useGasLess =
    (isGasNotEnough || !!gasLessConfig) && !!canUseGasLess && !!ctx?.useGasless;

  const showGasLess = isReady && (isGasNotEnough || !!gasLessConfig);

  const noCustomRPC = !!ctx?.noCustomRPC;

  const canGotoUseGasAccount =
    // isSupportedAddr &&
    noCustomRPC &&
    !!ctx?.gasAccount?.balance_is_enough &&
    !ctx?.gasAccount.chain_not_support &&
    !!ctx?.gasAccount.is_gas_account;

  const canDepositUseGasAccount =
    // isSupportedAddr &&
    noCustomRPC &&
    !!ctx?.gasAccount &&
    !ctx?.gasAccount?.balance_is_enough &&
    !ctx?.gasAccount.chain_not_support;

  const gasAccountCanPay =
    ctx?.gasMethod === 'gasAccount' &&
    // isSupportedAddr &&
    noCustomRPC &&
    !!ctx?.gasAccount?.balance_is_enough &&
    !ctx?.gasAccount.chain_not_support &&
    !!ctx?.gasAccount.is_gas_account &&
    !(ctx?.gasAccount as any).err_msg;

  // mock mini sign task
  const task = {
    status: ctx.signInfo?.status
      ? ctx.signInfo?.status === 'signing'
        ? 'active'
        : ctx.signInfo?.status
      : 'idle',
    error: null,
    list: [],
    init: () => {},
    start: () => Promise.resolve(''),
    retry: () => Promise.resolve(''),
    stop: () => {},
    currentActiveIndex: ctx.signInfo?.currentTxIndex || 0,
    total: ctx.signInfo?.totalTxs,
  } as any;

  const directSubmit = ctx.mode === 'direct';

  const {
    enableSecurityEngine,
    showSimulateChange,
    onRedirectToDeposit,
    title,
    originGasPrice,
    getContainer,
    disableSignBtn,
  } = config;
  const txsResult = ctx.txsCalc;
  const txs = ctx.txs;
  const gasAccountCost = ctx.gasAccount as any;
  const gasMethod = ctx.gasMethod;
  const setGasMethod = handleChangeGasMethod;
  const pushType = swapPreferMEVGuarded ? 'mev' : 'default';
  const gasLimit = ctx.txs?.[0]?.gas;
  const gasList = ctx.gasList;
  const selectedGas = ctx.selectedGas;
  const recommendGasLimit = ctx.txsCalc?.[0]?.gasLimit;
  const recommendNonce = ctx.txsCalc?.[0]?.tx?.nonce || '0x1';
  const chainId = ctx.chainId;
  const realNonce = ctx.txsCalc?.[0]?.tx?.nonce || '0x1';
  const isHardware = false;
  const manuallyChangeGasLimit = false;
  const checkErrors = ctx.checkErrors || [];
  const engineResults = ctx.engineResults;
  const gasPriceMedian = ctx.gasPriceMedian || null;
  const isGasAccountLogin = !!sig && !!gasAccountAddress;
  const isWalletConnect = currentAccount?.type === 'WalletConnectKeyring';
  const isWatchAddr = currentAccount?.type === 'WatchAddressKeyring';
  const gasLessFailedReason = ctx.gasless?.desc;
  const securityLevel = ctx.engineResults?.actionRequireData?.[0];
  const disabledProcess =
    !!loading ||
    !ctx?.txsCalc?.length ||
    !!ctx.checkErrors?.some((e) => e.level === 'forbidden');

  if (isDesktop && !config.getContainer) {
    const desktopPortalClassName = 'desktop-mini-signer';
    const desktopMiniSignerGetContainer = `.${desktopPortalClassName}`;
    return (
      <>
        <Popup
          height={'fit-content'}
          visible={!!error && !!ctx.signInfo?.status}
          bodyStyle={{ padding: 0 }}
          getContainer={desktopMiniSignerGetContainer}
        >
          <MiniApprovalPopupContainer
            hdType={hdType}
            brandIcon={brandIcon}
            status={'FAILED'}
            content={content}
            description={description}
            onCancel={handleCancel}
            onRetry={async () => {
              await wallet.setRetryTxType(retryUpdateType);
              handleRetry(desktopMiniSignerGetContainer);
            }}
            retryUpdateType={retryUpdateType}
          />
        </Popup>
        <Modal
          visible={visible}
          onClose={handleCancel}
          maskClosable={!loading}
          closable={false}
          bodyStyle={{ padding: 0, maxHeight: 600, height: 600 }}
          destroyOnClose={false}
          forceRender
          maskStyle={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
          }}
          key={`${currentAccount?.address}-${currentAccount?.type}`}
          width={400}
          centered
          content
          className="modal-support-darkmode"
        >
          <PopupContainer>
            <div className={clsx(desktopPortalClassName)}>
              <MiniFooterBar
                className="rounded-none h-[600px] flex flex-col"
                account={currentAccount || undefined}
                directSubmit={directSubmit}
                task={task}
                Header={
                  <div
                    className={clsx(
                      'flex-1 flex flex-col',
                      directSubmit &&
                        'fixed left-[99999px] top-[99999px] z-[-1]',
                      task.status !== 'idle' && 'pointer-events-none'
                    )}
                    key={task.status}
                  >
                    {enableSecurityEngine ||
                    showSimulateChange ||
                    isSpeedUp ||
                    isCancel ||
                    title ? (
                      <div className="flex-1 flex flex-col gap-[22px] mb-16">
                        {title}

                        {showSimulateChange ? (
                          <div className="bg-r-neutral-card-2 px-16 py-12 rounded-[8px]">
                            {txsResult?.[txsResult?.length - 1]
                              ?.preExecResult ? (
                              <BalanceChange
                                version={
                                  txsResult?.[txsResult?.length - 1]
                                    .preExecResult.pre_exec_version
                                }
                                data={
                                  txsResult?.[txsResult?.length - 1]
                                    .preExecResult.balance_change
                                }
                              />
                            ) : (
                              <BalanceChangeLoading />
                            )}
                          </div>
                        ) : null}

                        {engineResults &&
                        ctx?.txsCalc[txs.length - 1].preExecResult ? (
                          <ApprovalUtilsProvider>
                            <MiniSecurityHeader
                              engineResults={engineResults}
                              tx={txs[txs.length - 1]}
                              txDetail={
                                ctx?.txsCalc[txs.length - 1].preExecResult
                              }
                              account={config.account}
                              isReady={!!ctx.engineResults}
                              session={config?.session}
                            />
                          </ApprovalUtilsProvider>
                        ) : null}
                        <SpeedUpCancelHeader
                          isSpeedUp={isSpeedUp}
                          isCancel={isCancel}
                          originGasPrice={originGasPrice || '0'}
                          currentGasPrice={
                            txsResult?.[0]?.tx?.gasPrice ||
                            txsResult?.[0]?.tx?.maxFeePerGas ||
                            ''
                          }
                        />

                        <Divide className="mt-auto w-[calc(100%+40px)] relative left-[-20px] bg-r-neutral-line" />
                      </div>
                    ) : null}
                    <GasSelectorHeader
                      tx={txs[0]}
                      gasAccountCost={gasAccountCost}
                      gasMethod={gasMethod}
                      onChangeGasMethod={setGasMethod}
                      pushType={pushType}
                      disabled={false}
                      isReady={isReady}
                      gasLimit={gasLimit}
                      noUpdate={false}
                      gasList={gasList}
                      selectedGas={selectedGas}
                      version={
                        txsResult?.[0]?.preExecResult?.pre_exec_version || 'v0'
                      }
                      recommendGasLimit={recommendGasLimit}
                      recommendNonce={recommendNonce}
                      chainId={chainId}
                      onChange={handleGasChange}
                      nonce={realNonce}
                      disableNonce={true}
                      isSpeedUp={isSpeedUp}
                      isCancel={isCancel}
                      is1559={support1559}
                      isHardware={isHardware}
                      manuallyChangeGasLimit={manuallyChangeGasLimit}
                      errors={checkErrors}
                      // engineResults={engineResults}
                      nativeTokenBalance={nativeTokenBalance}
                      gasPriceMedian={gasPriceMedian}
                      gas={totalGasCost}
                      gasCalcMethod={gasCalcMethod}
                      // directSubmit={directSubmit}
                      directSubmit={true}
                      checkGasLevelIsNotEnough={checkGasLevelIsNotEnough}
                      getContainer={desktopMiniSignerGetContainer}
                    />
                  </div>
                }
                noCustomRPC={noCustomRPC}
                gasMethod={gasMethod}
                gasAccountCost={gasAccountCost}
                gasAccountCanPay={gasAccountCanPay}
                canGotoUseGasAccount={canGotoUseGasAccount}
                canDepositUseGasAccount={canDepositUseGasAccount}
                isGasAccountLogin={isGasAccountLogin}
                isWalletConnect={isWalletConnect}
                onChangeGasAccount={() => setGasMethod('gasAccount')}
                isWatchAddr={isWatchAddr}
                gasLessConfig={gasLessConfig}
                gasLessFailedReason={gasLessFailedReason}
                canUseGasLess={canUseGasLess}
                showGasLess={showGasLess}
                useGasLess={
                  (isGasNotEnough || !!gasLessConfig) &&
                  canUseGasLess &&
                  useGasLess
                }
                isGasNotEnough={isGasNotEnough}
                enableGasLess={() => handleToggleGasless(true)}
                hasShadow={false}
                origin={INTERNAL_REQUEST_SESSION.origin}
                originLogo={INTERNAL_REQUEST_SESSION.icon}
                // hasUnProcessSecurityResult={hasUnProcessSecurityResult}
                securityLevel={securityLevel}
                gnosisAccount={undefined}
                chain={chain}
                isTestnet={chain.isTestnet}
                onCancel={handleCancel}
                onSubmit={() => handleConfirm(desktopMiniSignerGetContainer)}
                onIgnoreAllRules={noop}
                enableTooltip={ctx.checkErrors?.some(
                  (e) => e.code !== 3001 && e.level === 'forbidden'
                )}
                tooltipContent={
                  checkErrors && checkErrors?.[0]?.code === 3001
                    ? undefined
                    : checkErrors.find((item) => item.level === 'forbidden')
                    ? checkErrors.find((item) => item.level === 'forbidden')!
                        .msg
                    : undefined
                }
                disabledProcess={disabledProcess}
                disableSignBtn={disableSignBtn}
                isFirstGasLessLoading={!ctx?.txsCalc.length}
                isFirstGasCostLoading={!ctx?.txsCalc.length}
                getContainer={desktopMiniSignerGetContainer}
                onRedirectToDeposit={onRedirectToDeposit}
              />
            </div>
          </PopupContainer>
        </Modal>

        <TokenDetailPopup
          token={tokenDetail.selectToken}
          visible={tokenDetail.popupVisible}
          onClose={() => dispatch.sign.closeTokenDetailPopup()}
          canClickToken={false}
          hideOperationButtons
          variant="add"
          account={currentAccount || undefined}
          getContainer={desktopMiniSignerGetContainer}
        />
      </>
    );
  }

  return (
    <>
      <Popup
        height={'fit-content'}
        visible={!!error && !!ctx.signInfo?.status}
        bodyStyle={{ padding: 0 }}
        getContainer={config?.getContainer}
        push={false}
      >
        <MiniApprovalPopupContainer
          hdType={hdType}
          brandIcon={brandIcon}
          status={'FAILED'}
          content={content}
          description={description}
          onCancel={handleCancel}
          onRetry={async () => {
            await wallet.setRetryTxType(retryUpdateType);
            handleRetry(config?.getContainer);
          }}
          retryUpdateType={retryUpdateType}
        />
      </Popup>

      <Popup
        placement="bottom"
        height="fit-content"
        className="is-support-darkmode"
        visible={visible}
        onClose={handleCancel}
        maskClosable={!loading}
        closable={false}
        bodyStyle={{ padding: 0 }}
        push={false}
        destroyOnClose={false}
        forceRender
        maskStyle={{
          backgroundColor: !isDarkTheme ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)',
        }}
        getContainer={visible ? config?.getContainer : undefined}
        key={`${currentAccount?.address}-${currentAccount?.type}`}
      >
        <MiniFooterBar
          account={currentAccount || undefined}
          directSubmit={directSubmit}
          task={task}
          Header={
            <div
              className={clsx(
                directSubmit && 'fixed left-[99999px] top-[99999px] z-[-1]',
                task.status !== 'idle' && 'pointer-events-none'
              )}
              key={task.status}
            >
              {enableSecurityEngine ||
              showSimulateChange ||
              isSpeedUp ||
              isCancel ||
              title ? (
                <div className="flex flex-col gap-[22px] mb-16">
                  {title}

                  {showSimulateChange ? (
                    <div className="bg-r-neutral-card-2 px-16 py-12 rounded-[8px]">
                      {txsResult?.[txsResult?.length - 1]?.preExecResult ? (
                        <BalanceChange
                          version={
                            txsResult?.[txsResult?.length - 1].preExecResult
                              .pre_exec_version
                          }
                          data={
                            txsResult?.[txsResult?.length - 1].preExecResult
                              .balance_change
                          }
                        />
                      ) : (
                        <BalanceChangeLoading />
                      )}
                    </div>
                  ) : null}

                  {engineResults &&
                  ctx?.txsCalc[txs.length - 1].preExecResult ? (
                    <ApprovalUtilsProvider>
                      <MiniSecurityHeader
                        engineResults={engineResults}
                        tx={txs[txs.length - 1]}
                        txDetail={ctx?.txsCalc[txs.length - 1].preExecResult}
                        account={config.account}
                        isReady={!!ctx.engineResults}
                        session={config?.session}
                      />
                    </ApprovalUtilsProvider>
                  ) : null}
                  <SpeedUpCancelHeader
                    isSpeedUp={isSpeedUp}
                    isCancel={isCancel}
                    originGasPrice={originGasPrice || '0'}
                    currentGasPrice={
                      txsResult?.[0]?.tx?.gasPrice ||
                      txsResult?.[0]?.tx?.maxFeePerGas ||
                      ''
                    }
                  />

                  <Divide className="w-[calc(100%+40px)] relative left-[-20px] bg-r-neutral-line" />
                </div>
              ) : null}
              <GasSelectorHeader
                tx={txs[0]}
                gasAccountCost={gasAccountCost}
                gasMethod={gasMethod}
                onChangeGasMethod={setGasMethod}
                pushType={pushType}
                disabled={false}
                isReady={isReady}
                gasLimit={gasLimit}
                noUpdate={false}
                gasList={gasList}
                selectedGas={selectedGas}
                version={
                  txsResult?.[0]?.preExecResult?.pre_exec_version || 'v0'
                }
                recommendGasLimit={recommendGasLimit}
                recommendNonce={recommendNonce}
                chainId={chainId}
                onChange={handleGasChange}
                nonce={realNonce}
                disableNonce={true}
                isSpeedUp={isSpeedUp}
                isCancel={isCancel}
                is1559={support1559}
                isHardware={isHardware}
                manuallyChangeGasLimit={manuallyChangeGasLimit}
                errors={checkErrors}
                // engineResults={engineResults}
                nativeTokenBalance={nativeTokenBalance}
                gasPriceMedian={gasPriceMedian}
                gas={totalGasCost}
                gasCalcMethod={gasCalcMethod}
                // directSubmit={directSubmit}
                directSubmit={true}
                checkGasLevelIsNotEnough={checkGasLevelIsNotEnough}
                getContainer={getContainer}
              />
            </div>
          }
          noCustomRPC={noCustomRPC}
          gasMethod={gasMethod}
          gasAccountCost={gasAccountCost}
          gasAccountCanPay={gasAccountCanPay}
          canGotoUseGasAccount={canGotoUseGasAccount}
          canDepositUseGasAccount={canDepositUseGasAccount}
          isGasAccountLogin={isGasAccountLogin}
          isWalletConnect={isWalletConnect}
          onChangeGasAccount={() => setGasMethod('gasAccount')}
          isWatchAddr={isWatchAddr}
          gasLessConfig={gasLessConfig}
          gasLessFailedReason={gasLessFailedReason}
          canUseGasLess={canUseGasLess}
          showGasLess={showGasLess}
          useGasLess={
            (isGasNotEnough || !!gasLessConfig) && canUseGasLess && useGasLess
          }
          isGasNotEnough={isGasNotEnough}
          enableGasLess={() => handleToggleGasless(true)}
          hasShadow={false}
          origin={INTERNAL_REQUEST_SESSION.origin}
          originLogo={INTERNAL_REQUEST_SESSION.icon}
          // hasUnProcessSecurityResult={hasUnProcessSecurityResult}
          securityLevel={securityLevel}
          gnosisAccount={undefined}
          chain={chain}
          isTestnet={chain.isTestnet}
          onCancel={handleCancel}
          onSubmit={() => handleConfirm(getContainer)}
          onIgnoreAllRules={noop}
          enableTooltip={ctx.checkErrors?.some(
            (e) => e.code !== 3001 && e.level === 'forbidden'
          )}
          tooltipContent={
            checkErrors && checkErrors?.[0]?.code === 3001
              ? undefined
              : checkErrors.find((item) => item.level === 'forbidden')
              ? checkErrors.find((item) => item.level === 'forbidden')!.msg
              : undefined
          }
          disabledProcess={disabledProcess}
          disableSignBtn={disableSignBtn}
          isFirstGasLessLoading={!ctx?.txsCalc.length}
          isFirstGasCostLoading={!ctx?.txsCalc.length}
          getContainer={getContainer}
          onRedirectToDeposit={onRedirectToDeposit}
        />
      </Popup>
      <TokenDetailPopup
        token={tokenDetail.selectToken}
        visible={tokenDetail.popupVisible}
        onClose={() => dispatch.sign.closeTokenDetailPopup()}
        canClickToken={false}
        hideOperationButtons
        variant="add"
        account={currentAccount || undefined}
      />
    </>
  );
};

export default MiniSignTxV2;
