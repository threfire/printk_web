export type SeasonPlanPeriod = {
  seasonYear: number;
  month: number;
};

export function getCurrentSeasonPlanPeriod(date = new Date()): SeasonPlanPeriod {
  return {
    seasonYear: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

export function formatSeasonPlanTitle(period: SeasonPlanPeriod) {
  return `${period.seasonYear} 赛季 ${period.month} 月计划`;
}
