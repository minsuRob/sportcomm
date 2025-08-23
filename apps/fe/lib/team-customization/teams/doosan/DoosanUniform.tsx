import React from 'react';
import { UniformPlaceholder } from '@/components/uniform/UniformPlaceholder';
import type { TeamUniformProps } from '../../types';

/**
 * 두산 베어스 전용 유니폼 플레이스홀더 컴포넌트
 *
 * 두산 팀의 시그니처 색상과 스타일을 적용한 유니폼을 렌더링합니다.
 * 팀 데이터를 기반으로 동적으로 색상과 텍스트를 설정합니다.
 */
export const DoosanUniform: React.FC<TeamUniformProps> = ({
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
  // 두산 팀 기본 설정
  const defaultText = text || teamData?.name || '두산베어스';
  const defaultNumber = number || '10';

  // 두산 팀 색상 설정 (어두운 네이비 베이스)
  const doosanMainColor = mainColor || teamData?.mainColor || '#1a237e'; // 네이비 블루
  const doosanSubColor = subColor || teamData?.subColor || '#ffffff'; // 화이트
  const doosanOutlineColor = outlineColor || teamData?.darkMainColor || '#0d1642'; // 더 어두운 네이비

  // 두산 베어스 특별 번호 매핑 (유명 선수들)
  const getDoosanPlayerInfo = (num: string | number) => {
    const playerMap: { [key: string]: string } = {
      '10': '유희관',
      '24': '김재환',
      '27': '양의지',
      '31': '오재원',
      '36': '김택연',
      '50': '김선빈',
      '63': '김택연', // 기본값
    };

    return playerMap[String(num)] || defaultText;
  };

  const playerName = typeof defaultNumber === 'string' || typeof defaultNumber === 'number'
    ? getDoosanPlayerInfo(defaultNumber)
    : defaultText;

  return (
    <UniformPlaceholder
      text={playerName}
      number={defaultNumber}
      mainColor={doosanMainColor}
      subColor={doosanSubColor}
      outlineColor={doosanOutlineColor}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      style={style}
    />
  );
};
