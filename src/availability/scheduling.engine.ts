import { Repository } from 'typeorm';
import { RecurringAvailability } from './entity/recurring-availability.entity';
import { CustomAvailability } from './entity/custom-availability.entity';
import { Appointment, AppointmentStatus } from '../appointment/entity/appointment.entity';
import { toMinutes, toTime } from '../common/utils/time.util';

type Window = {
  id?: number;
  startTime: string;
  endTime: string;
  schedulingType?: string | null;
  slotDuration?: number | null;
  maxPatients?: number | null;
  bufferTime?: number | null;
  availabilityId?: number | null;
};

type Slot = {
  startTime: string;
  endTime: string;
  schedulingType?: string | null;
  availabilityId?: number | null;
  maxPatients?: number | null;
};

export type AvailableSlot = { startTime: string; endTime: string; status: string; availabilityId?: number | null };

function weekdayFromISODate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date format: ${date}`);
  }
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}

function normalizeTimeValue(time: string): string {
  return time.toString().substring(0, 5);
}

function buildSlotKey(startTime: string, endTime: string): string {
  return `${normalizeTimeValue(startTime)}-${normalizeTimeValue(endTime)}`;
}

export async function computeDailySchedule(
  doctorId: number,
  date: string,
  recurringRepo: Repository<RecurringAvailability>,
  customRepo: Repository<CustomAvailability>,
  appointmentRepo: Repository<Appointment>,
): Promise<{ date: string; totalAvailableSlots: number; availableSlots: AvailableSlot[] }> {
  const day = weekdayFromISODate(date);

  // Fetch recurring windows (allow multiple)
  const recurring = await recurringRepo.find({ where: { doctor: { id: doctorId }, dayOfWeek: day } });

  // Transform recurring into windows
  const recurringWindows: Window[] = recurring.map((r) => ({
    id: r.id,
    startTime: r.startTime,
    endTime: r.endTime,
    schedulingType: r.schedulingType,
    slotDuration: r.slotDuration,
    bufferTime: r.bufferTime,
    maxPatients: r.maxPatients,
    availabilityId: r.id,
  }));

  // Fetch custom overrides for this date (treated as additional availability)
  const customs = await customRepo.find({ where: { doctor: { id: doctorId }, date } });
  const customWindows: Window[] = customs.map((c) => ({
    id: c.id,
    startTime: c.startTime,
    endTime: c.endTime,
    schedulingType: c.schedulingType ?? recurringWindows[0]?.schedulingType ?? 'STREAM',
    slotDuration: c.slotDuration ?? recurringWindows[0]?.slotDuration,
    bufferTime: c.bufferTime ?? recurringWindows[0]?.bufferTime ?? 0,
    maxPatients: c.maxPatients ?? recurringWindows[0]?.maxPatients,
    availabilityId: c.id,
  }));

  // Combine all windows (recurring + custom)
  const allWindows = [...recurringWindows, ...customWindows];

  // Normalize: remove duplicates and sort
  const merged: Window[] = [];
  const seen = new Set<string>();
  for (const w of allWindows) {
    const key = `${w.startTime}-${w.endTime}`;
    if (!seen.has(key)) {
      merged.push(w);
      seen.add(key);
    }
  }
  merged.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  // Generate slots from each window
  const slots: Slot[] = [];
  for (const w of merged) {
    const strategy = w.schedulingType ?? 'STREAM';
    const duration = w.slotDuration ?? (toMinutes(w.endTime) - toMinutes(w.startTime));
    const buffer = w.bufferTime ?? 0;

    if (duration <= 0) {
      throw new Error(`Invalid slot duration (${duration}) for availability window ${w.startTime}-${w.endTime}`);
    }

    const step = duration + buffer;
    if (step <= 0) {
      throw new Error(`Invalid slot step (${step}) for availability window ${w.startTime}-${w.endTime}`);
    }

    let current = toMinutes(w.startTime);
    const end = toMinutes(w.endTime);

    while (current + duration <= end) {
      slots.push({
        startTime: toTime(current),
        endTime: toTime(current + duration),
        schedulingType: strategy,
        maxPatients: w.maxPatients ?? 1,
        availabilityId: w.availabilityId ?? null,
      });
      current += step;
    }
  }

  // Fetch booked appointments for doctor/date
  const booked = await appointmentRepo
    .createQueryBuilder('appointment')
    .leftJoin('appointment.doctor', 'doctor')
    .where('doctor.id = :doctorId', { doctorId })
    .andWhere('appointment.date = :date', { date })
    .andWhere('appointment.status = :status', { status: AppointmentStatus.BOOKED })
    .getMany();

  const bookedCount = new Map<string, number>();
  for (const appointment of booked) {
    const key = buildSlotKey(appointment.startTime, appointment.endTime);
    bookedCount.set(key, (bookedCount.get(key) ?? 0) + 1);
  }

  // Filter available slots considering capacity
  const availableSlots = slots.filter((slot) => {
    const key = buildSlotKey(slot.startTime, slot.endTime);
    const bookedForSlot = bookedCount.get(key) ?? 0;
    const capacity = slot.maxPatients && slot.maxPatients > 0 ? slot.maxPatients : 1;
    return bookedForSlot < capacity;
  });

  return {
    date,
    totalAvailableSlots: availableSlots.length,
    availableSlots: availableSlots.map((s) => ({ startTime: s.startTime, endTime: s.endTime, status: 'AVAILABLE', availabilityId: s.availabilityId ?? null })),
  };
}

export async function findNearestAvailableAfter(
  doctorId: number,
  date: string,
  requestedStartTime: string,
  recurringRepo: Repository<RecurringAvailability>,
  customRepo: Repository<CustomAvailability>,
  appointmentRepo: Repository<Appointment>,
) {
  const schedule = await computeDailySchedule(doctorId, date, recurringRepo, customRepo, appointmentRepo);
  if (!schedule || !schedule.availableSlots || schedule.availableSlots.length === 0) return null;
  const requested = toMinutes(requestedStartTime);
  const found = schedule.availableSlots.find((s) => toMinutes(s.startTime) >= requested);
  return found ? { date: schedule.date, startTime: found.startTime, endTime: found.endTime } : null;
}
