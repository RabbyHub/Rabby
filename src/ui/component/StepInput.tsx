import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { RcIconMinusCC, RcIconPlusCC } from '../assets/desktop/common';
import clsx from 'clsx';
import { Tooltip } from 'antd';

const Root = styled.div`
  display: flex;
  align-items: center;

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .step-btn {
    padding: 6px;
    color: var(--r-neutral-body, #3e495e);
    border: 1px solid var(--r-neutral-line, #e0e5ec);

    &:first-child {
      border-right: none;
      border-radius: 8px 0 0 8px;
    }
    &:last-child {
      border-left: none;
      border-radius: 0 8px 8px 0;
    }

    &:disabled {
      cursor: not-allowed;
      svg {
        opacity: 0.5;
      }
    }
  }

  .step-input-field {
    color: var(--r-neutral-title1, #192945);
    text-align: center;
    font-size: 13px;
    font-weight: 500;
    line-height: 16px;
    width: 64px;
    height: 34px;

    border: 1px solid var(--r-neutral-line, #e0e5ec);
    background-color: transparent;

    &:disabled {
      cursor: not-allowed;
    }

    &:focus {
      outline: none;
      border-color: var(--r-blue-default, #4c65ff);
    }
  }
`;

export interface StepInputProps {
  value?: number | null; // controlled value
  defaultValue?: number | null; // uncontrolled initial value
  onChange?: (value: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  maxTooltip?: string;
}

export const StepInput: React.FC<StepInputProps> = ({
  value,
  defaultValue,
  onChange,
  step = 1,
  min,
  max,
  disabled = false,
  className,
  maxTooltip,
}) => {
  const isControlled = value !== undefined;
  const [inner, setInner] = useState<number | null>(
    defaultValue !== undefined ? defaultValue : value !== undefined ? value : 0
  );

  // keep internal state in sync when controlled
  useEffect(() => {
    if (isControlled) {
      // value may be undefined in uncontrolled mode
      setInner(value as number);
    }
  }, [value, isControlled]);

  const clamp = (v: number | null): number | null => {
    if (v === null) return null;
    let nv = Number.isFinite(v) ? v : 0;
    if (min !== undefined) nv = Math.max(min, nv);
    if (max !== undefined) nv = Math.min(max, nv);
    return nv;
  };

  const commit = (v: number | null) => {
    const nv = clamp(v);
    if (!isControlled) setInner(nv as number | null);
    onChange && onChange(nv as number | null);
  };

  const increment = () => {
    if (disabled) return;
    const base = inner ?? defaultValue ?? 0;
    commit(base + step);
  };

  const decrement = () => {
    if (disabled) return;
    const base = inner ?? defaultValue ?? 0;
    commit(base - step);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // allow empty input while editing -> represent as null
    if (v === '') {
      if (!isControlled) setInner(null);
      onChange && onChange(null);
      return;
    }
    const n = Number(v);
    if (Number.isNaN(n)) return;
    if (!isControlled) setInner(n);
    // call onChange with clamped number
    onChange && onChange(clamp(n) as number);
  };

  const onBlur = () => {
    // when leaving input, ensure value is clamped and persisted
    if (inner === null) {
      commit(null);
    } else {
      commit(inner);
    }
  };

  const current = inner ?? defaultValue ?? 0;
  const canDecrement = !disabled && (min === undefined || current > min);
  const canIncrement = !disabled && (max === undefined || current < max);

  return (
    <Root className={clsx('step-input', className)}>
      <button
        type="button"
        onClick={decrement}
        disabled={!canDecrement}
        aria-label="decrement"
        className="step-btn"
      >
        <RcIconMinusCC />
      </button>
      <input
        type="number"
        value={inner === null ? '' : inner}
        onChange={onInputChange}
        onBlur={onBlur}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        className="step-input-field"
      />

      {maxTooltip ? (
        <button
          type="button"
          // onClick={increment}
          // disabled={!canIncrement}
          aria-label="increment"
          className="step-btn"
        >
          <Tooltip
            placement="top"
            overlayClassName={clsx('rectangle')}
            title={maxTooltip}
          >
            <RcIconPlusCC className="opacity-50" />
          </Tooltip>
        </button>
      ) : (
        <button
          type="button"
          onClick={increment}
          disabled={!canIncrement}
          aria-label="increment"
          className="step-btn"
        >
          <RcIconPlusCC />
        </button>
      )}
    </Root>
  );
};
