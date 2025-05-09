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

// Aviator Game Variables
let aviatorGameActive = false;
let aviatorMultiplier = 1.00;
let aviatorBetAmount = 0;
let aviatorCrashPoint = 0;
let aviatorAnimationFrame = null;
let aviatorStartTime = 0;

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    setupAuthTabs();
    checkLoginStatus();
    updatePreGameStats();
    setupMobileTabs();
    
    // Prevent zoom on double tap for mobile
    document.addEventListener('touchend', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    // Prevent pull-to-refresh on mobile
    document.body.style.overscrollBehavior = 'none';

    // Setup tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Hide all tabs
            document.querySelectorAll('.tab-pane').forEach(tab => {
                tab.classList.add('hidden');
            });
            
            // Show selected tab
            if (tabId === 'game') {
                document.querySelector('.game-container').classList.remove('hidden');
                document.querySelector('.tab-content').classList.add('hidden');
            } else {
                document.querySelector('.game-container').classList.add('hidden');
                document.querySelector('.tab-content').classList.remove('hidden');
                document.getElementById(`${tabId}-tab`).classList.remove('hidden');
            }
            
            // Update active button
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            // Reset Aviator game when switching away
            if (tabId !== 'aviator' && aviatorGameActive) {
                resetAviatorGame();
            }
        });
    });
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
        cell.textContent = '💣';
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
        cell.textContent = '💰';
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
            cell.textContent = '💣';
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
        cell.textContent = '';
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
            <p>You won $${winnings.toFixed(2)}</p>
            <div class="win-animation">$${winnings.toFixed(2)}</div>
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
            right: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: flex-end;
            align-items: center;
            z-index: 1000;
        }
        .popup-content {
            background: #1a1a2e;
            padding: 2rem;
            border-radius: 10px 0 0 10px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            margin-right: 0;
            animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
        .popup-content h2 {
            color: #2ecc71;
            margin-bottom: 1rem;
        }
        .popup-content p {
            color: #fff;
            margin-bottom: 1.5rem;
        }
        .win-animation {
            font-size: 2.5rem;
            color: #2ecc71;
            font-weight: bold;
            margin: 1rem 0;
            animation: scaleUp 1s ease-in-out;
        }
        @keyframes scaleUp {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
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

function animateBalanceIncrease(amount) {
    const balanceDisplay = document.getElementById('balance-display');
    const currentBalance = currentUser.balance;
    const targetBalance = currentBalance + amount;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    
    function updateBalance(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out animation
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentAmount = currentBalance + (amount * easedProgress);
        balanceDisplay.textContent = `Balance: $${currentAmount.toFixed(2)}`;
        
        if (progress < 1) {
            requestAnimationFrame(updateBalance);
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
    
    sortedUsers.forEach((user, index) => {
        const entry = document.createElement('div');
        entry.className = 'leaderboard-entry';
        
        // Add medal emoji for top 3
        let rankEmoji = '';
        if (index === 0) rankEmoji = '🥇';
        else if (index === 1) rankEmoji = '🥈';
        else if (index === 2) rankEmoji = '🥉';
        
        entry.innerHTML = `
            <span class="rank">${rankEmoji} ${index + 1}.</span>
            <span class="username">${user.username}</span>
            <span class="balance">$${user.balance.toFixed(2)}</span>
        `;
        
        // Highlight current user
        if (user.username === currentUser.username) {
            entry.classList.add('current-user');
        }
        
        leaderboardList.appendChild(entry);
    });
}

// Add this to the existing CSS in the JavaScript
const style = document.createElement('style');
style.textContent = `
    .leaderboard-entry {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 1rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        transition: all 0.3s ease;
        align-items: center;
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
    
    .leaderboard-entry .balance {
        font-weight: bold;
        color: #4CAF50;
    }
    
    .leaderboard-entry:hover {
        transform: translateX(5px);
        background: rgba(255, 255, 255, 0.1);
    }
`;
document.head.appendChild(style);

// Mobile tab switching
function setupMobileTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const gameContainer = document.querySelector('.game-container');
    const tabContent = document.querySelector('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Hide all tab panes
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.add('hidden');
            });
            
            // Show selected content
            if (tabId === 'game') {
                gameContainer.classList.remove('hidden');
                tabContent.classList.add('hidden');
            } else {
                gameContainer.classList.add('hidden');
                tabContent.classList.remove('hidden');
                document.getElementById(`${tabId}-tab`).classList.remove('hidden');
            }
            
            // Reset Aviator game when switching away
            if (tabId !== 'aviator' && aviatorGameActive) {
                resetAviatorGame();
            }
        });
    });
}

