// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/hello-world

import { currentUser } from 'wix-users';
import wixData from 'wix-data';

$w.onReady(async function () {
    if (!currentUser.loggedIn) {
        await currentUser.promptLogin();
    }
    
    // Load user's streak
    const streak = await getCurrentStreak();
    $w('#streakCounter').text = streak.toString();
    
    // Add event listener for rules
    $w('#rulesButton').onClick(() => {
        wixWindow.openLightbox("RulesLightbox");
    });
});

async function getCurrentStreak() {
    try {
        // Get yesterday's date in UK format
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ukDate = formatUKDate(yesterday);
        
        // Get latest stats
        const stats = await wixData.query("DailyStats")
            .eq("userId", currentUser.id)
            .le("date", ukDate)
            .descending("date")
            .find()
            .then(({ items }) => items[0]);
            
        return stats ? stats.currentStreak : 0;
    } catch (error) {
        console.error("Error loading streak:", error);
        return 0;
    }
}

function formatUKDate(date) {
    // UK time formatting (adjust for DST)
    const isDST = date.getMonth() > 2 && date.getMonth() < 10;
    const ukOffset = isDST ? 60 : 0;
    return new Date(date.getTime() + (ukOffset * 60 * 1000))
        .toISOString()
        .split('T')[0];
}
