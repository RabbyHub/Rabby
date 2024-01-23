import FallbackImage from '@/ui/component/FallbackSiteLogo';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { openInTab } from '@/ui/utils';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { BasicDappInfo } from '@rabby-wallet/rabby-api/dist/types';
import { Divider, Tooltip } from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import clsx from 'clsx';
import { range } from 'lodash';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { createGlobalStyle } from 'styled-components';
import { ReactComponent as RcIconArrow } from 'ui/assets/dapp-search/cc-arrow.svg';
import { ReactComponent as RcIconStarFill } from 'ui/assets/dapp-search/cc-star-fill.svg';
import { ReactComponent as RcIconStar } from 'ui/assets/dapp-search/cc-star.svg';
import { ReactComponent as RcIconMore } from 'ui/assets/dapp-search/icon-more.svg';

const Wraper = styled.div`
  border: 1px solid transparent;
  position: relative;
  &:hover {
    border: 1px solid var(--r-blue-default, #7084ff);
    box-shadow: 0px 4px 4px 0px rgba(112, 132, 255, 0.12);
  }
`;

const GlobalStyle = createGlobalStyle`
  .dapp-search-card-tooltip {
    .ant-tooltip-inner {
      background-color: var(--r-neutral-black, #000) !important;
      border-radius: 6px;
      padding: 12px !important;
    }

    .ant-tooltip-arrow-content {
      background-color: var(--r-neutral-black, #000) !important;
    }
  }
`;

export const DappCard = ({
  data,
  isFavorite,
  onFavoriteChange,
  className,
  size = 'normal',
}: {
  data: BasicDappInfo;
  isFavorite?: boolean;
  onFavoriteChange?: (v: boolean, info: BasicDappInfo) => void;
  className?: string;
  size?: 'small' | 'normal';
}) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  return (
    <Wraper
      className={clsx(
        'bg-r-neutral-card1 cursor-pointer rounded-[8px]',
        size === 'normal' && 'p-[15px]',
        size === 'small' && 'py-[13px] px-[16px]',
        className
      )}
      ref={ref}
      onClick={() => {
        openInTab(`https://${data.id}`, false);
        matomoRequestEvent({
          category: 'DappsSearch',
          action:
            size === 'small'
              ? 'Dapps_Search_Open_Favorite'
              : 'Dapps_Search_Open',
        });
      }}
    >
      <div className="flex items-center ">
        <div className="flex items-center gap-[12px] min-w-0">
          <FallbackImage
            url={data.logo_url || ''}
            origin={`https://${data.id}`}
            className="rounded-full flex-shrink-0"
            width="32px"
          />
          <div className="min-w-0">
            <div className="text-r-neutral-title1 font-medium text-[16px] leading-[19px] mb-[2px] truncate">
              {data.id}
            </div>
            <div className="text-r-neutral-foot text-[13px] leading-[16px] flex items-center">
              {data.name}
              {data.name && data.collected_list?.length ? (
                <div className="w-[1px] h-[12px] bg-r-neutral-line mx-[6px]"></div>
              ) : null}
              {data.collected_list?.length ? (
                <Tooltip
                  getPopupContainer={() => ref.current || document.body}
                  overlayClassName="rectangle max-w-[360px] dapp-search-card-tooltip"
                  title={
                    <div>
                      <div className="text-[12px] leading-[14px] text-r-neutral-title2 mb-[6px]">
                        {t('page.dappSearch.listBy')}
                      </div>
                      <div className="flex items-center gap-[8px] flex-wrap">
                        {data.collected_list?.map((item) => {
                          return (
                            <div
                              className="flex items-center gap-[6px]"
                              key={item.name}
                            >
                              <img
                                src={item.logo_url}
                                alt={item.name}
                                className="w-[12px] h-[12px] rounded-full"
                              />

                              <span className="text-[12px] leading-[14px] text-r-neutral-title2">
                                {item.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  }
                >
                  <div className="flex items-center gap-[6px]">
                    {data?.collected_list?.slice(0, 6)?.map((item) => {
                      return (
                        <img
                          src={item.logo_url}
                          alt={item.name}
                          className="w-[12px] h-[12px] rounded-full opacity-70"
                          key={item.name}
                        />
                      );
                    })}
                    {(data?.collected_list?.length || 0) > 6 ? (
                      <ThemeIcon
                        src={RcIconMore}
                        className="w-[12px] h-[12px] rounded-full"
                      />
                    ) : null}
                  </div>
                </Tooltip>
              ) : null}
            </div>
          </div>
        </div>
        <div
          className="ml-auto p-[6px] mr-[-6px] cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteChange?.(!isFavorite, data);
          }}
        >
          {isFavorite ? (
            <span className="text-r-blue-default">
              <RcIconStarFill />
            </span>
          ) : (
            <span className="text-r-neutral-foot">
              <RcIconStar />
            </span>
          )}
        </div>
      </div>
      {size === 'normal' && data?.description ? (
        <div className="relative p-[8px] bg-r-neutral-card3 mt-[10px] rounded-[4px]">
          <div className="text-r-neutral-card3 absolute top-[-11px] left-[8px]">
            <RcIconArrow />
          </div>
          <Paragraph
            className="mb-0 text-r-neutral-body text-[14px] leading-[20px]"
            ellipsis={{
              rows: 3,
              expandable: false,
            }}
            title={data.description}
          >
            {data.description}
          </Paragraph>
        </div>
      ) : null}
      <GlobalStyle />
    </Wraper>
  );
};
