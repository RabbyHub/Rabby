import React from 'react';
import clsx from 'clsx';
import { useWallet } from '@/ui/utils';
import { copyAddress } from '@/ui/utils/clipboard';
import { ellipsisAddress } from '@/ui/utils/address';
import { RcCreateAddressSuccessCopyIcon } from '@/ui/assets/add-address';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { CreateAddressSuccessAddress } from './useCreateAddress';

export const normalizeSuccessAddresses = (state: {
  addresses?: CreateAddressSuccessAddress[];
  address?: string;
  alias?: string;
}): CreateAddressSuccessAddress[] => {
  if (state.addresses?.length) {
    return state.addresses;
  }

  if (state.address) {
    return [
      {
        address: state.address,
        alias: state.alias || '',
      },
    ];
  }

  return [];
};

export const useEditableSuccessAddresses = (
  addresses: CreateAddressSuccessAddress[]
) => {
  const wallet = useWallet();
  const [items, setItems] = React.useState<CreateAddressSuccessAddress[]>(
    addresses
  );
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const committedAliasRef = React.useRef<Record<string, string>>({});

  React.useEffect(() => {
    setItems(addresses);
    committedAliasRef.current = Object.fromEntries(
      addresses.map((item) => [item.address.toLowerCase(), item.alias || ''])
    );
  }, [addresses]);

  React.useEffect(() => {
    let mounted = true;

    Promise.all(
      addresses.map(async (item) => {
        if (item.alias) {
          return item;
        }

        const alias = await wallet.getAlianName(item.address);
        return {
          ...item,
          alias: alias || '',
        };
      })
    ).then((nextItems) => {
      if (!mounted) {
        return;
      }

      setItems(nextItems);
      committedAliasRef.current = Object.fromEntries(
        nextItems.map((item) => [item.address.toLowerCase(), item.alias || ''])
      );
    });

    return () => {
      mounted = false;
    };
  }, [addresses, wallet]);

  React.useLayoutEffect(() => {
    const firstAddress = addresses[0]?.address?.toLowerCase();
    if (!firstAddress) {
      return;
    }

    const input = inputRefs.current[firstAddress];
    if (!input) {
      return;
    }

    input.focus();
    const length = input.value.length;
    input.setSelectionRange(length, length);
  }, [addresses]);

  const commitAlias = React.useCallback(
    async (address: string) => {
      const addressKey = address.toLowerCase();
      const item = items.find(
        (currentItem) => currentItem.address.toLowerCase() === addressKey
      );
      if (!item) {
        return;
      }

      const committedAlias = committedAliasRef.current[addressKey] || '';
      const nextAlias = item.alias.trim() || committedAlias;
      if (!nextAlias || nextAlias === committedAlias) {
        setItems((prev) =>
          prev.map((currentItem) =>
            currentItem.address.toLowerCase() === addressKey
              ? {
                  ...currentItem,
                  alias: committedAlias,
                }
              : currentItem
          )
        );
        return;
      }

      await wallet.updateAlianName(addressKey, nextAlias);
      committedAliasRef.current[addressKey] = nextAlias;
      setItems((prev) =>
        prev.map((currentItem) =>
          currentItem.address.toLowerCase() === addressKey
            ? {
                ...currentItem,
                alias: nextAlias,
              }
            : currentItem
        )
      );
    },
    [items, wallet]
  );

  const commitAllAliases = React.useCallback(async () => {
    await Promise.all(items.map((item) => commitAlias(item.address)));
  }, [commitAlias, items]);

  return {
    items,
    setItems,
    inputRefs,
    commitAlias,
    commitAllAliases,
  };
};

export const SuccessAddressCards = ({
  items,
  setItems,
  inputRefs,
  onCommitAlias,
  listClassName,
  cardClassName,
  aliasWrapClassName,
  aliasInputClassName,
  addressRowClassName,
  addressTextClassName,
  copyButtonClassName,
  copyIconClassName,
}: {
  items: CreateAddressSuccessAddress[];
  setItems: React.Dispatch<React.SetStateAction<CreateAddressSuccessAddress[]>>;
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onCommitAlias: (address: string) => void | Promise<void>;
  listClassName?: string;
  cardClassName?: string;
  aliasWrapClassName?: string;
  aliasInputClassName?: string;
  addressRowClassName?: string;
  addressTextClassName?: string;
  copyButtonClassName?: string;
  copyIconClassName?: string;
}) => {
  const virtuosoRef = React.useRef<VirtuosoHandle>(null);
  const [pendingFocusAddress, setPendingFocusAddress] = React.useState('');
  const listHeight = React.useMemo(() => {
    const estimatedHeight = Math.max(items.length * 76 - 12, 0);
    return items.length > 6 ? '100%' : `${estimatedHeight}px`;
  }, [items.length]);

  React.useLayoutEffect(() => {
    if (!pendingFocusAddress) {
      return;
    }

    const input = inputRefs.current[pendingFocusAddress];
    if (!input) {
      return;
    }

    input.focus();
    const length = input.value.length;
    input.setSelectionRange(length, length);
    setPendingFocusAddress('');
  }, [inputRefs, items, pendingFocusAddress]);

  const renderCard = React.useCallback(
    (item: CreateAddressSuccessAddress, index: number) => {
      const addressKey = item.address.toLowerCase();

      return (
        <div
          key={item.address}
          className={clsx(index < items.length - 1 && 'pb-[12px]')}
        >
          <div className={cardClassName}>
            <div className={aliasWrapClassName}>
              <input
                ref={(node) => {
                  inputRefs.current[addressKey] = node;
                }}
                value={item.alias}
                onChange={(e) => {
                  const nextAlias = e.target.value;
                  setItems((prev) =>
                    prev.map((currentItem) =>
                      currentItem.address === item.address
                        ? {
                            ...currentItem,
                            alias: nextAlias,
                          }
                        : currentItem
                    )
                  );
                }}
                onBlur={() => {
                  onCommitAlias(item.address);
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') {
                    return;
                  }
                  onCommitAlias(item.address);
                  if (index < items.length - 1) {
                    const nextAddress = items[index + 1].address.toLowerCase();
                    virtuosoRef.current?.scrollToIndex({
                      index: index + 1,
                      align: 'center',
                    });
                    setPendingFocusAddress(nextAddress);
                  }
                }}
                className={aliasInputClassName}
              />
            </div>

            <div className={addressRowClassName}>
              <div className={addressTextClassName}>
                {ellipsisAddress(item.address)}
              </div>
              <button
                type="button"
                className={copyButtonClassName}
                onClick={() => copyAddress(item.address)}
              >
                <RcCreateAddressSuccessCopyIcon className={copyIconClassName} />
              </button>
            </div>
          </div>
        </div>
      );
    },
    [
      addressRowClassName,
      addressTextClassName,
      aliasInputClassName,
      aliasWrapClassName,
      cardClassName,
      copyButtonClassName,
      copyIconClassName,
      inputRefs,
      items,
      onCommitAlias,
      setItems,
    ]
  );

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={items}
      className={listClassName}
      style={{ height: listHeight }}
      itemContent={(index, item) => renderCard(item, index)}
    />
  );
};
