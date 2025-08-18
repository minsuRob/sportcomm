import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
// import { Cron, CronExpression } from '@nestjs/schedule'; // 패키지 설치 후 활성화
import {
  PointLottery,
  LotteryStatus,
} from '../../entities/point-lottery.entity';
import { LotteryEntry } from '../../entities/lottery-entry.entity';
import { User } from '../../entities/user.entity';

/**
 * 포인트 추첨 서비스
 *
 * 60분마다 진행되는 포인트 추첨 시스템을 관리합니다.
 * 자동 추첨 생성, 응모 처리, 당첨자 선정 등의 기능을 제공합니다.
 */
@Injectable()
export class LotteryService {
  constructor(
    @InjectRepository(PointLottery)
    private readonly lotteryRepository: Repository<PointLottery>,
    @InjectRepository(LotteryEntry)
    private readonly entryRepository: Repository<LotteryEntry>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    // 서비스 시작 시 초기 추첨 생성
    this.initializeLotterySystem();
  }

  /**
   * 추첨 시스템 초기화
   */
  private async initializeLotterySystem(): Promise<void> {
    try {
      // 잠시 대기 후 초기화 (데이터베이스 연결 완료 대기)
      setTimeout(async () => {
        const currentLottery = await this.lotteryRepository.findOne({
          where: [
            { status: LotteryStatus.ACTIVE },
            { status: LotteryStatus.ANNOUNCING },
          ],
          order: { createdAt: 'DESC' },
        });

        if (!currentLottery) {
          console.log('🎰 초기 추첨을 생성합니다...');
          const newLottery = await this.createNextLottery();
          if (newLottery) {
            console.log(
              `🎰 초기 추첨 생성 완료: ${newLottery.roundNumber}회차`,
            );
          }
        } else {
          console.log(
            `✅ 기존 추첨이 있습니다: ${currentLottery.roundNumber}회차`,
          );
        }
      }, 3000); // 3초 후 실행
    } catch (error) {
      console.error('❌ 추첨 시스템 초기화 실패:', error);
    }
  }

  /**
   * 현재 진행 중인 추첨 조회 (응모 중 또는 결과 발표 중)
   * 추첨이 없으면 자동으로 생성
   */
  async getCurrentLottery(): Promise<PointLottery | null> {
    const now = new Date();

    let currentLottery = await this.lotteryRepository.findOne({
      where: [
        {
          status: LotteryStatus.ACTIVE,
          startTime: MoreThan(new Date(now.getTime() - 60 * 60 * 1000)), // 1시간 전부터
        },
        {
          status: LotteryStatus.ANNOUNCING,
          startTime: MoreThan(new Date(now.getTime() - 60 * 60 * 1000)), // 1시간 전부터
        },
      ],
      relations: ['entries', 'entries.user'],
      order: { createdAt: 'DESC' },
    });

    // 진행 중인 추첨이 없으면 새로 생성
    if (!currentLottery) {
      console.log('🎰 진행 중인 추첨이 없어 새로 생성합니다...');
      currentLottery = await this.createNextLottery();

      // 생성에 실패한 경우 다시 조회
      if (!currentLottery) {
        currentLottery = await this.lotteryRepository.findOne({
          where: [
            { status: LotteryStatus.ACTIVE },
            { status: LotteryStatus.ANNOUNCING },
          ],
          relations: ['entries', 'entries.user'],
          order: { createdAt: 'DESC' },
        });
      }
    }

    return currentLottery;
  }

