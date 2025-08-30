import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/lib/theme/context';
import type { ThemedStyle } from '@/lib/theme/types';
import type { TeamDecorationProps, DecorationItem, TeamData } from '../types';

/**
 * 팀별 decoration 렌더링 컴포넌트
 *
 * 다중 decoration을 지원하며, position에 따라 자동으로 스타일을 적용합니다.
 * PostCard에서 팀별 커스터마이징 로직을 분리하여 코드 간소화에 기여합니다.
 * PostActions 영역과 겹치지 않도록 z-index와 위치를 조정했습니다.
 */

export interface TeamDecorationRendererProps {
  teamId: string;
  teamData: TeamData;
  decorations: DecorationItem[];
  color?: string;
  teamPalette: {
    borderColor?: string;
    glowColor?: string;
  };
  categoryInfo: {
    colors: {
      border: string;
      glow: string;
    };
  };
}

/**
 * position에 따른 스타일 매핑
 * PostActions 바로 위에 위치하도록 조정했습니다.
 */
const getPositionStyle = (position?: string): ViewStyle => {
  switch (position) {
    case 'top-left':
      return { top: 0, left: 0 };
    case 'top-right':
      return { top: 16, right: 16 };
    case 'bottom-left':
      return { bottom: 60, left: 16 }; // PostActions 바로 위로 조정
    case 'bottom-right':
      return { bottom: 60, right: 16 }; // PostActions 바로 위로 조정
    default:
      return { bottom: 60, left: 16 }; // 기본값도 PostActions 바로 위로 조정
  }
};

/**
 * 기본 decoration 컨테이너 스타일
 * PostActions 영역과 겹치지 않도록 z-index를 조정했습니다.
 */
const $decorationContainer: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  zIndex: 1, // 다른 UI 요소들(zIndex: 2, 3)보다 뒤에, uniformBackground(zIndex: 1)보다는 앞에 위치
});

export const TeamDecorationRenderer: React.FC<TeamDecorationRendererProps> = ({
  teamId,
  teamData,
  decorations,
  color,
  teamPalette,
  categoryInfo,
}) => {
  const { themed } = useAppTheme();

  // decoration이 없으면 렌더링하지 않음
  if (!decorations || decorations.length === 0) {
    return null;
  }

  return (
    <>
      {decorations.map((decoration, index) => {
        const { component: DecorationComponent, props, enabled } = decoration;

        // 비활성화된 decoration은 건너뜀
        if (!enabled || !DecorationComponent) {
          return null;
        }

        // position에 따른 스타일 계산
        const position = props?.position || 'bottom-left';
        const positionStyle = getPositionStyle(position);

        // decoration props 구성
        const decorationProps: TeamDecorationProps = {
          teamId,
          teamData,
          color: color || teamPalette.borderColor || categoryInfo.colors.border,
          ...props,
        };

        return (
          <View
            key={`${teamId}-decoration-${index}-${position}`}
            style={[
              themed($decorationContainer),
              positionStyle,
            ]}
          >
            <DecorationComponent {...decorationProps} />
          </View>
        );
      })}
    </>
  );
};

export default TeamDecorationRenderer;
