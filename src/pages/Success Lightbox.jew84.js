// ======================= SUCCESS LIGHTBOX =======================
import wixWindow from 'wix-window';

$w.onReady(() => {
    const context = wixWindow.lightbox.getContext();
    const riddle = context.riddle;
    const currentStreak = context.currentStreak;
    const maxStreak = context.maxStreak;
    
    // Display riddle info
    $w('#questionText').text = riddle.question;
    $w('#answerText').text = `Answer: ${riddle.answer}`;
    $w('#explanationText').text = `Explanation: ${riddle.explanation}`;
    
    // Display streaks
    $w('#currentStreakText').text = `Current Streak: ${currentStreak}`;
    $w('#maxStreakText').text = `Max Streak: ${maxStreak}`;
    
    // Setup close button
    $w('#closeButton1').onClick(() => wixWindow.lightbox.close());
});