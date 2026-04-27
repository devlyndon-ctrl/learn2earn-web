function getStreakClass(streak) {
    if (streak < 7) return '';
    if (streak < 15) return 'streak-yellow';
    if (streak < 22) return 'streak-orange';
    if (streak < 29) return 'streak-red';
    if (streak < 36) return 'streak-green';
    if (streak < 50) return 'streak-blue';
    return 'streak-purple';
}

function getStreakBgColor(streak) {
    if (streak < 7) return '#888';
    if (streak < 15) return '#B71C1C';
    if (streak < 22) return '#FF1744';
    if (streak < 29) return 'orange';
    if (streak < 36) return '#FFD600';
    if (streak < 43) return 'orange';
    if (streak < 50) return '#5e72e4';
    if (streak < 61) return '#8e24aa';
    return '#8e24aa';
}

const streakClass = typeof getStreakClass === "function" ? getStreakClass(streak) : '';