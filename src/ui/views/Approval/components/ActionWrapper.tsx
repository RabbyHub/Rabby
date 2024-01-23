import React from 'react';
import styled from 'styled-components';

export const DIV = styled.div`
  background-color: var(--r-neutral-bg-1, #fff);
  margin-bottom: 8px;
  border-radius: 8px;
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

        .ant-tooltip-arrow-content {
          background-color: var(--r-neutral-bg-1, #fff);
        }
        .ant-tooltip-inner {
          background-color: var(--r-neutral-bg-1, #fff);
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
    /* border: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1)); */
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    background-color: var(--r-neutral-card-1, rgba(255, 255, 255, 0.06));

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

export const ActionWrapper: React.FC = ({ children }) => {
  return (
    <DIV>
      <div className="overflow-hidden">{children}</div>
    </DIV>
  );
};
