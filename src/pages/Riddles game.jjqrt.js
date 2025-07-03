// ======================= RIDDLES GAME =======================
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

// ────────────────  STATE MANAGEMENT SYSTEM  ────────────────
class GameStateManager {
    constructor() {
        this.state = {
            userStats: {
                currentStreak: 0,
                maxStreak: 0
            },
            dailyStats: {
                solvedIds: [],
                livesRemaining: 3
            },
            riddles: [],
            ui: {
                isLoading: false,
                isSubmitting: false,
                error: null
            },
            game: {
                initialized: false
            }
        };
        
        this.subscribers = [];
        this.actionQueue = [];
        this.isProcessingQueue = false;
    }
    
    // Subscribe to state changes
    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }
    
    // Get current state (immutable)
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }
    
    // Update state and notify subscribers
    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notifySubscribers();
    }
    
    // Deep merge state updates
    updateState(path, value) {
        const newState = JSON.parse(JSON.stringify(this.state));
        this.setNestedValue(newState, path, value);
        this.state = newState;
        this.notifySubscribers();
    }
    
    // Helper to set nested values
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    }
    
    // Notify all subscribers
    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.state));
    }
    
    // Queue action for processing
    async dispatch(action) {
        return new Promise((resolve, reject) => {
            this.actionQueue.push({ action, resolve, reject });
            this.processQueue();
        });
    }
    
    // Process action queue
    async processQueue() {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;
        
        while (this.actionQueue.length > 0) {
            const { action, resolve, reject } = this.actionQueue.shift();
            
            try {
                const result = await this.executeAction(action);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
        
        this.isProcessingQueue = false;
    }
    
    // Execute individual action
    async executeAction(action) {
        console.log('Executing action:', action.type);
        
        switch (action.type) {
            case 'INITIALIZE_GAME':
                return this.handleInitialize(action.payload);
            case 'SUBMIT_ANSWER':
                return this.handleSubmitAnswer(action.payload);
            case 'SOLVE_RIDDLE':
                return this.handleSolveRiddle(action.payload);
            case 'DECREMENT_LIVES':
                return this.handleDecrementLives();
            case 'RESET_STREAK':
                return this.handleResetStreak();
            case 'SET_UI_STATE':
                return this.handleSetUIState(action.payload);
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }
    
    // Action handlers
    async handleInitialize(payload) {
        const { userStats, dailyStats, riddles } = payload;
        
        this.setState({
            userStats,
            dailyStats,
            riddles,
            game: { initialized: true }
        });
        
        return this.state;
    }
    
    async handleSubmitAnswer(payload) {
        const { answer, riddle } = payload;
        
        this.updateState('ui.isSubmitting', true);
        
        try {
            const correct = (riddle.correctAnswers || [])
                .some(a => normalize(a) === normalize(answer));
            
            let result = { correct };
            
            if (correct) {
                const solveResult = await this.handleSolveRiddle({ riddleId: riddle._id });
                result = { ...result, ...solveResult };
            } else {
                const livesResult = await this.handleDecrementLives();
                result = { ...result, ...livesResult };
            }
            
            return result;
        } finally {
            this.updateState('ui.isSubmitting', false);
        }
    }
    
    async handleSolveRiddle(payload) {
        const { riddleId } = payload;
        
        // Create snapshot for rollback
        const snapshot = {
            solvedIds: [...this.state.dailyStats.solvedIds],
            currentStreak: this.state.userStats.currentStreak,
            maxStreak: this.state.userStats.maxStreak
        };
        
        // Update local state
        const newSolvedIds = [...this.state.dailyStats.solvedIds, riddleId];
        this.updateState('dailyStats.solvedIds', newSolvedIds);
        
        // Check if first riddle or all riddles solved
        const isFirstRiddle = newSolvedIds.length === 1;
        const isAllSolved = newSolvedIds.length >= this.state.riddles.length;
        
        if (isFirstRiddle || isAllSolved) {
            const newStreak = this.state.userStats.currentStreak + 1;
            const newMaxStreak = Math.max(newStreak, this.state.userStats.maxStreak);
            
            this.updateState('userStats.currentStreak', newStreak);
            this.updateState('userStats.maxStreak', newMaxStreak);
        }
        
        // Sync with database
        try {
            await addSolvedRiddle(currentUser.id, riddleId);
            
            if (isFirstRiddle || isAllSolved) {
                await incrementUserStreak(currentUser.id);
            }
            
            console.log('Successfully synced solve riddle to database');
        } catch (error) {
            console.error('Failed to sync solve riddle to database:', error);
            
            // Rollback local state
            this.updateState('dailyStats.solvedIds', snapshot.solvedIds);
            this.updateState('userStats.currentStreak', snapshot.currentStreak);
            this.updateState('userStats.maxStreak', snapshot.maxStreak);
            
            throw error;
        }
        
        return {
            solved: newSolvedIds.length,
            isFirstRiddle,
            isAllSolved
        };
    }
    
    async handleDecrementLives() {
        const currentLives = this.state.dailyStats.livesRemaining;
        
        if (currentLives <= 0) {
            console.warn('No lives remaining to decrement');
            return { lives: 0 };
        }
        
        // Create snapshot for rollback
        const snapshot = {
            livesRemaining: currentLives,
            currentStreak: this.state.userStats.currentStreak
        };
        
        // Update local state
        const newLives = currentLives - 1;
        this.updateState('dailyStats.livesRemaining', newLives);
        
        // Check if game over (no lives and no riddles solved)
        const isGameOver = newLives <= 0 && this.state.dailyStats.solvedIds.length === 0;
        
        if (isGameOver) {
            this.updateState('userStats.currentStreak', 0);
        }
        
        // Sync with database
        try {
            await decrementLivesRemaining(currentUser.id);
            
            if (isGameOver) {
                await resetCurrentStreak(currentUser.id);
            }
            
            console.log('Successfully synced decrement lives to database');
        } catch (error) {
            console.error('Failed to sync decrement lives to database:', error);
            
            // Rollback local state
            this.updateState('dailyStats.livesRemaining', snapshot.livesRemaining);
            this.updateState('userStats.currentStreak', snapshot.currentStreak);
            
            throw error;
        }
        
        return { lives: newLives, isGameOver };
    }
    
    async handleResetStreak() {
        const snapshot = { currentStreak: this.state.userStats.currentStreak };
        
        this.updateState('userStats.currentStreak', 0);
        
        try {
            await resetCurrentStreak(currentUser.id);
            console.log('Successfully synced reset streak to database');
        } catch (error) {
            console.error('Failed to sync reset streak to database:', error);
            this.updateState('userStats.currentStreak', snapshot.currentStreak);
            throw error;
        }
    }
    
    async handleSetUIState(payload) {
        Object.keys(payload).forEach(key => {
            this.updateState(`ui.${key}`, payload[key]);
        });
    }
    
    // Computed properties
    get currentRiddle() {
        const idx = this.state.dailyStats.solvedIds.length;
        return this.state.riddles[idx] || null;
    }
    
    get hasRiddlesRemaining() {
        return this.state.dailyStats.solvedIds.length < this.state.riddles.length;
    }
    
    get hasLivesRemaining() {
        return this.state.dailyStats.livesRemaining > 0;
    }
    
    get isGameActive() {
        return this.hasRiddlesRemaining && this.hasLivesRemaining;
    }
    
    get isAllRiddlesSolved() {
        return this.state.dailyStats.solvedIds.length >= this.state.riddles.length;
    }
    
    get isGameOver() {
        return this.state.dailyStats.livesRemaining <= 0 && this.state.dailyStats.solvedIds.length === 0;
    }
}

// ────────────────  GLOBAL STATE INSTANCE  ────────────────
const gameState = new GameStateManager();

// ────────────────  UI CONTROLLER  ────────────────
class UIController {
    constructor() {
        this.elements = {};
        this.unsubscribe = null;
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.subscribeToState();
    }
    
    cacheElements() {
        this.elements = {
            riddleText: $w('#riddleText'),
            answerInput: $w('#answerInput'),
            submitButton: $w('#submitButton'),
            hintButton: $w('#hintButton'),
            challengeCounter: $w('#challengeCounter'),
            livesCounter: $w('#livesCounter'),
            streakCounter: $w('#streakCounter'),
            riddlesRepeater: $w('#riddlesRepeater')
        };
    }
    
    bindEvents() {
        this.elements.submitButton.onClick(this.handleSubmit.bind(this));
    }
    
    subscribeToState() {
        this.unsubscribe = gameState.subscribe(this.updateUI.bind(this));
    }
    
    async handleSubmit() {
        const answer = this.elements.answerInput.value;
        const riddle = gameState.currentRiddle;
        
        if (!riddle || !answer.trim()) {
            console.warn('No riddle or answer provided');
            return;
        }
        
        this.elements.submitButton.disable();
        
        try {
            const result = await gameState.dispatch({
                type: 'SUBMIT_ANSWER',
                payload: { answer, riddle }
            });
            
            this.flashInputBorder(result.correct);
            
            // Handle result-specific logic
            if (result.correct) {
                await this.handleCorrectAnswer(result);
            } else {
                await this.handleWrongAnswer(result);
            }
            
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            this.elements.submitButton.enable();
        }
    }
    
    async handleCorrectAnswer(result) {
        if (result.isAllSolved) {
            await this.openResultBox('VictoryLightbox');
        } else if (result.isFirstRiddle) {
            const state = gameState.getState();
            const lastSolvedId = state.dailyStats.solvedIds[state.dailyStats.solvedIds.length - 1];
            await this.openResultBox('Success Lightbox', lastSolvedId);
        }
    }
    
    async handleWrongAnswer(result) {
        if (result.isGameOver) {
            await this.openResultBox('GameOverLightbox');
        }
    }
    
    updateUI(state) {
        console.log('Updating UI with state:', state);
        
        if (!this.validateState(state)) return;
        
        this.updateCounters(state);
        this.updateGameState(state);
    }
    
    validateState(state) {
        if (!state.game.initialized) {
            this.disableUI('Initializing...');
            return false;
        }
        
        if (!state.dailyStats || !state.userStats) {
            this.disableUI('Loading stats...');
            return false;
        }
        
        if (state.riddles.length === 0) {
            this.disableUI('🕵️‍♂️ No riddle set for today. Come back tomorrow!');
            return false;
        }
        
        return true;
    }
    
    updateCounters(state) {
        const solved = state.dailyStats.solvedIds.length;
        const lives = Math.max(0, state.dailyStats.livesRemaining);
        const streak = state.userStats.currentStreak || 0;
        
        this.elements.challengeCounter.text = `${solved}/${state.riddles.length}`;
        this.elements.livesCounter.text = lives > 0 
            ? '❤️'.repeat(lives) 
            : 'Out of Lives 💔';
        this.elements.streakCounter.text = streak.toString();
    }
    
    updateGameState(state) {
        if (gameState.isAllRiddlesSolved) {
            return this.disableUI('🎉 All riddles solved!');
        }
        
        if (!gameState.hasLivesRemaining) {
            return this.disableUI('💀 Game over.');
        }
        
        const riddle = gameState.currentRiddle;
        if (!riddle) {
            return this.disableUI('🎯 No more riddles available.');
        }
        
        this.updateRiddleDisplay(riddle);
    }
    
    updateRiddleDisplay(riddle) {
        this.elements.riddleText.text = riddle.riddleText;
        this.elements.answerInput.value = '';
        this.enableUI();
    }
    
    disableUI(message) {
        this.elements.riddleText.text = message;
        this.elements.answerInput.placeholder = 'Come back tomorrow!';
        this.elements.answerInput.disable();
        this.elements.submitButton.disable();
        this.elements.hintButton.disable();
    }
    
    enableUI() {
        this.elements.answerInput.enable();
        this.elements.submitButton.enable();
        this.elements.hintButton.enable();
    }
    
    flashInputBorder(isCorrect, duration = 1500) {
        const input = this.elements.answerInput;
        
        if (isCorrect) {
            input.style.borderColor = '#22c55e';
            input.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.4)';
        } else {
            input.style.borderColor = '#ef4444';
            input.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
        }
        
        input.style.borderWidth = '2px';
        input.style.borderStyle = 'solid';
        
        setTimeout(() => {
            input.style.borderColor = '';
            input.style.borderWidth = '';
            input.style.borderStyle = '';
            input.style.boxShadow = '';
        }, duration);
    }
    
    async openResultBox(name, singleRiddleId = null) {
        const state = gameState.getState();
        const payload = {
            riddles: state.riddles.map(this.formatRiddle),
            currentStreak: state.userStats.currentStreak,
            maxStreak: state.userStats.maxStreak
        };
        
        if (singleRiddleId) {
            const riddle = state.riddles.find(r => r._id === singleRiddleId);
            if (riddle) {
                payload.riddle = this.formatRiddle(riddle);
            }
        }

        if(name === 'VictoryLightbox'){
            // Reference the repeater element and set its data
            this.elements.riddlesRepeater.data = state.riddles.map(riddle => ({
            _id: riddle._id,
            riddleText: riddle.riddleText,
            correctAnswers: riddle.correctAnswers?.join(', ') || '',
            explanation: riddle.explanation || 'No explanation'
            // Add any other fields your repeater template needs
            }));
        }

        await wixWindow.openLightbox(name, payload);
        // Only redirect if all riddles are solved or game is over
        if (name === 'VictoryLightbox' || name === 'GameOverLightbox') {
            wixLocation.to('/riddles');
        }
    }
    
    formatRiddle(riddle) {
        return {
            question: riddle.riddleText,
            answer: (riddle.correctAnswers || []).join(', '),
            explanation: riddle.explanation || 'No explanation'
        };
    }
    
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// ────────────────  INITIALIZATION  ────────────────
const uiController = new UIController();

$w.onReady(async () => {
    try {
        console.log("Initializing game...");
        
        // Initialize UI controller
        uiController.init();
        
        // Load game data
        const [userStats, dailyStats, riddles] = await Promise.all([
            getOrCreateUserStats(currentUser.id),
            getOrCreateUserRiddleProgress(currentUser.id),
            fetchRiddlesByDate(getUKDateAsString())
        ]);
        
        // Initialize game state
        await gameState.dispatch({
            type: 'INITIALIZE_GAME',
            payload: { userStats, dailyStats, riddles }
        });
        
        console.log("Game ready!");
        
    } catch (error) {
        console.error('Initialization error:', error);
        uiController.disableUI('Something went wrong – please refresh.');
    }
});

// ────────────────  HELPERS  ────────────────
function normalize(s) {
    return s.trim().toLowerCase().replace(/\s+/g, '');
}