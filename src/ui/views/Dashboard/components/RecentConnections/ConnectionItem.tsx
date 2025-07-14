import { ConnectedSite } from '@/background/service/permission';
import { FallbackSiteLogo } from '@/ui/component';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChainByEnum } from '@/utils/chain';
import clsx from 'clsx';
import React, { forwardRef, memo } from 'react';
import { ReactComponent as RcIconDisconnect } from 'ui/assets/icon-disconnect.svg';
import { ReactComponent as RcIconPinned } from 'ui/assets/icon-pinned.svg';
import { ReactComponent as RcIconPinnedFill } from 'ui/assets/icon-pinned-fill.svg';
import { Avatar, Card, Flex, IconButton, Text } from '@radix-ui/themes';
import {
  LucideEllipsisVertical,
  LucideGlobe,
  LucideLink2Off,
  LucidePin,
  LucidePinOff,
} from 'lucide-react';
import { Drawer } from 'vaul';

interface ConnectionItemProps {
  className?: string;
  item: ConnectedSite;
  onClick?(): void;
  onRemove?(origin: string): void;
  onPin?(item: ConnectedSite): void;
}

export const Item = memo(
  forwardRef(
    (
      {
        item,
        onClick,
        onRemove,
        onPin,
        className,
        ...rest
      }: ConnectionItemProps & Record<string, any>,
      ref: React.ForwardedRef<any>
    ) => {
      const chainItem = findChainByEnum(item.chain);
      return (
        <>
          <Card>
            <Flex align={'center'} gap={'4'} maxWidth={'100%'}>
              <Flex position={'relative'} align={'center'} gap={'2'}>
                <FallbackSiteLogo
                  url={item.icon}
                  origin={item.origin}
                  width="24px"
                  style={{
                    borderRadius: '50%',
                  }}
                />
                <Avatar
                  // className={'absolute -bottom-0.5 right-2'}
                  size={'1'}
                  fallback={''}
                  src={chainItem?.logo}
                  alt={chainItem?.name}
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-4px',
                    width: '16px',
                    height: '16px',
                  }}
                />
                {/*<img
                  className="connect-chain absolute -bottom-0.5 -right-1 z-10 w-3 h-3 rounded-full"
                  src={chainItem?.logo}
                  alt={chainItem?.name}
                />*/}
              </Flex>

              <Flex
                align={'center'}
                justify={'between'}
                gap={'4'}
                width={'100%'}
              >
                <Text
                  truncate
                  className={'hover:underline cursor-pointer w-full'}
                  size={'2'}
                  onClick={onClick}
                >
                  {item.origin}
                </Text>
              </Flex>
              <Flex flexGrow={'1'} align={'center'} gap={'2'}>
                <IconButton
                  variant={'ghost'}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPin?.(item);
                  }}
                >
                  {item.isTop ? (
                    <LucidePinOff size={16} />
                  ) : (
                    <LucidePin size={16} />
                  )}
                  {/*<ThemeIcon
                    src={item.isTop ? RcIconPinnedFill : RcIconPinned}
                    className={clsx('pin-website', item.isTop && 'is-active')}
                  />*/}
                </IconButton>
                <IconButton
                  variant={'soft'}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onRemove) {
                      onRemove(item.origin);
                    }
                  }}
                >
                  <LucideLink2Off size={16} />
                  {/*<ThemeIcon
                    className="icon-close"
                    src={RcIconDisconnect}
                    viewBox="0 0 16 16"
                  />*/}
                </IconButton>

                <Drawer.Root>
                  <Drawer.Trigger
                    className={'appearance-none bg-transparent border-0 p-0'}
                  >
                    <IconButton variant={'soft'}>
                      <LucideEllipsisVertical size={16} />
                    </IconButton>
                  </Drawer.Trigger>
                  <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40" />
                    <Drawer.Content className="bg-gray-100 flex flex-col rounded-t-[10px] mt-24 h-fit fixed bottom-0 left-0 right-0 outline-none">
                      <div className="p-4 bg-blackA11 rounded-t-[10px] flex-1">
                        <div
                          aria-hidden
                          className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300"
                        />
                        <div className="mx-auto">
                          <Drawer.Title className="font-medium text-center">
                            <Text>Options</Text>
                          </Drawer.Title>
                          <Flex direction={'column'} gap={'3'}>
                            <Flex
                              align={'center'}
                              gap={'9'}
                              p={'8'}
                              style={{ padding: '8px' }}
                            >
                              <FallbackSiteLogo
                                url={item.icon}
                                origin={item.origin}
                                width="24px"
                                style={{
                                  borderRadius: '50%',
                                }}
                              />
                              <Flex
                                direction={'column'}
                                align={'start'}
                                gap={'1'}
                              >
                                <Text>Visit Connected App</Text>
                                <Text truncate size={'1'}>
                                  {item.origin}
                                </Text>
                              </Flex>
                            </Flex>
                            <Flex
                              align={'center'}
                              gapX={'8'}
                              style={{
                                padding: '16px',
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onPin?.(item);
                              }}
                            >
                              <IconButton>
                                {item.isTop ? (
                                  <LucidePinOff />
                                ) : (
                                  <LucidePin size={20} />
                                )}
                              </IconButton>
                              <Flex
                                direction={'column'}
                                align={'center'}
                                gap={'1'}
                              >
                                <Text>
                                  {item.isTop
                                    ? 'UnPin this site'
                                    : 'Pin this site'}
                                </Text>
                              </Flex>
                            </Flex>
                            <Flex
                              align={'center'}
                              gap={'4'}
                              style={{
                                padding: '8px',
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onRemove) {
                                  onRemove(item.origin);
                                }
                              }}
                            >
                              <IconButton variant={'soft'}>
                                <LucideLink2Off size={16} />
                              </IconButton>
                              <Flex
                                direction={'column'}
                                align={'center'}
                                gap={'1'}
                              >
                                <Text>Remove this connected site</Text>
                              </Flex>
                            </Flex>
                          </Flex>
                        </div>
                      </div>
                    </Drawer.Content>
                  </Drawer.Portal>
                </Drawer.Root>
              </Flex>
            </Flex>
          </Card>

          {/*<div
            className={clsx('item', className)}
            ref={ref}
            onClick={onClick}
            {...rest}
          >
            <div className="logo cursor-pointer">
              <FallbackSiteLogo
                url={item.icon}
                origin={item.origin}
                width="24px"
                style={{
                  borderRadius: '50%',
                }}
              />
              <TooltipWithMagnetArrow
                title={chainItem?.name}
                className="rectangle w-[max-content]"
              >
                <img
                  className="connect-chain"
                  src={chainItem?.logo}
                  alt={chainItem?.name}
                />
              </TooltipWithMagnetArrow>
            </div>
            <div className="flex items-center gap-[4px] min-w-0">
              <div className="item-content flex-1 truncate">{item.origin}</div>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPin?.(item);
                }}
              >
                <ThemeIcon
                  src={item.isTop ? RcIconPinnedFill : RcIconPinned}
                  className={clsx('pin-website', item.isTop && 'is-active')}
                />
              </div>
            </div>
            <div
              className="item-extra"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onRemove) {
                  onRemove(item.origin);
                }
              }}
            >
              <ThemeIcon
                className="icon-close"
                src={RcIconDisconnect}
                viewBox="0 0 16 16"
              />
            </div>
          </div>*/}
        </>
      );
    }
  )
);
