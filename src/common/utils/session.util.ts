export function getSessionCalendarLabels(date: Date) {
    const d = new Date(date);

    // Month -> JAN
    const monthLabel = d.toLocaleString('en-US', {
        month: 'short',
        timeZone: 'UTC',
    }).toUpperCase();

    // Date -> 01, 24
    const dateLabel = d
        .getUTCDate()
        .toString()
        .padStart(2, '0');

    // Day -> MON, TUE
    const dayLabel = d.toLocaleString('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
    }).toUpperCase();

    return {
        monthLabel,
        dateLabel,
        dayLabel,
    };
}



export function getSessionTimeLabel(date: Date) {
    const d = new Date(date);

    return d.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
    });
}