// Quick bet amount buttons
function setBetAmount(amount) {
    const betInput = document.getElementById('bet-amount');
    const currentBet = parseInt(betInput.value) || 0;
    const newBet = currentBet + amount;
    
    if (newBet <= currentUser.balance) {
        betInput.value = newBet;
    } else {
        betInput.value = currentUser.balance;
    }
}

// Aviator Game Functions
function setAviatorBetAmount(amount) {
    const input = document.getElementById('aviator-bet-amount');
    const currentValue = parseInt(input.value) || 0;
    input.value = currentValue + amount;
}

function placeAviatorBet() {
    if (aviatorGameActive) return;
    
    const betAmount = parseInt(document.getElementById('aviator-bet-amount').value);
    if (!betAmount || betAmount <= 0) {
        showToast('Please enter a valid bet amount');
        return;
    }
    
    if (betAmount > currentUser.balance) {
        showToast('Insufficient balance');
        return;
    }
    
    // Deduct bet amount from balance
    currentUser.balance -= betAmount;
    aviatorBetAmount = betAmount;
    updateBalance();
    
    // Generate random crash point between 1.00 and 10.00
    aviatorCrashPoint = (Math.random() * 9 + 1).toFixed(2);
    
    // Start the game
    aviatorGameActive = true;
    aviatorMultiplier = 1.00;
    aviatorStartTime = Date.now();
    
    // Update UI
    document.getElementById('place-aviator-bet').disabled = true;
    document.getElementById('aviator-cashout-btn').disabled = false;
    document.getElementById('aviator-current-bet').textContent = `Bet: $${betAmount}`;
    
    // Start animation
    const plane = document.querySelector('.plane');
    plane.classList.add('flying');
    
    // Start multiplier update
    updateAviatorMultiplier();
}

function updateAviatorMultiplier() {
    if (!aviatorGameActive) return;
    
    const elapsedTime = (Date.now() - aviatorStartTime) / 1000;
    aviatorMultiplier = (1 + elapsedTime * 0.5).toFixed(2);
    
    // Update UI
    document.querySelector('.multiplier').textContent = `${aviatorMultiplier}x`;
    document.getElementById('aviator-multiplier').textContent = `Multiplier: ${aviatorMultiplier}x`;
    document.getElementById('aviator-potential-win').textContent = 
        `Win: $${(aviatorBetAmount * aviatorMultiplier).toFixed(2)}`;
    
    // Check for crash
    if (parseFloat(aviatorMultiplier) >= parseFloat(aviatorCrashPoint)) {
        aviatorCrash();
    } else {
        aviatorAnimationFrame = requestAnimationFrame(updateAviatorMultiplier);
    }
}

function aviatorCashout() {
    if (!aviatorGameActive) return;
    
    // Calculate winnings
    const winnings = aviatorBetAmount * aviatorMultiplier;
    currentUser.balance += winnings;
    updateBalance();
    
    // Show success message
    showToast(`Cashed out at ${aviatorMultiplier}x! Won $${winnings.toFixed(2)}`);
    
    // Reset game
    resetAviatorGame();
}

function aviatorCrash() {
    if (!aviatorGameActive) return;
    
    // Show crash message
    showToast(`Crashed at ${aviatorMultiplier}x!`);
    
    // Reset game
    resetAviatorGame();
}

function resetAviatorGame() {
    aviatorGameActive = false;
    aviatorMultiplier = 1.00;
    aviatorBetAmount = 0;
    
    // Update UI
    document.getElementById('place-aviator-bet').disabled = false;
    document.getElementById('aviator-cashout-btn').disabled = true;
    document.getElementById('aviator-current-bet').textContent = 'Bet: $0';
    document.getElementById('aviator-multiplier').textContent = 'Multiplier: 1.00x';
    document.getElementById('aviator-potential-win').textContent = 'Win: $0';
    document.querySelector('.multiplier').textContent = '1.00x';
    
    // Reset plane position
    const plane = document.querySelector('.plane');
    plane.classList.remove('flying');
    
    // Cancel animation
    if (aviatorAnimationFrame) {
        cancelAnimationFrame(aviatorAnimationFrame);
        aviatorAnimationFrame = null;
    }
}

// Add tab switching for Aviator
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        
        // Hide all tabs
        document.querySelectorAll('.tab-pane').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Show selected tab
        document.getElementById(`${tabId}-tab`).classList.remove('hidden');
        
        // Update active button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Reset Aviator game when switching away
        if (tabId !== 'aviator' && aviatorGameActive) {
            resetAviatorGame();
        }
    });
}); 
