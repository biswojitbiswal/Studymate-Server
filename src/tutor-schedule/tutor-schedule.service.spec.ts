import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TutorAvailibilityService } from './tutor-availibility.service';
import { TutorLeaveService } from './tutor-leave.service';
import { TutorTimeoffService } from './tutor-timeoff.service';

const createPrismaMock = () => ({
  tutor: { findUnique: jest.fn() },
  tutorAvailability: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  tutorLeave: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  tutorTimeOff: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  session: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
});

describe('TutorAvailibilityService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: TutorAvailibilityService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new TutorAvailibilityService(prisma as unknown as PrismaService);

    prisma.tutor.findUnique.mockResolvedValue({ id: 'tutor-1' });
    prisma.tutorLeave.findFirst.mockResolvedValue(null);
    prisma.tutorAvailability.findMany.mockResolvedValue([]);
    prisma.session.findMany.mockResolvedValue([]);
    prisma.tutorTimeOff.findMany.mockResolvedValue([]);
  });

  describe('getFreeAvailibility', () => {
    const date = '2026-09-23'; // Wednesday

    it('rejects an unknown tutor before calculating slots', async () => {
      prisma.tutor.findUnique.mockResolvedValue(null);

      await expect(
        service.getFreeAvailibility('missing', date),
      ).rejects.toThrow(new NotFoundException('Tutor account not found'));
      expect(prisma.tutorLeave.findFirst).not.toHaveBeenCalled();
    });

    it('returns no slots for a date covered by tutor leave', async () => {
      prisma.tutorLeave.findFirst.mockResolvedValue({ id: 'leave-1' });

      await expect(
        service.getFreeAvailibility('tutor-1', date),
      ).resolves.toEqual({ date, slots: [] });
      expect(prisma.tutorAvailability.findMany).not.toHaveBeenCalled();
      expect(prisma.session.findMany).not.toHaveBeenCalled();
    });

    it('returns no slots when the tutor has no active weekly availability', async () => {
      await expect(
        service.getFreeAvailibility('tutor-1', date),
      ).resolves.toEqual({ date, slots: [] });
      expect(prisma.session.findMany).not.toHaveBeenCalled();
      expect(prisma.tutorTimeOff.findMany).not.toHaveBeenCalled();
    });

    it('splits availability around sessions and multiple time-off periods', async () => {
      prisma.tutorAvailability.findMany.mockResolvedValue([
        { id: 'availability-1', startTime: '09:00', endTime: '17:00' },
      ]);
      prisma.session.findMany.mockResolvedValue([
        { id: 'session-1', startTime: '10:00', durationMin: 60 },
      ]);
      prisma.tutorTimeOff.findMany.mockResolvedValue([
        { id: 'break-1', startTime: '12:00', endTime: '12:30' },
        { id: 'break-2', startTime: '13:00', endTime: '14:00' },
      ]);

      await expect(
        service.getFreeAvailibility('tutor-1', date),
      ).resolves.toEqual({
        date,
        slots: [
          { startTime: '09:00', endTime: '10:00' },
          { startTime: '11:00', endTime: '12:00' },
          { startTime: '12:30', endTime: '13:00' },
          { startTime: '14:00', endTime: '17:00' },
        ],
      });
    });

    it('merges overlapping blocks and clips blocks to the availability window', async () => {
      prisma.tutorAvailability.findMany.mockResolvedValue([
        { id: 'availability-1', startTime: '09:00', endTime: '12:00' },
      ]);
      prisma.session.findMany.mockResolvedValue([
        { id: 'session-1', startTime: '08:30', durationMin: 60 },
        { id: 'session-2', startTime: '11:30', durationMin: 60 },
      ]);
      prisma.tutorTimeOff.findMany.mockResolvedValue([
        { id: 'break-1', startTime: '09:15', endTime: '10:00' },
      ]);

      await expect(
        service.getFreeAvailibility('tutor-1', date),
      ).resolves.toEqual({
        date,
        slots: [{ startTime: '10:00', endTime: '11:30' }],
      });
    });

    it('only treats scheduled and pending-approval sessions as blocking', async () => {
      prisma.tutorAvailability.findMany.mockResolvedValue([
        { id: 'availability-1', startTime: '09:00', endTime: '10:00' },
      ]);

      await service.getFreeAvailibility('tutor-1', date);

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: {
          tutorId: 'tutor-1',
          date: expect.any(Date),
          status: { in: ['SCHEDULED', 'PENDING_TUTOR_APPROVAL'] },
        },
        select: {
          id: true,
          date: true,
          startTime: true,
          durationMin: true,
        },
      });
    });
  });

  describe('create availability', () => {
    const dto = {
      dayOfWeek: DayOfWeek.WED,
      startTime: '09:00',
      endTime: '12:00',
      timeZone: 'UTC',
    };

    it('rejects a weekly availability that overlaps an existing window', async () => {
      prisma.tutorAvailability.findMany.mockResolvedValue([
        { startTime: '11:00', endTime: '14:00' },
      ]);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        'Overlaps with 11:00–14:00',
      );
      expect(prisma.tutorAvailability.create).not.toHaveBeenCalled();
    });

    it('rejects availability that overlaps an existing session', async () => {
      prisma.session.findMany.mockResolvedValue([
        {
          date: new Date('2026-09-23T00:00:00.000Z'),
          startTime: '10:00',
          durationMin: 60,
        },
      ]);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        'You already have a session during this time',
      );
    });

    it('allows adjacent non-overlapping availability windows', async () => {
      prisma.tutorAvailability.findMany.mockResolvedValue([
        { startTime: '12:00', endTime: '14:00' },
      ]);
      prisma.tutorAvailability.create.mockResolvedValue({
        id: 'availability-2',
      });

      await expect(service.create(dto, 'user-1')).resolves.toEqual({
        id: 'availability-2',
      });
    });
  });
});

