import { Chain } from '@debank/common';
import { OpenApiService } from '@debank/rabby-api';
import React, { ReactNode } from 'react';
import { ApproveToken } from './ApproveToken';
import { CommonSign } from './CommonSign';
import { ListNFT } from './ListNFT';

interface SignTypedDataExplainProps {
  data?: Awaited<ReturnType<OpenApiService['explainTypedData']>>;
  chain?: Chain;
  message?: ReactNode;
}

export const SignTypedDataExplain = ({
  data,
  chain,
  message,
}: SignTypedDataExplainProps) => {
  if (!data) {
    return <div className="h-[360px]">{message}</div>;
  }
  if (data.type_list_nft) {
    // todo
    return <ListNFT detail={data?.type_list_nft} />;
  }
  if (data.type_token_approval) {
    return (
      <ApproveToken
        detail={data?.type_token_approval}
        chainEnum={chain?.enum}
      />
    );
  }
  if (data.type_common_sign) {
    return (
      <CommonSign detail={data.type_common_sign} chainEnum={chain?.enum}>
        <div className="section-title mt-[20px]">Message</div>
        <div className="h-[280px]">{message}</div>
      </CommonSign>
    );
  }

  return <div className="h-[360px]">{message}</div>;
};
