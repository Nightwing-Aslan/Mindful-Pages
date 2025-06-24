// ======================= RIDDLES ENTRY PAGE =======================
import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location'; 

$w.onReady(async function () {
    // Force login if needed
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Get today's date in UK format
    const today = getUKDateString();
    
    // Check if user has already played today
    const todayStats = await wixData.query("DailyStats")
        .eq("userId", currentUser.id)
        .eq("date", today)
        .find()
        .then(({ items }) => items[0]);
    
    // Disable play button if at least 1 riddle solved
    if (todayStats && todayStats.riddlesSolved.length >= 1) {
        $w('#playButton').disable();
        $w('#playButton').label = "Completed Today";
    }
    
    // Load user's streak info
    const userStats = await wixData.query("UserStats")
        .eq("userId", currentUser.id)
        .find()
        .then(({ items }) => items[0]);
    
    // Display streaks
    $w('#currentStreak').text = userStats?.currentStreak?.toString() || "0";
    $w('#maxStreak').text = userStats?.maxStreak?.toString() || "0";
    
    // Rules button handler
    $w('#rulesButton').onClick(() => {
        wixWindow.openLightbox("RulesLightbox");
    });
    
    // Play button handler
    $w('#playButton').onClick(() => {
        wixLocation.to("/riddles-game");
    });
});

function getUKDateString() {
    // UK time (UTC+0/UTC+1 for DST)
    const now = new Date();
    const isDST = now.getMonth() > 2 && now.getMonth() < 10; // Apr-Oct
    const ukOffset = isDST ? 60 : 0; // Minutes
    return new Date(now.getTime() + (ukOffset * 60 * 1000))
        .toISOString()
        .split('T')[0];
}