# Product Requirements Document

## 1. Executive Summary

스포츠 팬을 위한 Feed 형식 커뮤니티 SNS

## 2. Problem Statement

기존 스포츠 커뮤니티는

- 실시간 경기 상황 공유가 느리다.
- 게시물 수정 내역이 없어 신뢰성이 낮다.
- 모바일 UX가 올드하다.  
  사용자는 직관적 모바일 Feed·실시간 상호작용·편집 히스토리를 원한다.

## 3. Goals and Objectives

- Primary Goal: 스포츠 팬이 실시간으로 정보 공유·토론할 수 있는 모바일 중심 커뮤니티 제공
- Secondary Goals:
  - 게시물 버전 관리로 정보 신뢰성 개선
  - 푸시·라이브 알림으로 사용자 참여 증대
  - 커뮤니티 데이터 기반 광고·제휴 매출 확보
- Success Metrics:
  - MAU 100k, DAU/MAU ≥ 35%
  - 평균 세션 8분 이상
  - 게시물 평균 댓글 5개 이상
  - 버그리포트 대비 해결률 95%+

## 4. Target Audience

### Primary Users

- 연령 15~50세 남녀, 주 2회 이상 스포츠 시청
- 모바일 SNS·라이브 중계 앱 사용 경험
- 실시간 토론·정보 검증 요구

### Secondary Users

- 스포츠 기자·인플루언서
- 광고주(스포츠용품, OTT, 스포츠베팅)

## 5. User Stories

- “스포츠 팬으로서, 경기 중 실시간 댓글을 보고 싶어 경기 몰입감을 높이고 싶다.”
- “인플루언서로서, 게시물 수정 기록을 남겨 신뢰도를 유지하고 싶다.”
- “광고주로서, 특정 팀 팬에게 타깃 광고를 집행해 ROI를 높이고 싶다.”

## 6. Functional Requirements

### Core Features

1. Feed & 포스팅

   - 무한 스크롤, 이미지·영상 포함
   - Acceptance: 200ms 내 피드 로드, 미디어 20MB 이하 업로드

2. 라이브 채팅 룸
   - 경기별 자동 생성, 동접 10k 지원
   - 멘션, 링크 미리보기
3. 게시물 버전 관리
   - 수정 시 diff 히스토리 저장
   - 기존 내용 복원 가능
4. 푸시 & 인앱 알림
   - 팔로우, 멘션, 득점 이벤트 트리거
5. 사용자 프로필 & 팔로잉
   - 관심 팀, 종목 설정
   - 팔로워/팔로잉 목록

### Supporting Features

- 다크모드, 오프라인 캐시
- 다국어 지원
- 신고·블록·필터
- 관리자 대시보드(유저·콘텐츠 관리)
- 추천 알고리즘(팔로잉·인기·개인화)

## 7. Non-Functional Requirements

- Performance: p95 피드 응답 300ms, 채팅 지연 <1s
- Security: JWT + OAuth2, HTTPS, XSS/CSRF 방어
- Usability: WCAG 2.1 AA, 온보딩 ≤ 2분
- Scalability: AWS ECS + RDS, 수평 확장
- Compatibility: iOS 13+, Android 9+, 최신 브라우저

## 8. Technical Considerations

- 아키텍처: React Native(Expo) → GraphQL(API Gateway) → NestJS(서비스) → PostgreSQL/Redis
- 실시간: Redis Pub/Sub + WebSocket Gateway
- 미디어 저장: S3, CloudFront CDN
- Analytics: Amplitude + GA4
- 3rd-party: Firebase FCM, AWS Rekognition(이미지 모더레이션)

## 9. Success Metrics and KPIs

- 제품: DAU, Retention D7 40%, 앱스토어 평점 4.5+
- 비즈니스: 광고 CPM, 제휴 매출, ARPU $0.5+
- 기술: Crash Free ≥ 99%, 서버 가용성 99.9%

## 10. Risks and Mitigation

- 사용자 유해 콘텐츠: AI 모더레이션 + 운영자 검수
- 사업 수익화 지연: 단계적 광고, 프리미엄 구독 검토

## 11. Future Considerations

- AI 하이라이트 자동 생성
- 해외 리그 다국어 지원
