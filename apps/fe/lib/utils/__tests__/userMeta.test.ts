/**
 * userMeta 유틸리티 함수 테스트
 */

import {
  extractTeamLogos,
  extractTeams,
  createUserMeta,
  createChatUserMeta,
  isSameUser,
} from "../userMeta";

// 테스트용 모킹 데이터
const mockTeam1 = {
  id: "team1",
  name: "팀A",
  logoUrl: "https://example.com/team1.png",
  icon: "⚽",
};

const mockTeam2 = {
  id: "team2",
  name: "팀B",
  logoUrl: "https://example.com/team2.png",
  icon: "🏀",
};

const mockUserWithMyTeams = {
  id: "user1",
  nickname: "사용자1",
  age: 25,
  myTeams: [{ team: mockTeam1 }, { team: mockTeam2 }],
};

const mockUserWithAuthorTeams = {
  id: "user2",
  nickname: "사용자2",
  age: 30,
  authorTeams: [mockTeam1, mockTeam2],
};

const mockUserWithMyTeamLogos = {
  id: "user3",
  nickname: "사용자3",
  age: 28,
  myTeamLogos: [
    "https://example.com/team1.png",
    "https://example.com/team2.png",
  ],
};

describe("userMeta 유틸리티 함수", () => {
  describe("extractTeamLogos", () => {
    it("myTeams에서 팀 로고를 추출해야 함", () => {
      const logos = extractTeamLogos(mockUserWithMyTeams);
      expect(logos).toEqual([
        "https://example.com/team1.png",
        "https://example.com/team2.png",
      ]);
    });

    it("authorTeams에서 팀 로고를 추출해야 함", () => {
      const logos = extractTeamLogos(mockUserWithAuthorTeams);
      expect(logos).toEqual([
        "https://example.com/team1.png",
        "https://example.com/team2.png",
      ]);
    });

    it("myTeamLogos에서 팀 로고를 추출해야 함", () => {
      const logos = extractTeamLogos(mockUserWithMyTeamLogos);
      expect(logos).toEqual([
        "https://example.com/team1.png",
        "https://example.com/team2.png",
      ]);
    });

    it("maxCount 제한을 적용해야 함", () => {
      const logos = extractTeamLogos(mockUserWithMyTeams, 1);
      expect(logos).toHaveLength(1);
      expect(logos[0]).toBe("https://example.com/team1.png");
    });

    it("팀 정보가 없으면 빈 배열을 반환해야 함", () => {
      const logos = extractTeamLogos({ id: "user", nickname: "test" });
      expect(logos).toEqual([]);
    });
  });

  describe("extractTeams", () => {
    it("myTeams에서 팀 정보를 추출해야 함", () => {
      const teams = extractTeams(mockUserWithMyTeams);
      expect(teams).toEqual([mockTeam1, mockTeam2]);
    });

    it("authorTeams에서 팀 정보를 추출해야 함", () => {
      const teams = extractTeams(mockUserWithAuthorTeams);
      expect(teams).toEqual([mockTeam1, mockTeam2]);
    });
  });

  describe("createUserMeta", () => {
    it("기본 사용자 메타 데이터를 생성해야 함", () => {
      const meta = createUserMeta(mockUserWithMyTeams);
      expect(meta).toEqual({
        age: 25,
        teamLogos: [
          "https://example.com/team1.png",
          "https://example.com/team2.png",
        ],
      });
    });

    it("옵션에 따라 필드를 포함/제외해야 함", () => {
      const meta = createUserMeta(mockUserWithMyTeams, {
        includeAge: false,
        includeTeams: true,
      });
      expect(meta.age).toBeUndefined();
      expect(meta.teams).toEqual([mockTeam1, mockTeam2]);
    });
  });

  describe("isSameUser", () => {
    it("같은 사용자를 올바르게 식별해야 함", () => {
      const currentUser = { id: "user1", nickname: "test" };
      const targetUser = { id: "user1", nickname: "test" };
      expect(isSameUser(currentUser, targetUser)).toBe(true);
    });

    it("다른 사용자를 올바르게 식별해야 함", () => {
      const currentUser = { id: "user1", nickname: "test1" };
      const targetUser = { id: "user2", nickname: "test2" };
      expect(isSameUser(currentUser, targetUser)).toBe(false);
    });

    it("user_id 필드도 처리해야 함", () => {
      const currentUser = { id: "user1", nickname: "test" };
      const targetUser = { user_id: "user1", nickname: "test" };
      expect(isSameUser(currentUser, targetUser)).toBe(true);
    });
  });

  describe("createChatUserMeta", () => {
    it("채팅용 사용자 메타 데이터를 생성해야 함", () => {
      const meta = createChatUserMeta(mockUserWithMyTeams);
      expect(meta).toEqual({
        age: 25,
        teamLogos: [
          "https://example.com/team1.png",
          "https://example.com/team2.png",
        ],
      });
    });

    it("본인인 경우 현재 사용자 정보를 우선 사용해야 함", () => {
      const currentUser = {
        id: "user1",
        nickname: "현재사용자",
        age: 35,
        myTeams: [{ team: mockTeam1 }],
      };
      const messageUser = {
        id: "user1",
        nickname: "메시지사용자",
        age: 25,
        myTeamLogos: ["https://example.com/old.png"],
      };

      const meta = createChatUserMeta(messageUser, currentUser);
      expect(meta?.age).toBe(35); // 현재 사용자의 나이 사용
      expect(meta?.teamLogos).toEqual(["https://example.com/team1.png"]); // 현재 사용자의 팀 로고 사용
    });

    it("사용자 정보가 없으면 undefined를 반환해야 함", () => {
      const meta = createChatUserMeta(null);
      expect(meta).toBeUndefined();
    });
  });
});
