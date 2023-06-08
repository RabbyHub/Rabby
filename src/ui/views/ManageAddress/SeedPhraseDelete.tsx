import { Field, Popup } from '@/ui/component';
import React from 'react';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';

type DelectModalProps = {
  visible: boolean;
  onClose(): void;
  onSubmit(deleteSeedPhrase: boolean): void;
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
}: DelectModalProps) => {
  return (
    <Popup
      visible={visible}
      title={'Delete seed phrase?'}
      height={224}
      onClose={onClose}
    >
      <div className="flex flex-col gap-12">
        {list.map((item) => {
          return (
            <Field
              key={item.title}
              leftIcon={null}
              rightIcon={
                <img src={IconArrowRight} className="icon icon-arrow-right" />
              }
              onClick={() => {
                onSubmit(item.deleteSeedPhrase);
              }}
              className="bg-gray-bg2"
            >
              {item.title}
            </Field>
          );
        })}
      </div>
    </Popup>
  );
};
