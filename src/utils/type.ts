export type ObjectMirror<T> = {
  [K in keyof T]: T[K];
};
