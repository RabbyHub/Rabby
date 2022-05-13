import { init } from '@rematch/core';
import type { RematchDispatch, RematchRootState } from '@rematch/core';
import { models, RootModel } from './models';

const store = init({ models });

export type RabbyStore = typeof store;
export type RabbyDispatch = RematchDispatch<RootModel>;
export type RabbyRootState = RematchRootState<RootModel>;

export default store;
