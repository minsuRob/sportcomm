import { useQuery } from "@apollo/client";
import { GET_TEAMS, Team, GetTeamsResult } from "@/lib/graphql/teams";
import { useMemo } from "react";

interface UseTeamsOutput {
  teams: Team[];
  loading: boolean;
  error: any;
  getTeamById: (id: string) => Team | undefined;
}

export const useTeams = (): UseTeamsOutput => {
  const { data, loading, error } = useQuery<GetTeamsResult>(GET_TEAMS);

  const teams = useMemo(() => data?.teams || [], [data]);

  const teamsById = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach((team) => {
      map.set(team.id, team);
    });
    return map;
  }, [teams]);

  const getTeamById = (id: string) => {
    return teamsById.get(id);
  };

  return {
    teams,
    loading,
    error,
    getTeamById,
  };
};
