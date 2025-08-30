import React from 'react';
import { View, ViewStyle } from 'react-native';
import { isWeb } from '@/lib/platform';
import type { TeamDecorationProps } from '../../types';

/**
 * KIADecoration
 * - 부모 컨테이너의 가로 폭에 맞춰 자동으로 리사이징되는 반응형 SVG 장식 컴포넌트
 * - 기본 디자인 해상도(baseWidth x baseHeight)를 기준으로 aspectRatio를 고정하고,
 *   외부 부모 너비 변화에 따라 비율 유지한 채로 축소/확대
 * - width/height를 직접 지정하고 싶다면 responsive=false 로 설정
 *
 * 반응형 전략:
 * 1. responsive=true (기본값)
 *    - 바깥 컨테이너: width: '100%', aspectRatio = baseWidth / baseHeight
 *    - 내부 SVG: width/height 100% 로 채움 + viewBox = "0 0 baseWidth baseHeight"
 *    - 결과적으로 디자인 좌표계를 유지한 채로 균등 스케일
 * 2. responsive=false
 *    - 기존 구현과 동일: 명시된 width/height 픽셀 크기 사용
 *
 * preserveAspectRatio:
 * - maintainAspectRatio=true 인 경우: 'xMidYMid meet'
 * - false 인 경우: 'none' (좌표를 부모 영역에 강제 스트레치)
 */

// ThemedStyle을 ViewStyle로 변환 (팀 테마 함수 지원)
const resolveStyle = (style: any): ViewStyle => {
  if (typeof style === 'function') {
    return style({}); // 테마 객체가 필요하다면 확장 시 주입
  }
  return (style as ViewStyle) || {};
};

// react-native-svg 조건부 로드 (웹 환경에서 번들 오류 방지)
let Svg: any = null;
let Path: any = null;
try {
  if (!isWeb()) {
    const svgModule = require('react-native-svg');
    Svg = svgModule.Svg;
    Path = svgModule.Path;
  }
} catch (error) {
  console.warn('react-native-svg 로드 실패:', error);
}

// SVG 경로 타입
interface SVGPathData {
  d: string;
  fill: string;
}

// 확장 Props
interface KIADecorationProps extends TeamDecorationProps {
  svgPaths?: SVGPathData[];
  svgViewBox?: string;
  svgWidth?: number;          // (비반응형 모드 전용) 실제 렌더링 width
  svgHeight?: number;         // (비반응형 모드 전용) 실제 렌더링 height
  baseWidth?: number;         // 디자인 기준 너비 (반응형 계산 용)
  baseHeight?: number;        // 디자인 기준 높이 (반응형 계산 용)
  responsive?: boolean;       // true: 부모 폭 100% + aspectRatio 유지
  maintainAspectRatio?: boolean; // false 면 stretch
  maxWidthPercent?: number | string; // 반응형일 때 최대 폭 (기본 '100%')
}

// 기본 SVG path 데이터
const defaultKIASvgPaths: SVGPathData[] = [
  { d: 'M17.0896 0.999512L274.809 107V242H17.0896V0.999512Z', fill: '#F00316' },
  { d: 'M16.2068 1.49978L274.833 72.9019L274.793 108.592L16.2068 1.49978Z', fill: '#211F24' },
  { d: 'M529.91 0.999512L272.191 107V242H529.91V0.999512Z', fill: '#F00316' },
  { d: 'M530.793 0.499779L272.167 71.9019L272.207 107.592L530.793 0.499779Z', fill: '#211F24' },
];

/**
 * 기아 전용 장식 컴포넌트
 */
