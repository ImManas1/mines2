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

// Add to the top of the file with other state variables
let friendRequests = JSON.parse(localStorage.getItem('friendRequests')) || [];
let friends = JSON.parse(localStorage.getItem('friends')) || {};

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    setupAuthTabs();
    checkLoginStatus();
    updatePreGameStats();
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
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
        currentUser = user;
        showGameSection();
    }
}

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    // In a real app, this would be a server call
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showGameSection();
        
        // Update friend lists after login
        updateFriendRequests();
        updateFriendsList();
    } else {
        alert('Invalid credentials');
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
    
    // In a real app, this would be a server call
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
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuthSection();
}

function showGameSection() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('game-section').classList.remove('hidden');
    document.getElementById('username-display').textContent = currentUser.username;
    updateBalance();
    updateLeaderboard();
    updateTransactionHistory();
    initializeGameBoard();
    
    // Initialize friend system
    updateFriendRequests();
    updateFriendsList();
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
    
    // New multiplier formula: higher multiplier for more mines
    // Base multiplier increases exponentially with mine count
    const baseMultiplier = 1 + (gameState.mineCount * 0.2) + (Math.pow(gameState.mineCount, 1.5) * 0.05);
    return baseMultiplier.toFixed(2);
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

function placeBet() {
    const betAmount = parseInt(document.getElementById('bet-amount').value);
    
    if (betAmount <= 0 || betAmount > currentUser.balance) {
        alert('Invalid bet amount');
        return;
    }
    
    gameState.currentBet = betAmount;
    gameState.multiplier = 1.00;
    gameState.revealedCells = 0;
    gameState.gameActive = true;
    
    // Generate mines
    gameState.mines = [];
    while (gameState.mines.length < gameState.mineCount) {
        const mine = Math.floor(Math.random() * 25); // Fixed 5x5 grid
        if (!gameState.mines.includes(mine)) {
            gameState.mines.push(mine);
        }
    }
    
    // Reset board
    const cells = document.querySelectorAll('.mine-cell');
    cells.forEach(cell => {
        cell.classList.remove('revealed', 'mine');
    });
    
    updateGameStats();
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
    // Reveal all mines
    gameState.mines.forEach(mineIndex => {
        const cell = document.querySelector(`.mine-cell[data-index="${mineIndex}"]`);
        if (cell) {
            cell.classList.add('mine');
        }
    });

    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'popup-container';
    popup.innerHTML = `
        <div class="popup-content">
            <h2>Game Over!</h2>
            <p>You hit a mine and lost $${gameState.currentBet}</p>
            <button onclick="resetGame()">Play Again</button>
        </div>
    `;
    
    // Add popup to the body
    document.body.appendChild(popup);
    
    // Add styles for the popup
    const style = document.createElement('style');
    style.textContent = `
        .popup-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .popup-content {
            background: #1a1a2e;
            padding: 2rem;
            border-radius: 10px;
            text-align: center;
            max-width: 400px;
            width: 90%;
        }
        .popup-content h2 {
            color: #e74c3c;
            margin-bottom: 1rem;
        }
        .popup-content p {
            color: #fff;
            margin-bottom: 1.5rem;
        }
        .popup-content button {
            background: #4CAF50;
            color: #fff;
            border: none;
            padding: 0.8rem 1.5rem;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        .popup-content button:hover {
            background: #45a049;
        }
    `;
    document.head.appendChild(style);
}

