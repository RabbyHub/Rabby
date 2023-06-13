import { Field, Popup } from '@/ui/component';
import React from 'react';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';

type DelectModalProps = {
  visible: boolean;
  onClose(): void;
  onSubmit(deleteSeedPhrase: boolean): void;
  emptyAddress: boolean;
};

const list = [
  {
    title: 'Delete all addresses, but keep the seed phrase',
    deleteSeedPhrase: false,
  },
  {
    title: 'Delete all addresses and the seed phrase',
    deleteSeedPhrase: true,
  },
];
export const SeedPhraseDeleteModal = ({
  visible,
  onClose,
  onSubmit,
  emptyAddress = false,
}: DelectModalProps) => {
  return (
    <Popup
      visible={visible}
      title={'Delete seed phrase?'}
      height={emptyAddress ? 150 : 224}
      onClose={onClose}
    >
      <div className="flex flex-col ">
        {list.map((item, i) => {
          if (emptyAddress && i === 0) {
            return null;
          }
          return (
            <Field
              key={item.title}
              leftIcon={null}
              rightIcon={<img src={IconArrowRight} className="w-16 h-16" />}
              onClick={() => {
                onSubmit(item.deleteSeedPhrase);
              }}
              className="bg-gray-bg2 border border-transparent hover:border-blue-light hover:bg-blue-light hover:bg-opacity-20"
            >
              {item.title}
            </Field>
          );
        })}
      </div>
    </Popup>
  );
};