export const KIADecoration: React.FC<KIADecorationProps> = ({
  teamId,
  teamData,
  // width / height: 비반응형일 때 사용할 크기 (기존 호환)
  width = 535,
  height = 242,
  color,
  opacity = 0.5,
  position,
  style,
  svgPaths = defaultKIASvgPaths,
  svgViewBox,
  svgWidth,
  svgHeight,
  baseWidth = 535,
  baseHeight = 242,
  responsive = true,
  maintainAspectRatio = true,
  maxWidthPercent = '100%',
}) => {
  // 팀 색상 (덮어쓰기 로직 확장 가능)
  const decorationColor =
    color ||
    teamData?.decorationBorder ||
    teamData?.mainColor ||
    '#EA0029';

  const resolvedStyle = resolveStyle(style);

  // 반응형/비반응형에 따른 컨테이너 및 SVG 크기 계산
  const designWidth = baseWidth;
  const designHeight = baseHeight;
  const aspectRatio = designWidth / designHeight;

  // 비반응형 모드일 때 사용할 실제 렌더링 크기
  const fixedRenderWidth = svgWidth || width;
  const fixedRenderHeight = svgHeight || height;

  // viewBox (좌표계)
  const finalViewBox =
    svgViewBox || `0 0 ${designWidth} ${designHeight}`;

  // 경로 컬러 오버레이(필요 시 확장). 현재는 원본 색상 유지
  const processedSvgPaths = svgPaths.map((p) => ({
    ...p,
    // 필요 시 색상 커스터마이징:
    // fill: p.fill === '#F00316' ? decorationColor : p.fill,
  }));

  /**
   * 웹 렌더링
   * - responsive=true: 컨테이너가 부모 폭을 채움. aspectRatio 유지.
   * - responsive=false: 고정 width/height 사용.
   */
  if (isWeb()) {
    if (responsive) {
      return (
        <View
          style={[
            {
              // 부모 폭에 맞춰 확장 (RN 타입 충돌 회피 위해 width 생략, 내부 div가 100% 채움)
              aspectRatio,
              opacity,
              position: 'relative',
              overflow: 'hidden',
            },
            resolvedStyle,
          ]}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            }}
            // 인라인 SVG: width/height 100% 로 컨테이너 채움
            dangerouslySetInnerHTML={{
              __html: `
                <svg
                  width="100%"
                  height="100%"
                  viewBox="${finalViewBox}"
                  preserveAspectRatio="${maintainAspectRatio ? 'xMidYMid meet' : 'none'}"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  ${processedSvgPaths
                    .map(
                      (path) =>
                        `<path d="${path.d}" fill="${path.fill}" />`
                    )
                    .join('')}
                </svg>
              `,
            }}
          />
        </View>
      );
    }

    // 비반응형 (기존 방식 유지)
    return (
      <View
        style={[
          {
            width: fixedRenderWidth,
            height: fixedRenderHeight,
            opacity,
            overflow: 'hidden',
            position: 'relative',
          },
          resolvedStyle,
        ]}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
          }}
          dangerouslySetInnerHTML={{
            __html: `
              <svg
                width="100%"
                height="100%"
                viewBox="${finalViewBox}"
                preserveAspectRatio="${maintainAspectRatio ? 'xMidYMid meet' : 'none'}"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                ${processedSvgPaths
                  .map(
                    (path) =>
                      `<path d="${path.d}" fill="${path.fill}" />`
                  )
                  .join('')}
              </svg>
            `,
          }}
        />
      </View>
    );
  }

  /**
   * 모바일 (react-native-svg)
   * - responsive=true: width: '100%' + aspectRatio 사용
   * - responsive=false: 고정 width/height
   */
  if (!Svg || !Path) {
    // react-native-svg 불가 시 fallback
    return (
      <View
        style={[
          responsive
            ? {
                width: '100%',
                aspectRatio,
                opacity,
              }
            : {
                width: fixedRenderWidth,
                height: fixedRenderHeight,
                opacity,
              },
          resolvedStyle,
        ]}
      />
    );
  }

  if (responsive) {
    return (
      <View
        style={[
          {
            width: '100%',
            aspectRatio,
            opacity,
            position: 'relative',
            overflow: 'hidden',
          },
          resolvedStyle,
        ]}
      >
        <Svg
          // react-native-svg 는 퍼센트 지원X -> '100%' 사용 가능(웹), RN 에서는 숫자 필요
          // width/height 대신 flex & absolute 로 전체 채움
          // -> 여기서는 width/height undefined + style 로 채움
          // 안전하게 width/height '100%' 시도 (플랫폼 별 처리)
          width="100%"
          height="100%"
          viewBox={finalViewBox}
          preserveAspectRatio={maintainAspectRatio ? 'xMidYMid meet' : 'none'}
          fill="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          {processedSvgPaths.map((path, idx) => (
            <Path key={idx} d={path.d} fill={path.fill} />
          ))}
        </Svg>
      </View>
    );
  }

  // 비반응형
  return (
    <View
      style={[
        {
          width: fixedRenderWidth,
            height: fixedRenderHeight,
          opacity,
        },
        resolvedStyle,
      ]}
    >
      <Svg
        width={fixedRenderWidth}
        height={fixedRenderHeight}
        viewBox={finalViewBox}
        preserveAspectRatio={maintainAspectRatio ? 'xMidYMid meet' : 'none'}
        fill="none"
      >
        {processedSvgPaths.map((path, idx) => (
          <Path key={idx} d={path.d} fill={path.fill} />
        ))}
      </Svg>
    </View>
  );
};

// commit: feat(kia): KIADecoration 반응형 aspectRatio 스케일링 적용
