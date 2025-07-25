import ChainIcon from '@/ui/component/ChainIcon';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useWallet } from '@/ui/utils';
import {
  ActionRequireData,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Chain, ExplainTxResponse } from 'background/service/openapi';
import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconArrowRight } from 'ui/assets/approval/edit-arrow-right.svg';
import { ReactComponent as IconQuestionMark } from 'ui/assets/sign/question-mark.svg';
import IconSpeedUp from 'ui/assets/sign/tx/speedup.svg';
import { ActionWrapper } from '../ActionWrapper';
import { Card } from '../Card';
import { Divide } from '../Divide';
import { NoActionAlert } from '../NoActionAlert/NoActionAlert';
import { OriginInfo } from '../OriginInfo';
import ViewRawModal from '../TxComponents/ViewRawModal';
import { Col, Row } from './components/Table';
import { TransactionActionList } from './components/TransactionActionList';
import { getActionTypeText } from './utils';
import { BalanceChangeWrapper } from '../TxComponents/BalanceChangeWrapper';
import { Account } from '@/background/service/preference';
import { MultiActionProps } from '../TypedDataActions';

const ActionItem = ({
  isSpeedUp,
  account,
  chain,
  requireData,
  txDetail,
  raw,
  data,
  engineResults,
  onChange,
}: {
  data: ParsedTransactionActionData;
  requireData: ActionRequireData;
  chain: Chain;
  engineResults: Result[];
  txDetail: ExplainTxResponse;
  raw: Record<string, string | number>;
  onChange(tx: Record<string, any>): void;
  isSpeedUp: boolean;
  account: Account;
}) => {
  const actionName = useMemo(() => {
    return getActionTypeText(data);
  }, [data]);

  const { t } = useTranslation();

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: txDetail?.abi_str,
    });
  };

  const isUnknown = data?.contractCall;
  const wallet = useWallet();
  const [customRPC, setCustomRPC] = useState('');
  const getCustomRPC = async () => {
    const rpc = await wallet.getCustomRpcByChain(chain.enum);
    setCustomRPC(rpc?.enable ? rpc.url : '');
  };
  useEffect(() => {
    getCustomRPC();
  }, [chain]);
  return (
    <Card>
      <div
        className={clsx('action-header', {
          'is-unknown': isUnknown,
        })}
      >
        <div className="left">
          {isSpeedUp && (
            <TooltipWithMagnetArrow
              inApproval
              placement="bottom"
              overlayClassName="rectangle w-[max-content]"
              title={t('page.signTx.speedUpTooltip')}
              viewportOffset={[0, -16, 0, 16]}
            >
              <img
                src={IconSpeedUp}
                className="icon icon-speedup mr-2 w-16 h-16"
              />
            </TooltipWithMagnetArrow>
          )}
          <span>{actionName}</span>
          {isUnknown && (
            <TooltipWithMagnetArrow
              inApproval
              placement="bottom"
              overlayClassName="rectangle w-[max-content] decode-tooltip"
              title={
                <NoActionAlert
                  account={account}
                  data={{
                    chainId: chain.serverId,
                    contractAddress:
                      requireData && 'id' in requireData
                        ? requireData.id
                        : txDetail.type_call?.contract,
                    selector: raw.data.toString(),
                  }}
                />
              }
            >
              <IconQuestionMark className="w-14 text-r-neutral-foot ml-2 mt-2" />
            </TooltipWithMagnetArrow>
          )}
        </div>
        <div className="right">
          <div
            className="float-right text-13 cursor-pointer flex items-center view-raw"
            onClick={handleViewRawClick}
          >
            {t('page.signTx.viewRaw')}
            <ThemeIcon
              className="icon icon-arrow-right"
              src={RcIconArrowRight}
            />
          </div>
        </div>
      </div>
      <Divide />
      <div className="container">
        <Col>
          <Row isTitle>{t('page.signTx.chain')}</Row>
          <Row>
            <div className="flex items-center gap-[6px]">
              <ChainIcon
                chain={chain.enum}
                size={'small'}
                innerClassName="w-[16px] h-[16px]"
                customRPC={customRPC}
                showCustomRPCToolTip
              ></ChainIcon>
              <div className="truncate text-rabby-neutral-title1">
                {chain.name}
              </div>
            </div>
          </Row>
        </Col>
        <TransactionActionList
          data={data}
          requireData={requireData}
          chain={chain}
          engineResults={engineResults}
          raw={raw}
          onChange={onChange}
        />
      </div>
    </Card>
  );
};

const Actions = ({
  data,
  requireData,
  chain,
  engineResults,
  txDetail,
  raw,
  onChange,
  isSpeedUp,
  origin,
  originLogo,
  account,
  multiAction,
}: {
  data: ParsedTransactionActionData;
  requireData: ActionRequireData;
  chain: Chain;
  engineResults: Result[];
  txDetail: ExplainTxResponse;
  raw: Record<string, string | number>;
  onChange(tx: Record<string, any>): void;
  isSpeedUp: boolean;
  origin?: string;
  originLogo?: string;
  account: Account;
  multiAction?: MultiActionProps;
}) => {
  const isMultiAction = useMemo(() => {
    return !!multiAction;
  }, [multiAction]);

  return (
    <>
      <ActionWrapper>
        <Card>
          <OriginInfo
            chain={chain}
            origin={origin}
            originLogo={originLogo}
            engineResults={engineResults}
          />
          <BalanceChangeWrapper
            data={data}
            balanceChange={txDetail.balance_change}
            preExecSuccess={txDetail.pre_exec.success}
            preExecVersion={txDetail.pre_exec_version}
          />
        </Card>
        {isMultiAction && multiAction ? (
          (multiAction.actionList as ParsedTransactionActionData[]).map(
            (action, index) => (
              <ActionItem
                key={index}
                data={action}
                requireData={multiAction.requireDataList[index]}
                chain={chain}
                engineResults={multiAction.engineResultList[index]}
                raw={raw}
                account={account}
                txDetail={txDetail}
                onChange={onChange}
                isSpeedUp={isSpeedUp}
              />
            )
          )
        ) : (
          <ActionItem
            data={data}
            requireData={requireData}
            chain={chain}
            engineResults={engineResults}
            raw={raw}
            account={account}
            txDetail={txDetail}
            onChange={onChange}
            isSpeedUp={isSpeedUp}
          />
        )}
      </ActionWrapper>
    </>
  );
};

export default Actions;
