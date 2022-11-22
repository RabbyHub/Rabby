import { Checkbox, Field } from '@/ui/component';
import React from 'react';

const QUESTIONS = [
  {
    index: 1,
    content: 'I am aware of the risks and will stop the connection',
    checked: false,
  },
  {
    index: 2,
    content: 'I confirm it is no risk and proceed',
    checked: false,
  },
];

interface Props {
  onChange(isAllChecked: boolean): void;
}

export const WarningChecklist: React.FC<Props> = ({ onChange }) => {
  const [questionChecks, setQuestionChecks] = React.useState(QUESTIONS);

  const toggleCheckedByIndex = React.useCallback((index: number) => {
    setQuestionChecks((prev) => {
      const idx = prev.findIndex((item) => item.index === index);
      prev[idx].checked = !prev[idx].checked;
      return [...prev];
    });
  }, []);

  const isAllChecked = React.useMemo(
    () => questionChecks.every((item) => item.checked),
    [questionChecks]
  );

  React.useEffect(() => {
    onChange(isAllChecked);
  }, [isAllChecked]);

  return (
    <div className="mt-16 mb-20">
      {QUESTIONS.map((q) => (
        <Field
          className="field-outlined text-13 min-h-[48px] py-0"
          key={`item-${q.index}`}
          leftIcon={
            <Checkbox
              checked={q.checked}
              width={'20px'}
              height={'20px'}
              background="#27C193"
              onChange={() => toggleCheckedByIndex(q.index)}
            />
          }
          rightIcon={null}
          onClick={() => toggleCheckedByIndex(q.index)}
        >
          {q.content}
        </Field>
      ))}
    </div>
  );
};
