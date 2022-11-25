import { Checkbox, Field } from '@/ui/component';
import clsx from 'clsx';
import React from 'react';
import { ReactComponent as IconCheck } from 'ui/assets/check.svg';

const QUESTIONS: {
  id: QUESTION_IDS;
  content: string;
}[] = [
  {
    id: 'cancel',
    content: 'I am aware of the risks and will stop the connection',
  },
  {
    id: 'continue',
    content: 'I see no risk and will proceed anyway',
  },
];

export type QUESTION_IDS = 'cancel' | 'continue';

interface Props {
  onChange: (id: QUESTION_IDS) => void;
}

export const WarningRadioGroup: React.FC<Props> = ({ onChange }) => {
  const [selected, setSelected] = React.useState<QUESTION_IDS>();

  const toggleCheckedByIndex = React.useCallback((id: QUESTION_IDS) => {
    onChange(id);
    setSelected(id);
  }, []);

  return (
    <div className="mt-16 mb-20">
      {QUESTIONS.map((q) => (
        <Field
          className={clsx('field-outlined text-13 min-h-[44px] py-0', {
            'bg-blue-light text-white selected': selected === q.id,
          })}
          key={`item-${q.id}`}
          leftIcon={
            <Checkbox
              checked={selected === q.id}
              width="20px"
              height="20px"
              background="white"
              onChange={() => toggleCheckedByIndex(q.id)}
              checkIcon={<IconCheck className="icon icon-check" />}
            />
          }
          rightIcon={null}
          onClick={() => toggleCheckedByIndex(q.id)}
        >
          {q.content}
        </Field>
      ))}
    </div>
  );
};
