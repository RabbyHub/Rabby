import BigNumber from 'bignumber.js';
import { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

export const GasCardBody = styled.div<{
  $disabled?: boolean;
}>`
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 8px;

  ${({ $disabled }) =>
    $disabled
      ? css`
          opacity: 0.5;
          cursor: not-allowed;
        `
      : css`
          .card {
            cursor: pointer;

            &:hover {
              border: 1px solid var(--r-blue-default, #7084ff);
            }

            &.active {
              background: var(--r-blue-light-1, #eef1ff);
              border: 1px solid var(--r-blue-default, #7084ff);
              box-shadow: none;
            }
          }

          .cardTitle {
            &.active {
              color: var(--r-blue-default, #7084ff) !important;
            }
          }
        `}

  .card {
    width: 84px;
    height: 80px;
    border-radius: 8px;
    background: var(--r-neutral-card1, #fff);
    box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    border: 1px solid transparent;
    transition: all 0.2s;

    .gas-level,
    .cardTitle {
      text-align: center;
      font-size: 12px;
      line-height: 14px;
      color: var(--r-neutral-body, #3e495e);
      margin: 14px auto 0;
      font-weight: 500;
    }

    .cardTitle {
      color: var(--r-neutral-title-1, #192945) !important;
      font-weight: 500;
      font-size: 15px !important;
      line-height: 18px;
      margin: 6px auto 0;

      .ant-input {
        background: transparent !important;
      }
    }

    .cardTime {
      font-size: 12px;
      line-height: 14px;
      color: var(--r-neutral-foot, #6a7587);
      margin: 2px auto 0;
    }

    .custom-input {
      margin: 6px auto 0;

      .ant-input {
        padding: 0;
      }
    }

    .ant-input {
      text-align: center !important;
      font-size: 15px !important;
      font-weight: 500;
      color: var(--r-neutral-title-1, #192945);
      padding-top: 0;
      transition: none;

      &.active {
        color: var(--r-blue-default, #7084ff) !important;
      }
    }

    .ant-input:focus,
    .ant-input-focused {
      color: var(--r-neutral-title-1);
    }
  }
`;

export const GasPriceDesc = styled.div`
  margin-top: 20px;
  font-size: 13px;
  color: var(--r-neutral-body, #3e495e);
  display: flex;
  flex-direction: column;
  gap: 12px;
  line-height: 16px;
`;

export const GasPriceBold = styled.span`
  font-weight: 500;
  color: var(--r-neutral-title1, #192945);
  font-size: 13px;
`;

export const useExplainGas = ({
  price,
  method,
  value,
}: {
  price: number;
  method: (
    price: number
  ) => Promise<{
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
  }>;
  value: {
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
  };
}) => {
  const [result, setResult] = useState<{
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
  }>(value);

  useEffect(() => {
    let stale = false;
    method(price).then((res) => {
      if (!stale) setResult(res);
    });
    return () => {
      stale = true;
    };
  }, [method, price]);

  return result;
};
