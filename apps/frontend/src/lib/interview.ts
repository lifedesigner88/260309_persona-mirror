export const INTERVIEW_TIME_OPTIONS = [
  { value: 1, compactLabel: "1T", rangeLabel: "09:30 ~ 10:15", fullLabel: "1T · 09:30 ~ 10:15" },
  { value: 2, compactLabel: "2T", rangeLabel: "10:55 ~ 12:10", fullLabel: "2T · 10:55 ~ 12:10" },
  { value: 3, compactLabel: "3T", rangeLabel: "12:45 ~ 14:00", fullLabel: "3T · 12:45 ~ 14:00" },
  { value: 4, compactLabel: "4T", rangeLabel: "14:10 ~ 15:25", fullLabel: "4T · 14:10 ~ 15:25" },
  { value: 5, compactLabel: "5T", rangeLabel: "15:35 ~ 16:50", fullLabel: "5T · 15:35 ~ 16:50" }
] as const;

export function formatInterviewTimeSlot(slot: number | null | undefined, includeRange = true) {
  if (slot == null) {
    return "-";
  }

  const option = INTERVIEW_TIME_OPTIONS.find((item) => item.value === slot);
  if (!option) {
    return `${slot}T`;
  }

  return includeRange ? option.fullLabel : option.compactLabel;
}

export function formatInterviewStartTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return value.slice(0, 5);
}

export function formatInterviewRoom(room: number | string | null | undefined) {
  if (room == null || room === "") {
    return "-";
  }

  return `${room}분과`;
}
