import { useInfiniteScroll } from 'ahooks';
import { Button, message, Tooltip } from 'antd';
import { TokenItem, TxHistoryResult } from 'background/service/openapi';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import { last } from 'lodash';
import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import IconCopy from 'ui/assets/swap/copy.svg';
import IconPlus from 'ui/assets/plus.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconTrash from 'ui/assets/trash.svg';
import { Modal, Popup, TokenWithChain } from 'ui/component';
import { splitNumberByStep, useWallet, useWalletOld } from 'ui/utils';
import { getChain } from 'utils';
import ChainIcon from '../NFT/ChainIcon';
import { HistoryItem } from './HistoryItem';
import { Loading } from './Loading';
import './style.less';
import { RABBY_SWAP_ROUTER } from '@/constant';

const PAGE_COUNT = 10;
const ellipsis = (text: string) => {
  return text.replace(/^(.{6})(.*)(.{4})$/, '$1...$3');
};

interface TokenDetailProps {
  onClose?(): void;
  token: TokenItem;
  addToken(token: TokenItem): void;
  removeToken(token: TokenItem): void;
  variant?: 'add';
}

const TokenDetail = ({
  token,
  addToken,
  removeToken,
  variant,
}: TokenDetailProps) => {
  const wallet = useWalletOld();
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
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              Copied
            </div>
            <div className="text-white">{text}</div>
          </div>
        ),
      });
      clipboard.destroy();
    });
  };

  const handleRemove = async (token: TokenItem) => {
    const { destroy } = Modal.info({
      closable: true,
      className: 'token-detail-remove-modal',
      width: 320,
      content: (
        <div>
          <div className="mb-[16px]">
            This will only stop the token from being visible in Rabby and will
            not affect its balance
          </div>
          <Button
            type="primary"
            size="large"
            className="w-[170px]"
            onClick={async () => {
              await removeToken(token);
              destroy();
            }}
          >
            Remove
          </Button>
        </div>
      ),
    });
  };

  const isEmpty = (data?.list?.length || 0) <= 0 && !loading;

  const isShowAddress = /^0x.{40}$/.test(token.id);

  const history = useHistory();
  const goToSend = useCallback(() => {
    history.push(
      `/send-token?rbisource=tokendetail&token=${token?.chain}:${token?.id}`
    );
  }, [history, token]);

  const goToReceive = useCallback(() => {
    history.push(
      `/receive?rbisource=tokendetail&chain=${
        getChain(token?.chain)?.enum
      }&token=${token?.symbol}`
    );
  }, [history, token]);

  const goToSwap = useCallback(() => {
    history.push(
      `/swap?rbisource=tokendetail&chain=${token?.chain}&payTokenId=${token?.id}`
    );
  }, [history, token]);

  return (
    <div className="token-detail" ref={ref}>
      <div className="token-detail-header border-b-0 pb-24">
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
          <div className="address">
            <ChainIcon chain={token.chain}></ChainIcon>
            {isShowAddress ? (
              <>
                {ellipsis(token.id)}
                <img
                  src={IconCopy}
                  className="w-14 cursor-pointer"
                  alt=""
                  onClick={() => {
                    handleCopy(token.id);
                  }}
                />
              </>
            ) : (
              token?.name
            )}
          </div>
          {!token.is_core && variant !== 'add' ? (
            <div
              className="remove"
              onClick={() => {
                handleRemove(token);
              }}
            >
              <img src={IconTrash} alt="" />
            </div>
          ) : null}
        </div>
        <div className="balance">
          <div className="balance-title">{token?.name} balance</div>
          <div className="balance-content overflow-hidden">
            <div
              className="balance-value truncate"
              title={splitNumberByStep((token.amount || 0)?.toFixed(4))}
            >
              {splitNumberByStep((token.amount || 0)?.toFixed(4))}
            </div>
            <div
              className="balance-value-usd truncate"
              title={splitNumberByStep(
                (token.amount * token.price || 0)?.toFixed(2)
              )}
            >
              ≈ $
              {splitNumberByStep((token.amount * token.price || 0)?.toFixed(2))}
            </div>
          </div>
        </div>
        {variant === 'add' && (
          <>
            {token.is_core ? (
              <div className="alert mb-[24px]">
                This token is supported by default. It will show up in your
                wallet as long as balance &gt; 0.
              </div>
            ) : (
              <div className="alert alert-primary mb-[24px]">
                This token is not verified. Please do your <br />
                own research before you add it.
                {token.amount > 0 ? (
                  <div
                    className="alert-primary-btn"
                    onClick={() => {
                      addToken(token);
                    }}
                  >
                    <img src={IconPlus} alt="" />
                  </div>
                ) : (
                  <Tooltip
                    title="Cannot add a token with 0 balance"
                    placement="bottomLeft"
                    overlayClassName={clsx('rectangle')}
                  >
                    <div className="alert-primary-btn opacity-20 cursor-not-allowed">
                      <img src={IconPlus} alt="" />
                    </div>
                  </Tooltip>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex flex-row justify-between mt-24">
          <Tooltip
            overlayClassName="rectangle token_swap__tooltip"
            placement="topLeft"
            title={t('The token on this chain is not supported for swap')}
            visible={
              token.is_core &&
              RABBY_SWAP_ROUTER[getChain(token?.chain)?.enum || '']
                ? false
                : undefined
            }
          >
            <Button
              type="primary"
              size="large"
              onClick={goToSwap}
              disabled={
                !token.is_core ||
                !RABBY_SWAP_ROUTER[getChain(token?.chain)?.enum || '']
              }
              style={{
                width: 114,
              }}
            >
              Swap
            </Button>
          </Tooltip>

          <Button
            type="primary"
            ghost
            size="large"
            className="w-[114px] rabby-btn-ghost"
            onClick={goToSend}
          >
            {t('Send')}
          </Button>
          <Button
            type="primary"
            ghost
            size="large"
            className="w-[114px] rabby-btn-ghost"
            onClick={goToReceive}
          >
            {t('Receive')}
          </Button>
        </div>
      </div>

      <div className="token-detail-body token-txs-history pt-[0px]">
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
    </div>
  );
};

export default TokenDetail;
