import clsx from 'clsx';
import React from 'react';
import styled from 'styled-components';

export const DIV = styled.div`
  .action-header {
    display: flex;
    justify-content: space-between;
    background: var(--r-neutral-card-1, #fff);
    padding: 12px 16px;
    align-items: center;
    color: var(--r-neutral-title1, #192945);
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;

    .left {
      font-weight: 500;
      font-size: 13px;
      line-height: 16px;
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
      background: var(--r-neutral-card-1, #fff);
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

export const ActionWrapper: React.FC<{
  isEmptyBody?: boolean;
}> = ({ children, isEmptyBody }) => {
  return (
    <DIV>
      <div className={clsx(isEmptyBody ? '' : 'overflow-hidden', 'space-y-12')}>
        {children}
      </div>
    </DIV>
  );
};