function resetGame() {
    // Remove popup
    const popup = document.querySelector('.popup-container');
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

function cashout() {
    if (!gameState.gameActive || gameState.revealedCells === 0) {
        return;
    }
    
    const winnings = gameState.currentBet * gameState.multiplier;
    
    // Reveal all mines
    gameState.mines.forEach(mineIndex => {
        const cell = document.querySelector(`.mine-cell[data-index="${mineIndex}"]`);
        if (cell) {
            cell.classList.add('mine');
        }
    });
    
    // Show win popup with animation
    showWinPopup(winnings);
    
    // Animate balance increase
    animateBalanceIncrease(winnings);
    
    // Update balance after animation
    setTimeout(() => {
        currentUser.balance += winnings;
        addTransaction('Win', winnings);
        updateBalance();
        
        gameState.gameActive = false;
        updateGameStats();
        resetGame();
    }, 2000); // Wait for animation to complete
}

function showWinPopup(winnings) {
    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'popup-container';
    popup.innerHTML = `
        <div class="popup-content">
            <h2>Congratulations!</h2>
            <p>You won</p>
            <div class="win-animation">
                <div class="bloom-effect"></div>
                <div class="win-amount">$${winnings.toFixed(2)}</div>
            </div>
            <button onclick="closePopup()">Continue</button>
        </div>
    `;
    
    // Add popup to the body
    document.body.appendChild(popup);
    
    // Add styles for the popup
    const style = document.createElement('style');
    style.textContent = `
        .popup-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .popup-content {
            background: #1a1a2e;
            padding: 2rem;
            border-radius: 20px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            position: relative;
            overflow: hidden;
        }
        .popup-content h2 {
            color: #2ecc71;
            margin-bottom: 1rem;
            font-size: 2rem;
            text-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
        }
        .popup-content p {
            color: #fff;
            margin-bottom: 1.5rem;
            font-size: 1.2rem;
        }
        .win-animation {
            position: relative;
            margin: 2rem 0;
        }
        .win-amount {
            font-size: 3rem;
            color: #2ecc71;
            font-weight: bold;
            position: relative;
            z-index: 2;
            text-shadow: 0 0 20px rgba(46, 204, 113, 0.8);
            animation: amountPulse 2s infinite;
        }
        .bloom-effect {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, rgba(46, 204, 113, 0.8) 0%, rgba(46, 204, 113, 0) 70%);
            border-radius: 50%;
            animation: bloomPulse 2s infinite;
            z-index: 1;
        }
        @keyframes bloomPulse {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
        }
        @keyframes amountPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        .popup-content button {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: #fff;
            border: none;
            padding: 0.8rem 1.5rem;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }
        .popup-content button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }
    `;
    document.head.appendChild(style);
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
    const popup = document.querySelector('.popup-container');
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

function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const sortedUsers = [...users].sort((a, b) => b.balance - a.balance);
    
    // Add header
    const header = document.createElement('div');
    header.className = 'leaderboard-header';
    header.innerHTML = `
        <span class="rank">Rank</span>
        <span class="username">Username</span>
        <span class="status">Status</span>
        <span class="balance">Balance</span>
    `;
    leaderboardList.appendChild(header);
    
    sortedUsers.forEach((user, index) => {
        const entry = document.createElement('div');
        entry.className = 'leaderboard-entry';
        
        // Add medal emoji for top 3
        let rankEmoji = '';
        if (index === 0) rankEmoji = '🥇';
        else if (index === 1) rankEmoji = '🥈';
        else if (index === 2) rankEmoji = '🥉';
        
        // Check if user is currently playing
        const isActive = user.username === currentUser?.username;
        
        entry.innerHTML = `
            <span class="rank">${rankEmoji} ${index + 1}.</span>
            <span class="username">${user.username}</span>
            <span class="status">${isActive ? '🟢 Playing' : '⚪ Offline'}</span>
            <span class="balance">$${user.balance.toFixed(2)}</span>
        `;
        
        // Highlight current user
        if (isActive) {
            entry.classList.add('current-user');
        }
        
        leaderboardList.appendChild(entry);
    });
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

// Add these functions after the existing functions
function searchFriends() {
    const searchInput = document.getElementById('friend-search');
    const searchTerm = searchInput.value.toLowerCase();
    
    if (!searchTerm) {
        const existingResults = document.querySelector('.search-results');
        if (existingResults) {
            existingResults.remove();
        }
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    const results = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm) && 
        user.username !== currentUser?.username &&
        !friends[currentUser?.username]?.includes(user.username)
    );
    
    // Remove existing results if any
    const existingResults = document.querySelector('.search-results');
    if (existingResults) {
        existingResults.remove();
    }
    
    const searchResults = document.createElement('div');
    searchResults.className = 'search-results';
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No users found</div>';
    } else {
        results.forEach(user => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <div>${user.username}</div>
                <button class="add-friend-btn" onclick="sendFriendRequest('${user.username}')">Add Friend</button>
            `;
            searchResults.appendChild(resultItem);
        });
    }
    
    searchInput.parentNode.appendChild(searchResults);
}

function sendFriendRequest(username) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    
    // Check if request already exists
    const existingRequest = friendRequests.find(
        request => request.from === currentUser.username && request.to === username
    );
    
    if (existingRequest) {
        alert('Friend request already sent');
        return;
    }
    
    const request = {
        from: currentUser.username,
        to: username,
        timestamp: new Date().toISOString()
    };
    
    friendRequests.push(request);
    localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
    
    // Remove search results
    const searchResults = document.querySelector('.search-results');
    if (searchResults) {
        searchResults.remove();
    }
    
    // Clear search input
    document.getElementById('friend-search').value = '';
    
    updateFriendRequests();
    alert('Friend request sent successfully!');
}

function updateFriendRequests() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    
    const requestsList = document.getElementById('friend-requests-list');
    if (!requestsList) return;
    
    requestsList.innerHTML = '';
    
    const userRequests = friendRequests.filter(request => request.to === currentUser.username);
    
    if (userRequests.length === 0) {
        requestsList.innerHTML = '<div class="no-requests">No friend requests</div>';
        return;
    }
    
    userRequests.forEach(request => {
        const requestItem = document.createElement('div');
        requestItem.className = 'friend-request-item';
        requestItem.innerHTML = `
            <div>${request.from}</div>
            <div class="friend-request-actions">
                <button class="accept-request" onclick="handleFriendRequest('${request.from}', true)">Accept</button>
                <button class="reject-request" onclick="handleFriendRequest('${request.from}', false)">Reject</button>
            </div>
        `;
        requestsList.appendChild(requestItem);
    });
}

function handleFriendRequest(username, accept) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    
    // Remove the request
    friendRequests = friendRequests.filter(request => 
        !(request.from === username && request.to === currentUser.username)
    );
    localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
    
    if (accept) {
        // Add to friends list
        if (!friends[currentUser.username]) {
            friends[currentUser.username] = [];
        }
        if (!friends[username]) {
            friends[username] = [];
        }
        
        if (!friends[currentUser.username].includes(username)) {
            friends[currentUser.username].push(username);
        }
        if (!friends[username].includes(currentUser.username)) {
            friends[username].push(currentUser.username);
        }
        
        localStorage.setItem('friends', JSON.stringify(friends));
        alert(`You are now friends with ${username}!`);
    } else {
        alert(`Friend request from ${username} rejected`);
    }
    
    updateFriendRequests();
    updateFriendsList();
}

function updateFriendsList() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    
    const friendsList = document.getElementById('friends-list');
    if (!friendsList) return;
    
    friendsList.innerHTML = '';
    
    const userFriends = friends[currentUser.username] || [];
    
    if (userFriends.length === 0) {
        friendsList.innerHTML = '<div class="no-friends">No friends yet</div>';
        return;
    }
    
    userFriends.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        friendItem.innerHTML = `
            <div>${friend}</div>
            <div class="friend-status ${friend === currentUser.username ? 'online' : 'offline'}">
                ${friend === currentUser.username ? 'Online' : 'Offline'}
            </div>
        `;
        friendsList.appendChild(friendItem);
    });
}

// Add to the initializeGame function
function initializeGame() {
    // ... existing initialization code ...
    
    // Initialize friend system
    updateFriendRequests();
    updateFriendsList();
    
    // Add event listener for friend search
    const searchInput = document.getElementById('friend-search');
    if (searchInput) {
        searchInput.addEventListener('input', searchFriends);
    }
}

// Update the handleLogin function
function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showGameSection();
        
        // Update friend lists after login
        updateFriendRequests();
        updateFriendsList();
    } else {
        alert('Invalid credentials');
    }
} 
