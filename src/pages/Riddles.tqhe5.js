// ======================= RIDDLES ENTRY PAGE =======================
import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';

$w.onReady(async function () {
    // Force login if not already logged in
    if (!currentUser.loggedIn) {
        await currentUser.promptLogin();
    }
    
    // Get today's date in UK format
    const today = getUKDateString();
    
    // Check if user has already completed today's riddles
    const todayStats = await wixData.query("DailyStats")
        .eq("userId", currentUser.id)
        .eq("date", today)
        .find()
        .then(({ items }) => items[0]);
    
    // Disable play button if already completed
    if (todayStats && todayStats.riddlesSolved.length === 3) {
        $w('#playButton').disable();
        $w('#playButton').label = "Already Completed Today";
    }
    
    // Load user's max streak
    const userStats = await wixData.query("UserStats")
        .eq("userId", currentUser.id)
        .find()
        .then(({ items }) => items[0]);
    
    // Display max streak
    $w('#maxStreak').text = userStats?.maxStreak.toString() || "0";
    
    // Load current streak
    const streak = await getCurrentStreak();
    $w('#streakCounter').text = streak.toString();
    
    // Add event listener for rules button
    $w('#rulesButton').onClick(() => {
        wixWindow.openLightbox("RulesLightbox");
    });
    
    // Play button handler
    $w('#playButton').onClick(() => {
        wixLocation.to("/riddles-game");
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

function getUKDateString() {
    // UK time (UTC+0/UTC+1 for DST)
    const now = new Date();
    const isDST = now.getMonth() > 2 && now.getMonth() < 10; // Apr-Oct
    const ukOffset = isDST ? 60 : 0; // Minutes
    return new Date(now.getTime() + (ukOffset * 60 * 1000))
        .toISOString()
        .split('T')[0];
}
