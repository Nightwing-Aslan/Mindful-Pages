// ======================= GAME OVER LIGHTBOX =======================
import wixWindow from 'wix-window';
import wixData from 'wix-data';
import { currentUser } from 'wix-users';

$w.onReady(async () => {
    // Get riddles data from context
    const context = wixWindow.lightbox.getContext();
    const riddles = context.riddles;
    
    // Display riddles with answers
    $w('#riddlesRepeater').data = riddles;
    
    // Load and display max streak
    const userStats = await wixData.query("UserStats")
        .eq("userId", currentUser.id)
        .find()
        .then(({ items }) => items[0]);
    
    const maxStreak = userStats?.maxStreak || 0;
    $w('#maxStreakText').text = `Max Streak: ${maxStreak}`;
    
    // Setup close button
    $w('#closeButton1').onClick(() => wixWindow.lightbox.close());
});

$w('#riddlesRepeater').onItemReady(($item, riddle, index) => {
    $item('#questionText').text = `Riddle ${index + 1}: ${riddle.question}`;
    $item('#answerText').text = `Answer: ${riddle.answer}`;
    $item('#explanationText').text = `Explanation: ${riddle.explanation}`;
});