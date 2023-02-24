import { Chain } from '@debank/common';
import { ExplainTypedDataResponse } from '@debank/rabby-api/dist/types';
import React, { ReactNode } from 'react';
import { ApproveToken } from './ApproveToken';
import { CommonSign } from './CommonSign';
import { ListNFT } from './ListNFT';

interface SignTypedDataExplainProps {
  data?: ExplainTypedDataResponse;
  chain?: Chain;
  message?: ReactNode;
}

export const SignTypedDataExplain = ({
  data,
  chain,
  message,
}: SignTypedDataExplainProps) => {
  if (data?.type_list_nft) {
    return <ListNFT detail={data?.type_list_nft} chainEnum={chain?.enum} />;
  }
  if (data?.type_token_approval) {
    return (
      <ApproveToken
        detail={data?.type_token_approval}
        chainEnum={chain?.enum}
      />
    );
  }
  if (data?.type_common_sign) {
    return (
      <CommonSign detail={data.type_common_sign} chainEnum={chain?.enum}>
        <div className="section-title mt-[20px]">Message</div>
        <div className="h-[280px]">{message}</div>
      </CommonSign>
    );
  }

  return <div className="h-[360px]">{message}</div>;
};
