import { Result } from '@rabby-wallet/rabby-security-engine';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Tabs } from 'antd';
import { TextActionData, getActionTypeText } from './utils';
import IconArrowRight, {
  ReactComponent as RcIconArrowRight,
} from 'ui/assets/approval/edit-arrow-right.svg';
import CreateKey from './CreateKey';
import VerifyAddress from './VerifyAddress';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { ReactComponent as IconQuestionMark } from 'ui/assets/sign/question-mark.svg';
import IconRabbyDecoded from 'ui/assets/sign/rabby-decoded.svg';
import IconCheck, {
  ReactComponent as RcIconCheck,
} from 'src/ui/assets/approval/icon-check.svg';
import clsx from 'clsx';
import { Popup } from 'ui/component';
import { NoActionAlert } from '../NoActionAlert/NoActionAlert';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { CommonAction } from '../CommonAction';
import { ActionWrapper } from '../ActionWrapper';
import { Card } from '../Card';
import { OriginInfo } from '../OriginInfo';

const { TabPane } = Tabs;

export const SignTitle = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  .left {
    display: flex;
    font-size: 18px;
    line-height: 21px;
    color: var(--r-neutral-title-1, #f7fafc);
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

const MessageWrapper = styled.div`
  .title {
    position: relative;
    font-size: 14px;
    line-height: 16px;
    color: var(--r-neutral-title-1, #f7fafc);
    text-align: center;
    margin-bottom: 10px;
    margin-left: -20px;
    margin-right: -20px;
    &::before {
      content: '';
      width: 40%;
      height: 1px;
      border-top: 1px dashed var(--r-neutral-line, rgba(255, 255, 255, 0.1));
      position: absolute;
      top: 50%;
      left: 0;
    }
    &::after {
      content: '';
      width: 40%;
      height: 1px;
      border-top: 1px dashed var(--r-neutral-line, rgba(255, 255, 255, 0.1));
      position: absolute;
      top: 50%;
      right: 0;
    }
  }
  .content {
    padding: 15px;
    word-break: break-all;
    white-space: pre-wrap;
    background: var(--r-neutral-card-1, #ffffff);
    border: 1px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
    border-radius: 6px;
    font-size: 13px;
    line-height: 16px;
    font-weight: 500;
    color: var(--r-neutral-body, #3e495e);
    height: 320px;
    overflow-y: auto;
    /* font-family: 'Roboto Mono'; */
  }
  &.no-action {
    .content {
      background: var(--r-neutral-card-3, rgba(255, 255, 255, 0.06));
    }
  }
`;

const Actions = ({
  data,
  engineResults,
  raw,
  message,
  origin,
  originLogo,
}: {
  data: TextActionData | null;
  engineResults: Result[];
  raw: string;
  message: string;
  origin: string;
  originLogo?: string;
}) => {
  const actionName = useMemo(() => {
    return getActionTypeText(data);
  }, [data]);

  const { t } = useTranslation();

  const handleViewRawClick = () => {
    Popup.info({
      closable: true,
      height: 520,
      isNew: true,
      content: (
        <Tabs defaultActiveKey="raw">
          {raw && (
            <TabPane tab="DATA" key="raw">
              {raw}
            </TabPane>
          )}
        </Tabs>
      ),
      className: 'view-raw-detail',
    });
  };

  const isUnknown = !data;

  return (
    <>
      <ActionWrapper isEmptyBody={isUnknown}>
        <Card>
          <OriginInfo
            origin={origin}
            originLogo={originLogo}
            engineResults={engineResults}
          />
        </Card>

        <Card>
          <div
            className={clsx('action-header', {
              'is-unknown': isUnknown,
            })}
          >
            <div className="left">
              <span>{actionName}</span>
              {isUnknown && (
                <TooltipWithMagnetArrow
                  placement="bottom"
                  overlayClassName="rectangle w-[max-content] decode-tooltip"
                  title={
                    <NoActionAlert
                      data={{
                        origin,
                        text: message,
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
                className="float-right text-12 cursor-pointer flex items-center view-raw"
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

          {data && (
            <div className="container">
              {data.createKey && (
                <CreateKey
                  data={data.createKey}
                  engineResults={engineResults}
                />
              )}
              {data.verifyAddress && (
                <VerifyAddress
                  data={data.verifyAddress}
                  engineResults={engineResults}
                />
              )}
              {data.common && (
                <CommonAction
                  data={data.common}
                  engineResults={engineResults}
                />
              )}
            </div>
          )}
        </Card>
      </ActionWrapper>
      <MessageWrapper
        className={clsx({
          'no-action': !data,
        })}
      >
        <div className="title">{t('page.signText.message')}</div>
        <div className="content">{message}</div>
      </MessageWrapper>
    </>
  );
};

export default Actions;
