import { Checkbox, Field } from '@/ui/component';
import React from 'react';

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
    content: 'I confirm it is no risk and proceed',
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
          className="field-outlined text-13 min-h-[44px] py-0"
          key={`item-${q.id}`}
          leftIcon={
            <Checkbox
              checked={selected === q.id}
              width="20px"
              height="20px"
              background="#27C193"
              onChange={() => toggleCheckedByIndex(q.id)}
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
