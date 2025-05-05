// Game state
let currentUser = null;
let gameState = {
    balance: 1000,
    currentBet: 0,
    multiplier: 1.00,
    revealedCells: 0,
    gameActive: false,
    mines: [],
    mineCount: 1
};

// Touch state
let touchStartX = 0;
let touchStartY = 0;
let lastTouchTime = 0;

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';
let authToken = null;

// Initialize localStorage items if they don't exist
function initializeLocalStorage() {
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('friendRequests')) {
        localStorage.setItem('friendRequests', JSON.stringify([]));
    }
    if (!localStorage.getItem('friends')) {
        localStorage.setItem('friends', JSON.stringify({}));
    }
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    initializeLocalStorage();
    setupAuthTabs();
    checkLoginStatus();
    updatePreGameStats();
    setupMobileGestures();
});

// Authentication functions
function setupAuthTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            
            if (tab.dataset.tab === 'login') {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            } else {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
            }
        });
    });
}

function checkLoginStatus() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (user) {
            currentUser = user;
            showGameSection();
            return true;
        }
    } catch (error) {
        console.error('Error checking login status:', error);
        localStorage.removeItem('currentUser');
    }
    return false;
}

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            showGameSection();
        } else {
            alert('Invalid credentials');
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred during login. Please try again.');
    }
}

