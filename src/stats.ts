import StatsReport, { SITE } from '@debank/festats';
import { shouldReportUserBehaviorData } from '@/utils/user-data-tracking';

type StatsReportParams = Parameters<StatsReport['report']>[1];

export type EventParams = Record<string, number | string | boolean | undefined>;

let statsReport: StatsReport | null = null;

const getStatsReport = () => {
  if (!statsReport) {
    statsReport = new StatsReport(SITE.rabby);
  }
  return statsReport;
};

const omitUndefinedParams = (params: EventParams) => {
  const result: StatsReportParams = {};

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      result[key] = value;
    }
  });

  return result;
};

export default {
  report: async (name: string, params: EventParams) => {
    if (!(await shouldReportUserBehaviorData())) {
      return;
    }

    return getStatsReport().report(name, omitUndefinedParams(params));
  },
};
