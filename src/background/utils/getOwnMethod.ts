type Method = (this: any, ...args: any[]) => any;

export default function getOwnMethod(
  target: object,
  key: PropertyKey
): Method | undefined {
  if (!Object.prototype.hasOwnProperty.call(target, key)) {
    return undefined;
  }

  const method = Reflect.get(target, key);
  return typeof method === 'function' ? method : undefined;
}