function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (!username || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        if (users.some(u => u.username === username)) {
            alert('Username already exists');
            return;
        }
        
        const newUser = {
            username,
            password,
            balance: 1000,
            transactions: []
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        showGameSection();
    } catch (error) {
        console.error('Error during registration:', error);
        alert('An error occurred during registration. Please try again.');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuthSection();
}

// Game State Management
async function updateGameState(type, amount) {
    try {
        const response = await fetch(`${API_BASE_URL}/game/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ type, amount })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    } catch (error) {
        throw error;
    }
}

// Add error handling middleware
async function handleApiError(error) {
    console.error('API Error:', error);
    if (error.message === 'Failed to fetch') {
        alert('Cannot connect to the server. Please make sure the server is running.');
    } else {
        alert(error.message || 'An error occurred. Please try again.');
    }
}

// Leaderboard
async function getLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    } catch (error) {
        throw error;
    }
}

function showGameSection() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('game-section').classList.remove('hidden');
    
    // Update user info
    document.getElementById('username-display').textContent = currentUser.username;
    document.getElementById('balance-display').textContent = `Balance: $${currentUser.balance}`;
    
    // Initialize game board
    initializeGameBoard();
    
    // Update stats
    updatePreGameStats();
}

function showAuthSection() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('game-section').classList.add('hidden');
}

// Game functions
function updateMineCount() {
    const count = parseInt(document.getElementById('mine-count').value);
    gameState.mineCount = count;
    if (!gameState.gameActive) {
        updatePreGameStats();
    }
}

function calculatePreGameProbability() {
    const totalCells = 25; // Fixed 5x5 grid
    const probability = (gameState.mineCount / totalCells) * 100;
    return probability.toFixed(2);
}

function calculatePreGameMultiplier() {
    const totalCells = 25; // 5x5 grid
    const mineCount = parseInt(document.getElementById('mine-count').value);
    const safeCells = totalCells - mineCount;
    
    // Base multiplier calculation that increases exponentially with risk
    // The formula ensures that:
    // 1. More mines = higher multiplier
    // 2. The increase is exponential but controlled
    // 3. The multiplier is always greater than 1
    const baseMultiplier = 1 + (mineCount * 0.2) + (Math.pow(mineCount, 1.5) * 0.05);
    
    // Ensure the multiplier is reasonable and capped
    const maxMultiplier = 10; // Cap the maximum multiplier
    return Math.min(baseMultiplier, maxMultiplier).toFixed(2);
}

function calculateMultiplier() {
    const totalCells = 25; // 5x5 grid
    const mineCount = gameState.mines.length;
    const safeCells = totalCells - mineCount;
    const revealedCells = gameState.revealedCells;
    
    // Base multiplier calculation
    const baseMultiplier = 1 + (mineCount * 0.2) + (Math.pow(mineCount, 1.5) * 0.05);
    
    // Increase multiplier based on revealed cells
    // The more cells revealed, the higher the risk, so higher multiplier
    const cellMultiplier = revealedCells * (0.1 + (mineCount * 0.02));
    
    // Calculate final multiplier
    const finalMultiplier = baseMultiplier + cellMultiplier;
    
    // Cap the maximum multiplier
    const maxMultiplier = 10;
    return Math.min(finalMultiplier, maxMultiplier).toFixed(2);
}

function updatePreGameStats() {
    document.getElementById('probability').textContent = `Probability: ${calculatePreGameProbability()}%`;
    document.getElementById('multiplier').textContent = `Base Multiplier: ${calculatePreGameMultiplier()}x`;
    document.getElementById('current-bet').textContent = `Current Bet: $0`;
    document.getElementById('potential-win').textContent = `Potential Win: $0`;
}

function calculateProbability() {
    const totalCells = 25; // Fixed 5x5 grid
    const remainingCells = totalCells - gameState.revealedCells;
    const remainingMines = gameState.mineCount;
    const probability = (remainingMines / remainingCells) * 100;
    return probability.toFixed(2);
}

function calculatePotentialWin() {
    return (gameState.currentBet * gameState.multiplier).toFixed(2);
}

function updateGameStats() {
    if (gameState.gameActive) {
        gameState.multiplier = calculateMultiplier();
    } else {
        gameState.multiplier = calculatePreGameMultiplier();
    }
    
    document.getElementById('current-bet').textContent = `Current Bet: $${gameState.currentBet}`;
    document.getElementById('multiplier').textContent = `Multiplier: ${gameState.multiplier}x`;
    document.getElementById('probability').textContent = `Probability: ${calculateProbability()}%`;
    document.getElementById('potential-win').textContent = `Potential Win: $${(gameState.currentBet * gameState.multiplier).toFixed(2)}`;
    
    // Enable/disable cashout button
    const cashoutBtn = document.getElementById('cashout-btn');
    cashoutBtn.disabled = !gameState.gameActive || gameState.revealedCells === 0;
}

function initializeGameBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    // Create 5x5 grid
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.dataset.index = i;
        cell.addEventListener('click', () => handleCellClick(i));
        gameBoard.appendChild(cell);
    }
}

async function handleBet() {
    const betAmount = parseFloat(document.getElementById('bet-amount').value);
    if (isNaN(betAmount) || betAmount <= 0) {
        alert('Please enter a valid bet amount');
        return;
    }

    try {
        await updateGameState('bet', -betAmount);
        startGame(betAmount);
    } catch (error) {
        alert(error.message);
    }
}

function handleCellClick(index) {
    if (!gameState.gameActive) {
        alert('Please place a bet first');
        return;
    }
    
    const cell = document.querySelector(`.mine-cell[data-index="${index}"]`);
    
    if (cell.classList.contains('revealed')) {
        return;
    }
    
    if (gameState.mines.includes(index)) {
        // Hit a mine
        cell.classList.add('mine');
        gameState.gameActive = false;
        currentUser.balance -= gameState.currentBet;
        addTransaction('Loss', -gameState.currentBet);
        updateBalance();
        updateGameStats();
        
        // Show loss popup
        showLossPopup();
    } else {
        // Safe cell
        cell.classList.add('revealed');
        gameState.revealedCells++;
        
        updateGameStats();
    }
}

function showLossPopup() {
    const popup = document.createElement('div');
    popup.className = 'mobile-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h2>Game Over!</h2>
            <p>You hit a mine!</p>
            <p>You lost $${gameState.currentBet}</p>
            <button onclick="closePopup()" class="mobile-popup-btn">OK</button>
        </div>
    `;
    document.body.appendChild(popup);
    resetGame();
}

function resetGame() {
    // Remove popup
    const popup = document.querySelector('.mobile-popup');
    if (popup) {
        popup.remove();
    }
    
    // Reset game state
    gameState.currentBet = 0;
    gameState.multiplier = 1.00;
    gameState.revealedCells = 0;
    gameState.gameActive = false;
    gameState.mines = [];
    
    // Reset board
    const cells = document.querySelectorAll('.mine-cell');
    cells.forEach(cell => {
        cell.classList.remove('revealed', 'mine');
    });
    
    // Update stats
    updateGameStats();
    updatePreGameStats();
}

async function handleCashout() {
    try {
        const winnings = calculateWinnings();
        await updateGameState('win', winnings);
        showWinPopup(winnings);
        animateBalanceIncrease(winnings);
        resetBoard();
    } catch (error) {
        alert(error.message);
    }
}

function showWinPopup(winnings) {
    const popup = document.createElement('div');
    popup.className = 'mobile-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h2>Congratulations!</h2>
            <p>You won $${winnings}!</p>
            <div class="popup-buttons">
                <button onclick="handleCashout()" class="mobile-popup-btn">Cashout</button>
                <button onclick="closePopup()" class="mobile-popup-btn">Continue</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function animateBalanceIncrease(amount) {
    const balanceDisplay = document.getElementById('balance-display');
    const currentBalance = currentUser.balance;
    const targetBalance = currentBalance + amount;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    
    // Add bloom effect to balance display
    balanceDisplay.classList.add('balance-bloom');
    
    function updateBalance(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out animation
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentAmount = currentBalance + (amount * easedProgress);
        balanceDisplay.textContent = `Balance: $${currentAmount.toFixed(2)}`;
        
        if (progress < 1) {
            requestAnimationFrame(updateBalance);
        } else {
            // Remove bloom effect after animation
            setTimeout(() => {
                balanceDisplay.classList.remove('balance-bloom');
            }, 500);
        }
    }
    
    requestAnimationFrame(updateBalance);
}

function closePopup() {
    const popup = document.querySelector('.mobile-popup');
    if (popup) {
        popup.remove();
    }
}

function updateBalance() {
    document.getElementById('balance-display').textContent = `Balance: $${currentUser.balance.toFixed(2)}`;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Update users in localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.username === currentUser.username);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // Update leaderboard
    updateLeaderboard();
}

function addTransaction(type, amount) {
    const transaction = {
        type,
        amount,
        timestamp: new Date().toLocaleString()
    };
    
    currentUser.transactions = currentUser.transactions || [];
    currentUser.transactions.push(transaction);
    
    // Update users in localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.username === currentUser.username);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // Update transaction history and leaderboard
    updateTransactionHistory();
    updateLeaderboard();
}

function updateTransactionHistory() {
    const transactionList = document.getElementById('transaction-list');
    transactionList.innerHTML = '';
    
    if (!currentUser.transactions) return;
    
    currentUser.transactions.slice().reverse().forEach(transaction => {
        const entry = document.createElement('div');
        entry.className = 'transaction-entry';
        entry.innerHTML = `
            <span>${transaction.type}</span>
            <span>$${Math.abs(transaction.amount)}</span>
            <span>${transaction.timestamp}</span>
        `;
        transactionList.appendChild(entry);
    });
}

// Update leaderboard display
async function updateLeaderboard() {
    try {
        const leaderboard = await getLeaderboard();
        const leaderboardElement = document.getElementById('leaderboard');
        leaderboardElement.innerHTML = `
            <div class="leaderboard-header">
                <span>Rank</span>
                <span>Username</span>
                <span>Balance</span>
            </div>
        `;

        leaderboard.forEach((user, index) => {
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            entry.innerHTML = `
                <span>${rankEmoji}</span>
                <span>${user.username}</span>
                <span>${user.balance.toFixed(2)}</span>
            `;
            leaderboardElement.appendChild(entry);
        });
    } catch (error) {
        console.error('Failed to update leaderboard:', error);
    }
}

// Update initializeGame function
async function initializeGame() {
    updatePreGameStats();
    updateTransactionHistory();
    initializeGameBoard();
    await updateLeaderboard();
}

// Add debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Update handleLogin function
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    try {
        await login(username, password);
        await initializeGame();
        showGameSection();
    } catch (error) {
        showError(error.message);
    }
}

// Add handleRegister function
async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    try {
        await register(username, password);
        await initializeGame();
        showGameSection();
    } catch (error) {
        showError(error.message);
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const authForm = document.querySelector('.auth-form');
    const existingError = authForm.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    authForm.insertBefore(errorDiv, authForm.firstChild);
    
    // Auto-remove error after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Mobile gesture setup
function setupMobileGestures() {
    const gameBoard = document.getElementById('game-board');
    if (!gameBoard) return;

    // Prevent default touch behaviors
    gameBoard.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchTime = Date.now();
    }, { passive: false });

    gameBoard.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    gameBoard.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchDuration = Date.now() - lastTouchTime;

        // Calculate swipe distance
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // If it's a quick tap (less than 300ms) and small movement (less than 10px)
        if (touchDuration < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            const target = document.elementFromPoint(touchEndX, touchEndY);
            if (target && target.classList.contains('mine-cell')) {
                const index = Array.from(target.parentNode.children).indexOf(target);
                handleCellClick(index);
            }
        }
    }, { passive: false });
}

