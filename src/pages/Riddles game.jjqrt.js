// ======================= ENHANCED RIDDLES GAME =======================
import { currentUser } from 'wix-users';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import wixData from 'wix-data';

// Global variables
let currentRiddles = [];
let currentStats = null;

$w.onReady(async () => {
    // Initialize game
    
    await initializeUserSession();
    await loadDailyGameState();
    setupUI();
    updateDisplay();
});

// ------------------------ Core Functions ------------------------
async function initializeUserSession() {

}

async function loadDailyGameState() {
    const today = getUKDateAsString();

    currentStats = await wixData.query("DailyStats")
        .eq("userId", currentUser.id)
        .eq("date", today)
        .find()
        .then(({ items }) => items[0] || createNewDailyStats(today));

    currentRiddles = await wixData.query("Riddles")
        .eq("date", today)
        .find()
        .then(({ items }) => items);

    console.log("✅ Loaded Riddles:", currentRiddles);
}


function setupUI() {
    $w('#submitButton').onClick(handleAnswerSubmission);
    $w('#hintButton').onClick(showHint);
    updateLivesAndStreak();
}

// ------------------------ Game Logic ------------------------
async function handleAnswerSubmission() {
    const userAnswer = $w('#answerInput').value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');

    const currentRiddle = getCurrentRiddle();
    if (!currentRiddle) return;

    console.debug("Got current riddle");

    const answers = Array.isArray(currentRiddle.correctAnswers) ? currentRiddle.correctAnswers : [];
    console.log('currentRiddle.correctAnswers:', currentRiddle.correctAnswers);

    const normalizedAnswers = answers.map(ans => 
        ans.trim().toLowerCase().replace(/\s+/g, '')
    );

    console.debug("Normalized");
    console.debug(normalizedAnswers);

    if (normalizedAnswers.includes(userAnswer)) {
        await handleCorrectAnswer(currentRiddle._id);
        console.debug("Correct Answer");
    } else {
        await handleWrongAnswer();
        console.debug("Wrong Answer");
    }

    console.debug("Update Display");
    
    updateDisplay();
}

async function handleCorrectAnswer(riddleId) {
    currentStats.riddlesSolved.push(riddleId);
    
    // Update daily stats
    await wixData.update("DailyStats", currentStats);

    // Streak maintained after solving just 1 riddle
    if (currentStats.riddlesSolved.length === 1) {
        // Get current streak from UserStats
        const userStats = await wixData.query("UserStats")
            .eq("userId", currentUser.id)
            .find()
            .then(({ items }) => items[0] || {
                _id: undefined,
                userId: currentUser.id,
                currentStreak: 0,
                maxStreak: 0
            });
        
        // Update streaks
        const newStreak = userStats.currentStreak + 1;
        const newMaxStreak = Math.max(newStreak, userStats.maxStreak);
        
        // Save updated streaks
        await wixData.save("UserStats", {
            _id: userStats._id,
            userId: currentUser.id,
            currentStreak: newStreak,
            maxStreak: newMaxStreak
        });
        
        // Show success lightbox after first correct answer
        const riddleData = {
            question: currentRiddles[0].riddleText,
            answer: currentRiddles[0].correctAnswers.join(", "),
            explanation: currentRiddles[0].explanation || "No explanation available"
        };
        
        wixWindow.openLightbox("SuccessLightbox", { 
            riddle: riddleData,
            currentStreak: newStreak,
            maxStreak: newMaxStreak
        }).then(() => {
            // Redirect to main riddles page after closing
            wixLocation.to("/riddles");
        });
    }
    // Optional: Show victory for solving all
    else if (currentStats.riddlesSolved.length === 3) {
        // Get current streaks
        const userStats = await wixData.query("UserStats")
            .eq("userId", currentUser.id)
            .find()
            .then(({ items }) => items[0]);
        
        const riddlesData = currentRiddles.map(r => ({
            question: r.riddleText,
            answer: r.correctAnswers.join(", "),
            explanation: r.explanation || "No explanation available"
        }));
        
        wixWindow.openLightbox("VictoryLightbox", { 
            riddles: riddlesData,
            currentStreak: userStats.currentStreak,
            maxStreak: userStats.maxStreak
        }).then(() => {
            wixLocation.to("/riddles");
        });
    }
}

