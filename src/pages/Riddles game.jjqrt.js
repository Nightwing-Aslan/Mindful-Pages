// ======================= ENHANCED RIDDLES GAME =======================
import { currentUser } from 'wix-users';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { getUKDateAsString } from 'public/DateUtils.js';

// ------------------------ Global State ------------------------
let currentRiddles = [];
let currentStats = null;

// ------------------------ On Page Ready ------------------------
$w.onReady(async () => {
    console.log("OnReady: Riddle Game");
    
    await initializeUserSession();
    await loadDailyGameState();
    setupUI();
    updateDisplay();
});

// ------------------------ Initialization ------------------------
async function initializeUserSession() {
    await ensureUserStatsExists(currentUser.id);
}

async function ensureUserStatsExists(userId) {
    const { items } = await wixData.query("UserStats").eq("user", userId).find();
    if (items.length === 0) {
        await wixData.insert("UserStats", {
            userId: userId,
            user: userId,
            currentStreak: 0,
            maxStreak: 0
        });
    }
}

async function loadDailyGameState() {
    const today = getUKDateAsString();

    const statsQuery = await wixData.query("UserDailyStats")
        .eq("user", currentUser.id)
        .eq("date", today)
        .find();

    currentStats = statsQuery.items[0] || await createNewDailyStats(today);

    const riddlesQuery = await wixData.query("Riddles").eq("date", today).find();
    currentRiddles = riddlesQuery.items;

    console.log("✅ Loaded Riddles:", currentRiddles);
}

async function createNewDailyStats(date) {
    const userStats = await getUserStats();

    const newStats = {
        user: currentUser.id,
        date,
        livesRemaining: 3,
        riddlesSolved: [],
        currentStreak: userStats.currentStreak
    };

    return await wixData.insert("UserDailyStats", newStats);
}

async function getUserStats() {
    const { items } = await wixData.query("UserStats").eq("user", currentUser.id).find();
    return items[0] || { currentStreak: 0, maxStreak: 0 };
}

// ------------------------ UI Setup ------------------------
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

    console.log("wowowo");

    const normalizedAnswers = (currentRiddle.correctAnswers || []).map(ans =>
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
    await wixData.update("UserDailyStats", currentStats);

    const solvedCount = currentStats.riddlesSolved.length;

    if (solvedCount === 1) {
        await updateUserStreak(true);
        const userStats = await getUserStats();

        await wixWindow.openLightbox("SuccessLightbox", {
            riddle: formatRiddle(currentRiddles[0]),
            currentStreak: userStats.currentStreak,
            maxStreak: userStats.maxStreak
        });
        wixLocation.to("/riddles");

    } else if (solvedCount === 3) {
        const userStats = await getUserStats();

        await wixWindow.openLightbox("VictoryLightbox", {
            riddles: currentRiddles.map(formatRiddle),
            currentStreak: userStats.currentStreak,
            maxStreak: userStats.maxStreak
        });
        wixLocation.to("/riddles");
    }
}

async function handleWrongAnswer() {
    currentStats.livesRemaining--;
    await wixData.update("UserDailyStats", currentStats);

    if (currentStats.livesRemaining <= 0 && currentStats.riddlesSolved.length === 0) {
        await updateUserStreak(false);

        const userStats = await getUserStats();

        await wixWindow.openLightbox("GameOverLightbox", {
            riddles: currentRiddles.map(formatRiddle),
            currentStreak: userStats.currentStreak,
            maxStreak: userStats.maxStreak
        });
        wixLocation.to("/riddles");
    }
}

async function updateUserStreak(success) {
    const userStats = await getUserStats();
    const newStreak = success ? userStats.currentStreak + 1 : 0;
    const newMaxStreak = Math.max(newStreak, userStats.maxStreak);

    await wixData.save("UserStats", {
        _id: userStats._id,
        user: currentUser.id,
        currentStreak: newStreak,
        maxStreak: newMaxStreak
    });
}

// ------------------------ Display Logic ------------------------
function updateDisplay() {
    const currentIndex = currentStats.riddlesSolved.length;

    $w('#challengeCounter').text = `${currentIndex}/3`;

    if (!currentRiddles.length) {
        return disableUI("No riddles available today. Please come back tomorrow.");
    }

    if (currentIndex < 3 && currentStats.livesRemaining > 0) {
        $w('#riddleText').text = currentRiddles[currentIndex].riddleText;
        $w('#answerInput').placeholder = "Enter your answer...";
        enableUI();
    } else if (currentIndex >= 3) {
        disableUI("🎉 Congratulations! You solved all riddles today.");
    } else if (currentStats.livesRemaining <= 0) {
        disableUI("💀 Game Over! You've run out of lives.");
    }

    updateLivesAndStreak();
    $w('#answerInput').value = "";
}

function disableUI(message) {
    $w('#riddleText').text = message;
    $w('#answerInput').placeholder = "Come back tomorrow!";
    $w('#answerInput').disable();
    $w('#submitButton').disable();
    $w('#hintButton').disable();
}

function enableUI() {
    $w('#answerInput').enable();
    $w('#submitButton').enable();
    $w('#hintButton').enable();
}

function updateLivesAndStreak() {
    $w('#livesCounter').text = "❤️".repeat(currentStats.livesRemaining);
    $w('#streakCounter').text = currentStats.currentStreak.toString();
}

function getCurrentRiddle() {
    return currentRiddles[currentStats.riddlesSolved.length];
}

function showHint() {
    const currentRiddle = getCurrentRiddle();
    if (!currentRiddle) return;

    wixWindow.openLightbox("HintLightbox", { hint: currentRiddle.hint });
}

function formatRiddle(riddle) {
    return {
        question: riddle.riddleText,
        answer: (riddle.correctAnswers || []).join(", "),
        explanation: riddle.explanation || "No explanation available"
    };
}
