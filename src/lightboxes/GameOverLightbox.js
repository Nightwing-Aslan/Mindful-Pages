import wixWindow from 'wix-window';

$w.onReady(() => {
    const context = wixWindow.lightbox.getContext();
    const riddles = context.riddles;
    
    $w('#repeater').data = riddles;
    
    // Show max streak
    wixData.query("UserStats")
        .eq("userId", currentUser.id)
        .find()
        .then(({ items }) => {
            if (items.length > 0) {
                $w('#maxStreak').text = items[0].maxStreak.toString();
            }
        });
});

$w('#repeater').onItemReady(($item, riddle, index) => {
    $item('#question').text = `Riddle ${index + 1}: ${riddle.question}`;
    $item('#answer').text = `Answer: ${riddle.answer}`;
    $item('#explanation').text = `Explanation: ${riddle.explanation}`;
});
