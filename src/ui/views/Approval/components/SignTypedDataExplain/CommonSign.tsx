import { NameAndAddress } from '@/ui/component';
import LessPalette from '@/ui/style/var-defs';
import { CHAINS_ENUM } from '@debank/common';
import { OpenApiService } from '@debank/rabby-api';
import { ExplainTxResponse } from '@debank/rabby-api/dist/types';
import React from 'react';
import styled from 'styled-components';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';

const Wraper = styled.div`
  .explain-card {
    padding: 16px 16px 20px 16px;

    background: #ffffff;
    border-radius: 6px;
  }

  .title {
    font-weight: 500;
    font-size: 20px;
    line-height: 23px;
    color: ${LessPalette['@color-title']};
    margin-bottom: 16px;
  }
  .detail-list {
    &-item {
      display: flex;
      align-items: center;
      gap: 16px;
      &:not(:last-child) {
        margin-bottom: 16px;
      }

      &-label {
        font-weight: 400;
        font-size: 14px;
        line-height: 16px;
        color: ${LessPalette['@color-body']};
      }
      &-value {
        margin-left: auto;
        font-weight: 500;
        font-size: 14px;
        line-height: 16px;
        color: ${LessPalette['@color-title']};
        .list-on-address {
          .address {
            font-weight: 400;
            font-size: 14px;
            line-height: 16px;
            color: ${LessPalette['@color-comment-1']} !important;
          }
        }
        .buyer-address {
          .address {
            font-weight: 500;
            font-size: 14px;
            line-height: 16px;
            text-align: right;
            color: ${LessPalette['@color-title']} !important;
          }
        }
      }
    }
  }
`;

interface CommonSignProps {
  detail: NonNullable<
    Awaited<ReturnType<OpenApiService['explainTypedData']>>['type_common_sign']
  >;
  chainEnum?: CHAINS_ENUM;
}

export const CommonSign = ({
  detail,
  chainEnum,
  children,
}: React.PropsWithChildren<CommonSignProps>) => {
  const handleProtocolLogoLoadFailed = function (
    e: React.SyntheticEvent<HTMLImageElement>
  ) {
    e.currentTarget.src = IconUnknownProtocol;
  };
  return (
    <Wraper>
      <div className="explain-card">
        <div className="title">Contract Interaction</div>
        <div className="detail-list">
          <div className="detail-list-item">
            <div className="detail-list-item-label flex-shrink-0">
              Interact with
            </div>

            <div className="detail-list-item-value flex items-center gap-[6px] overflow-hidden">
              <img
                src={detail?.contract_protocol_logo_url || IconUnknownProtocol}
                className="w-[16px] h-[16px] rounded-full"
                onError={handleProtocolLogoLoadFailed}
              />
              <span className="truncate">
                {detail.contract_protocol_name || 'Unknown Protocol'}
              </span>
              <NameAndAddress
                className="list-on-address ml-auto flex-shrink-0"
                address={detail.contract}
                nameClass="max-90"
                noNameClass="no-name"
                openExternal
                chainEnum={chainEnum}
              />
            </div>
          </div>
        </div>
      </div>
      {children}
    </Wraper>
  );
};
