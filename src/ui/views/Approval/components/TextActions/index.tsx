import { Result } from '@rabby-wallet/rabby-security-engine';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Tabs } from 'antd';
import { getActionTypeText } from './utils';
import { ReactComponent as RcIconArrowRight } from 'ui/assets/approval/edit-arrow-right.svg';
import CreateKey from './CreateKey';
import VerifyAddress from './VerifyAddress';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { ReactComponent as IconQuestionMark } from 'ui/assets/sign/question-mark.svg';
import clsx from 'clsx';
import { Copy, Popup } from 'ui/component';
import { NoActionAlert } from '../NoActionAlert/NoActionAlert';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { CommonAction } from '../CommonAction';
import { ActionWrapper } from '../ActionWrapper';
import { Card } from '../Card';
import { OriginInfo } from '../OriginInfo';
import { Divide } from '../Divide';
import { ParsedTextActionData } from '@rabby-wallet/rabby-action';
import { findChain } from '@/utils/chain';
import { Account } from '@/background/service/preference';
import {
  SignMessageHighlightToken,
  tokenizeSignMessageText,
} from '../signMessageHighlighter';
import { Chain } from 'background/service/openapi';
import SignMessageAddressTag from '../SignMessageAddressTag';
import {
  getSignMessageAddressTagType,
  SignMessageAddressData,
  SignMessageAddressDataMap,
} from '../signMessageAddressData';
import { getSignMessageAddressTagLayouts } from '../signMessageAddressTagLayout';

const { TabPane } = Tabs;

export const MessageWrapper = styled.div`
  position: relative;

  .title {
    display: flex;
    justify-content: center;
    margin-top: 12px;
    margin-bottom: 12px;
    overflow: hidden;

    .title-text {
      font-size: 14px;
      color: var(--r-blue-default, #7084ff);
      text-align: center;
      font-weight: 500;
      padding: 0 8px;
      position: relative;

      &::before,
      &::after {
        content: '';
        width: 400px;
        height: 1px;
        border-top: 1px dashed var(--r-neutral-line, rgba(255, 255, 255, 0.1));
        position: absolute;
        top: 50%;
      }

      &::before {
        transform: translateX(-100%);
        left: 0px;
      }

      &::after {
        transform: translateX(100%);
        right: 0px;
      }
    }
  }
  .content {
    position: relative;
    word-break: break-all;
    white-space: pre-wrap;
    font-size: 13px;
    line-height: 16px;
    font-weight: 400;
    color: var(--r-neutral-body, #3e495e);
    height: 250px;
    overflow-y: auto;
    padding: 0 16px 16px;
    /* font-family: 'Roboto Mono'; */
  }
  .message-highlight {
    color: var(--r-blue-default, #7084ff);
    font-weight: 500;
  }
  &.no-action {
    .content {
    }
  }
`;

const AddressTagAnchor = styled.span`
  display: inline-block;
  width: 0;
  height: 16px;
`;

const AddressTagRail = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

type AddressTag = {
  id: string;
  index: number;
  data: SignMessageAddressData;
  danger: boolean;
};

export const SignMessageContent = ({
  text,
  tokens,
  chain,
  addressData,
}: {
  text: string;
  tokens?: SignMessageHighlightToken[];
  chain?: Chain;
  addressData?: SignMessageAddressDataMap;
}) => {
  const resolvedTokens = useMemo(
    () => tokens || tokenizeSignMessageText(text),
    [text, tokens]
  );
  const contentRef = React.useRef<HTMLDivElement>(null);
  const anchorRefs = React.useRef<Record<number, HTMLSpanElement | null>>({});
  const triggerRefs = React.useRef<Record<string, HTMLButtonElement | null>>(
    {}
  );
  const addressTags = useMemo<AddressTag[]>(() => {
    if (!chain) return [];

    return resolvedTokens.flatMap((token, index) => {
      if (token.type !== 'address') return [];
      const address = token.address || token.value;
      const data = addressData?.[address.toLowerCase()];
      if (!data) return [];

      const tagType = getSignMessageAddressTagType(data);
      if (!tagType) return [];

      return [
        {
          id: `${index}-${tagType}`,
          index,
          data,
          danger: tagType === 'danger',
        },
      ];
    });
  }, [addressData, chain, resolvedTokens]);

  React.useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || !addressTags.length) return;

    const updatePosition = () => {
      addressTags.forEach(({ id }) => {
        const trigger = triggerRefs.current[id];
        if (trigger) {
          trigger.style.visibility = 'hidden';
          trigger.style.removeProperty('right');
          trigger.style.removeProperty('top');
        }
      });

      const measured = addressTags.flatMap(({ id, index }) => {
        const anchor = anchorRefs.current[index];
        const trigger = triggerRefs.current[id];
        const addressElement = anchor?.parentElement as HTMLElement | null;
        return anchor && trigger && addressElement
          ? [{ index, anchor, trigger, lineTop: addressElement.offsetTop }]
          : [];
      });
      const layouts = getSignMessageAddressTagLayouts(
        measured.map(({ anchor, lineTop }) => ({
          lineTop,
          anchorHeight: anchor.offsetHeight,
        })),
        {
          contentTop: content.offsetTop,
          scrollTop: content.scrollTop,
          viewportHeight: content.clientHeight,
        }
      );

      measured.forEach(({ trigger }, index) => {
        const layout = layouts[index];
        if (!layout) return;

        trigger.style.right = `${layout.right}px`;
        trigger.style.top = `${layout.top}px`;
        trigger.style.visibility = 'visible';
      });
    };

    updatePosition();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updatePosition);
    observer?.observe(content);
    if (content.parentElement) observer?.observe(content.parentElement);
    content.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);
    return () => {
      observer?.disconnect();
      content.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [addressTags]);

  return (
    <>
      <div className="content" ref={contentRef}>
        {resolvedTokens.map((token, index) => {
          if (token.type === 'text') {
            return (
              <React.Fragment key={`text-${index}`}>
                {token.value}
              </React.Fragment>
            );
          }
          const address = token.address || token.value;
          const resolvedAddressData =
            token.type === 'address'
              ? addressData?.[address.toLowerCase()]
              : undefined;
          const tagType = resolvedAddressData
            ? getSignMessageAddressTagType(resolvedAddressData)
            : null;
          const hasTag = !!(chain && tagType);

          return (
            <span
              key={`${token.type}-${index}`}
              className={clsx('message-highlight', {
                'message-highlight--address': token.type === 'address',
              })}
            >
              {hasTag ? (
                <AddressTagAnchor
                  ref={(element) => {
                    anchorRefs.current[index] = element;
                  }}
                />
              ) : null}
              {token.value}
            </span>
          );
        })}
      </div>
      <AddressTagRail>
        {chain
          ? addressTags.map(({ id, data, danger }) => (
              <SignMessageAddressTag
                key={id}
                chain={chain}
                data={data}
                danger={danger}
                triggerRef={(element) => {
                  triggerRefs.current[id] = element;
                }}
              />
            ))
          : null}
      </AddressTagRail>
    </>
  );
};

