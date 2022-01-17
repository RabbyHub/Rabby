import { useInfiniteScroll } from 'ahooks';
import { Button, message } from 'antd';
import { TokenItem, TxHistoryResult } from 'background/service/openapi';
import ClipboardJS from 'clipboard';
import { last } from 'lodash';
import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import IconCopy from 'ui/assets/address-copy.png';
import IconSuccess from 'ui/assets/success.svg';
import { TokenWithChain } from 'ui/component';
import { splitNumberByStep, useWallet } from 'ui/utils';
import ChainIcon from '../NFT/ChainIcon';
import { HistoryItem } from './HistoryItem';
import { Loading } from './Loading';
import './style.less';

const PAGE_COUNT = 100;
const ellipsis = (text: string) => {
  return text.replace(/^(.{6})(.*)(.{4})$/, '$1...$3');
};

const TokenDetail = ({ token }: { token: TokenItem }) => {
  const wallet = useWallet();
  const { t } = useTranslation();

  const ref = useRef<HTMLDivElement | null>(null);

  const fetchData = async (startTime = 0) => {
    const { address } = await wallet.syncGetCurrentAccount()!;

    const res: TxHistoryResult = await wallet.openapi.listTxHisotry({
      id: address,
      chain_id: token.chain,
      start_time: startTime,
      page_count: PAGE_COUNT,
      token_id: token.id,
    });
    const { project_dict, cate_dict, token_dict, history_list: list } = res;
    const displayList = list
      .map((item) => ({
        ...item,
        projectDict: project_dict,
        cateDict: cate_dict,
        tokenDict: token_dict,
      }))
      .sort((v1, v2) => v2.time_at - v1.time_at);
    return {
      last: last(displayList)?.time_at,
      list: displayList,
    };
  };

  const { data, loading, loadingMore } = useInfiniteScroll(
    (d) => fetchData(d?.last),
    {
      target: ref,
      isNoMore: (d) => {
        return !d?.list.length || (d?.list.length || 0) % PAGE_COUNT != 0;
      },
    }
  );

  const handleCopy = (text) => {
    const clipboard = new ClipboardJS('.token-detail', {
      text: function () {
        return text;
      },
    });

    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  const isEmpty = (data?.list?.length || 0) <= 0 && !loading;

  const isShowAddress = /^0x.{40}$/.test(token.id);

  const history = useHistory();
  const goToSend = useCallback(() => {
    history.push(`/send-token?token=${token?.chain}:${token?.id}`);
  }, [history, token]);

  return (
    <div className="token-detail" ref={ref}>
      <div className="token-detail-header">
        <div className="flex items-center mb-20">
          <div className="flex items-center mr-8">
            <TokenWithChain
              token={token}
              hideConer
              width="24px"
              height="24px"
            ></TokenWithChain>
            <div className="token-symbol ml-8">{token.symbol}</div>
          </div>
          {isShowAddress && (
            <div className="address">
              <ChainIcon chain={token.chain}></ChainIcon>
              {ellipsis(token.id)}
              <img
                src={IconCopy}
                className="w-14 cursor-pointer"
                alt=""
                onClick={() => {
                  handleCopy(token.id);
                }}
              />
            </div>
          )}
        </div>
        <div className="balance">
          <div className="balance-title">My balance</div>
          <div className="balance-content">
            <div className="balance-value">
              {splitNumberByStep((token.amount || 0)?.toFixed(4))}
            </div>
            <div className="balance-value-usd">
              ≈ $
              {splitNumberByStep((token.amount * token.price || 0)?.toFixed(2))}
            </div>
          </div>
        </div>
      </div>
      <div className="token-detail-body token-txs-history">
        {data?.list.map((item) => (
          <HistoryItem
            data={item}
            projectDict={item.projectDict}
            cateDict={item.cateDict}
            tokenDict={item.tokenDict}
            key={item.id}
          ></HistoryItem>
        ))}
        {(loadingMore || loading) && <Loading count={5} active />}
        {isEmpty && (
          <div className="token-txs-history__empty">
            <img className="no-data" src="./images/nodata-tx.png" />
            <p className="text-14 text-gray-content mt-12">
              {t('No Transactions')}
            </p>
          </div>
        )}
      </div>
      <div className="token-detail-footer">
        <Button
          type="primary"
          size="large"
          className="w-[172px]"
          onClick={goToSend}
        >
          {t('Send')}
        </Button>
      </div>
    </div>
  );
};

export default TokenDetail;
