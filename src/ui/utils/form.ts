import BigNumber from 'bignumber.js';

export type FormFieldComparer<T> = {
  [K in keyof T]?: (oldValue: T[K], newValue: T[K]) => boolean;
};

export type FormAmountMode = 'exact' | 'max';

export type FormComparisonResult<T> = {
  isChanged: boolean;
  changedFields: (keyof T)[];
};

export interface FormValuesOnSubmitOptions<T extends Record<string, any>> {
  comparers?: FormFieldComparer<T>;
}

const isSamePrimitive = (oldValue: unknown, newValue: unknown) =>
  Object.is(oldValue, newValue);

export class FormValuesOnSubmit<T extends Record<string, any>> {
  private snapshot?: T;

  private readonly comparers?: FormFieldComparer<T>;

  constructor(options?: FormValuesOnSubmitOptions<T>) {
    this.comparers = options?.comparers;
  }

  save(nextSnapshot: T) {
    this.snapshot = nextSnapshot;
  }

  clear() {
    this.snapshot = undefined;
  }

  getSnapshot() {
    return this.snapshot;
  }

  compare(currentValues: T): FormComparisonResult<T> {
    if (!this.snapshot) {
      return {
        isChanged: false,
        changedFields: [],
      };
    }

    const allKeys = new Set<keyof T>([
      ...(Object.keys(this.snapshot) as (keyof T)[]),
      ...(Object.keys(currentValues) as (keyof T)[]),
    ]);

    const changedFields = [...allKeys].filter((field) => {
      const comparer = this.comparers?.[field];
      if (comparer) {
        return comparer(this.snapshot![field], currentValues[field]);
      }
      return !isSamePrimitive(this.snapshot![field], currentValues[field]);
    });

    return {
      isChanged: changedFields.length > 0,
      changedFields,
    };
  }
}

export function createAmountComparer<T>(): (
  oldValue: T,
  newValue: T
) => boolean {
  return (oldValue, newValue) => {
    const oldAmount = new BigNumber(String(oldValue || 0));
    const newAmount = new BigNumber(String(newValue || 0));

    if (!oldAmount.isFinite() || !newAmount.isFinite()) {
      return !isSamePrimitive(oldValue, newValue);
    }

    return !oldAmount.eq(newAmount);
  };
}

export function shouldIgnoreAmountChangeInMaxMode<
  T extends {
    amount?: string;
    amountMode?: FormAmountMode;
  }
>(comparison: FormComparisonResult<T>, snapshot: T, currentValues: T): boolean {
  if (!comparison.isChanged) {
    return false;
  }

  if (
    comparison.changedFields.length !== 1 ||
    comparison.changedFields[0] !== ('amount' as keyof T)
  ) {
    return false;
  }

  return snapshot.amountMode === 'max' && currentValues.amountMode === 'max';
}
