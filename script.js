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
const API_BASE_URL = 'https://mines-ez7j.onrender.com/api';
let authToken = null;

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
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
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('authToken');
    
    if (storedUser && storedToken) {
        try {
            currentUser = JSON.parse(storedUser);
            authToken = storedToken;
            showGameSection();
            return true;
        } catch (error) {
            console.error('Error parsing stored user:', error);
            logout();
            return false;
        }
    }
    return false;
}

// Authentication Functions
async function register(username, password) {
    if (!username || !password) {
        throw new Error('Username and password are required');
    }
    
    if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        // Store user data and token
        currentUser = data.user;
        authToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('authToken', authToken);
        
        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

async function login(username, password) {
    if (!username || !password) {
        throw new Error('Username and password are required');
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        // Store user data and token
        currentUser = data.user;
        authToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('authToken', authToken);
        
        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
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

// Friend System
async function searchUsers(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/search?query=${query}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to search users');
        }
        return await response.json();
    } catch (error) {
        handleApiError(error);
        throw error;
    }
}

async function sendFriendRequest(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/friends/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ userId })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send friend request');
        }
        const data = await response.json();
        alert('Friend request sent successfully!');
        return data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
}

async function handleFriendRequest(requestId, action) {
    try {
        const response = await fetch(`${API_BASE_URL}/friends/request/${requestId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ action })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to process friend request');
        }
        const data = await response.json();
        
        if (action === 'accept') {
            alert('Friend request accepted!');
        } else {
            alert('Friend request rejected.');
        }
        
        await updateFriendRequests();
        await updateFriendsList();
        return data;
    } catch (error) {
        handleApiError(error);
        throw error;
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
    document.getElementById('username-display').textContent = currentUser.username;
    updateBalance();
    updateLeaderboard();
    updateTransactionHistory();
    initializeGameBoard();
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
    // Base multiplier calculation based on mine count
    const totalCells = 25; // Fixed 5x5 grid
    const safeCells = totalCells - gameState.mineCount;
    
    // More balanced multiplier formula that properly scales with risk
    // The multiplier increases exponentially with the ratio of mines to safe cells
    const mineRatio = gameState.mineCount / totalCells;
    const safeRatio = safeCells / totalCells;
    
    // Base multiplier calculation that ensures higher risk = higher reward
    // The formula ensures that:
    // 1. More mines = higher multiplier
    // 2. The increase is exponential but controlled
    // 3. The multiplier is always greater than 1
    const baseMultiplier = 1 + (mineRatio * 2) + (Math.pow(mineRatio, 2) * 3);
    
    // Ensure the multiplier is reasonable and capped
    const maxMultiplier = 10; // Cap the maximum multiplier
    return Math.min(baseMultiplier, maxMultiplier).toFixed(2);
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
    document.getElementById('current-bet').textContent = `Current Bet: $${gameState.currentBet}`;
    document.getElementById('multiplier').textContent = `Multiplier: ${gameState.multiplier}x`;
    document.getElementById('probability').textContent = `Probability: ${calculateProbability()}%`;
    document.getElementById('potential-win').textContent = `Potential Win: $${calculatePotentialWin()}`;
    
    // Enable/disable cashout button
    const cashoutBtn = document.getElementById('cashout-btn');
    cashoutBtn.disabled = !gameState.gameActive || gameState.revealedCells === 0;
}

function initializeGameBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = 'repeat(5, 1fr)'; // Fixed 5x5 grid
    
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
        
        // New multiplier calculation that increases more with each revealed cell
        const baseMultiplier = 1 + (gameState.mineCount * 0.2) + (Math.pow(gameState.mineCount, 1.5) * 0.05);
        const cellMultiplier = gameState.revealedCells * (0.1 + (gameState.mineCount * 0.02));
        gameState.multiplier = (baseMultiplier + cellMultiplier).toFixed(2);
        
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

// Update the leaderboard styles
const style = document.createElement('style');
style.textContent = `
    .leaderboard-header {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 1rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        margin-bottom: 0.5rem;
        font-weight: bold;
        color: rgba(255, 255, 255, 0.8);
    }
    
    .leaderboard-entry {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 1rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        transition: all 0.3s ease;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .leaderboard-entry.current-user {
        background: rgba(76, 175, 80, 0.2);
        border: 1px solid rgba(76, 175, 80, 0.3);
    }
    
    .leaderboard-entry .rank {
        font-weight: bold;
        min-width: 3rem;
    }
    
    .leaderboard-entry .username {
        font-weight: 500;
    }
    
    .leaderboard-entry .status {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
        min-width: 6rem;
        text-align: center;
    }
    
    .leaderboard-entry .balance {
        font-weight: bold;
        color: #4CAF50;
        min-width: 8rem;
        text-align: right;
    }
    
    .leaderboard-entry:hover {
        transform: translateX(5px);
        background: rgba(255, 255, 255, 0.1);
    }
    
    #leaderboard-list {
        max-height: 400px;
        overflow-y: auto;
        padding-right: 0.5rem;
    }
    
    #leaderboard-list::-webkit-scrollbar {
        width: 6px;
    }
    
    #leaderboard-list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
    }
    
    #leaderboard-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
    }
    
    #leaderboard-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
    }
