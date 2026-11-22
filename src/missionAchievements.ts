type AchievementState = {
  stage: number;
  elementDiscovered?: number;
  timelineFound: number;
  victory: number;
};

export function missionAchievements(mission: AchievementState) {
  return {
    elementDiscovered: mission.stage >= 3 && Boolean(mission.elementDiscovered),
    planetaryDefense: mission.stage >= 4,
    timelineFound: mission.stage >= 6 && Boolean(mission.timelineFound),
    victory: mission.stage >= 8 && Boolean(mission.victory),
  };
}
