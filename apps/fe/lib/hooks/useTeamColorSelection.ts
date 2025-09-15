import { useMemo, useCallback } from "react";
import { GetMyTeamsResult } from "@/lib/graphql/teams";

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
   * 팀명으로 slug를 유추하여 getTeamColors 매칭에 사용하는 헬퍼
   */
  const deriveTeamSlug = useCallback((teamName?: string | null): string | null => {
    if (!teamName) return null;
    const n = teamName.toLowerCase();
    if (n.includes("한화") || n.includes("hanwha")) return "hanwha";
    if (n.includes("두산") || n.includes("doosan")) return "doosan";
    if (n.includes("삼성") || n.includes("samsung")) return "samsung";
    if (n.includes("기아") || n.includes("kia")) return "kia";
    if (n.includes("ssg") || n.includes("landers") || n.includes("랜더스"))
      return "ssg";
    if (n.includes("lg") && (n.includes("트윈스") || n.includes("twins")))
      return "lg";
    if (n.includes("롯데") || n.includes("lotte") || n.includes("giants"))
      return "lotte";
    if (n.includes("다이노스") || n.includes("dinos") || n.includes("nc"))
      return "nc";
    if (n.includes("위즈") || n.includes("wiz") || n === "kt") return "kt";
    if (n.includes("키움") || n.includes("kiwoom") || n.includes("heroes"))
      return "kiwoom";
    return null;
  }, []);

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
    deriveTeamSlug,
    findTeamById,
  };
}