function placeBet() {
    const betAmount = parseFloat(document.getElementById('bet-amount').value);
    
    if (isNaN(betAmount) || betAmount <= 0) {
        alert('Please enter a valid bet amount');
        return;
    }
    
    if (betAmount > currentUser.balance) {
        alert('Insufficient balance');
        return;
    }
    
    if (gameState.gameActive) {
        alert('Game is already in progress');
        return;
    }
    
    try {
        // Deduct bet amount from balance
        currentUser.balance -= betAmount;
        gameState.currentBet = betAmount;
        gameState.gameActive = true;
        gameState.revealedCells = 0;
        gameState.multiplier = 1.00;
        
        // Initialize mines
        const totalCells = 25; // 5x5 grid
        gameState.mines = [];
        const mineCount = parseInt(document.getElementById('mine-count').value);
        
        // Generate random mine positions
        while (gameState.mines.length < mineCount) {
            const randomIndex = Math.floor(Math.random() * totalCells);
            if (!gameState.mines.includes(randomIndex)) {
                gameState.mines.push(randomIndex);
            }
        }
        
        // Update UI
        updateBalance();
        updateGameStats();
        document.getElementById('cashout-btn').disabled = false;
        
        // Reset board
        const cells = document.querySelectorAll('.mine-cell');
        cells.forEach(cell => {
            cell.classList.remove('revealed', 'mine');
        });
        
    } catch (error) {
        console.error('Error placing bet:', error);
        alert('An error occurred while placing your bet');
    }
} 