describe('TutorTimeoffService.create', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: TutorTimeoffService;
  const dto = {
    date: '2026-09-23',
    startTime: '12:00',
    endTime: '13:00',
    reason: 'Lunch break',
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new TutorTimeoffService(prisma as unknown as PrismaService);
    prisma.tutor.findUnique.mockResolvedValue({ id: 'tutor-1' });
    prisma.tutorLeave.findFirst.mockResolvedValue(null);
    prisma.tutorAvailability.findMany.mockResolvedValue([
      { startTime: '09:00', endTime: '17:00' },
    ]);
    prisma.tutorTimeOff.findFirst.mockResolvedValue(null);
    prisma.session.findMany.mockResolvedValue([]);
    prisma.tutorTimeOff.create.mockResolvedValue({ id: 'timeoff-1' });
  });

  it('rejects time-off on a date already covered by leave', async () => {
    prisma.tutorLeave.findFirst.mockResolvedValue({ id: 'leave-1' });

    await expect(service.create(dto, 'user-1')).rejects.toThrow(
      'You have taken leave on this date. TimeOff is not allowed.',
    );
  });

  it('rejects time-off outside the tutor availability window', async () => {
    prisma.tutorAvailability.findMany.mockResolvedValue([
      { startTime: '09:00', endTime: '11:00' },
    ]);

    await expect(service.create(dto, 'user-1')).rejects.toThrow(
      'TimeOff must be inside your availability window',
    );
  });

  it('rejects time-off overlapping an existing break', async () => {
    prisma.tutorTimeOff.findFirst.mockResolvedValue({ id: 'existing-break' });

    await expect(service.create(dto, 'user-1')).rejects.toThrow(
      'TimeOff overlaps with an existing break',
    );
  });

  it('rejects time-off overlapping a scheduled session', async () => {
    prisma.session.findMany.mockResolvedValue([
      { startTime: '12:30', durationMin: 60 },
    ]);

    await expect(service.create(dto, 'user-1')).rejects.toThrow(
      'You already have a session during this time',
    );
  });

  it('allows time-off adjacent to a session and saves it', async () => {
    prisma.session.findMany.mockResolvedValue([
      { startTime: '11:00', durationMin: 60 },
    ]);

    await expect(service.create(dto, 'user-1')).resolves.toEqual({
      id: 'timeoff-1',
    });
    expect(prisma.tutorTimeOff.create).toHaveBeenCalledWith({
      data: {
        tutorId: 'tutor-1',
        date: expect.any(Date),
        startTime: '12:00',
        endTime: '13:00',
        reason: 'Lunch break',
      },
    });
  });
});

describe('TutorLeaveService.create', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: TutorLeaveService;
  const dto = {
    startDate: '2026-09-23',
    endDate: '2026-09-25',
    reason: 'Vacation',
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new TutorLeaveService(prisma as unknown as PrismaService);
    prisma.tutor.findUnique.mockResolvedValue({ id: 'tutor-1' });
    prisma.tutorLeave.findFirst.mockResolvedValue(null);
    prisma.session.findFirst.mockResolvedValue(null);
    prisma.tutorLeave.create.mockResolvedValue({ id: 'leave-1' });
  });

  it('rejects an end date before the start date', async () => {
    await expect(
      service.create(
        { ...dto, startDate: '2026-09-25', endDate: '2026-09-23' },
        'user-1',
      ),
    ).rejects.toThrow(new BadRequestException('Invalid date range'));
  });

  it('rejects a date range overlapping existing leave', async () => {
    prisma.tutorLeave.findFirst.mockResolvedValue({ id: 'existing-leave' });

    await expect(service.create(dto, 'user-1')).rejects.toThrow(
      'Leave overlaps with an existing leave',
    );
  });

  it('rejects leave when a scheduled session exists in the date range', async () => {
    prisma.session.findFirst.mockResolvedValue({ id: 'session-1' });

    await expect(service.create(dto, 'user-1')).rejects.toThrow(
      'Please cancel your existing sessions before taking leave',
    );
  });

  it('normalizes the date range and creates leave when there are no conflicts', async () => {
    await expect(service.create(dto, 'user-1')).resolves.toEqual({
      id: 'leave-1',
    });

    const createCall = prisma.tutorLeave.create.mock.calls[0][0];
    expect(createCall.data).toMatchObject({
      tutorId: 'tutor-1',
      reason: 'Vacation',
    });
    expect(createCall.data.startDate.getHours()).toBe(0);
    expect(createCall.data.startDate.getMinutes()).toBe(0);
    expect(createCall.data.endDate.getHours()).toBe(23);
    expect(createCall.data.endDate.getMinutes()).toBe(59);
  });
});
