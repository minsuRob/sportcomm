import { DataSource } from 'typeorm';
import { Sport, Team } from '../../entities';

/**
 * 스포츠 및 팀 초기 데이터 시드
 *
 * 시스템에 기본 스포츠 카테고리와 팀 데이터를 생성합니다.
 */
export async function seedSportsAndTeams(
  dataSource: DataSource,
): Promise<void> {
  const sportRepository = dataSource.getRepository(Sport);
  const teamRepository = dataSource.getRepository(Team);

  console.log('🏆 스포츠 및 팀 데이터 시드 시작...');

  // 스포츠 카테고리 데이터
  const sportsData = [
    {
      name: '축구',
      icon: '⚽',
      description: '전 세계에서 가장 인기 있는 스포츠',
      sortOrder: 1,
      teams: [
        {
          name: '토트넘',
          code: 'TOTTENHAM',
          color: '#132257',
          icon: '⚽',
          description: '토트넘 홋스퍼 FC',
          sortOrder: 1,
        },
        {
          name: '뉴캐슬',
          code: 'NEWCASTLE',
          color: '#241F20',
          icon: '⚽',
          description: '뉴캐슬 유나이티드 FC',
          sortOrder: 2,
        },
        {
          name: '아틀레티코',
          code: 'ATLETICO_MADRID',
          color: '#CE2029',
          icon: '⚽',
          description: '아틀레티코 마드리드',
          sortOrder: 3,
        },
        {
          name: '맨시티',
          code: 'MANCHESTER_CITY',
          color: '#6CABDD',
          icon: '⚽',
          description: '맨체스터 시티 FC',
          sortOrder: 4,
        },
        {
          name: '리버풀',
          code: 'LIVERPOOL',
          color: '#C8102E',
          icon: '⚽',
          description: '리버풀 FC',
          sortOrder: 5,
        },
      ],
    },
    {
      name: '야구',
      icon: '⚾',
      description: '한국 프로야구 KBO 리그',
      sortOrder: 2,
      teams: [
        {
          name: '두산',
          code: 'DOOSAN_BEARS',
          color: '#131230',
          icon: '⚾',
          description: '두산 베어스',
          sortOrder: 1,
        },
        {
          name: '한화',
          code: 'HANWHA_EAGLES',
          color: '#FF6600',
          icon: '⚾',
          description: '한화 이글스',
          sortOrder: 2,
        },
        {
          name: 'LG',
          code: 'LG_TWINS',
          color: '#C30452',
          icon: '⚾',
          description: 'LG 트윈스',
          sortOrder: 3,
        },
        {
          name: '삼성',
          code: 'SAMSUNG_LIONS',
          color: '#074CA1',
          icon: '⚾',
          description: '삼성 라이온즈',
          sortOrder: 4,
        },
        {
          name: 'KIA',
          code: 'KIA_TIGERS',
          color: '#EA0029',
          icon: '⚾',
          description: 'KIA 타이거즈',
          sortOrder: 5,
        },
      ],
    },
    {
      name: 'e스포츠',
      icon: '🎮',
      description: '리그 오브 레전드 LCK',
      sortOrder: 3,
      teams: [
        {
          name: 'T1',
          code: 'T1',
          color: '#E2012D',
          icon: '🎮',
          description: 'T1 (구 SK Telecom T1)',
          sortOrder: 1,
        },
        {
          name: 'Gen.G',
          code: 'GENG',
          color: '#AA8B56',
          icon: '🎮',
          description: 'Gen.G Esports',
          sortOrder: 2,
        },
        {
          name: 'DRX',
          code: 'DRX',
          color: '#2E5BFF',
          icon: '🎮',
          description: 'DRX',
          sortOrder: 3,
        },
        {
          name: 'KT',
          code: 'KT_ROLSTER',
          color: '#D4002A',
          icon: '🎮',
          description: 'KT 롤스터',
          sortOrder: 4,
        },
        {
          name: '담원',
          code: 'DAMWON_KIA',
          color: '#004B9F',
          icon: '🎮',
          description: '담원 기아',
          sortOrder: 5,
        },
      ],
    },
  ];

  // 스포츠 및 팀 데이터 생성
  for (const sportData of sportsData) {
    // 이미 존재하는 스포츠인지 확인
    let sport = await sportRepository.findOne({
      where: { name: sportData.name },
    });

    if (!sport) {
      // 스포츠 생성
      sport = sportRepository.create({
        name: sportData.name,
        icon: sportData.icon,
        description: sportData.description,
        sortOrder: sportData.sortOrder,
        isActive: true,
      });
      sport = await sportRepository.save(sport);
      console.log(`✅ 스포츠 생성: ${sport.name}`);
    } else {
      console.log(`⏭️  스포츠 이미 존재: ${sport.name}`);
    }

    // 팀 데이터 생성
    for (const teamData of sportData.teams) {
      // 이미 존재하는 팀인지 확인
      const existingTeam = await teamRepository.findOne({
        where: { code: teamData.code },
      });

      if (!existingTeam) {
        const team = teamRepository.create({
          name: teamData.name,
          code: teamData.code,
          color: teamData.color,
          icon: teamData.icon,
          description: teamData.description,
          sortOrder: teamData.sortOrder,
          isActive: true,
          sportId: sport.id,
        });
        await teamRepository.save(team);
        console.log(`  ✅ 팀 생성: ${team.name} (${sport.name})`);
      } else {
        // 기존 팀의 sportId 업데이트 (항상 업데이트)
        existingTeam.sportId = sport.id;
        existingTeam.name = teamData.name;
        existingTeam.color = teamData.color;
        existingTeam.icon = teamData.icon;
        existingTeam.description = teamData.description;
        existingTeam.sortOrder = teamData.sortOrder;
        existingTeam.isActive = true;
        await teamRepository.save(existingTeam);
        console.log(`  🔄 팀 업데이트: ${teamData.name} -> ${sport.name}`);
      }
    }
  }

  console.log('🎉 스포츠 및 팀 데이터 시드 완료!');
}

/**
 * 시드 스크립트 실행 함수
 * 개발 환경에서 직접 실행할 수 있습니다.
 */
export async function runSportsTeamsSeed(): Promise<void> {
  const { AppDataSource } = await import('../datasource');

  try {
    await AppDataSource.initialize();
    console.log('📊 데이터베이스 연결 성공');

    await seedSportsAndTeams(AppDataSource);

    console.log('✨ 시드 작업 완료');
  } catch (error) {
    console.error('❌ 시드 작업 실패:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 데이터베이스 연결 종료');
  }
}

// 스크립트가 직접 실행될 때
if (require.main === module) {
  runSportsTeamsSeed()
    .then(() => {
      console.log('🚀 시드 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 시드 스크립트 실행 실패:', error);
      process.exit(1);
    });
}
