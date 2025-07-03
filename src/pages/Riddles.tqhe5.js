// ======================= RIDDLES ENTRY PAGE =======================
import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location'; 
import { getUKDateAsString } from 'public/DateUtils.js';
import { getOrCreateUserStats } from 'backend/user-stats-api.jsw'
import { getOrCreateUserRiddleProgress } from 'backend/user-daily-riddle-stats-api.jsw'

$w.onReady(async () => {
    console.log("On Ready: Riddle Page");

    const [dailyStats, userStats] = await Promise.all([
        getOrCreateUserRiddleProgress(),
        getOrCreateUserStats()
    ]);   
    
    if (dailyStats && dailyStats.solvedIds.length >= 3) {
        $w('#playButton').disable();
        $w('#playButton').label = "Completed Today";
    }

    console.log("User Stats: ")
    console.log("Current Streak: " + userStats.currentStreak)
    console.log("Max Streak: " + userStats.maxStreak)
  
    $w('#currentStreak').text = userStats.currentStreak.toString();
    $w('#maxStreak').text = userStats.maxStreak.toString();
    $w('#dailySolved').text =  dailyStats.solvedIds.length;
    $w('#livesRemaining').text = `${dailyStats?.livesRemaining} / 3`;
    
    // Rules button handler
    // $w('#rulesButton').onClick(() => {
    //     wixWindow.openLightbox("RulesLightbox");
    // });
    
    // Play button handler
    $w('#playButton').onClick(() => {
        wixLocation.to("/riddles-game");
    });
});