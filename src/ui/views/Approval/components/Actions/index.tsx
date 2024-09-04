import { Result } from '@rabby-wallet/rabby-security-engine';
import { Chain, ExplainTxResponse } from 'background/service/openapi';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BalanceChange from '../TxComponents/BalanceChange';
import ViewRawModal from '../TxComponents/ViewRawModal';
import { getActionTypeText } from './utils';
import {
  ActionRequireData,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import { ReactComponent as RcIconArrowRight } from 'ui/assets/approval/edit-arrow-right.svg';
import IconSpeedUp from 'ui/assets/sign/tx/speedup.svg';
import { ReactComponent as IconQuestionMark } from 'ui/assets/sign/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { NoActionAlert } from '../NoActionAlert/NoActionAlert';
import clsx from 'clsx';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { ActionWrapper } from '../ActionWrapper';
import { OriginInfo } from '../OriginInfo';
import { Card } from '../Card';
import { Divide } from '../Divide';
import { Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import { TransactionActionList } from './components/TransactionActionList';

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
}) => {
  const actionName = useMemo(() => {
    return getActionTypeText(data);
  }, [data]);

  const notShowBalanceChange = useMemo(() => {
    if (
      data.approveNFT ||
      data.approveNFTCollection ||
      data.approveToken ||
      data.cancelTx ||
      data.deployContract ||
      data.pushMultiSig ||
      data.revokeNFT ||
      data.revokeNFTCollection ||
      data.revokeToken ||
      data.permit2BatchRevokeToken ||
      data.revokePermit2
    ) {
      const balanceChange = txDetail.balance_change;
      if (!txDetail.pre_exec.success) return false;
      if (
        balanceChange.receive_nft_list.length +
          balanceChange.receive_token_list.length +
          balanceChange.send_nft_list.length +
          balanceChange.send_nft_list.length <=
        0
      ) {
        return true;
      }
    }
    return false;
  }, [data, txDetail]);

  const { t } = useTranslation();

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: txDetail?.abi_str,
    });
  };

  const isUnknown = data?.contractCall;

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
          {!notShowBalanceChange && (
            <>
              <Divide />
              <BalanceChange
                version={txDetail.pre_exec_version}
                data={txDetail.balance_change}
              />
            </>
          )}
        </Card>

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
                <LogoWithText
                  logo={chain.logo}
                  text={chain.name}
                  logoRadius="100%"
                />
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
      </ActionWrapper>
    </>
  );
};

export default Actions;
