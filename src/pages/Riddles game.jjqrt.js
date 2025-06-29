// ======================= RIDDLES GAME =======================
import { currentUser }       from 'wix-users';
import wixWindow             from 'wix-window';
import wixLocation           from 'wix-location';
import wixData               from 'wix-data';
import { getUKDateAsString } from 'public/DateUtils.js';

// ────────────────  GLOBAL STATE  ────────────────
let todaysRiddles           = [];
let userDailyRiddleStats    = null;          // CMS UserDailyRiddleStats
let cachedUserStats         = null;          // CMS UserStats
let hintCooldown            = false;

// ────────────────  PAGE READY  ────────────────
$w.onReady(async () => {
    try {
        await ensureUserStats();

        await Promise.all([
            loadTodaysRiddles(),
            loadUserRiddleProgress()
        ]);

        setupUI();
        updateDisplay();
    } catch (err) {
        console.error('Init error', err);
        disableUI('❌ Something went wrong – please refresh.');
    }
});

// ────────────────  DATA LOADERS  ────────────────
async function ensureUserStats() {
    const result = await wixData.query('UserStats')
                                .eq('userId', currentUser.id)
                                .limit(1)
                                .find();

    if (result.items.length > 0) {
        cachedUserStats = result.items[0];
        return;
    }

    try {
        cachedUserStats = await wixData.insert('UserStats', {
            userId: currentUser.id,
            userRef: { _id: currentUser.id }, // ✅ fixed reference
            currentStreak: 0,
            maxStreak: 0
        });
    } catch (err) {
        console.warn("Insert failed — possible duplicate, retrying query.");

        const retry = await wixData.query('UserStats')
                                   .eq('userId', currentUser.id)
                                   .limit(1)
                                   .find();

        if (retry.items.length) {
            cachedUserStats = retry.items[0];
        } else {
            throw new Error("Failed to create or fetch UserStats.");
        }
    }
}

async function loadTodaysRiddles() {
    const today = getUKDateAsString();
    console.log("Today's date:", today);
    console.log("CurrentUser:", currentUser.loggedIn, currentUser.id);

    const res = await wixData.query('Riddles')
                             .eq('date', today)
                             .ascending('_createdDate')
                             .find();

    todaysRiddles = res.items;

    if (todaysRiddles.length === 0) {
        console.warn(`No riddles found for date: ${today}`);
    }
}

async function loadUserRiddleProgress() {
    const today = getUKDateAsString();

    const { items } = await wixData.query('UserDailyRiddleStats')
                                    .eq('userId', currentUser.id)
                                    .eq('date', today)
                                    .find();

    if (items.length) {
        userDailyRiddleStats = items[0];
    } else {
        userDailyRiddleStats = await wixData.insert('UserDailyRiddleStats', {
            userId:         currentUser.id,
            userRef:        { _id: currentUser.id }, // ✅ fixed reference
            date:           today,
            livesRemaining: 3,
            solvedIds:      [],
            streakAtStart:  cachedUserStats.currentStreak
        });
    }
}

// ────────────────  UI SET-UP  ────────────────
function setupUI() {
  $w('#submitButton').onClick(onSubmit);
  $w('#hintButton').onClick(showHint);
}

// ────────────────  GAME FLOW  ────────────────
async function onSubmit() {
    const answer = normalize($w('#answerInput').value);
    const riddle = getCurrentRiddle();

    if (!riddle) return;

    $w('#submitButton').disable();

    const correct = (riddle.correctAnswers || [])
                        .some(a => normalize(a) === answer);

    if (correct) {
        await handleCorrect(riddle._id);
    } else {
        await handleWrong();
    }

    updateDisplay();
    $w('#submitButton').enable();
}

async function handleCorrect(riddleId) {
    console.log("Handling Correct Answer");

    userDailyRiddleStats.solvedIds.push(riddleId);
    await wixData.update('UserDailyRiddleStats', userDailyRiddleStats);

    const solved = userDailyRiddleStats.solvedIds.length;

    if (solved === 1) {
        await updateStreak(true);
        await openResultBox('SuccessLightbox', riddleId);
    } else if (solved === 3) {
        await openResultBox('VictoryLightbox');
    }
}

async function handleWrong() {
    console.log("Handling Wrong Answer");

    userDailyRiddleStats.livesRemaining--;
    await wixData.update('UserDailyRiddleStats', userDailyRiddleStats);

    if (userDailyRiddleStats.livesRemaining <= 0 &&
        userDailyRiddleStats.solvedIds.length === 0) {

        await updateStreak(false);
        await openResultBox('GameOverLightbox');
    }
}

// ────────────────  STREAKS  ────────────────
async function updateStreak(won) {
    const newStreak = won ? cachedUserStats.currentStreak + 1 : 0;
    const newMax    = Math.max(newStreak, cachedUserStats.maxStreak);

    cachedUserStats = {
        ...cachedUserStats,
        currentStreak: newStreak,
        maxStreak:     newMax
    };

    await wixData.update('UserStats', cachedUserStats);
}

// ────────────────  LIGHTBOX  ────────────────
async function openResultBox(name, singleRiddleId = null) {
    const payload = {
        riddles: todaysRiddles.map(formatRiddle),
        currentStreak: cachedUserStats.currentStreak,
        maxStreak:     cachedUserStats.maxStreak
    };

    if (singleRiddleId) {
        const r = todaysRiddles.find(x => x._id === singleRiddleId);
        payload.riddle = formatRiddle(r);
    }

    await wixWindow.openLightbox(name, payload);
    wixLocation.to('/riddles');
}

// ────────────────  DISPLAY / UI  ────────────────
function updateDisplay() {
    const solved = userDailyRiddleStats.solvedIds.length;
    const lives  = Math.max(0, userDailyRiddleStats.livesRemaining);

    if (todaysRiddles.length === 0) {
        return disableUI('🕵️‍♂️ No riddle set for today. Come back tomorrow!');
    }

    $w('#challengeCounter').text = `${solved}/3`;
    $w('#livesCounter').text     = lives
        ? '❤️'.repeat(lives)
        : 'Out of Lives 💔';
    $w('#streakCounter').text    = cachedUserStats.currentStreak.toString();

    if (solved >= 3) {
        return disableUI('🎉 All riddles solved!');
    }
    if (lives <= 0) {
        return disableUI('💀 Game over.');
    }

    const riddle = getCurrentRiddle();
    $w('#riddleText').text = riddle?.riddleText || 'No riddle today.';
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
    $w('#answerInput').enable();
    $w('#submitButton').enable();
    $w('#hintButton').enable();
}

function showHint() {
    if (hintCooldown) return;

    const riddle = getCurrentRiddle();
    if (riddle?.hint) {
        wixWindow.openLightbox('Hint', { hint: riddle.hint });
    }

    hintCooldown = true;
    $w('#hintButton').disable();

    setTimeout(() => {
        hintCooldown = false;
        $w('#hintButton').enable();
    }, 3000);
}

// ────────────────  HELPERS  ────────────────
function normalize(s) {
    return s.trim().toLowerCase().replace(/\s+/g, '');
}

function getCurrentRiddle() {
    return todaysRiddles[userDailyRiddleStats.solvedIds.length];
}

function formatRiddle(r) {
    return {
        question:     r.riddleText,
        answer:       (r.correctAnswers || []).join(', '),
        explanation:  r.explanation || 'No explanation'
    };
}