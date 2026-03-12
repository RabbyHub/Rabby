import React from 'react';
import clsx from 'clsx';
import { useWallet } from '@/ui/utils';
import { copyAddress } from '@/ui/utils/clipboard';
import { ellipsisAddress } from '@/ui/utils/address';
import { RcCreateAddressSuccessCopyIcon } from '@/ui/assets/add-address';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { CreateAddressSuccessAddress } from './useCreateAddress';
import {
  AccountItemAddress,
  AccountItemInput,
  AccountItemInputWrapper,
  AccountItemWrapper,
} from '../NewUserImport/AccountItem';
import { Input, InputRef } from 'antd';

type SuccessAddressCommitResult = CreateAddressSuccessAddress | null;

type SuccessAddressCommitAlias = (
  address: string
) => SuccessAddressCommitResult | Promise<SuccessAddressCommitResult>;

const useEditableSuccessAddresses = (
  addresses: CreateAddressSuccessAddress[]
) => {
  const wallet = useWallet();
  const [items, setItems] = React.useState<CreateAddressSuccessAddress[]>(
    addresses
  );
  const inputRefs = React.useRef<Record<string, InputRef | null>>({});
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

    input.focus({ cursor: 'end' });
  }, [addresses]);

  const commitAlias = React.useCallback(
    async (address: string) => {
      const addressKey = address.toLowerCase();
      const item = items.find(
        (currentItem) => currentItem.address.toLowerCase() === addressKey
      );
      if (!item) {
        return null;
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

        return {
          ...item,
          alias: committedAlias,
        };
      }

      await wallet.updateAlianName(addressKey, nextAlias);
      committedAliasRef.current[addressKey] = nextAlias;

      const nextItem = {
        ...item,
        alias: nextAlias,
      };

      setItems((prev) =>
        prev.map((currentItem) =>
          currentItem.address.toLowerCase() === addressKey
            ? nextItem
            : currentItem
        )
      );

      return nextItem;
    },
    [items, wallet]
  );

  const commitAllAliases = React.useCallback(async () => {
    const nextItems = await Promise.all(
      items.map(async (item) => (await commitAlias(item.address)) || item)
    );

    return nextItems;
  }, [commitAlias, items]);

  return {
    items,
    setItems,
    inputRefs,
    commitAlias,
    commitAllAliases,
  };
};

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

const SuccessAddressCard = ({
  item,
  index,
  isLast,
  inputRefs,
  onAliasChange,
  onCommitAlias,
  onEnterNext,
}: {
  item: CreateAddressSuccessAddress;
  index: number;
  isLast: boolean;
  inputRefs: React.MutableRefObject<Record<string, InputRef | null>>;
  onAliasChange: (address: string, alias: string) => void;
  onCommitAlias: SuccessAddressCommitAlias;
  onEnterNext?: () => void;
}) => {
  const addressKey = item.address.toLowerCase();
  const handleAliasChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onAliasChange(item.address, e.target.value);
    },
    [item.address, onAliasChange]
  );

  const handleCommitAlias = React.useCallback(() => {
    void onCommitAlias(item.address);
  }, [item.address, onCommitAlias]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') {
        return;
      }

      void onCommitAlias(item.address);
      onEnterNext?.();
    },
    [item.address, onCommitAlias, onEnterNext]
  );

  return (
    <AccountItemWrapper className={clsx(!isLast && 'pb-[12px]')}>
      <AccountItemInputWrapper>
        <AccountItemInput
          autoFocus={index === 0}
          ref={(node) => {
            inputRefs.current[addressKey] = node;
          }}
          value={item.alias}
          onChange={handleAliasChange}
          onBlur={handleCommitAlias}
          onKeyDown={handleKeyDown}
        />
      </AccountItemInputWrapper>
      <AccountItemAddress>{ellipsisAddress(item.address)}</AccountItemAddress>
    </AccountItemWrapper>
  );
};

export type SuccessAddressCardsRef = {
  commitAllAliases: () => Promise<CreateAddressSuccessAddress[]>;
};

export const SuccessAddressCards = React.forwardRef<
  SuccessAddressCardsRef,
  {
    addresses: CreateAddressSuccessAddress[];
  }
>(function SuccessAddressCards({ addresses }, ref) {
  const {
    items,
    setItems,
    inputRefs,
    commitAlias,
    commitAllAliases,
  } = useEditableSuccessAddresses(addresses);
  const virtuosoRef = React.useRef<VirtuosoHandle>(null);
  const [pendingFocusAddress, setPendingFocusAddress] = React.useState('');
  const handleAliasChange = React.useCallback(
    (address: string, alias: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.address === address
            ? {
                ...item,
                alias,
              }
            : item
        )
      );
    },
    [setItems]
  );

  React.useImperativeHandle(
    ref,
    () => ({
      commitAllAliases,
    }),
    [commitAllAliases]
  );

  React.useLayoutEffect(() => {
    if (!pendingFocusAddress) {
      return;
    }

    const input = inputRefs.current[pendingFocusAddress];
    if (!input) {
      return;
    }

    input.focus({ cursor: 'end' });
    setPendingFocusAddress('');
  }, [inputRefs, items, pendingFocusAddress]);

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={items}
      className="min-h-0 h-full"
      style={{ height: '100%' }}
      itemContent={(index, item) => {
        const nextAddress = items[index + 1]?.address.toLowerCase();

        return (
          <SuccessAddressCard
            item={item}
            index={index}
            isLast={index === items.length - 1}
            inputRefs={inputRefs}
            onAliasChange={handleAliasChange}
            onCommitAlias={commitAlias}
            onEnterNext={
              nextAddress
                ? () => {
                    virtuosoRef.current?.scrollToIndex({
                      index: index + 1,
                      align: 'center',
                    });
                    setPendingFocusAddress(nextAddress);
                  }
                : undefined
            }
          />
        );
      }}
    />
  );
});
