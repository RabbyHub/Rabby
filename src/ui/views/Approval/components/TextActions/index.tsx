import { Result } from '@rabby-wallet/rabby-security-engine';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Tabs } from 'antd';
import { TextActionData, getActionTypeText } from './utils';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';
import CreateKey from './CreateKey';
import VerifyAddress from './VerifyAddress';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import IconQuestionMark from 'ui/assets/sign/question-mark-24.svg';
import IconRabbyDecoded from 'ui/assets/sign/rabby-decoded.svg';
import IconCheck from 'ui/assets/icon-check.svg';
import clsx from 'clsx';
import { Popup } from 'ui/component';
import { NoActionAlert } from '../NoActionAlert/NoActionAlert';

const { TabPane } = Tabs;

export const SignTitle = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  .left {
    display: flex;
    font-size: 18px;
    line-height: 21px;
    color: #333333;
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

export const ActionWrapper = styled.div`
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: #fff;
  .action-header {
    display: flex;
    justify-content: space-between;
    background: var(--r-blue-default, #7084ff);
    padding: 13px;
    align-items: center;
    color: #fff;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    .left {
      font-weight: 500;
      font-size: 16px;
      line-height: 19px;
    }
    .right {
      font-size: 14px;
      line-height: 16px;
      position: relative;
      .decode-tooltip {
        max-width: 358px;
        &:not(.ant-tooltip-hidden) {
          left: -321px !important;
          .ant-tooltip-arrow {
            left: 333px;
          }
        }
        .ant-tooltip-arrow-content {
          background-color: #fff;
        }
        .ant-tooltip-inner {
          background-color: #fff;
          padding: 0;
          font-size: 13px;
          font-weight: 500;
          color: var(--r-neutral-body, #3e495e);
          border-radius: 6px;
        }
      }
    }
    &.is-unknown {
      background: var(--r-neutral-foot, #6a7587);
    }
  }
  .container {
    padding: 14px;
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
      .left {
        font-weight: 500;
        font-size: 16px;
        line-height: 19px;
        color: #222222;
      }
      .right {
        font-size: 14px;
        line-height: 16px;
        color: #999999;
      }
    }
  }
`;

const MessageWrapper = styled.div`
  .title {
    position: relative;
    font-size: 14px;
    line-height: 16px;
    color: #666666;
    text-align: center;
    margin-bottom: 10px;
    margin-left: -20px;
    margin-right: -20px;
    &::before {
      content: '';
      width: 40%;
      height: 1px;
      border-top: 1px dashed #c7c9d7;
      position: absolute;
      top: 50%;
      left: 0;
    }
    &::after {
      content: '';
      width: 40%;
      height: 1px;
      border-top: 1px dashed #c7c9d7;
      position: absolute;
      top: 50%;
      right: 0;
    }
  }
  .content {
    padding: 15px;
    word-break: break-all;
    white-space: pre-wrap;
    background: #ebedf7;
    border: 1px solid rgba(225, 227, 234, 0.9);
    border-radius: 6px;
    font-size: 13px;
    line-height: 16px;
    font-weight: 500;
    color: #4b4d59;
    height: 320px;
    overflow-y: auto;
    /* font-family: 'Roboto Mono'; */
  }
  &.no-action {
    .content {
      background-color: #fff;
    }
  }
`;

const Actions = ({
  data,
  engineResults,
  raw,
  message,
  origin,
}: {
  data: TextActionData | null;
  engineResults: Result[];
  raw: string;
  message: string;
  origin: string;
}) => {
  const actionName = useMemo(() => {
    return getActionTypeText(data);
  }, [data]);

  const { t } = useTranslation();

  const handleViewRawClick = () => {
    Popup.info({
      closable: true,
      height: 720,
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

  return (
    <>
      <SignTitle>
        <div className="left relative">{t('page.signText.title')}</div>
        <div
          className="float-right text-12 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          {t('page.signTx.viewRaw')}
          <img className="icon icon-arrow-right" src={IconArrowRight} />
        </div>
      </SignTitle>
      <ActionWrapper>
        <div
          className={clsx('action-header', {
            'is-unknown': !data,
          })}
        >
          <div className="left">{actionName}</div>
          <div className="right">
            <TooltipWithMagnetArrow
              placement="bottom"
              overlayClassName="rectangle w-[max-content] decode-tooltip"
              title={
                !data ? (
                  <NoActionAlert
                    data={{
                      origin,
                      text: message,
                    }}
                  />
                ) : (
                  <span className="flex w-[358px] p-12">
                    <img src={IconCheck} className="mr-4 w-12" />
                    {t('page.signTx.decodedTooltip')}
                  </span>
                )
              }
            >
              {!data ? (
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
        {data && (
          <div className="container">
            {data.createKey && (
              <CreateKey data={data.createKey} engineResults={engineResults} />
            )}
            {data.verifyAddress && (
              <VerifyAddress
                data={data.verifyAddress}
                engineResults={engineResults}
              />
            )}
          </div>
        )}
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
