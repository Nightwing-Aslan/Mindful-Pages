import { data } from 'wix-data';
import { currentUser } from 'wix-users';
import wixWindow from 'wix-window';
import { getTodaysRiddles, updateUserStreak } from 'backend/public-api';

// Game state
let currentRiddles = [];
let currentRiddleIndex = 0;
let currentLives = 3;
let currentStreak = 0;
let gameCompleted = false;

$w.onReady(async () => {
    // Initialize game
    await initializeGame();
    setupUI();
});

async function initializeGame() {
    // Force login
    if (!currentUser.loggedIn) {
        await currentUser.promptLogin();
    }
    
    // Load user streak
    const userProfile = await data.query("UserProfiles")
        .eq("userId", currentUser.id)
        .find()
        .then(({ items }) => items[0] || createUserProfile());
    
    currentStreak = userProfile.streak;
    
    // Load today's riddles
    const { items } = await getTodaysRiddles();
    currentRiddles = items;
    
    // Initialize UI
    $w('#livesCounter').text = "❤️".repeat(currentLives);
    $w('#streakCounter').text = currentStreak.toString();
    $w('#riddleText').text = currentRiddles[0]?.riddleText || "No riddles today";
}

async function createUserProfile() {
    return data.insert("UserProfiles", {
        userId: currentUser.id,
        streak: 0
    });
}

function setupUI() {
    $w('#submitButton').onClick(checkAnswer);
    $w('#hintButton').onClick(showHint);
}

async function checkAnswer() {
    if (gameCompleted) return;
    
    const userAnswer = $w('#answerInput').value.trim().toLowerCase();
    const currentRiddle = currentRiddles[currentRiddleIndex];
    
    if (!userAnswer) return;
    
    // Record attempt
    await data.insert("Attempts", {
        userId: currentUser.id,
        riddleId: currentRiddle._id,
        answer: userAnswer,
        isCorrect: false,
        timestamp: new Date()
    });
    
    if (currentRiddle.correctAnswers.includes(userAnswer)) {
        await handleCorrectAnswer();
    } else {
        await handleWrongAnswer();
    }
}

async function handleCorrectAnswer() {
    // Show success
    $w('#messageText').text = "Correct!";
    $w('#messagePopup').show();
    
    // Move to next riddle
    setTimeout(() => {
        $w('#messagePopup').hide();
        currentRiddleIndex++;
        currentLives = 3;
        
        if (currentRiddleIndex >= currentRiddles.length) {
            handleDailyCompletion();
        } else {
            updateUI();
        }
    }, 1500);
}

async function handleWrongAnswer() {
    currentLives--;
    
    if (currentLives > 0) {
        $w('#messageText').text = `Wrong! ${currentLives} lives left`;
        $w('#messagePopup').show();
        setTimeout(() => $w('#messagePopup').hide(), 1500);
    } else {
        $w('#messageText').text = "Game Over!";
        $w('#messagePopup').show();
        currentStreak = 0;
        await updateUserStreak(currentUser.id, 0);
        gameCompleted = true;
        $w('#answerInput').disable();
    }
    
    updateUI();
}

async function handleDailyCompletion() {
    // Update streak
    currentStreak++;
    await updateUserStreak(currentUser.id, currentStreak);
    
    // Show victory
    wixWindow.openLightbox("VictoryLightbox");
    gameCompleted = true;
    $w('#answerInput').disable();
    $w('#riddleText').text = "All riddles solved!";
}

function showHint() {
    $w('#hintText').text = currentRiddles[currentRiddleIndex].hint;
    $w('#hintPopup').show();
}

function updateUI() {
    // Update riddle
    $w('#riddleText').text = currentRiddles[currentRiddleIndex].riddleText;
    
    // Update counters
    $w('#livesCounter').text = "❤️".repeat(currentLives);
    $w('#streakCounter').text = currentStreak.toString();
    
    // Clear input
    $w('#answerInput').value = "";
}
