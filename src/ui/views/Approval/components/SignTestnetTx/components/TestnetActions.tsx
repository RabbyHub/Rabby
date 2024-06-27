import { Chain } from '@debank/common';
import ViewRawModal from '../../TxComponents/ViewRawModal';
import React from 'react';
import styled from 'styled-components';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconQuestionMark } from 'ui/assets/sign/question-mark.svg';
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
import { Card } from '../../Card';
import { OriginInfo } from '../../OriginInfo';
import { Divide } from '../../Divide';
import BalanceChange from '../../TxComponents/BalanceChange';
import LogoWithText from '../../Actions/components/LogoWithText';
import { MessageWrapper } from '../../TextActions';
import { SignAdvancedSettings } from '../../SignAdvancedSettings';

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
  originLogo,
  origin,
}: {
  chain: Chain;
  raw: Record<string, string | number>;
  onChange?(tx: Record<string, any>): void;
  isSpeedUp: boolean;
  isReady?: boolean;
  originLogo?: string;
  origin: string;
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
      <ActionWrapper>
        <Card>
          <OriginInfo chain={chain} origin={origin} originLogo={originLogo} />
          <Divide />
          <BalanceChange version="v0" />
        </Card>

        {/* <TestnetUnknownAction raw={raw} /> */}
        <Card>
          <div
            className={clsx('action-header', {
              'is-unknown': isUnknown,
            })}
          >
            <div className="left">
              {isSpeedUp && (
                <TooltipWithMagnetArrow
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
                  placement="bottom"
                  overlayClassName="rectangle w-[max-content] decode-tooltip"
                  title={
                    <NoActionAlert
                      data={{
                        origin,
                        text: '',
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

          <div className="px-16">
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
          </div>
        </Card>
      </ActionWrapper>
    </div>
  );
};
