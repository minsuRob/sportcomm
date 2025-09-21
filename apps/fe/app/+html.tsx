import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// 이 파일은 웹 전용이며, 정적 렌더링 중 모든 웹 페이지의 루트 HTML을 구성하는 데 사용됩니다.
// 내용은 Node.js 환경에서만 실행되며 DOM이나 브라우저 API에 접근할 수 없습니다.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <title>Sportalk - 스포톡</title>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Open Graph 메타 태그 - 소셜 미디어 공유용 */}
        <meta property="og:title" content="Sportalk - 스포톡" />
        <meta property="og:description" content="야구, 축구, e스포츠 팬들 통합 커뮤니티 플랫폼" />
        <meta property="og:image" content="/thumnails.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://sportcomm.com" />

        {/* Twitter Card 메타 태그 */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Sportalk - 스포톡" />
        <meta name="twitter:description" content="야구, 축구, e스포츠 팬들 통합 커뮤니티 플랫폼" />
        <meta name="twitter:image" content="/thumnails.jpg" />

        {/* 기본 메타 태그 */}
        <meta name="description" content="스포츠 팬들을 위한 최고의 커뮤니티 플랫폼 - 팀별 게시물, 채팅, 경품 이벤트 등 다양한 기능을 제공합니다." />
        <meta name="keywords" content="스포츠,커뮤니티,축구,야구,농구,팀,팬,채팅,게시물" />

        {/*
          웹에서 ScrollView 컴포넌트가 네이티브처럼 작동하도록 본문 스크롤을 비활성화합니다.
          그러나 모바일 웹에서는 본문 스크롤이 더 나을 수 있습니다. 활성화하려면 이 줄을 제거하세요.
        */}
        <ScrollViewStyleReset />

        {/* 웹 전역적으로 사용할 추가 <head> 요소를 여기에 추가할 수 있습니다... */}
      </head>
      <body>{children}</body>
    </html>
  );
}
