from datetime import time

SLOT_WINDOWS: tuple[tuple[int, time, time], ...] = (
    (1, time(9, 0), time(10, 30)),
    (2, time(10, 30), time(12, 0)),
    (3, time(12, 0), time(14, 0)),
    (4, time(14, 0), time(15, 0)),
    (5, time(15, 0), time(17, 0)),
)


def derive_interview_time_slot(start_time: time) -> int | None:
    for slot, start, end in SLOT_WINDOWS:
        if start <= start_time < end:
            return slot
    return None
