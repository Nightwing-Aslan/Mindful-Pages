// ======================= OPTIMIZED RIDDLES GAME =======================
import { currentUser }       from 'wix-users';
import wixWindow             from 'wix-window';
import wixLocation           from 'wix-location';
import { getUKDateAsString } from 'public/DateUtils.js';
import { fetchRiddlesByDate } from 'backend/riddles-api.jsw'
import { getOrCreateUserStats, incrementUserStreak, resetCurrentStreak } from 'backend/user-stats-api.jsw'
import { 
    getOrCreateUserRiddleProgress, 
    addSolvedRiddle, 
    decrementLivesRemaining 
} from 'backend/user-daily-riddle-stats-api.jsw'

// ────────────────  GLOBAL STATE  ────────────────
let todaysRiddles           = [];
let userDailyRiddleStats    = null;          // CMS UserDailyRiddleStats
let cachedUserStats         = null;          // CMS UserStats
// let hintCooldown            = false;
let gameInitialized         = false;

// ────────────────  PAGE READY  ────────────────
$w.onReady(async () => {
    try {
        console.log("Initializing game...");
        await initializeGame();
        
        console.log("Setting up UI...");
        setupUI();
        
        console.log("Game ready!");
        
    } catch (err) {
        console.error('Page Error:', err);
        disableUI('Something went wrong – please refresh.');
    }
});

// ────────────────  INITIALIZATION  ────────────────
async function initializeGame() {
    // Load all required data in parallel - SINGLE CALL EACH
    const [userStats, userDailyStats, riddles] = await Promise.all([
        getOrCreateUserStats(currentUser.id),
        getOrCreateUserRiddleProgress(currentUser.id),
        fetchRiddlesByDate(getUKDateAsString())
    ]);

    cachedUserStats = userStats;
    userDailyRiddleStats = userDailyStats;
    todaysRiddles = riddles;

    console.log("Loaded User Stats: ", cachedUserStats);
    console.log("Loaded User Daily Stats: ", userDailyRiddleStats);
    console.log("Loaded Today's Riddles: ", todaysRiddles);

    // Update display with loaded data
    updateDisplay();
    gameInitialized = true;
}

// ────────────────  UI SET-UP  ────────────────
function setupUI() {
    ///$w('#hintButton').onClick(showHint);
    $w('#submitButton').onClick(handleSubmit);
}

// ────────────────  GAME FLOW  ────────────────
async function handleSubmit() {
    if (!gameInitialized) return;
    
    const answer = normalize($w('#answerInput').value);
    const riddle = getCurrentRiddle();

    if (!riddle) {
        console.warn('No current riddle available');
        return;
    }

    if (!answer) {
        console.warn('No answer provided');
        return;
    }

    $w('#submitButton').disable();

    try {
        const correct = (riddle.correctAnswers || [])
                            .some(a => normalize(a) === answer);

        if (correct) {
            await handleCorrect(riddle._id);
        } else {
            await handleWrong();
        }
        
    } catch (err) {
        console.error('Error handling answer:', err);
        $w('#submitButton').enable();
    }
}

async function handleCorrect(riddleId) {
    console.log("Handling Correct Answer for riddle:", riddleId);

    flashInputBorder(true);

    await addSolvedRiddle(currentUser.id, riddleId);
    
    userDailyRiddleStats.solvedIds.push(riddleId);
    const solved = userDailyRiddleStats.solvedIds.length;

    console.log(`Riddles solved: ${solved}/${todaysRiddles.length}`);

    updateChallengeProgress();

    // Check victory condition using local state
    if (hasSolvedAllRiddlesLocal()) {
        console.log("All riddles solved!");
        
        await incrementUserStreak(currentUser.id);
        
        cachedUserStats.currentStreak = (cachedUserStats.currentStreak || 0) + 1;
        cachedUserStats.maxStreak = Math.max(cachedUserStats.currentStreak, cachedUserStats.maxStreak || 0);
        
        updateStreakDisplay();
        
        await openResultBox('VictoryLightbox');
        return;
    }

    if (solved === 1) {
        await incrementUserStreak(currentUser.id);
        
        // Update local state
        cachedUserStats.currentStreak = (cachedUserStats.currentStreak || 0) + 1;
        cachedUserStats.maxStreak = Math.max(cachedUserStats.currentStreak, cachedUserStats.maxStreak || 0);
        
        updateStreakDisplay();
        
        await openResultBox('Success Lightbox', riddleId);
    }
    
    updateDisplay();
    $w('#submitButton').enable();
}

async function handleWrong() {
    console.log("Handling Wrong Answer");

    flashInputBorder(false);

    await decrementLivesRemaining(currentUser.id);
    
    if (userDailyRiddleStats.livesRemaining > 0) {
        userDailyRiddleStats.livesRemaining--;
    }

    updateLivesDisplay();

    // Check if game over using local state
    if (userDailyRiddleStats.livesRemaining <= 0 &&
        userDailyRiddleStats.solvedIds.length === 0) {
        
        console.log("Game Over - resetting streak");
        
        await resetCurrentStreak(currentUser.id);
        
        cachedUserStats.currentStreak = 0;
        
        updateStreakDisplay();
        
        await openResultBox('GameOverLightbox');
        return;
    }
    
    updateDisplay();
    $w('#submitButton').enable();
}

// ────────────────  LIGHTBOX  ────────────────
async function openResultBox(name, singleRiddleId = null) {
    const payload = {
        riddles:        todaysRiddles.map(formatRiddle),
        currentStreak:  cachedUserStats.currentStreak,
        maxStreak:      cachedUserStats.maxStreak
    };

    if (singleRiddleId) {
        const r = todaysRiddles.find(x => x._id === singleRiddleId);
        if (r) {
            payload.riddle = formatRiddle(r);
        }
    }

    await wixWindow.openLightbox(name, payload);
    wixLocation.to('/riddles');
}