async function handleWrongAnswer() {
    currentStats.livesRemaining--;
    
    await wixData.update("DailyStats", currentStats);

    if (currentStats.livesRemaining <= 0) {
        // Reset streak if no riddles solved today
        if (currentStats.riddlesSolved.length === 0) {
            // Get current UserStats
            const userStats = await wixData.query("UserStats")
                .eq("userId", currentUser.id)
                .find()
                .then(({ items }) => items[0]);
            
            // Only reset if exists
            if (userStats) {
                await wixData.save("UserStats", {
                    _id: userStats._id,
                    userId: currentUser.id,
                    currentStreak: 0,
                    maxStreak: userStats.maxStreak
                });
            }
        }
        
        // Get updated stats
        const updatedStats = await wixData.query("UserStats")
            .eq("userId", currentUser.id)
            .find()
            .then(({ items }) => items[0]);
        
        const riddlesData = currentRiddles.map(r => ({
            question: r.riddleText,
            answer: r.correctAnswers.join(", "),
            explanation: r.explanation || "No explanation available"
        }));
        
        wixWindow.openLightbox("GameOverLightbox", { 
            riddles: riddlesData,
            currentStreak: updatedStats?.currentStreak || 0,
            maxStreak: updatedStats?.maxStreak || 0
        }).then(() => {
            wixLocation.to("/riddles");
        });
    }
}

// ------------------------ Helper Functions ------------------------
function updateDisplay() {
    const currentIndex = currentStats.riddlesSolved.length;

    // Fallback if no riddles loaded
    if (!currentRiddles || currentRiddles.length === 0) {
        console.warn("No riddles found for today.");
        $w('#riddleText').text = "No riddles available today. Please come back tomorrow.";
        $w('#answerInput').placeholder = "No riddle today.";
        $w('#answerInput').value = "";
        $w('#answerInput').disable();
        $w('#submitButton').disable();
        $w('#hintButton').disable();
        $w('#challengeCounter').text = "0/3";
        return;
    }

    // Normal gameplay logic
    $w('#challengeCounter').text = `${currentIndex}/3`;

    if (currentIndex < 3 && currentStats.livesRemaining > 0) {
        $w('#riddleText').text = currentRiddles[currentIndex].riddleText;
        $w('#answerInput').placeholder = "Enter your answer...";
        $w('#answerInput').enable();
        $w('#submitButton').enable();
        $w('#hintButton').enable();
    } else if (currentIndex >= 3) {
        $w('#riddleText').text = "🎉 Congratulations! You solved all riddles today!";
        $w('#answerInput').placeholder = "Come back tomorrow!";
        $w('#answerInput').disable();
        $w('#submitButton').disable();
        $w('#hintButton').disable();
    } else if (currentStats.livesRemaining <= 0) {
        $w('#riddleText').text = "💀 Game Over! You've run out of lives.";
        $w('#answerInput').placeholder = "Come back tomorrow!";
        $w('#answerInput').disable();
        $w('#submitButton').disable();
        $w('#hintButton').disable();
    }

    // Update lives and streak counters
    updateLivesAndStreak();

    // Clear input field
    $w('#answerInput').value = "";
}

function updateLivesAndStreak() {
    $w('#livesCounter').text = "❤️".repeat(currentStats.livesRemaining);
    $w('#streakCounter').text = currentStats.currentStreak.toString();
}

async function createNewDailyStats(date) {
    // Get current streak from UserStats
    const userStats = await wixData.query("UserStats")
        .eq("userId", currentUser.id)
        .find()
        .then(({ items }) => items[0]);
    
    return wixData.insert("DailyStats", {
        userId: currentUser.id,
        date: date,
        livesRemaining: 3,
        riddlesSolved: [],
        currentStreak: userStats?.currentStreak || 0
    });
}

function getCurrentRiddle() {
    return currentRiddles[currentStats.riddlesSolved.length];
}

function showHint() {
    const currentRiddle = getCurrentRiddle();
    if (!currentRiddle) return;
    
    wixWindow.openLightbox("HintLightbox", {
        hint: currentRiddle.hint
    });
}