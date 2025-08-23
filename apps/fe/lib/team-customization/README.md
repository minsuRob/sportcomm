# 팀 커스터마이징 시스템

SportComm 앱의 팀별 맞춤형 UI 컴포넌트 시스템입니다. 각 팀의 고유한 색상, 로고, 스타일을 PostCard와 기타 컴포넌트에 동적으로 적용할 수 있습니다.

## 📁 폴더 구조

```
lib/team-customization/
├── common/                    # 공용 컴포넌트들
│   ├── uniform/              # 유니폼 관련 컴포넌트
│   │   ├── UniformPlaceholder.tsx
│   │   ├── ArchedText.tsx
│   │   ├── UniformNumber.tsx
│   │   └── index.ts
│   ├── decorations/          # SVG 장식 컴포넌트
│   │   ├── BaseSVGDecoration.tsx
│   │   └── index.ts
│   └── index.ts
├── teams/                    # 팀별 커스터마이징 설정
│   ├── doosan/              # 두산 베어스
│   │   ├── DoosanStripes.tsx
│   │   ├── DoosanUniform.tsx
│   │   └── index.ts
│   ├── samsung/             # 삼성 라이온즈
│   │   └── index.tsx
│   └── [team-name]/         # 새로운 팀 추가
├── registry.ts              # 팀 설정 레지스트리
├── useTeamCustomization.ts  # React 훅
├── types.ts                 # 타입 정의
└── index.ts                 # 메인 엔트리 포인트
```

## 🚀 기본 사용법

### 1. 시스템 초기화 (앱 시작 시)

```tsx
// app/_layout.tsx
import { initializeTeamCustomizations } from '@/lib/team-customization';

export default function RootLayout() {
  useEffect(() => {
    initializeTeamCustomizations();
  }, []);
}
```

### 2. PostCard에서 팀 커스터마이징 사용

```tsx
// components/PostCard.tsx
import { useTeamCustomization } from '@/lib/team-customization';

function PostCard({ post }) {
  const teamCustomization = useTeamCustomization(post.teamId, {
    id: post.teamId,
    name: post.team?.name,
    mainColor: post.team?.mainColor,
    subColor: post.team?.subColor,
  });

  return (
    <View>
      {/* 기존 PostCard 내용 */}
      
      {/* 팀별 장식 요소 (좌측 하단 스트라이프 등) */}
      {teamCustomization.hasDecoration && teamCustomization.DecorationComponent && (
        <View style={teamCustomization.styles.decoration}>
          <teamCustomization.DecorationComponent
            teamId={post.teamId}
            teamData={teamData}
            color={teamPalette.borderColor}
            {...teamCustomization.decorationProps}
          />
        </View>
      )}

      {/* 팀별 유니폼 플레이스홀더 */}
      {teamCustomization.hasUniform && teamCustomization.UniformComponent && (
        <teamCustomization.UniformComponent
          teamId={post.teamId}
          teamData={teamData}
          {...teamCustomization.uniformProps}
        />
      )}
    </View>
  );
}
```

## 🎨 새로운 팀 커스터마이징 추가하기

### 1단계: 팀 폴더 생성

```bash
mkdir apps/fe/lib/team-customization/teams/[팀이름]
```

### 2단계: 장식 컴포넌트 생성 (SVG)

```tsx
// teams/[팀이름]/[팀이름]Decoration.tsx
import React from 'react';
import { BaseSVGDecoration, createVerticalStripes } from '../../common';
import type { TeamDecorationProps } from '../../types';

export const MyTeamDecoration: React.FC<TeamDecorationProps> = (props) => {
  return (
    <BaseSVGDecoration
      {...props}
      defaultColor="#FF5722" // 팀 고유 색상
      renderSVG={createVerticalStripes(3)} // 3개 세로 스트라이프
      renderWebFallback={({ width, height, color }) => (
        <View style={{ 
          width, 
          height, 
          backgroundColor: color,
          borderRadius: 4 
        }} />
      )}
    />
  );
};
```