//// ────────────────  UI  ────────────────
function updateDisplay() {
    console.log("Updating display...");
    
    // Early validation
    if (!validateGameState()) return;
    
    // Update all UI components
    updateCounters();
    updateGameState();
    
    console.log("Display updated");
}

function validateGameState() {
    if (!userDailyRiddleStats) {
        disableUI('No Daily Stats..');
        return false;
    } 
    
    if (!cachedUserStats) {
        disableUI('Stats Not Cached...');
        return false;
    }
    
    if (todaysRiddles.length === 0) {
        disableUI('🕵️‍♂️ No riddle set for today. Come back tomorrow!');
        return false;
    }
    
    return true;
}

function updateCounters() {
    const solved = userDailyRiddleStats.solvedIds.length;
    const lives = Math.max(0, userDailyRiddleStats.livesRemaining);
    const streak = cachedUserStats.currentStreak || 0;
    
    console.log(`Solved: ${solved}, Lives: ${lives}, Streak: ${streak}`);
    
    // Update counter displays
    $w('#challengeCounter').text = `${solved}/${todaysRiddles.length}`;
    $w('#livesCounter').text = lives > 0 
        ? '❤️'.repeat(lives) 
        : 'Out of Lives 💔';
    $w('#streakCounter').text = streak.toString();
}

function updateGameState() {
    // Check end game conditions first
    if (hasSolvedAllRiddlesLocal()) {
        return disableUI('🎉 All riddles solved!');
    }
    
    if (userDailyRiddleStats.livesRemaining <= 0) {
        return disableUI('💀 Game over.');
    }
    
    // Update active game state
    const riddle = getCurrentRiddle();
    if (!riddle) {
        return disableUI('🎯 No more riddles available.');
    }
    
    updateRiddleDisplay(riddle);
}

function updateRiddleDisplay(riddle) {
    console.log('Displaying riddle:', riddle);
    
    $w('#riddleText').text = riddle.riddleText;
    $w('#answerInput').value = '';
    enableUI();
}

function disableUI(msg) {
    $w('#riddleText').text = msg;
    $w('#answerInput').placeholder = 'Come back tomorrow!';
    $w('#answerInput').disable();
    $w('#submitButton').disable();
    $w('#hintButton').disable();
}

function enableUI() {
    console.log("enableUI()");
    $w('#answerInput').enable();
    $w('#submitButton').enable();
    $w('#hintButton').enable();
}

// ────────────────  UI HELPERS  ────────────────

function updateSingleCounter(counterId, value) {
    const element = $w(counterId);
    if (element) {
        element.text = value;
    }
}

function updateLivesDisplay() {
    const lives = Math.max(0, userDailyRiddleStats.livesRemaining);
    const livesText = lives > 0 ? '❤️'.repeat(lives) : 'Out of Lives 💔';
    updateSingleCounter('#livesCounter', livesText);
}

function updateStreakDisplay() {
    const streak = cachedUserStats.currentStreak || 0;
    updateSingleCounter('#streakCounter', streak.toString());
}

function updateChallengeProgress() {
    const solved = userDailyRiddleStats.solvedIds.length;
    updateSingleCounter('#challengeCounter', `${solved}/${todaysRiddles.length}`);
}

// ────────────────  HELPERS  ────────────────
function normalize(s) {
    return s.trim().toLowerCase().replace(/\s+/g, '');
}

function getCurrentRiddle() {
    const idx = userDailyRiddleStats.solvedIds.length;
    if (idx >= todaysRiddles.length) {
        console.warn('No more riddles available for current user progress');
        return null;
    }
    return todaysRiddles[idx];
}

function hasSolvedAllRiddlesLocal() {
    if (!todaysRiddles.length) return false;
    
    return userDailyRiddleStats.solvedIds.length >= todaysRiddles.length;
}

function formatRiddle(r) {
    return {
        question:     r.riddleText,
        answer:       (r.correctAnswers || []).join(', '),
        explanation:  r.explanation || 'No explanation'
    };
}


// ────────────────  VISUAL FEEDBACK FUNCTIONS  ────────────────

function flashInputBorder(isCorrect, duration = 1500) {
    const input = $w('#answerInput');
    
    // Set the appropriate color and style
    if (isCorrect) {
        input.style.borderColor = '#22c55e';  // Green
        input.style.borderWidth = '2px';
        input.style.borderStyle = 'solid';
    } else {
        input.style.borderColor = '#ef4444';  // Red
        input.style.borderWidth = '2px';
        input.style.borderStyle = 'solid';
    }
    
    // Add a subtle glow effect
    input.style.boxShadow = isCorrect 
        ? '0 0 8px rgba(34, 197, 94, 0.4)'   // Green glow
        : '0 0 8px rgba(239, 68, 68, 0.4)';  // Red glow
    
    // Reset to normal after duration
    setTimeout(() => {
        resetInputBorder();
    }, duration);
}

function resetInputBorder() {
    const input = $w('#answerInput');
    
    // Reset to default styling
    input.style.borderColor = '';
    input.style.borderWidth = '';
    input.style.borderStyle = '';
    input.style.boxShadow = '';
}

// Alternative approach with CSS classes (if you prefer)
function flashInputBorderWithClasses(isCorrect, duration = 1500) {
    const input = $w('#answerInput');
    
    // Add appropriate CSS class
    const className = isCorrect ? 'success-flash' : 'error-flash';
    input.addClass(className);
    
    // Remove class after duration
    setTimeout(() => {
        input.removeClass(className);
    }, duration);
}