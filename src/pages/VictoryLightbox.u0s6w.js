// Velo API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// ======================= VICTORY LIGHTBOX =======================
import wixWindow from 'wix-window';
import wixData from 'wix-data';
import { currentUser } from 'wix-users';

$w.onReady(async () => {
    // Get solved riddles data from context
    const context = wixWindow.lightbox.getContext();
    const riddles = context.riddles;
    const currentStreak = context.currentStreak;
    
    // Display solved riddles
    $w('#riddlesRepeater').data = riddles;
    
    // Load and display max streak
    const userStats = await wixData.query("UserStats")
        .eq("userId", currentUser.id)
        .find()
        .then(({ items }) => items[0]);
    
    const maxStreak = userStats?.maxStreak || 0;
    $w('#maxStreakText').text = `Max Streak: ${maxStreak}`;
    $w('#currentStreakText').text = `Current Streak: ${currentStreak}`;
    
    // Setup close button
    $w('#closeButton1').onClick(() => wixWindow.lightbox.close());
});

$w('#riddlesRepeater').onItemReady(($item, riddle, index) => {
    $item('#questionText').text = `Riddle ${index + 1}: ${riddle.question}`;
    $item('#answerText').text = `Answer: ${riddle.answer}`;
    $item('#explanationText').text = `Explanation: ${riddle.explanation}`;
});