### 3단계: 커스텀 SVG 패턴 만들기

```tsx
// 완전 커스텀 SVG
export const MyTeamLogo: React.FC<TeamDecorationProps> = (props) => {
  return (
    <BaseSVGDecoration
      {...props}
      renderSVG={({ width, height, color, svgComponents }) => {
        const { Path, Circle } = svgComponents;
        return (
          <>
            <Circle cx={width/2} cy={height/2} r={width/4} fill={color} />
            <Path 
              d={`M0,${height} L${width},0`} 
              stroke={color} 
              strokeWidth="2" 
            />
          </>
        );
      }}
      renderWebFallback={({ width, height, color }) => (
        <View style={{
          width,
          height,
          borderRadius: width/2,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: color,
        }} />
      )}
    />
  );
};
```

### 4단계: 유니폼 컴포넌트 생성

```tsx
// teams/[팀이름]/[팀이름]Uniform.tsx
import React from 'react';
import { UniformPlaceholder } from '../../common';
import type { TeamUniformProps } from '../../types';

export const MyTeamUniform: React.FC<TeamUniformProps> = ({
  teamId,
  teamData,
  text,
  number,
  mainColor,
  subColor,
  outlineColor,
  containerWidth = 300,
  containerHeight = 350,
  style,
}) => {
  // 팀 기본 설정
  const defaultText = text || teamData?.name || '우리팀';
  const defaultNumber = number || '10';

  // 팀 색상 설정
  const teamMainColor = mainColor || teamData?.mainColor || '#FF5722';
  const teamSubColor = subColor || teamData?.subColor || '#ffffff';
  const teamOutlineColor = outlineColor || teamData?.darkMainColor || '#D84315';

  // 선수 번호별 이름 매핑
  const getPlayerInfo = (num: string | number) => {
    const playerMap: { [key: string]: string } = {
      '7': '김철수',
      '10': '이영희',
      '23': '박민수',
    };
    return playerMap[String(num)] || defaultText;
  };

  const playerName = getPlayerInfo(defaultNumber);

  return (
    <UniformPlaceholder
      text={playerName}
      number={defaultNumber}
      mainColor={teamMainColor}
      subColor={teamSubColor}
      outlineColor={teamOutlineColor}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      style={style}
    />
  );
};
```

### 5단계: 팀 설정 통합

```tsx
// teams/[팀이름]/index.ts
import { MyTeamDecoration } from './MyTeamDecoration';
import { MyTeamUniform } from './MyTeamUniform';
import type { TeamCustomizationConfig } from '../../types';

export const myTeamCustomization: TeamCustomizationConfig = {
  teamId: 'myteam', // 팀 ID (데이터베이스 연동시 팀 이름으로 매핑)
  teamName: '우리팀',

  // 장식 요소 설정
  decoration: {
    component: MyTeamDecoration,
    props: {
      width: 32,
      height: 120,
      opacity: 0.7,
      position: 'bottom-left'
    },
    enabled: true
  },

  // 유니폼 플레이스홀더 설정
  uniform: {
    component: MyTeamUniform,
    props: {
      text: '우리팀',
      number: '10',
      containerWidth: 300,
      containerHeight: 350
    },
    enabled: true
  },

  // 팀별 스타일 오버라이드
  styles: {
    decoration: () => ({
      position: 'absolute',
      bottom: 16,
      left: 16,
      zIndex: 10,
    }),
    uniform: () => ({
      // 유니폼 관련 스타일 오버라이드
    }),
    postCard: () => ({
      // PostCard 전체 스타일 오버라이드
    })
  }
};

export { MyTeamDecoration, MyTeamUniform };
export default myTeamCustomization;
```

### 6단계: 시스템에 등록

