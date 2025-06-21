import wixWindow from 'wix-window';
import wixData from 'wix-data';
import { currentUser } from 'wix-users';

$w.onReady(async () => {
    // Get riddles data
    const context = wixWindow.lightbox.getContext();
    const riddles = context.riddles;
    
    // Display riddles
    $w('#riddlesRepeater').data = riddles;
    
    // Load and display max streak
    const userStats = await wixData.query("UserStats")
        .eq("userId", currentUser.id)
        .find()
        .then(({ items }) => items[0]);
    
    $w('#maxStreakText').text = `Max Streak: ${userStats?.maxStreak || 0}`;
    
    // Setup close button
    $w('#closeButton').onClick(() => wixWindow.closeLightbox());
});

$w('#riddlesRepeater').onItemReady(($item, riddle, index) => {
    $item('#questionText').text = `Riddle ${index + 1}: ${riddle.question}`;
    $item('#answerText').text = `Answer: ${riddle.answer}`;
    $item('#explanationText').text = `Explanation: ${riddle.explanation}`;
});
