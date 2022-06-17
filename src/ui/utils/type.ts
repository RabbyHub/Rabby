export type IExtractFromPromise<T> = T extends Promise<infer U> ? U : T;