  /**
   * 추첨 응모
   */
  async enterLottery(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LotteryEntry> {
    // 현재 진행 중인 추첨 확인 (없으면 자동 생성)
    const currentLottery = await this.getCurrentLottery();
    if (!currentLottery) {
      throw new NotFoundException('추첨 생성에 실패했습니다.');
    }

    // 응모 가능 시간 확인
    if (!currentLottery.canEnter()) {
      throw new BadRequestException('응모 가능한 시간이 아닙니다.');
    }

    // 중복 응모 확인
    const existingEntry = await this.entryRepository.findOne({
      where: {
        userId,
        lotteryId: currentLottery.id,
      },
    });

    if (existingEntry) {
      throw new ConflictException('이미 이번 추첨에 응모하셨습니다.');
    }

    // 사용자 존재 확인
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 응모 기록 생성
    console.log('🔍 응모 기록 생성:', {
      userId,
      lotteryId: currentLottery.id,
      currentLottery: currentLottery,
      ipAddress,
      userAgent,
    });

    if (!currentLottery.id) {
      throw new Error('추첨 ID가 없습니다.');
    }

    const entry = LotteryEntry.create(
      userId,
      currentLottery.id,
      ipAddress,
      userAgent,
    );

    const savedEntry = await this.entryRepository.save(entry);

    // // 추첨 응모자 수 증가
    // currentLottery.incrementEntries();
    // await this.lotteryRepository.save(currentLottery);
    // 추첨 응모자 수 증가 (직접 업데이트)
    await this.lotteryRepository.update(
      { id: currentLottery.id },
      { totalEntries: () => '"totalEntries" + 1' },
    );
    //
    /**
     * TODO: 애매한 부분 - 이것으로 에러가 다 해결될지 체크해야함.
     * update는 totalEntries 필드만 직접 업데이트하며, entries 배열이나 관계 데이터를 건드리지 않음.
     * 따라서 lottery_entries 테이블에 대한 불필요한 업데이트가 발생하지 않아 lotteryId가 null로 설정되는 문제를 방지.
     */

    // 관계 데이터 포함하여 반환
    return (await this.entryRepository.findOne({
      where: { id: savedEntry.id },
      relations: ['user', 'lottery'],
    })) as LotteryEntry;
  }

  /**
   * 사용자의 응모 상태 확인
   */
  async getUserEntryStatus(userId: string): Promise<{
    hasEntered: boolean;
    entry?: LotteryEntry;
    currentLottery?: PointLottery;
  }> {
    const currentLottery = await this.getCurrentLottery();

    if (!currentLottery) {
      return { hasEntered: false };
    }

    const entry = await this.entryRepository.findOne({
      where: {
        userId,
        lotteryId: currentLottery.id,
      },
      relations: ['lottery'],
    });

    return {
      hasEntered: !!entry,
      entry: entry ?? undefined,
      currentLottery,
    };
  }

  /**
   * 추첨 이력 조회
   */
  async getLotteryHistory(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    lotteries: PointLottery[];
    total: number;
    hasMore: boolean;
  }> {
    const [lotteries, total] = await this.lotteryRepository.findAndCount({
      where: { status: LotteryStatus.COMPLETED },
      relations: ['entries', 'entries.user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      lotteries,
      total,
      hasMore: total > page * limit,
    };
  }

  /**
   * 매시 정각에 새로운 추첨 생성 (크론 작업)
   * TODO: @nestjs/schedule 패키지 설치 후 @Cron(CronExpression.EVERY_HOUR) 데코레이터 추가
   */
  // @Cron(CronExpression.EVERY_HOUR)
  async createNewLottery(): Promise<void> {
    console.log('🎰 새로운 포인트 추첨 생성 중...');

    try {
      // 이전 추첨 완료 처리
      await this.completeActiveLotteries();

      // 현재 진행 중인 추첨이 있는지 확인
      const currentLottery = await this.getCurrentLottery();
      if (currentLottery) {
        console.log('이미 진행 중인 추첨이 있습니다.');
        return;
      }

      // 다음 회차 번호 계산
      const lastLottery = await this.lotteryRepository.findOne({
        order: { roundNumber: 'DESC' },
      });
      const nextRoundNumber = (lastLottery?.roundNumber || 0) + 1;

      // 새 추첨 생성 - 정각부터 시작
      const startTime = new Date();
      startTime.setMinutes(0, 0, 0); // 정각으로 설정

      const endTime = PointLottery.getEndTime(startTime); // 50분 후
      const announceTime = PointLottery.getAnnounceTime(startTime); // 50분 후
      const finalEndTime = PointLottery.getFinalEndTime(startTime); // 60분 후

      // 상금 랜덤 설정 (500P ~ 2000P)
      const totalPrize = Math.floor(Math.random() * 1500) + 500;
      const winnerCount = 5;
      const prizePerWinner = Math.floor(totalPrize / winnerCount);

      const newLottery = this.lotteryRepository.create({
        roundNumber: nextRoundNumber,
        startTime,
        endTime,
        announceTime,
        finalEndTime,
        status: LotteryStatus.ACTIVE,
        totalPrize,
        winnerCount,
        prizePerWinner,
        totalEntries: 0,
      });

      await this.lotteryRepository.save(newLottery);

      console.log(
        `✅ ${nextRoundNumber}회차 추첨 생성 완료 (상금: ${totalPrize}P)`,
        `\n📅 응모 기간: ${startTime.toLocaleTimeString()} ~ ${endTime.toLocaleTimeString()}`,
        `\n🎊 발표 기간: ${announceTime.toLocaleTimeString()} ~ ${finalEndTime.toLocaleTimeString()}`,
      );
    } catch (error) {
      console.error('❌ 추첨 생성 실패:', error);
    }
  }

  /**
   * 활성 추첨들의 상태 업데이트 및 완료 처리
   */
  private async completeActiveLotteries(): Promise<void> {
    const now = new Date();

    // 응모 기간이 끝난 ACTIVE 추첨들을 ANNOUNCING으로 변경
    const activeLotteries = await this.lotteryRepository.find({
      where: { status: LotteryStatus.ACTIVE },
      relations: ['entries', 'entries.user'],
    });

    for (const lottery of activeLotteries) {
      if (now >= lottery.endTime) {
        await this.startAnnouncementPhase(lottery);
      }
    }

    // 발표 기간이 끝난 ANNOUNCING 추첨들을 COMPLETED로 변경
    const announcingLotteries = await this.lotteryRepository.find({
      where: { status: LotteryStatus.ANNOUNCING },
      relations: ['entries', 'entries.user'],
    });

    for (const lottery of announcingLotteries) {
      if (now >= lottery.finalEndTime) {
        lottery.complete();
        await this.lotteryRepository.save(lottery);
        console.log(`✅ ${lottery.roundNumber}회차 추첨 완전 종료`);

        // 다음 추첨 자동 생성 (재귀 호출 방지를 위해 별도 메서드로)
        const newLottery = await this.createNextLottery();
        if (newLottery) {
          console.log(
            `🎰 새 추첨 자동 생성 완료: ${newLottery.roundNumber}회차`,
          );
        }
      }
    }
  }

  /**
   * 결과 발표 단계 시작
   */
  private async startAnnouncementPhase(lottery: PointLottery): Promise<void> {
    console.log(`🎲 ${lottery.roundNumber}회차 결과 발표 시작...`);

    const entries = await this.entryRepository.find({
      where: { lotteryId: lottery.id },
      relations: ['user'],
    });

    if (entries.length === 0) {
      console.log('📭 응모자가 없어 추첨을 건너뜁니다.');
      lottery.startAnnouncement([]);
      await this.lotteryRepository.save(lottery);
      return;
    }

    // 당첨자 선정 (랜덤)
    const winnerCount = Math.min(lottery.winnerCount, entries.length);
    const shuffledEntries = entries.sort(() => Math.random() - 0.5);
    const winners = shuffledEntries.slice(0, winnerCount);

    const winnerIds: string[] = [];

    // 당첨자 처리
    for (const winnerEntry of winners) {
      // 응모 기록 업데이트
      winnerEntry.markAsWinner(lottery.prizePerWinner);
      await this.entryRepository.save(winnerEntry);

      // 사용자 포인트 지급
      const user = winnerEntry.user;
      user.points = (user.points || 0) + lottery.prizePerWinner;
      await this.userRepository.save(user);

      winnerIds.push(user.id);

      console.log(`🎉 당첨자: ${user.nickname} (+${lottery.prizePerWinner}P)`);
    }

    // 결과 발표 시작
    lottery.startAnnouncement(winnerIds);
    await this.lotteryRepository.save(lottery);

    console.log(
      `🎊 ${lottery.roundNumber}회차 결과 발표 시작 (${winnerCount}명 당첨, 10분간 공개)`,
    );
  }

  /**
   * 다음 추첨 생성 (재귀 호출 방지용)
   */
  private async createNextLottery(): Promise<PointLottery | null> {
    try {
      // 다음 회차 번호 계산
      const lastLottery = await this.lotteryRepository.findOne({
        where: {},
        order: { roundNumber: 'DESC' },
      });
      const nextRoundNumber = (lastLottery?.roundNumber || 0) + 1;

      // 새 추첨 생성 - 현재 시간부터 시작
      const startTime = new Date();
      startTime.setSeconds(0, 0); // 초와 밀리초 초기화

      const endTime = PointLottery.getEndTime(startTime); // 50분 후
      const announceTime = PointLottery.getAnnounceTime(startTime); // 50분 후
      const finalEndTime = PointLottery.getFinalEndTime(startTime); // 60분 후

      // 상금 랜덤 설정 (500P ~ 2000P)
      const totalPrize = Math.floor(Math.random() * 1500) + 500;
      const winnerCount = 5;
      const prizePerWinner = Math.floor(totalPrize / winnerCount);

      const newLottery = this.lotteryRepository.create({
        roundNumber: nextRoundNumber,
        startTime,
        endTime,
        announceTime,
        finalEndTime,
        status: LotteryStatus.ACTIVE,
        totalPrize,
        winnerCount,
        prizePerWinner,
        totalEntries: 0,
      });

      const savedLottery = await this.lotteryRepository.save(newLottery);

      console.log(
        `🎰 ${nextRoundNumber}회차 새 추첨 시작!`,
        `\n📅 응모 기간: ${startTime.toLocaleTimeString()} ~ ${endTime.toLocaleTimeString()}`,
        `\n🎊 발표 기간: ${announceTime.toLocaleTimeString()} ~ ${finalEndTime.toLocaleTimeString()}`,
        `\n🆔 추첨 ID: ${savedLottery.id}`,
      );

      return savedLottery;
    } catch (error) {
      console.error('❌ 다음 추첨 생성 실패:', error);
      return null;
    }
  }

  /**
   * 매 10분마다 추첨 상태 체크 및 업데이트 (크론 작업)
   * TODO: @nestjs/schedule 패키지 설치 후 크론 데코레이터 추가
   */
  // @Cron('*/10 * * * *') // 10분마다 실행
  async checkAndUpdateLotteryStatus(): Promise<void> {
    console.log('🔄 추첨 상태 체크 중...');

    const now = new Date();

    // 응모 기간이 끝난 ACTIVE 추첨들을 ANNOUNCING으로 변경
    const activeLotteries = await this.lotteryRepository.find({
      where: { status: LotteryStatus.ACTIVE },
      relations: ['entries', 'entries.user'],
    });

    for (const lottery of activeLotteries) {
      if (now >= lottery.endTime) {
        await this.startAnnouncementPhase(lottery);
      }
    }

    // 발표 기간이 끝난 ANNOUNCING 추첨들을 COMPLETED로 변경
    const announcingLotteries = await this.lotteryRepository.find({
      where: { status: LotteryStatus.ANNOUNCING },
    });

    for (const lottery of announcingLotteries) {
      if (now >= lottery.finalEndTime) {
        lottery.complete();
        await this.lotteryRepository.save(lottery);
        console.log(`✅ ${lottery.roundNumber}회차 추첨 완전 종료`);
      }
    }
  }

  /**
   * 특정 추첨의 당첨자 조회
   */
  async getLotteryWinners(lotteryId: string): Promise<LotteryEntry[]> {
    return await this.entryRepository.find({
      where: {
        lotteryId,
        isWinner: true,
      },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 사용자의 당첨 이력 조회
   */
  async getUserWinHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    entries: LotteryEntry[];
    total: number;
    totalWinnings: number;
  }> {
    const [entries, total] = await this.entryRepository.findAndCount({
      where: {
        userId,
        isWinner: true,
      },
      relations: ['lottery'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 총 당첨 포인트 계산
    const totalWinnings = entries.reduce(
      (sum, entry) => sum + (entry.prizePoints || 0),
      0,
    );

    return {
      entries,
      total,
      totalWinnings,
    };
  }

  // === 관리자 전용 메서드 ===

  /**
   * 관리자: 현재 진행 중인 추첨 강제 중단
   */
  async adminStopCurrentLottery(): Promise<boolean> {
    try {
      const currentLottery = await this.lotteryRepository.findOne({
        where: [
          { status: LotteryStatus.ACTIVE },
          { status: LotteryStatus.ANNOUNCING },
        ],
        order: { createdAt: 'DESC' },
      });

      if (!currentLottery) {
        console.log('중단할 진행 중인 추첨이 없습니다.');
        return false;
      }

      // 추첨 상태를 취소로 변경
      currentLottery.status = LotteryStatus.CANCELLED;
      currentLottery.updatedAt = new Date();
      await this.lotteryRepository.save(currentLottery);

      console.log(
        `🛑 관리자에 의해 ${currentLottery.roundNumber}회차 추첨이 중단되었습니다.`,
      );
      return true;
    } catch (error) {
      console.error('❌ 추첨 중단 실패:', error);
      return false;
    }
  }

  /**
   * 관리자: 커스텀 설정으로 새 추첨 생성
   */
  async adminCreateCustomLottery(
    totalPrize: number,
    winnerCount: number,
    durationMinutes: number = 50,
  ): Promise<PointLottery | null> {
    try {
      // 기존 진행 중인 추첨 중단
      await this.adminStopCurrentLottery();

      // 다음 회차 번호 계산
      const lastLottery = await this.lotteryRepository.findOne({
        where: {},
        order: { roundNumber: 'DESC' },
      });
      const nextRoundNumber = (lastLottery?.roundNumber || 0) + 1;

      // 새 추첨 생성 - 현재 시간부터 시작
      const startTime = new Date();
      startTime.setSeconds(0, 0); // 초와 밀리초 초기화

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);

      const announceTime = new Date(endTime);
      const finalEndTime = new Date(announceTime);
      finalEndTime.setMinutes(finalEndTime.getMinutes() + 10); // 10분간 발표

      const prizePerWinner = Math.floor(totalPrize / winnerCount);

      const newLottery = this.lotteryRepository.create({
        roundNumber: nextRoundNumber,
        startTime,
        endTime,
        announceTime,
        finalEndTime,
        status: LotteryStatus.ACTIVE,
        totalPrize,
        winnerCount,
        prizePerWinner,
        totalEntries: 0,
      });

      const savedLottery = await this.lotteryRepository.save(newLottery);

      console.log(
        `🎰 관리자가 ${nextRoundNumber}회차 커스텀 추첨을 생성했습니다!`,
        `\n💰 총 상금: ${totalPrize}P (${winnerCount}명, 개별 ${prizePerWinner}P)`,
        `\n📅 응모 기간: ${startTime.toLocaleTimeString()} ~ ${endTime.toLocaleTimeString()}`,
        `\n🎊 발표 기간: ${announceTime.toLocaleTimeString()} ~ ${finalEndTime.toLocaleTimeString()}`,
      );

      return savedLottery;
    } catch (error) {
      console.error('❌ 관리자 커스텀 추첨 생성 실패:', error);
      return null;
    }
  }

  /**
   * 관리자: 추첨 통계 조회
   */
  async getAdminLotteryStats(): Promise<{
    totalLotteries: number;
    activeLotteries: number;
    totalEntries: number;
    totalPrizeDistributed: number;
    averageParticipation: number;
  }> {
    try {
      // 전체 추첨 수
      const totalLotteries = await this.lotteryRepository.count();

      // 진행 중인 추첨 수
      const activeLotteries = await this.lotteryRepository.count({
        where: [
          { status: LotteryStatus.ACTIVE },
          { status: LotteryStatus.ANNOUNCING },
        ],
      });

      // 총 응모 수
      const totalEntries = await this.entryRepository.count();

      // 총 지급된 상금 (완료된 추첨만)
      const completedLotteries = await this.lotteryRepository.find({
        where: { status: LotteryStatus.COMPLETED },
      });
      const totalPrizeDistributed = completedLotteries.reduce(
        (sum, lottery) => sum + lottery.totalPrize,
        0,
      );

      // 평균 참여율
      const averageParticipation =
        totalLotteries > 0 ? totalEntries / totalLotteries : 0;

      return {
        totalLotteries,
        activeLotteries,
        totalEntries,
        totalPrizeDistributed,
        averageParticipation: Math.round(averageParticipation * 100) / 100,
      };
    } catch (error) {
      console.error('❌ 관리자 통계 조회 실패:', error);
      return {
        totalLotteries: 0,
        activeLotteries: 0,
        totalEntries: 0,
        totalPrizeDistributed: 0,
        averageParticipation: 0,
      };
    }
  }
}
