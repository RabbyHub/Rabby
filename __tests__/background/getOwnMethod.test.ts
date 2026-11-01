import getOwnMethod from '@/background/utils/getOwnMethod';

describe('getOwnMethod', () => {
  test('returns an own function and preserves its identity', () => {
    const ownMethod = jest.fn();
    const target = { ownMethod };

    expect(getOwnMethod(target, 'ownMethod')).toBe(ownMethod);
  });

  test('rejects own non-function properties', () => {
    expect(getOwnMethod({ value: true }, 'value')).toBeUndefined();
  });

  test.each([
    'constructor',
    'toString',
    'valueOf',
    'hasOwnProperty',
    '__proto__',
  ])('rejects inherited Object prototype property %s', (method) => {
    expect(getOwnMethod({ ownMethod: jest.fn() }, method)).toBeUndefined();
  });

  test('rejects methods inherited from a custom prototype', () => {
    const target = Object.create({ inheritedMethod: jest.fn() });

    expect(getOwnMethod(target, 'inheritedMethod')).toBeUndefined();
  });

  test('supports own methods on null-prototype method maps', () => {
    const ownMethod = jest.fn();
    const target = Object.assign(Object.create(null), { ownMethod });

    expect(getOwnMethod(target, 'ownMethod')).toBe(ownMethod);
  });
});
