export const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const ONE_HOUR_MS = 1000 * 60 * 60;

export const ONE_MINUTE_MS = 1000 * 60;

/** 统一历史：pending 创建超过该时长不再轮询。 */
export const BRIDGE_HISTORY_POLL_MAX_AGE_MS = 2 * ONE_HOUR_MS;

/**
 * 源链已成功但没有 from_tx.time_at 时，
 * 用 create_at 满该时长视为 Delayed（Contact Support）。
 */
export const BRIDGE_HISTORY_CREATE_AT_DELAY_MS = 2 * ONE_HOUR_MS;

/** 统一历史：交易上链未满该时长时，接口查无结果不缓存，下次打开或列表更新时重查。 */
export const BRIDGE_HISTORY_EMPTY_NO_CACHE_MS = 3 * ONE_MINUTE_MS;
