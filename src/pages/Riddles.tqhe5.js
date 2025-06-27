// ======================= RIDDLES ENTRY PAGE =======================
import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location'; 
import { getUKDateAsString } from 'public/DateUtils.js';

$w.onReady(async () => {
    console.log("On Ready: Riddle Page");

    const [dailyStats, userStats] = await Promise.all([
        loadUserDailyStats(),
        loadUserStats()
    ]);   
    
    if (dailyStats && dailyStats.riddlesSolved.length >= 3) {
        $w('#playButton').disable();
        $w('#playButton').label = "Completed Today";
    }
    
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

async function loadUserDailyStats(){
    const today = getUKDateAsString();

    // Check if user has already played today
    const todayStats = await wixData.query("UserDailyRiddleStats")
        .eq("userId", currentUser.id)
        .eq("date", today)
        .find()
        .then(({ items }) => items[0]);

    console.log(currentUser.id);
    return todayStats;
}

async function loadUserStats(){
     // Load user's streak info
    const userStats = await wixData.query("UserStats")
        .eq("userId", currentUser.id)
        .find()
        .then(({ items }) => items[0]);

    return userStats;
}