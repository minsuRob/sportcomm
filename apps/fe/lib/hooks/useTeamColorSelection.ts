import { useMemo, useCallback } from "react";
import { GetMyTeamsResult } from "@/lib/graphql/teams";
import { deriveTeamSlug } from "@/lib/team-data/players";

/**
 * 팀 색상 선택을 위한 공유 hook
 *
 * team-colors-select.tsx와 team-selection.tsx에서 공통으로 사용되는
 * priority 기반 팀 색상 선택 로직을 제공합니다.
 */

interface UseTeamColorSelectionParams {
  myTeamsData: GetMyTeamsResult | undefined;
  teamColorTeamId: string | null;
  selectedTeamId: string | null;
  setTeamColorOverride: (teamId: string | null, slug: string | null) => Promise<void>;
}

export function useTeamColorSelection({
  myTeamsData,
  teamColorTeamId,
  selectedTeamId,
  setTeamColorOverride,
}: UseTeamColorSelectionParams) {

  /**
   * priority가 가장 낮은(우선순위가 높은) 팀을 반환
   */
  const getDefaultTeamByPriority = useCallback(() => {
    if (!myTeamsData?.myTeams || myTeamsData.myTeams.length === 0) {
      return null;
    }

    // priority가 가장 낮은(우선순위가 높은) 팀을 찾음
    const sortedTeams = [...myTeamsData.myTeams].sort((a, b) => a.priority - b.priority);
    return sortedTeams[0]?.team?.id || null;
  }, [myTeamsData]);

  /**
   * 팀 ID로 팀 정보를 찾는 헬퍼 함수
   */
  const findTeamById = useCallback((teamId: string, sportsData?: any) => {
    if (!sportsData?.sports) return null;
    for (const sport of sportsData.sports) {
      const team = sport.teams?.find((t: any) => t.id === teamId);
      if (team) return team;
    }
    return null;
  }, []);

  /**
   * priority 기반으로 팀 색상을 적용
   */
  const applyTeamColorByPriority = useCallback(async (sportsData?: any) => {
    const defaultTeamId = getDefaultTeamByPriority();
    if (defaultTeamId && !teamColorTeamId) {
      const team = findTeamById(defaultTeamId, sportsData);
      if (team) {
        const slug = deriveTeamSlug(team.name);
        await setTeamColorOverride(defaultTeamId, slug);
      }
    }
  }, [getDefaultTeamByPriority, teamColorTeamId, findTeamById, deriveTeamSlug, setTeamColorOverride]);

  /**
   * 선택된 팀의 색상을 적용
   */
  const applyTeamColor = useCallback(async (teamId: string, sportsData?: any) => {
    const team = findTeamById(teamId, sportsData);
    if (team) {
      const slug = deriveTeamSlug(team.name);
      await setTeamColorOverride(teamId, slug);
    }
  }, [findTeamById, deriveTeamSlug, setTeamColorOverride]);

  /**
   * 팀 선택 시 색상 적용 (선택/해제 로직 포함)
   */
  const handleTeamSelection = useCallback((
    teamId: string,
    currentSelectedTeams: string[],
    sportsData?: any
  ) => {
    const isCurrentlySelected = currentSelectedTeams.includes(teamId);

    if (isCurrentlySelected) {
      // 해제: 남은 팀 중 첫 번째 팀의 색상을 적용
      const remainingTeams = currentSelectedTeams.filter(id => id !== teamId);

      // 색상 적용은 비동기로 처리
      if (remainingTeams.length > 0) {
        applyTeamColor(remainingTeams[0], sportsData).catch(error => {
          console.warn("팀 해제 후 색상 적용 실패:", error);
        });
      } else {
        // 모든 팀 해제 시 기본 색상
        setTeamColorOverride(null, null).catch(error => {
          console.warn("기본 색상 적용 실패:", error);
        });
      }
      return remainingTeams;
    } else {
      // 선택: 선택한 팀의 색상을 적용
      applyTeamColor(teamId, sportsData).catch(error => {
        console.warn("팀 선택 후 색상 적용 실패:", error);
      });
      return [...currentSelectedTeams, teamId];
    }
  }, [applyTeamColor, setTeamColorOverride]);

  /**
   * priority 기반 선택 상태를 반환
   */
  const getPriorityBasedSelection = useCallback((teamId: string) => {
    const defaultTeamId = getDefaultTeamByPriority();
    return {
      isPrimaryTeam: myTeamsData?.myTeams?.find(ut => ut.team.id === teamId)?.priority === 0,
      isUserSelected: teamColorTeamId === teamId,
      isAutoSelected: !teamColorTeamId && selectedTeamId === teamId && defaultTeamId === teamId,
    };
  }, [myTeamsData, teamColorTeamId, selectedTeamId, getDefaultTeamByPriority]);

  return {
    getDefaultTeamByPriority,
    applyTeamColorByPriority,
    applyTeamColor,
    handleTeamSelection,
    getPriorityBasedSelection,
    findTeamById,
  };
}
