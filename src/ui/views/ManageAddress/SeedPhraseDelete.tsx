import i18n from '@/i18n';
import { Field, Popup } from '@/ui/component';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';

type DeleteModalProps = {
  visible: boolean;
  onClose(): void;
  onSubmit(deleteSeedPhrase: boolean): void;
  emptyAddress: boolean;
};

const list = [
  {
    title: i18n.t(
      'page.manageAddress.delete-all-addresses-but-keep-the-seed-phrase'
    ),
    deleteSeedPhrase: false,
  },
  {
    title: i18n.t(
      'page.manageAddress.delete-all-addresses-and-the-seed-phrase'
    ),
    deleteSeedPhrase: true,
  },
];
export const SeedPhraseDeleteModal = ({
  visible,
  onClose,
  onSubmit,
  emptyAddress = false,
}: DeleteModalProps) => {
  const { t } = useTranslation();
  return (
    <Popup
      visible={visible}
      title={t('page.manageAddress.seed-phrase-delete-title')}
      height={emptyAddress ? 150 : 224}
      onClose={onClose}
      isSupportDarkMode
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
              className="bg-r-neutral-card-2 text-r-neutral-title-1 border border-transparent hover:border-blue-light hover:bg-blue-light hover:bg-opacity-20"
            >
              {item.title}
            </Field>
          );
        })}
      </div>
    </Popup>
  );
};
