/**
 * 인증 디버깅 테스트 스크립트
 * Node.js로 직접 실행하여 JWT 토큰과 인증 상태를 확인
 */

const jwt = require("jsonwebtoken");
const axios = require("axios");

// 제공받은 토큰
const token =
  "eyJhbGciOiJIUzI1NiIsImtpZCI6IllqUFlZR3pPT2xSL3NCVXYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2lpa2d1cGRtbmxtaHljbXR1cXpqLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI1MzA2OGU1Yy04YjNkLTQyMzItODVjYi02NjZjYjUxOGY3NWUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0NDc0MjczLCJpYXQiOjE3NTQ0NzA2NzMsImVtYWlsIjoicm80MTc4QG5hdmVyLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU0NDcwNjczfV0sInNlc3Npb25faWQiOiIyNWIzZmQ3MS1lMDdlLTRiNzUtYmZkNC00MWUyNDliMjk3NjAiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.e_L6HRru7-Z-Rih6EuCnpsDeiWPkY_mRnAHGdVRdp4c";

// JWT 시크릿 (백엔드에서 사용하는 것)
const jwtSecret =
  "IA2HIh02zsvxCW0UEjgwxQSML3CDNAcCnvd534czOUk1re65ooCWxH3pWT8oDCIyNrKgEjIdEcsnxcWHBZ3TYw";

console.log("🔍 === JWT 토큰 분석 시작 ===");

// 1. JWT 토큰 디코딩 (검증 없이)
try {
  const decoded = jwt.decode(token, { complete: true });
  console.log("1️⃣ JWT 헤더:", JSON.stringify(decoded.header, null, 2));
  console.log("1️⃣ JWT 페이로드:", JSON.stringify(decoded.payload, null, 2));

  const now = Math.floor(Date.now() / 1000);
  const exp = decoded.payload.exp;
  const timeUntilExpiry = exp - now;

  console.log("1️⃣ 토큰 만료 정보:", {
    현재시간: new Date(now * 1000).toISOString(),
    만료시간: new Date(exp * 1000).toISOString(),
    남은시간: `${timeUntilExpiry}초`,
    만료여부: timeUntilExpiry <= 0 ? "만료됨" : "유효함",
  });
} catch (error) {
  console.error("❌ JWT 디코딩 실패:", error.message);
}

// 2. JWT 토큰 검증
console.log("\n2️⃣ JWT 토큰 검증 테스트");
try {
  const verified = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
  console.log("✅ JWT 검증 성공:", {
    userId: verified.sub,
    email: verified.email,
    role: verified.role,
    iss: verified.iss,
  });
} catch (error) {
  console.error("❌ JWT 검증 실패:", error.message);

  // 다른 시크릿으로도 시도
  const alternativeSecrets = [
    "IA2HIh02zsvxCW0UEjgwxQSML3CDNAcCnvd534czOUk1re65ooCWxH3pWT8oDCIyNrKgEjIdEcsnxcWHBZ3TYw==",
    Buffer.from(
      "IA2HIh02zsvxCW0UEjgwxQSML3CDNAcCnvd534czOUk1re65ooCWxH3pWT8oDCIyNrKgEjIdEcsnxcWHBZ3TYw",
      "base64"
    ).toString(),
  ];

  for (let i = 0; i < alternativeSecrets.length; i++) {
    try {
      const verified = jwt.verify(token, alternativeSecrets[i], {
        algorithms: ["HS256"],
      });
      console.log(
        `✅ 대체 시크릿 ${i + 1}로 검증 성공:`,
        alternativeSecrets[i]
      );
      break;
    } catch (altError) {
      console.log(`❌ 대체 시크릿 ${i + 1} 실패:`, altError.message);
    }
  }
}

// 3. GraphQL 요청 테스트
console.log("\n3️⃣ GraphQL 요청 테스트");
async function testGraphQLRequest() {
  try {
    const response = await axios.post(
      "http://localhost:3000/graphql",
      {
        query: `
        query GetCurrentUserInfo {
          getCurrentUserInfo {
            id
            nickname
            email
            role
          }
        }
      `,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ GraphQL 요청 성공:", response.data);
  } catch (error) {
    console.error("❌ GraphQL 요청 실패:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
  }
}

testGraphQLRequest();

console.log("\n🔍 === JWT 토큰 분석 완료 ===");