const Actions = ({
  data,
  engineResults,
  raw,
  message,
  origin,
  originLogo,
  chainId,
  account,
  messageTokens,
  addressData,
}: {
  data: ParsedTextActionData | null;
  engineResults: Result[];
  raw: string;
  message: string;
  origin: string;
  originLogo?: string;
  chainId?: number;
  account: Account;
  messageTokens?: SignMessageHighlightToken[];
  addressData?: SignMessageAddressDataMap;
}) => {
  const actionName = useMemo(() => {
    return getActionTypeText(data);
  }, [data]);

  const chain = useMemo(() => {
    return (
      findChain({
        id: chainId,
      }) || undefined
    );
  }, [chainId]);

  const { t } = useTranslation();

  const handleViewRawClick = () => {
    Popup.info({
      closable: true,
      height: 520,
      isNew: true,
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

  const isUnknown = !data;

  return (
    <>
      <ActionWrapper isEmptyBody={isUnknown}>
        <Card>
          <OriginInfo
            chain={chain}
            origin={origin}
            originLogo={originLogo}
            engineResults={engineResults}
          />
        </Card>

        <Card>
          <div
            className={clsx('action-header', {
              'is-unknown': isUnknown,
            })}
          >
            <div className="left">
              <span>{actionName}</span>
              {isUnknown && (
                <TooltipWithMagnetArrow
                  inApproval
                  placement="bottom"
                  overlayClassName="rectangle w-[max-content] decode-tooltip"
                  title={
                    <NoActionAlert
                      account={account}
                      data={{
                        origin,
                        text: message,
                      }}
                    />
                  }
                >
                  <IconQuestionMark className="mt-2 ml-2 w-14 text-r-neutral-foot" />
                </TooltipWithMagnetArrow>
              )}
            </div>
            <div className="right">
              <div
                className="flex items-center float-right cursor-pointer text-13 view-raw"
                onClick={handleViewRawClick}
              >
                {t('page.signTx.viewRaw')}
                <ThemeIcon
                  className="icon icon-arrow-right"
                  src={RcIconArrowRight}
                />
              </div>
            </div>
          </div>

          {data?.createKey || data?.verifyAddress || data?.common ? (
            <Divide />
          ) : null}

          {data && (
            <div className="container">
              {data.createKey && (
                <CreateKey
                  data={data.createKey}
                  engineResults={engineResults}
                />
              )}
              {data.verifyAddress && (
                <VerifyAddress
                  data={data.verifyAddress}
                  engineResults={engineResults}
                />
              )}
              {data.common && (
                <CommonAction
                  data={data.common}
                  engineResults={engineResults}
                />
              )}
            </div>
          )}
        </Card>
      </ActionWrapper>

      <Card className="mt-12">
        <MessageWrapper
          className={clsx({
            'no-action': !data,
          })}
        >
          <div className="title">
            <div className="title-text flex items-center gap-4">
              {t('page.signText.title')}
              <Copy data={message} className="w-14 h-14" />
            </div>
          </div>
          <SignMessageContent
            text={message}
            tokens={messageTokens}
            chain={chain}
            addressData={addressData}
          />
        </MessageWrapper>
      </Card>
    </>
  );
};

export default Actions;
