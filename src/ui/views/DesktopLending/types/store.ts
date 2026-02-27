import { isEqual } from 'lodash';

export type UpdaterOrPartials<Val = unknown> =
  | (Val extends any[] ? Val[number][] : Partial<Val>)
  | ((prev: Val) => Val);

export function resolveValFromUpdater<Val = unknown>(
  prevVal: Val,
  input: UpdaterOrPartials<Val>,
  options?: {
    /**
     * @default true
     */
    strict?: boolean | ((prevVal: Val, newVal: Val) => boolean);
    /**
     * @default true
     */
    destructuringObjInput?: boolean;
  }
) {
  let strictCompare = options?.strict ?? true;
  const { destructuringObjInput = !strictCompare } = options || {};

  const ret = {
    newVal: prevVal,
    changed: false,
    isNonFuncInput: typeof input !== 'function',
    isChangedObjectInput: false,
  };
  if (typeof input === 'function') {
    strictCompare = strictCompare ?? true;
    ret.newVal = input(prevVal);
  } else if (typeof input === 'object') {
    if (strictCompare === undefined) {
      strictCompare = !destructuringObjInput;
    }

    if (strictCompare && destructuringObjInput) {
      strictCompare = false;
      console.warn(
        '[resolveValFromUpdater] Warning: strict mode with destructuringObjInput may cause unnecessary compare.'
      );
    }
    ret.isChangedObjectInput = prevVal !== input;
    if (Array.isArray(prevVal)) {
      ret.newVal = !destructuringObjInput
        ? ((input as any) as Val)
        : ([...(input as any[])] as Val);
    } else {
      ret.newVal = !destructuringObjInput
        ? ((input as any) as Val)
        : { ...prevVal, ...input };
    }
  } else {
    strictCompare = strictCompare ?? true;
    // for primitive type
    ret.newVal = input as Val;
  }

  if (typeof strictCompare === 'function') {
    ret.changed = strictCompare(prevVal, ret.newVal);
  } else if (strictCompare) {
    ret.changed = !isEqual(prevVal, ret.newVal);
  } else {
    ret.changed = prevVal !== ret.newVal;
  }

  return ret;
}
