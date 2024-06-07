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
import { Divide } from '../Divide';

const { TabPane } = Tabs;

export const MessageWrapper = styled.div`
  .title {
    display: flex;
    justify-content: center;
    margin-top: 12px;
    margin-bottom: 12px;
    overflow: hidden;

    .title-text {
      font-size: 14px;
      color: var(--r-blue-default, #7084ff);
      text-align: center;
      font-weight: 500;
      padding: 0 8px;
      position: relative;

      &::before,
      &::after {
        content: '';
        width: 400px;
        height: 1px;
        border-top: 1px dashed var(--r-neutral-line, rgba(255, 255, 255, 0.1));
        position: absolute;
        top: 50%;
      }

      &::before {
        transform: translateX(-100%);
        left: 0px;
      }

      &::after {
        transform: translateX(100%);
        right: 0px;
      }
    }
  }
  .content {
    word-break: break-all;
    white-space: pre-wrap;
    font-size: 13px;
    line-height: 16px;
    font-weight: 400;
    color: var(--r-neutral-body, #3e495e);
    height: 320px;
    overflow-y: auto;
    padding: 0 16px 16px;
    /* font-family: 'Roboto Mono'; */
  }
  &.no-action {
    .content {
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

          {data && <Divide />}

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

      <Card className="mt-12">
        <MessageWrapper
          className={clsx({
            'no-action': !data,
          })}
        >
          <div className="title">
            <div className="title-text">{t('page.signText.title')}</div>
          </div>
          <div className="content">{message}</div>
        </MessageWrapper>
      </Card>
    </>
  );
};

export default Actions;
