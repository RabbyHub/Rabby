import { Result } from '@debank/rabby-security-engine';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Tabs } from 'antd';
import { TextActionData, getActionTypeText } from './utils';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';
import CreateKey from './CreateKey';
import VerifyAddress from './VerifyAddress';
import IconAlert from 'ui/assets/sign/tx/alert.svg';
import clsx from 'clsx';
import { Popup } from 'ui/component';

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
    background: #8697ff;
    padding: 14px;
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
      .icon-tip {
        margin-top: 1px;
        margin-left: 4px;
        path {
          stroke: #fff;
        }
      }
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

const NoActionAlert = styled.div`
  display: flex;
  align-items: flex-start;
  background: #e8eaf3;
  border-radius: 6px;
  padding: 15px;
  font-weight: 500;
  font-size: 13px;
  line-height: 18px;
  color: #333333;
  margin-bottom: 15px;
  .icon-alert {
    margin-right: 8px;
    width: 15px;
    margin-top: 1px;
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
    font-family: 'Roboto Mono';
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
}: {
  data: TextActionData | null;
  engineResults: Result[];
  raw: string;
  message: string;
}) => {
  const actionName = useMemo(() => {
    if (!data) return '';
    return getActionTypeText(data);
  }, [data]);

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
        <div className="left relative">Sign Text</div>
        <div
          className="float-right text-12 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          View Raw
          <img className="icon icon-arrow-right" src={IconArrowRight} />
        </div>
      </SignTitle>
      {data && (
        <ActionWrapper>
          <div className="action-header">
            <div className="left">{actionName}</div>
            <div className="right">action type</div>
          </div>
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
        </ActionWrapper>
      )}
      {!data && (
        <NoActionAlert>
          <img src={IconAlert} className="icon icon-alert" />
          This signature can't be decoded by Rabby, but it doesn't imply any
          risk
        </NoActionAlert>
      )}
      <MessageWrapper
        className={clsx({
          'no-action': !data,
        })}
      >
        <div className="title">Message</div>
        <div className="content">{message}</div>
      </MessageWrapper>
    </>
  );
};

export default Actions;