```tsx
// lib/team-customization/index.ts
export function initializeTeamCustomizations(): void {
  import('./registry').then(({ TeamCustomizationRegistry }) => {
    // 기존 팀들...
    
    // 새로운 팀 추가
    import('./teams/myteam').then(({ default: myTeamConfig }) => {
      TeamCustomizationRegistry.register(myTeamConfig);
    });
  });
}

// useTeamCustomization.ts에 팀 이름 매핑 추가
const teamNameMapping: { [key: string]: string } = {
  // 기존 매핑들...
  '우리팀': 'myteam',
  'My Team': 'myteam',
};
```

## 🛠️ 공용 컴포넌트 활용하기

### 기본 장식 패턴들

```tsx
import { 
  BaseSVGDecoration, 
  createVerticalStripes, 
  createCirclePattern, 
  createDiagonalLines 
} from '@/lib/team-customization';

// 세로 스트라이프 (두산 스타일)
<BaseSVGDecoration
  renderSVG={createVerticalStripes(3, 6)} // 3개 줄, 6px 굵기
/>

// 원형 패턴 (삼성 스타일)
<BaseSVGDecoration
  renderSVG={createCirclePattern(3, 'vertical')} // 3개 원, 세로 배치
/>

// 대각선 패턴
<BaseSVGDecoration
  renderSVG={createDiagonalLines(4, 'left-to-right', 2)} // 4개 선, 좌→우, 2px
/>
```

### 유니폼 컴포넌트

```tsx
import { UniformPlaceholder } from '@/lib/team-customization';

// 기본 사용
<UniformPlaceholder
  text="김택연"
  number="63"
  mainColor="#1a237e"
  subColor="#ffffff"
  outlineColor="#0d1642"
/>
```

## 🎯 팀 ID 매칭 시스템

시스템은 다음 순서로 팀을 매칭합니다:

1. **UUID 직접 매칭**: `post.teamId`로 직접 조회
2. **팀 이름 매핑**: `teamData.name`을 기준으로 매핑 테이블에서 조회
3. **없으면 기본값**: 커스터마이징이 없는 경우 기본 컴포넌트 사용

```tsx
// useTeamCustomization.ts 내부 매핑 테이블
const teamNameMapping: { [key: string]: string } = {
  '두산': 'doosan',
  '두산베어스': 'doosan',
  '삼성': 'samsung',
  '삼성라이온즈': 'samsung',
  // 새로운 팀 추가 시 여기에 추가
};
```

## 🔧 고급 사용법

### 조건부 커스터마이징

```tsx
const teamCustomization = useTeamCustomization(teamId, teamData);

// 특정 컴포넌트만 확인
if (teamCustomization.hasDecoration) {
  // 장식 요소만 렌더링
}

if (teamCustomization.hasUniform) {
  // 유니폼만 렌더링
}
```

### 여러 팀 상태 확인

```tsx
import { useRegisteredTeams } from '@/lib/team-customization';

function AdminPanel() {
  const registeredTeams = useRegisteredTeams();
  
  return (
    <View>
      <Text>등록된 팀: {registeredTeams.join(', ')}</Text>
    </View>
  );
}
```

## 🎨 스타일링 가이드

### 위치 지정

```tsx
// 장식 요소 위치
position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

// 스타일 오버라이드
styles: {
  decoration: () => ({
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 10,
  })
}
```

### 색상 시스템

```tsx
// 우선순위: props > teamData > defaultColor
const finalColor = color || teamData?.mainColor || '#34445F';
```

## 🚨 주의사항

1. **플랫폼 호환성**: SVG는 모바일에서만 지원, 웹은 CSS fallback 필수
2. **성능**: SVG 컴포넌트는 동적 import로 지연 로딩됨
3. **타입 안전성**: TeamCustomizationConfig 인터페이스를 준수해야 함
4. **팀 이름 매핑**: 새로운 팀 추가 시 useTeamCustomization.ts의 매핑 테이블 업데이트 필요

## 📝 예제

전체 예제는 `teams/doosan/` 및 `teams/samsung/` 폴더를 참고하세요.

- **두산 베어스**: 세로 스트라이프 패턴
- **삼성 라이온즈**: 원형 패턴

새로운 팀 추가 시 이들을 템플릿으로 활용할 수 있습니다.