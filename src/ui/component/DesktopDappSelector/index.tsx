import React from 'react';
import clsx from 'clsx';
import styled from 'styled-components';
import { Dropdown, Menu } from 'antd';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown.svg';
import { DappSelectItem, INNER_DAPP_LIST } from '@/constant/dappIframe';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import type { InnerDappType } from '@/background/service';
import { useHistory, useLocation } from 'react-router-dom';

type DesktopDappSelectorProps = {
  items: DappSelectItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
  type: InnerDappType;
};

const MenuStyled = styled(Menu)`
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  box-shadow: 0px 8px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--rb-neutral-line, #e0e5ec);
  background: var(--rb-neutral-bg-1, #fff);
  padding: 12px;
  margin: 0;
  gap: 12px;
  width: 324px;
`;

const MenuItemStyled = styled(Menu.Item)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin: 0;
  border-radius: 10px;
  color: var(--rb-neutral-title-1, #192945);
  width: 100%;
  border-radius: 12px;
  border: 0.5px solid var(--rb-neutral-line, #e0e5ec);

  &:hover {
    background: var(--rb-neutral-bg-2, #f2f4f7);
    border-color: transparent;
  }

  &.ant-dropdown-menu-item-selected {
    background: var(--r-blue-light-2, #eef1ff);
    color: var(--rb-neutral-title-1, #192945);
    border-color: transparent;
  }

  &.ant-dropdown-menu-item-selected:hover {
    background: var(--r-blue-light-2, #eef1ff);
    border-color: transparent;
  }
`;

export const DesktopDappSelectorInner: React.FC<DesktopDappSelectorProps> = ({
  items,
  activeId,
  onSelect,
  className,
  type,
}) => {
  const activeItem = React.useMemo(
    () => items.find((item) => item.id === activeId),
    [items, activeId]
  );

  const dispatch = useRabbyDispatch();

  const handleSelect = (id: string) => {
    onSelect(id);
    dispatch.innerDappFrame.setInnerDappId({ type, dappId: id });
  };

  if (!activeItem || items.length <= 1) {
    return null;
  }

  return (
    <Dropdown
      overlay={
        <MenuStyled selectedKeys={[activeId]}>
          {items.map((item) => (
            <MenuItemStyled key={item.id} onClick={() => handleSelect(item.id)}>
              <div className="flex items-center justify-between gap-[16px] w-full min-w-0">
                <div className="flex items-center gap-[8px] min-w-0">
                  {item.icon ? (
                    <img
                      src={item.icon}
                      alt=""
                      className="w-[24px] h-[24px] rounded-full"
                    />
                  ) : null}
                  <div className="flex-col gap-4">
                    <span className="text-[16px] leading-normal font-bold text-rb-neutral-title-1 truncate">
                      {item.name}
                    </span>
                    {item.extraInfo ? (
                      <div className="flex items-center gap-[6px]">
                        <span className="text-[12px] leading-normal text-rb-neutral-foot">
                          {item.extraInfo}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
                {item.value ? (
                  <div className="flex flex-col items-end gap-[2px]">
                    <div className="flex items-center gap-[6px]">
                      <span className="text-[14px] leading-normal font-bold text-rb-neutral-title-1">
                        {item.value}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </MenuItemStyled>
          ))}
        </MenuStyled>
      }
      trigger={['hover']}
      placement="bottomRight"
    >
      <button
        type="button"
        className={clsx(
          'h-[40px] px-[12px] rounded-[16px]',
          'border border-solid border-rb-neutral-line',
          'flex items-center gap-[6px]',
          'bg-rb-neutral-bg-1 hover:bg-rb-neutral-bg-2',
          className
        )}
      >
        {activeItem.icon ? (
          <img
            src={activeItem.icon}
            alt=""
            className="w-[20px] h-[20px] rounded-full"
          />
        ) : null}
        <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-title-1">
          {activeItem.name}
        </span>
        <RcIconDropdown className="text-rb-neutral-foot" />
      </button>
    </Dropdown>
  );
};

export const DesktopDappSelector = (
  props: Partial<DesktopDappSelectorProps> & { type: InnerDappType }
) => {
  const activeId = useRabbySelector((s) => s.innerDappFrame[props.type]);
  const dappList = React.useMemo(
    () => INNER_DAPP_LIST[props.type?.toUpperCase()] || [],
    [props.type]
  );
  const dispatch = useRabbyDispatch();
  const history = useHistory();
  const location = useLocation();

  const onSelect = React.useCallback(
    (id: string) => {
      const nextDapp = dappList.find((item) => item.id === id);
      if (!nextDapp) {
        return;
      }
      history.replace(`/desktop/${props.type}`);
      props?.onSelect?.(id);
    },
    [props.type, props.onSelect, dispatch]
  );
  return (
    <DesktopDappSelectorInner
      {...props}
      activeId={activeId}
      items={dappList}
      onSelect={onSelect}
    />
  );
};
