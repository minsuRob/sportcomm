import { DoosanStripes } from './DoosanStripes';
import { DoosanUniform } from './DoosanUniform';
import type { TeamCustomizationConfig } from '../../types';

/**
 * 두산 베어스 팀 커스터마이징 설정
 *
 * 두산 베어스 팀의 고유한 디자인 요소들을 정의합니다.
 * - 세로 스트라이프 장식 (팀 시그니처)
 * - 커스텀 유니폼 플레이스홀더
 * - 팀 색상 및 스타일 설정
 */
export const doosanCustomization: TeamCustomizationConfig = {
  teamId: 'doosan',
  teamName: '두산 베어스',

  // 장식 요소 (스트라이프) - 양쪽 배치
  decoration: [
    {
      component: DoosanStripes,
      props: {
        width: 24,
        height: 120,
        opacity: 0.9,
        position: 'bottom-left'
      },
      enabled: true
    },
    {
      component: DoosanStripes,
      props: {
        width: 24,
        height: 120,
        opacity: 0.9,
        position: 'bottom-right'
      },
      enabled: true
    }
  ],

  // 유니폼 플레이스홀더
  uniform: {
    component: DoosanUniform,
    props: {
      text: '김택연',
      number: '63',
      containerWidth: 300,
      containerHeight: 350
    },
    enabled: true
  },

  // 팀별 스타일 오버라이드 (새로운 다중 decoration 시스템에서는 사용하지 않음)
  styles: {
    decoration: () => ({
      position: 'absolute',
      bottom: 16,
      left: 16,
      zIndex: 10,
    }),
    decorationRight: () => ({
      position: 'absolute',
      bottom: 16,
      right: 16,
      zIndex: 10,
    }),
    uniform: () => ({
      // 유니폼 관련 스타일 오버라이드
    }),
    postCard: () => ({
      // PostCard 전체 스타일 오버라이드 (필요시)
    })
  }
};

// 편의를 위한 개별 컴포넌트 export
export { DoosanStripes, DoosanUniform };

// 두산 팀 설정을 기본 export
export default doosanCustomization;