`;
document.head.appendChild(style);

// Add bloom effect styles for balance display
const balanceStyle = document.createElement('style');
balanceStyle.textContent = `
    .balance-bloom {
        position: relative;
        animation: balancePulse 0.5s ease-in-out;
    }
    
    .balance-bloom::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(46, 204, 113, 0.5) 0%, rgba(46, 204, 113, 0) 70%);
        border-radius: 50%;
        animation: balanceBloom 0.5s ease-in-out;
    }
    
    @keyframes balancePulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    @keyframes balanceBloom {
        0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
        100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    }
`;
document.head.appendChild(balanceStyle);

// Friends System
async function searchFriends() {
    const searchInput = document.getElementById('friend-search');
    const query = searchInput.value.trim();
    
    if (!query) {
        const existingResults = document.querySelector('.search-results');
        if (existingResults) {
            existingResults.remove();
        }
        return;
    }

    try {
        const users = await searchUsers(query);
        const existingResults = document.querySelector('.search-results');
        if (existingResults) {
            existingResults.remove();
        }

        const searchResults = document.createElement('div');
        searchResults.className = 'search-results';

        if (users.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">No users found</div>';
        } else {
            users.forEach(user => {
                // Skip current user from search results
                if (user._id === currentUser._id) return;
                
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.innerHTML = `
                    <div>${user.username}</div>
                    <button class="add-friend-btn" onclick="sendFriendRequest('${user._id}')">Add Friend</button>
                `;
                searchResults.appendChild(resultItem);
            });
        }

        const searchContainer = searchInput.parentNode;
        searchContainer.appendChild(searchResults);

        // Close search results when clicking outside
        document.addEventListener('click', function closeResults(e) {
            if (!searchContainer.contains(e.target)) {
                searchResults.remove();
                document.removeEventListener('click', closeResults);
            }
        });
    } catch (error) {
        console.error('Failed to search users:', error);
        alert('Failed to search users. Please try again.');
    }
}

async function updateFriendRequests() {
    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch friend requests');
        }
        const user = await response.json();
        
        const requestsList = document.getElementById('friend-requests-list');
        requestsList.innerHTML = '';

        if (user.friendRequests.length === 0) {
            requestsList.innerHTML = '<div class="no-requests">No friend requests</div>';
            return;
        }

        user.friendRequests.forEach(request => {
            if (request.status === 'pending') {
                const requestItem = document.createElement('div');
                requestItem.className = 'friend-request-item';
                requestItem.innerHTML = `
                    <div>${request.from.username}</div>
                    <div class="friend-request-actions">
                        <button class="accept-request" onclick="handleFriendRequest('${request._id}', 'accept')">Accept</button>
                        <button class="reject-request" onclick="handleFriendRequest('${request._id}', 'reject')">Reject</button>
                    </div>
                `;
                requestsList.appendChild(requestItem);
            }
        });
    } catch (error) {
        handleApiError(error);
    }
}

async function updateFriendsList() {
    try {
        const response = await fetch(`https://mines-ez7j.onrender.com/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch friends list');
        }
        const user = await response.json();
        
        const friendsList = document.getElementById('friends-list');
        friendsList.innerHTML = '';

        if (user.friends.length === 0) {
            friendsList.innerHTML = '<div class="no-friends">No friends yet</div>';
            return;
        }

        user.friends.forEach(friend => {
            const friendItem = document.createElement('div');
            friendItem.className = 'friend-item';
            friendItem.innerHTML = `
                <div>${friend.username}</div>
                <div class="friend-status ${friend.online ? 'online' : 'offline'}">
                    ${friend.online ? 'Online' : 'Offline'}
                </div>
            `;
            friendsList.appendChild(friendItem);
        });
    } catch (error) {
        handleApiError(error);
    }
}

// Update initializeGame function
async function initializeGame() {
    updatePreGameStats();
    updateTransactionHistory();
    initializeGameBoard();
    
    // Initialize friends system
    const searchInput = document.getElementById('friend-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchFriends, 300));
    }
    
    await updateFriendRequests();
    await updateFriendsList();
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
        showGameSection();
        await initializeGame();
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
        showGameSection();
        await initializeGame();
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
