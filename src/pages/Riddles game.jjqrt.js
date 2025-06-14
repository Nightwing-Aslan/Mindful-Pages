// ======================= RIDDLES GAME =======================
import { data } from 'wix-data';
import { currentUser } from 'wix-users';
import wixWindow from 'wix-window';

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
    // Force login
    if (!currentUser.loggedIn) {
        await currentUser.promptLogin();
    }
}

async function loadDailyGameState() {
    const today = getUKDateString();
    
    // Get/create daily stats
    currentStats = await data.query("DailyStats")
        .eq("userId", currentUser.id)
        .eq("date", today)
        .find()
        .then(({ items }) => items[0] || createNewDailyStats(today));

    // Load today's riddles
    currentRiddles = await data.query("Riddles")
        .eq("activeDate", today)
        .find()
        .then(({ items }) => items);
}

function setupUI() {
    // Event handlers
    $w('#submitButton').onClick(handleAnswerSubmission);
    $w('#hintButton').onClick(showHint);
    
    // Initialize display
    updateLivesAndStreak();
}

// ------------------------ Game Logic ------------------------
async function handleAnswerSubmission() {
    // Normalize answer: trim and remove spaces
    const userAnswer = $w('#answerInput').value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
    
    const currentRiddle = getCurrentRiddle();
    if (!currentRiddle) return;

    // Record attempt
    await data.insert("Attempts", {
        userId: currentUser.id,
        riddleId: currentRiddle._id,
        isCorrect: false,
        timestamp: new Date()
    });

    // Normalize correct answers
    const normalizedAnswers = currentRiddle.correctAnswers.map(ans => 
        ans.trim().toLowerCase().replace(/\s+/g, '')
    );

    if (normalizedAnswers.includes(userAnswer)) {
        await handleCorrectAnswer(currentRiddle._id);
    } else {
        await handleWrongAnswer();
    }
    
    updateDisplay();
}

async function handleCorrectAnswer(riddleId) {
    currentStats.riddlesSolved.push(riddleId);
    
    // Update stats
    await data.update("DailyStats", {
        ...currentStats,
        riddlesSolved: currentStats.riddlesSolved
    });

    // Check for daily completion
    if (currentStats.riddlesSolved.length === 3) {
        await updateStreak(currentStats.currentStreak + 1);
        wixWindow.openLightbox("VictoryLightbox");
    }
}

async function handleWrongAnswer() {
    currentStats.livesRemaining--;
    
    // Update stats
    await data.update("DailyStats", {
        ...currentStats,
        livesRemaining: currentStats.livesRemaining
    });

    // Check for game over
    if (currentStats.livesRemaining <= 0) {
        await updateStreak(0);
        wixWindow.openLightbox("GameOverLightbox");
    }
}

// ------------------------ Helper Functions ------------------------
function updateDisplay() {
    const currentIndex = currentStats.riddlesSolved.length;
    
    // Update challenges counter
    $w('#challengeCounter').text = `${currentIndex}/3`;
    
    // Update riddle text and input state
    if (currentIndex < 3 && currentStats.livesRemaining > 0) {
        $w('#riddleText').text = currentRiddles[currentIndex].riddleText;
        $w('#answerInput').placeholder = "Enter your answer...";
        $w('#answerInput').enable();
        $w('#submitButton').enable();
    } else if (currentIndex >= 3) {
        $w('#riddleText').text = "Congratulations! You solved all riddles today!";
        $w('#answerInput').placeholder = "Come back tomorrow!";
        $w('#answerInput').disable();
        $w('#submitButton').disable();
    } else if (currentStats.livesRemaining <= 0) {
        $w('#riddleText').text = "Game Over! You've run out of lives.";
        $w('#answerInput').placeholder = "Come back tomorrow!";
        $w('#answerInput').disable();
        $w('#submitButton').disable();
    }

    // Update counters
    updateLivesAndStreak();
    
    // Clear input
    $w('#answerInput').value = "";
}

function updateLivesAndStreak() {
    $w('#livesCounter').text = "❤️".repeat(currentStats.livesRemaining);
    $w('#streakCounter').text = currentStats.currentStreak.toString();
}

async function createNewDailyStats(date) {
    const streak = await getCurrentStreak();
    return data.insert("DailyStats", {
        userId: currentUser.id,
        date: date,
        livesRemaining: 3,
        riddlesSolved: [],
        currentStreak: streak
    });
}

async function getCurrentStreak() {
    const yesterday = new Date(getUKDate());
    yesterday.setDate(yesterday.getDate() - 1);
    
    return data.query("DailyStats")
        .eq("userId", currentUser.id)
        .le("date", yesterday.toISOString())
        .descending("date")
        .find()
        .then(({ items }) => items[0]?.currentStreak || 0);
}

async function updateStreak(newStreak) {
    currentStats.currentStreak = newStreak;
    await data.update("DailyStats", currentStats);
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

function getUKDateString() {
    // UK time (UTC+0/UTC+1 for DST)
    const now = new Date();
    const isDST = now.getMonth() > 2 && now.getMonth() < 10; // Apr-Oct
    const ukOffset = isDST ? 60 : 0; // Minutes
    return new Date(now.getTime() + (ukOffset * 60 * 1000))
        .toISOString()
        .split('T')[0];
}
