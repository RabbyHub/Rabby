import { Chain } from '@debank/common';
import ViewRawModal from '../../TxComponents/ViewRawModal';
import React from 'react';
import styled from 'styled-components';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useTranslation } from 'react-i18next';
import IconQuestionMark from 'ui/assets/sign/question-mark-24.svg';
import IconRabbyDecoded from 'ui/assets/sign/rabby-decoded.svg';
import IconSpeedUp from 'ui/assets/sign/tx/speedup.svg';
import { findChain } from '@/utils/chain';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import IconArrowRight, {
  ReactComponent as RcIconArrowRight,
} from 'ui/assets/approval/edit-arrow-right.svg';
import { ActionWrapper } from '../../ActionWrapper';
import clsx from 'clsx';
import { Table, Col, Row } from '../../Actions/components/Table';
import Loading from '../../TxComponents/Loading';
import IconCheck, {
  ReactComponent as RcIconCheck,
} from 'src/ui/assets/approval/icon-check.svg';
import { NoActionAlert } from '../../NoActionAlert/NoActionAlert';

export const SignTitle = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  .left {
    display: flex;
    font-size: 18px;
    line-height: 21px;
    color: var(--r-neutral-title-1, #f7fafc);
    flex: 1;
    .icon-speedup {
      width: 10px;
      margin-right: 6px;
      cursor: pointer;
    }
  }
  .right {
    font-size: 14px;
    line-height: 16px;
    color: #999999;
    cursor: pointer;
  }
`;

export const TestnetActions = ({
  chain,
  raw,
  onChange,
  isSpeedUp,
  isReady,
}: {
  chain: Chain;
  raw: Record<string, string | number>;
  onChange?(tx: Record<string, any>): void;
  isSpeedUp: boolean;
  isReady?: boolean;
}) => {
  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
    });
  };
  const { t } = useTranslation();
  const isUnknown = true;
  const actionName = t('page.signTx.unknownActionType');

  if (!isReady) {
    return <Loading />;
  }

  return (
    <div className="relative">
      <SignTitle>
        <div className="left relative">
          {isSpeedUp && (
            <TooltipWithMagnetArrow
              overlayClassName="rectangle w-[max-content]"
              title={t('page.signTx.speedUpTooltip')}
            >
              <img src={IconSpeedUp} className="icon icon-speedup" />
            </TooltipWithMagnetArrow>
          )}
          {t('page.signTx.signTransactionOnChain', { chain: chain?.name })}
        </div>
        <div
          className="float-right text-14 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          {t('page.signTx.viewRaw')}
          <ThemeIcon className="icon icon-arrow-right" src={RcIconArrowRight} />
        </div>
      </SignTitle>
      <ActionWrapper>
        {/* <TestnetUnknownAction raw={raw} /> */}
        <div
          className={clsx('action-header', {
            'is-unknown': isUnknown,
          })}
        >
          <div className="left">{actionName}</div>
          <div className="right">
            <TooltipWithMagnetArrow
              placement="bottom"
              overlayClassName="rectangle w-[max-content] decode-tooltip"
              title={
                isUnknown ? (
                  <NoActionAlert
                    data={{
                      origin,
                      text: '',
                    }}
                  />
                ) : (
                  <span className="flex w-[358px] p-12 items-center">
                    <ThemeIcon src={RcIconCheck} className="mr-4 w-12" />
                    {t('page.signTx.decodedTooltip')}
                  </span>
                )
              }
            >
              {isUnknown ? (
                <img src={IconQuestionMark} className="w-24" />
              ) : (
                <img
                  src={IconRabbyDecoded}
                  className="icon icon-rabby-decoded"
                />
              )}
            </TooltipWithMagnetArrow>
          </div>
        </div>
        <div className="container">
          <div
            className="break-all whitespace-pre-wrap font-medium text-r-neutral-body text-[13px] leading-[16px]"
            style={{
              fontFamily: 'Roboto Mono, sans-serif',
            }}
          >
            {JSON.stringify(raw, null, 2)}
          </div>
        </div>
      </ActionWrapper>
      <div className="token-balance-change">
        <div className="token-balance-change-content">
          <Table>
            <Col>
              <Row>
                <span className="text-15 text-r-neutral-title-1 font-medium">
                  {t('page.signTx.balanceChange.notSupport')}
                </span>
              </Row>
            </Col>
          </Table>
        </div>
      </div>
      <div
        className={clsx(
          'absolute bottom-[72px] right-0',
          'px-[16px] py-[12px] rotate-[-23deg]',
          'border-rabby-neutral-title1 border-[1px] rounded-[6px]',
          'text-r-neutral-title1 text-[20px] leading-[24px]',
          'opacity-30'
        )}
      >
        Custom Network
      </div>
    </div>
  );
};
