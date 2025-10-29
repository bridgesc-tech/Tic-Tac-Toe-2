class TicTacToeCardGame {
    constructor() {
        this.board = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
        this.currentPlayer = 'green'; // 'green' or 'red'
        this.gameMode = null;
        this.gameActive = false;
        this.scores = { green: 0, red: 0, draws: 0 };
        this.winningCombinations = [
            // Rows
            [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
            // Columns
            [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
            // Diagonals
            [0, 5, 10, 15], [3, 6, 9, 12]
        ];
        
        // Card deck management
        this.playerDecks = {
            green: this.createDeck('green'),
            red: this.createDeck('red')
        };
        
        this.draggedCard = null;
        this.selectedCard = null; // For mobile touch support
        
        // Track which tiles have been replaced (locked tiles)
        this.replacedTiles = new Set();
        
        // Store cell colors for online multiplayer
        this.storedCellColors = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
        
        // Firebase online multiplayer
        this.gameRoomId = null;
        this.myPlayerColor = null; // 'green' or 'red' - determines which player I am
        this.myPlayerName = 'Player'; // Player's name
        this.opponentName = 'Opponent'; // Opponent's name
        this.firebaseEnabled = false;
        this.gameUnsubscribe = null; // Firebase listener unsubscribe function
        this.gameResult = null; // Store game result (win/draw) for syncing
        
        this.initializeEventListeners();
        this.updateDisplay();
        this.checkFirebase();
    }

    checkFirebase() {
        // Wait for Firebase to be ready
        const checkFirebase = () => {
            if (typeof db !== 'undefined' && db !== null) {
                this.firebaseEnabled = true;
                console.log('Firebase ready for TicTacToe');
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    }

    createDeck(color) {
        const deck = [];
        // Each player gets 2 copies of numbers 1-5
        for (let i = 1; i <= 5; i++) {
            deck.push({ number: i, color: color, used: false, id: `${color}-${i}-1` });
            deck.push({ number: i, color: color, used: false, id: `${color}-${i}-2` });
        }
        return deck;
    }

    initializeEventListeners() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.addEventListener('dragover', (e) => this.handleDragOver(e));
            cell.addEventListener('drop', (e) => this.handleDrop(e));
            cell.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            cell.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            
            // Touch support for mobile
            cell.addEventListener('touchstart', (e) => this.handleCellTouchStart(e));
            cell.addEventListener('touchend', (e) => this.handleCellTouchEnd(e));
        });
    }

    startGame(mode) {
        this.gameMode = mode;
        
        // Close any open modals first
        document.getElementById('gameRoomModal').style.display = 'none';
        document.getElementById('waitingRoomModal').style.display = 'none';
        
        // Online mode is now handled by Firebase game rooms via showGameRoomModal()
        // For backwards compatibility, still check URL for old-style game states
        if (mode === 'online') {
            const urlParams = new URLSearchParams(window.location.search);
            const gameState = urlParams.get('state');
            
            if (gameState) {
                // Load existing game from URL (legacy support)
                this.loadGameFromURL(gameState);
                return;
            }
            // If no URL state, online mode should have been triggered via modal
            // Just return and let modal handle it
            return;
        }
        
        // Show coin flip for AI and local multiplayer
        document.getElementById('gameModeSelection').style.display = 'none';
        document.getElementById('coinFlipContainer').style.display = 'block';
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('gameResult').style.display = 'none';
        
        this.performCoinFlip();
    }

    performCoinFlip() {
        const coin = document.getElementById('coin');
        const coinResult = document.getElementById('coinResult');
        const coinResultText = document.getElementById('coinResultText');
        
        // Hide result initially
        coinResult.style.display = 'none';
        
        // Randomly determine winner first
        const randomValue = Math.random();
        const winner = randomValue < 0.5 ? 'green' : 'red';
        this.coinFlipWinner = winner;
        
        console.log(`Coin flip - Random value: ${randomValue}, Winner: ${winner}`);
        
        // Start JavaScript animation
        this.animateCoinFlip(coin, winner, coinResult, coinResultText);
    }

    animateCoinFlip(coin, winner, coinResult, coinResultText) {
        // Start CSS animation
        coin.classList.add('flipping');
        
        // Show result after animation completes
        setTimeout(() => {
            // Stop animation
            coin.classList.remove('flipping');
            
            // Set final position based on winner
            const coinGreen = document.getElementById('coinGreen');
            const coinRed = document.getElementById('coinRed');
            
            if (winner === 'green') {
                coinGreen.style.transform = 'rotateY(0deg)';
                coinRed.style.transform = 'rotateY(180deg)';
            } else {
                coinGreen.style.transform = 'rotateY(180deg)';
                coinRed.style.transform = 'rotateY(0deg)';
            }
            
            // Show result
            const winnerText = winner === 'green' ? 'You go first!' : 'AI goes first!';
            coinResultText.textContent = winnerText;
            coinResult.style.display = 'block';
        }, 2000); // Match CSS animation duration
    }

    proceedToGame() {
        // Close any open modals
        document.getElementById('gameRoomModal').style.display = 'none';
        document.getElementById('waitingRoomModal').style.display = 'none';
        
        this.resetBoard();
        this.gameActive = true;
        
        // Set the starting player based on coin flip AFTER resetBoard
        this.currentPlayer = this.coinFlipWinner;
        
        document.getElementById('coinFlipContainer').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
        
        this.updateCurrentPlayerDisplay();
        this.updatePlayerDeck();
        
        // If AI mode and AI goes first, make AI move
        if (this.gameMode === 'ai' && this.currentPlayer === 'red') {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    resetBoard() {
        console.log('resetBoard() called - resetting board array');
        this.board = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
        this.currentPlayer = 'green';
        this.gameActive = true;
        this.gameResult = null; // Clear any previous game result
        
        // Reset decks
        this.playerDecks.green = this.createDeck('green');
        this.playerDecks.red = this.createDeck('red');
        
        // Reset selected card
        this.selectedCard = null;
        
        // Reset replaced tiles tracking
        this.replacedTiles.clear();
        
        // Reset stored cell colors
        this.storedCellColors = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
        
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.textContent = '';
            cell.className = 'cell';
            cell.classList.remove('winning'); // Remove winning highlights
        });
        
        this.updateCurrentPlayerDisplay();
        this.updatePlayerDeck();
    }

    updatePlayerDeck() {
        // Update Player 1 (Green) deck
        const player1Container = document.getElementById('player1DeckContainer');
        const player1Label = document.querySelector('#player1Deck h3');
        
        // Update player name label for online mode
        if (this.gameMode === 'online' && player1Label) {
            const greenPlayerName = this.myPlayerColor === 'green' ? this.myPlayerName : this.opponentName;
            player1Label.textContent = `${greenPlayerName}'s Cards`;
        } else if (player1Label && this.gameMode !== 'online') {
            player1Label.textContent = 'Player 1 Cards';
        }
        
        player1Container.innerHTML = '';
        
        const greenDeck = this.playerDecks.green;
        greenDeck.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `card ${card.color}`;
            cardElement.textContent = card.number;
            cardElement.dataset.cardId = card.id;
            
            if (card.used) {
                // Mark used cards as disabled and non-draggable
                cardElement.classList.add('used');
                cardElement.draggable = false;
                cardElement.style.opacity = '0.3';
                cardElement.style.cursor = 'not-allowed';
            } else {
                // Available cards are draggable only on current player's turn
                // In online mode, also check if it's our turn
                const canDrag = this.currentPlayer === 'green' && 
                               (this.gameMode !== 'online' || this.currentPlayer === this.myPlayerColor);
                cardElement.draggable = canDrag;
                if (canDrag) {
                    cardElement.addEventListener('dragstart', (e) => this.handleDragStart(e));
                    cardElement.addEventListener('dragend', (e) => this.handleDragEnd(e));
                    // Touch support for mobile
                    cardElement.addEventListener('touchend', (e) => this.handleCardTouch(e, card));
                } else {
                    cardElement.style.opacity = '0.6';
                    cardElement.style.cursor = 'not-allowed';
                }
            }
            
            player1Container.appendChild(cardElement);
        });
        
        // Update Player 2/AI (Red) deck
        const player2Container = document.getElementById('player2DeckContainer');
        const player2Label = document.querySelector('#player2Deck h3');
        
        // Update player name label for online mode
        if (this.gameMode === 'online' && player2Label) {
            const redPlayerName = this.myPlayerColor === 'red' ? this.myPlayerName : this.opponentName;
            player2Label.textContent = `${redPlayerName}'s Cards`;
        } else if (player2Label && this.gameMode === 'ai') {
            player2Label.textContent = 'AI Cards';
        } else if (player2Label && this.gameMode === 'multiplayer') {
            player2Label.textContent = 'Player 2 Cards';
        }
        
        player2Container.innerHTML = '';
        
        const redDeck = this.playerDecks.red;
        redDeck.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `card ${card.color}`;
            cardElement.textContent = card.number;
            cardElement.dataset.cardId = card.id;
            
            if (card.used) {
                // Mark used cards as disabled and non-draggable
                cardElement.classList.add('used');
                cardElement.draggable = false;
                cardElement.style.opacity = '0.3';
                cardElement.style.cursor = 'not-allowed';
            } else {
                // Available cards are draggable only on current player's turn
                // In online mode, also check if it's our turn
                const canDrag = this.currentPlayer === 'red' && 
                               (this.gameMode !== 'online' || this.currentPlayer === this.myPlayerColor);
                cardElement.draggable = canDrag;
                if (canDrag) {
                    cardElement.addEventListener('dragstart', (e) => this.handleDragStart(e));
                    cardElement.addEventListener('dragend', (e) => this.handleDragEnd(e));
                    // Touch support for mobile
                    cardElement.addEventListener('touchend', (e) => this.handleCardTouch(e, card));
                } else {
                    cardElement.style.opacity = '0.6';
                    cardElement.style.cursor = 'not-allowed';
                }
            }
            
            player2Container.appendChild(cardElement);
        });
    }

    handleDragStart(e) {
        if (!this.gameActive) {
            e.preventDefault();
            return;
        }
        
        // Only allow dragging if it's the current player's turn
        const cardColor = e.target.classList.contains('green') ? 'green' : 'red';
        if (cardColor !== this.currentPlayer) {
            e.preventDefault();
            return;
        }
        
        this.draggedCard = e.target.dataset.cardId;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedCard = null;
    }

    // Mobile touch support methods
    handleCardTouch(e, card) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!this.gameActive) return;
        
        // Only allow selection if it's the current player's turn
        const cardColor = card.color;
        if (cardColor !== this.currentPlayer || card.used) {
            return;
        }
        
        // Toggle card selection
        if (this.selectedCard && this.selectedCard.id === card.id) {
            // Deselect if clicking the same card
            this.selectedCard = null;
            this.updateCardSelection();
        } else {
            // Select new card
            this.selectedCard = card;
            this.updateCardSelection();
        }
    }

    handleCellTouchStart(e) {
        // Prevent default behavior
        e.preventDefault();
    }

    handleCellTouchEnd(e) {
        e.preventDefault();
        
        if (!this.gameActive || !this.selectedCard) return;
        
        // Find the cell element
        let cellElement = e.target;
        while (cellElement && !cellElement.classList.contains('cell')) {
            cellElement = cellElement.parentElement;
        }
        
        if (!cellElement) return;
        
        const cellIndex = parseInt(cellElement.dataset.index);
        
        // Check if valid placement
        const card = this.selectedCard;
        const currentPiece = this.board[cellIndex];
        
        // Can't place on locked tiles
        if (this.replacedTiles.has(cellIndex)) {
            this.selectedCard = null;
            this.updateCardSelection();
            return;
        }
        
        if (currentPiece === '') {
            // Empty cell - can place
            this.makeMove(cellIndex, card);
            this.selectedCard = null;
            this.updateCardSelection();
        } else if (typeof currentPiece === 'number') {
            const currentColor = this.getCellColor(cellIndex);
            if (currentColor !== this.currentPlayer && card.number > currentPiece) {
                // Can overwrite enemy piece
                this.makeMove(cellIndex, card);
                this.selectedCard = null;
                this.updateCardSelection();
            }
        }
    }

    updateCardSelection() {
        // Update visual feedback for selected card
        const cards = document.querySelectorAll('.card');
        cards.forEach(cardElement => {
            const cardId = cardElement.dataset.cardId;
            const card = this.findCardById(cardId);
            
            if (this.selectedCard && cardId === this.selectedCard.id) {
                cardElement.classList.add('selected');
                cardElement.style.transform = 'scale(1.15)';
                cardElement.style.borderColor = '#667eea';
                cardElement.style.borderWidth = '4px';
            } else {
                cardElement.classList.remove('selected');
                cardElement.style.transform = '';
                cardElement.style.borderColor = '';
                cardElement.style.borderWidth = '';
            }
        });
    }

    handleDragOver(e) {
        if (!this.gameActive) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        if (!this.gameActive) return;
        e.preventDefault();
        
        // Find the cell element (in case we're hovering over a child element like span)
        let cellElement = e.target;
        while (cellElement && !cellElement.classList.contains('cell')) {
            cellElement = cellElement.parentElement;
        }
        
        if (!cellElement) return;
        
        const cellIndex = parseInt(cellElement.dataset.index);
        const cardId = this.draggedCard;
        const card = this.findCardById(cardId);
        
        if (!card || card.used || card.color !== this.currentPlayer) return;
        
        // Check if we can place the card here
        const currentPiece = this.board[cellIndex];
        let canPlace = false;
        let canOverwrite = false;
        
        // Can't place on locked tiles (tiles that have been replaced)
        if (this.replacedTiles.has(cellIndex)) {
            return; // Can't place on locked tiles
        }
        
        if (currentPiece === '') {
            canPlace = true;
        } else if (typeof currentPiece === 'number') {
            const currentColor = this.getCellColor(cellIndex);
            
            if (currentColor !== this.currentPlayer && card.number > currentPiece) {
                canPlace = true;
                canOverwrite = true;
            }
        }
        
        if (canPlace) {
            cellElement.classList.add('drag-over');
            if (canOverwrite) {
                cellElement.classList.add('can-overwrite');
            }
        }
    }

    handleDragLeave(e) {
        // Find the cell element (in case we're leaving a child element like span)
        let cellElement = e.target;
        while (cellElement && !cellElement.classList.contains('cell')) {
            cellElement = cellElement.parentElement;
        }
        
        if (cellElement) {
            cellElement.classList.remove('drag-over', 'can-overwrite');
        }
    }

    handleDrop(e) {
        if (!this.gameActive) return;
        
        e.preventDefault();
        
        // Find the cell element (in case we dropped on a child element like span)
        let cellElement = e.target;
        while (cellElement && !cellElement.classList.contains('cell')) {
            cellElement = cellElement.parentElement;
        }
        
        if (!cellElement) {
            console.error('handleDrop - Could not find cell element');
            return;
        }
        
        cellElement.classList.remove('drag-over', 'can-overwrite');
        
        const cellIndex = parseInt(cellElement.dataset.index);
        const cardId = this.draggedCard;
        const card = this.findCardById(cardId);
        
        console.log('handleDrop - e.target:', e.target);
        console.log('handleDrop - cellElement:', cellElement);
        console.log('handleDrop - dataset.index:', cellElement.dataset.index);
        console.log('handleDrop - cellIndex:', cellIndex);
        console.log('handleDrop - cardId:', cardId);
        console.log('handleDrop - card:', card);
        
        // Validate cell index
        if (isNaN(cellIndex) || cellIndex < 0 || cellIndex > 15) {
            console.error('handleDrop - Invalid cell index:', cellIndex);
            return;
        }
        
        if (!card || card.used || card.color !== this.currentPlayer) {
            console.log('handleDrop - Invalid card or not current player');
            return;
        }
        
        // Check if we can place the card (empty cell or overwriting with higher number)
        const currentPiece = this.board[cellIndex];
        
        // Can't place on locked tiles (tiles that have been replaced)
        if (this.replacedTiles.has(cellIndex)) {
            console.log('handleDrop - Cannot place on locked tile');
            return;
        }
        
        if (currentPiece !== '' && typeof currentPiece === 'number') {
            // There's already a piece here, check if we can overwrite it
            const currentColor = this.getCellColor(cellIndex);
            
            // Can only overwrite enemy pieces, and only with higher numbers
            if (currentColor === this.currentPlayer || card.number <= currentPiece) {
                return; // Can't overwrite
            }
        }
        
        this.makeMove(cellIndex, card);
    }

    findCardById(cardId) {
        for (let color in this.playerDecks) {
            const card = this.playerDecks[color].find(c => c.id === cardId);
            if (card) return card;
        }
        return null;
    }

    makeMove(index, card) {
        if (!this.gameActive) return;

        // For online mode, check if it's our turn
        if (this.gameMode === 'online' && this.currentPlayer !== this.myPlayerColor) {
            return; // Not our turn
        }
        
        console.log(`makeMove(${index}, ${card.number}, ${card.color}) - Before: board[${index}] = ${this.board[index]}`);
        
        // Check if we're overwriting an enemy piece
        const isOverwriting = this.board[index] !== '';
        const previousPiece = this.board[index];
        
        // Track if this tile has been replaced before
        if (isOverwriting) {
            this.replacedTiles.add(index);
        }
        
        this.board[index] = card.number;
        card.used = true;
        
        console.log(`makeMove(${index}, ${card.number}, ${card.color}) - After: board[${index}] = ${this.board[index]}`);
        console.log(`makeMove - Full board state:`, [...this.board]);
        
        const cell = document.querySelector(`[data-index="${index}"]`);
        
        // Validate that we found the cell element
        if (!cell) {
            console.error(`makeMove - Could not find cell with index ${index}`);
            return;
        }
        
        // Add overwrite animation if we're replacing a piece
        if (isOverwriting) {
            cell.classList.add('overwriting');
            setTimeout(() => {
                cell.classList.remove('overwriting');
            }, 300);
        }
        
        cell.innerHTML = `<span class="number">${card.number}</span>`;
        cell.className = `cell ${card.color}`; // Reset classes and add new color
        
        // Store the cell color for online multiplayer
        this.storedCellColors[index] = card.color;
        
        // Add locked class if this tile has been replaced
        if (this.replacedTiles.has(index)) {
            cell.classList.add('locked');
        }
        
        const winResult = this.checkWin();
        if (winResult) {
            this.endGame(winResult);
            // Sync final state
            if (this.gameMode === 'online' && this.firebaseEnabled) {
                this.syncGameStateToFirebase();
            }
            return;
        }
        
        if (this.checkDraw()) {
            this.endGame('draw');
            if (this.gameMode === 'online' && this.firebaseEnabled) {
                this.syncGameStateToFirebase();
            }
            return;
        }
        
        // Check for automatic draw when both players run out of playable cards
        if (this.checkAutomaticDraw()) {
            this.endGame('draw');
            if (this.gameMode === 'online' && this.firebaseEnabled) {
                this.syncGameStateToFirebase();
            }
            return;
        }
        
        this.switchPlayer();
        this.updateCurrentPlayerDisplay();
        this.updatePlayerDeck();
        
        // Sync to Firebase for online mode
        if (this.gameMode === 'online' && this.firebaseEnabled) {
            this.syncGameStateToFirebase();
        }
        
        // If AI mode and it's AI's turn, make AI move
        if (this.gameMode === 'ai' && this.currentPlayer === 'red') {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    makeAIMove() {
        if (!this.gameActive || this.currentPlayer !== 'red') return;
        
        // Check if AI has any playable cards
        if (!this.hasPlayableCards('red')) {
            // AI has no playable cards, check if game should end in draw
            if (this.checkAutomaticDraw()) {
                this.endGame('draw');
            }
            return;
        }
        
        const bestMove = this.getBestMove();
        if (bestMove !== null) {
            this.makeMove(bestMove.index, bestMove.card);
        }
    }

    getBestMove() {
        const availableCards = this.playerDecks.red.filter(card => !card.used);
        const opponentCards = this.playerDecks.green.filter(card => !card.used);
        let bestMove = null;
        let bestScore = -Infinity;
        
        // Create a snapshot of the current board state to prevent modifications during evaluation
        const boardSnapshot = [...this.board];
        const currentPlayerSnapshot = this.currentPlayer;
        
        console.log('=== AI DEBUG - UPDATED VERSION ===');
        console.log('AI Debug - Available cards:', availableCards.map(c => c.number));
        console.log('AI Debug - Opponent cards:', opponentCards.map(c => c.number));
        console.log('AI Debug - Board state:', boardSnapshot);
        console.log('AI Debug - Current player:', currentPlayerSnapshot);
        
        // First, check for immediate winning moves
        for (let i = 0; i < 16; i++) {
            for (let card of availableCards) {
                if (this.canPlaceCardWithSnapshot(i, card, boardSnapshot, currentPlayerSnapshot)) {
                    // Simulate the move
                    const originalValue = this.board[i];
                    const originalColor = this.getCellColor(i);
                    this.board[i] = card.number;
                    this.setCellColor(i, 'red');
                    
                    if (this.checkWinForSimulation() === 'red') {
                        console.log('AI Debug - Found winning move:', i, card.number);
                        this.board[i] = originalValue;
                        this.setCellColor(i, originalColor);
                        return { index: i, card: card };
                    }
                    
                    this.board[i] = originalValue;
                    this.setCellColor(i, originalColor);
                }
            }
        }
        
        // Second, check for blocking moves (prevent opponent from winning)
        for (let i = 0; i < 9; i++) {
            for (let card of availableCards) {
                if (this.canPlaceCardWithSnapshot(i, card, boardSnapshot, currentPlayerSnapshot)) {
                    // Check if opponent can win on their next turn
                    let opponentCanWin = false;
                    let blockingMove = null;
                    let bestBlockingCard = null;
                    let bestBlockingScore = -Infinity;
                    
                    // Check all empty positions for opponent wins
                    for (let j = 0; j < 16; j++) {
                        if (this.board[j] === '') {
                            for (let oppCard of opponentCards) {
                                // Simulate opponent move
                                const originalValue = this.board[j];
                                this.board[j] = oppCard.number;
                                this.setCellColor(j, 'green');
                                
                                if (this.checkWinForSimulation() === 'green') {
                                    opponentCanWin = true;
                                    // This position needs to be blocked
                                    if (i === j) {
                                        // Calculate how secure this blocking move would be
                                        const blockingScore = this.calculateBlockingSecurity(card, opponentCards);
                                        if (blockingScore > bestBlockingScore) {
                                            bestBlockingScore = blockingScore;
                                            bestBlockingCard = card;
                                            blockingMove = { index: i, card: card };
                                        }
                                    }
                                }
                                
                                // Restore
                                this.board[j] = originalValue;
                                this.setCellColor(j, '');
                                
                                if (opponentCanWin) break;
                            }
                            if (opponentCanWin) break;
                        }
                    }
                    
                    if (opponentCanWin && blockingMove && bestBlockingCard) {
                        console.log('AI Debug - Found blocking move:', blockingMove.index, bestBlockingCard.number, 'Security score:', bestBlockingScore);
                        
                        // Only use blocking move if it has a reasonable security score
                        // Don't block with terrible moves (negative scores)
                        if (bestBlockingScore > 0) {
                            console.log('AI Debug - Using blocking move (good security score)');
                            return blockingMove;
                        } else {
                            console.log('AI Debug - Ignoring blocking move (poor security score), will evaluate strategic moves instead');
                        }
                    }
                }
            }
        }
        
        // Third, use advanced strategic positioning
        console.log('AI Debug - No blocking needed, evaluating strategic moves...');
        for (let i = 0; i < 16; i++) {
            for (let card of availableCards) {
                if (this.canPlaceCardWithSnapshot(i, card, boardSnapshot, currentPlayerSnapshot)) {
                    const score = this.evaluateAdvancedStrategy(i, card, boardSnapshot, opponentCards);
                    console.log(`AI Debug - Position ${i}, Card ${card.number}, Score: ${score}`);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { index: i, card: card };
                    }
                }
            }
        }
        
        console.log('AI Debug - Best move:', bestMove ? `${bestMove.index}, ${bestMove.card.number}` : 'none');
        return bestMove;
    }

    canPlaceCardWithSnapshot(index, card, boardSnapshot, currentPlayerSnapshot) {
        const currentPiece = boardSnapshot[index];
        const currentColor = this.getCellColor(index);
        
        console.log(`canPlaceCardWithSnapshot(${index}, ${card.number}): boardSnapshot[${index}]=${currentPiece}, color=${currentColor}, currentPlayer=${currentPlayerSnapshot}`);
        
        if (currentPiece === '') {
            console.log(`  -> Empty cell, allowing placement`);
            return true; // Empty cell
        }
        
        if (typeof currentPiece === 'number') {
            const canOverwrite = currentColor !== currentPlayerSnapshot && card.number > currentPiece;
            console.log(`  -> Can overwrite: ${canOverwrite} (color different: ${currentColor !== currentPlayerSnapshot}, higher number: ${card.number > currentPiece})`);
            return canOverwrite;
        }
        
        console.log(`  -> Not a number, denying placement`);
        return false;
    }

    calculateBlockingSecurity(card, opponentCards) {
        // Calculate how secure this blocking move would be
        let securityScore = 0;
        
        // Higher cards are more secure (harder to overwrite)
        securityScore += card.number * 15;
        
        // Check if opponent has cards that can overwrite this
        const canOverwrite = opponentCards.some(oppCard => oppCard.number > card.number);
        if (!canOverwrite) {
            securityScore += 100; // Very secure - opponent can't overwrite
        } else {
            // Count how many opponent cards can overwrite this
            const overwriteCount = opponentCards.filter(oppCard => oppCard.number > card.number).length;
            const maxOpponentCard = Math.max(...opponentCards.map(c => c.number));
            const overwriteDifficulty = maxOpponentCard - card.number;
            
            // Heavy penalty for easily overwritable blocking moves
            securityScore -= (overwriteCount * 20) + (overwriteDifficulty * 10);
        }
        
        return securityScore;
    }

    evaluateAdvancedStrategy(index, card, boardSnapshot, opponentCards) {
        let score = 0;
        
        // 1. BASIC POSITION VALUE
        const positionValues = [3, 1, 3, 1, 5, 1, 3, 1, 3]; // Center = 5, corners = 3, edges = 1
        score += positionValues[index];
        
        // 2. CARD CONSERVATION STRATEGY
        const myCards = this.playerDecks.red.filter(c => !c.used);
        const myHighCards = myCards.filter(c => c.number >= 4).length;
        const myLowCards = myCards.filter(c => c.number <= 2).length;
        
        // If we have many high cards, prefer using lower cards early
        if (myHighCards >= 3 && card.number >= 4) {
            score -= 20; // Penalty for using high cards too early
        }
        
        // If we have few high cards, be more careful with them
        if (myHighCards <= 2 && card.number >= 4) {
            score += 10; // Bonus for strategic high card usage
        }
        
        // 3. OPPONENT MOVE PREDICTION
        const opponentThreats = this.predictOpponentThreats(boardSnapshot, opponentCards);
        const defensiveScore = this.evaluateDefensiveValue(index, card, opponentThreats);
        score += defensiveScore;
        
        // 4. OFFENSIVE BAITING STRATEGY
        const baitingScore = this.evaluateBaitingPotential(index, card, boardSnapshot, opponentCards);
        score += baitingScore;
        
        // 5. CARD PERMANENCE (existing logic)
        const canOverwrite = opponentCards.some(oppCard => oppCard.number > card.number);
        if (!canOverwrite) {
            score += 50; // Very secure placement
            const maxOpponentCard = opponentCards.length > 0 ? Math.max(...opponentCards.map(c => c.number)) : 0;
            if (card.number > maxOpponentCard) {
                score += 20; // Bonus for placing a card higher than opponent's highest
            }
        } else {
            const overwriteCount = opponentCards.filter(oppCard => oppCard.number > card.number).length;
            const maxOpponentCard = Math.max(...opponentCards.map(c => c.number));
            const overwriteDifficulty = maxOpponentCard - card.number;
            score -= (overwriteCount * 15) + (overwriteDifficulty * 8);
        }
        
        // 6. THREAT CREATION (weighted by permanence)
        const threatScore = this.evaluateThreatCreation(index, card, canOverwrite);
        score += threatScore;
        
        return score;
    }

    predictOpponentThreats(boardSnapshot, opponentCards) {
        const threats = [];
        
        // Check all empty positions for potential opponent threats
        for (let i = 0; i < 16; i++) {
            if (boardSnapshot[i] === '') {
                for (let oppCard of opponentCards) {
                    // Simulate opponent placing this card
                    const originalValue = boardSnapshot[i];
                    boardSnapshot[i] = oppCard.number;
                    
                    // Check if this creates a threat (two in a row)
                    const threatLevel = this.checkThreatLevel(i, 'green');
                    if (threatLevel > 0) {
                        threats.push({
                            position: i,
                            card: oppCard,
                            threatLevel: threatLevel,
                            priority: this.calculateThreatPriority(i, oppCard, opponentCards)
                        });
                    }
                    
                    boardSnapshot[i] = originalValue;
                }
            }
        }
        
        return threats.sort((a, b) => b.priority - a.priority);
    }

    checkThreatLevel(position, color) {
        let threatLevel = 0;
        
        for (let combination of this.winningCombinations) {
            if (combination.includes(position)) {
                const colorCount = combination.filter(i => {
                    const cell = document.querySelector(`[data-index="${i}"]`);
                    return cell && cell.classList.contains(color);
                }).length;
                
                if (colorCount === 3) {
                    threatLevel += 3; // Immediate win threat (3 in a row)
                } else if (colorCount === 2) {
                    threatLevel += 2; // Strong threat (2 in a row)
                } else if (colorCount === 1) {
                    threatLevel += 1; // Moderate threat (1 in a row)
                }
            }
        }
        
        return threatLevel;
    }

    calculateThreatPriority(position, card, opponentCards) {
        let priority = 0;
        
        // Higher cards create more dangerous threats
        priority += card.number * 5;
        
        // Threats that can't be easily blocked are more dangerous
        const canBlock = this.playerDecks.red.filter(c => !c.used).some(myCard => 
            myCard.number > card.number
        );
        
        if (!canBlock) {
            priority += 20; // Very dangerous threat
        }
        
        // Center threats are more dangerous
        if (position === 4) {
            priority += 10;
        }
        
        return priority;
    }

    evaluateDefensiveValue(index, card, opponentThreats) {
        let defensiveScore = 0;
        
        // Check if this move blocks a high-priority threat
        for (let threat of opponentThreats) {
            if (threat.position === index) {
                defensiveScore += threat.priority * 2;
                
                // Bonus if our card can't be easily overwritten
                const canOverwrite = this.playerDecks.green.filter(c => !c.used)
                    .some(oppCard => oppCard.number > card.number);
                
                if (!canOverwrite) {
                    defensiveScore += threat.priority;
                }
            }
        }
        
        return defensiveScore;
    }

    evaluateBaitingPotential(index, card, boardSnapshot, opponentCards) {
        let baitingScore = 0;
        
        // Simulate placing this card
        const originalValue = boardSnapshot[index];
        boardSnapshot[index] = card.number;
        
        // Check if this creates a situation where opponent might place a card we can overwrite
        for (let i = 0; i < 9; i++) {
            if (boardSnapshot[i] === '') {
                for (let oppCard of opponentCards) {
                    // Check if opponent would want to place this card here
                    const opponentValue = this.evaluatePositionForOpponent(i, oppCard, boardSnapshot);
                    
                    if (opponentValue > 10) { // Opponent would likely place this card
                        // Check if we can overwrite it with our remaining cards
                        const myRemainingCards = this.playerDecks.red.filter(c => !c.used && c.id !== card.id);
                        const canOverwrite = myRemainingCards.some(myCard => myCard.number > oppCard.number);
                        
                        if (canOverwrite) {
                            baitingScore += oppCard.number * 2; // Baiting bonus
                        }
                    }
                }
            }
        }
        
        // Restore original value
        boardSnapshot[index] = originalValue;
        
        return baitingScore;
    }

    evaluatePositionForOpponent(index, card, boardSnapshot) {
        let score = 0;
        
        // Position value
        const positionValues = [3, 1, 3, 1, 5, 1, 3, 1, 3];
        score += positionValues[index];
        
        // Card value
        score += card.number * 2;
        
        // Threat creation potential
        const originalValue = boardSnapshot[index];
        boardSnapshot[index] = card.number;
        
        const threatLevel = this.checkThreatLevel(index, 'green');
        score += threatLevel * 5;
        
        boardSnapshot[index] = originalValue;
        
        return score;
    }

    evaluateThreatCreation(index, card, canOverwrite) {
        let threatScore = 0;
        
        // Simulate placing the card
        const originalValue = this.board[index];
        const originalColor = this.getCellColor(index);
        this.board[index] = card.number;
        this.setCellColor(index, 'red');
        
        // Count threats created
        let threats = 0;
        for (let combination of this.winningCombinations) {
            if (combination.includes(index)) {
                const redCount = combination.filter(i => {
                    const cell = document.querySelector(`[data-index="${i}"]`);
                    return cell.classList.contains('red');
                }).length;
                
                const greenCount = combination.filter(i => {
                    const cell = document.querySelector(`[data-index="${i}"]`);
                    return cell.classList.contains('green');
                }).length;
                
                if (redCount === 2 && greenCount === 0) {
                    threats += 2 * (canOverwrite ? 0.1 : 2.0);
                } else if (redCount === 2) {
                    threats += 1 * (canOverwrite ? 0.05 : 1.5);
                }
            }
        }
        
        threatScore += threats * 3;
        
        // Restore original state
        this.board[index] = originalValue;
        this.setCellColor(index, originalColor);
        
        return threatScore;
    }

    evaluatePosition(index, card) {
        let score = 0;
        const opponentCards = this.playerDecks.green.filter(c => !c.used);
        
        // Position value (center > corners > edges)
        const positionValues = [3, 1, 3, 1, 5, 1, 3, 1, 3]; // Center = 5, corners = 3, edges = 1
        score += positionValues[index];
        
        // Card permanence (higher numbers are more secure)
        score += card.number * 2;
        
        // Security bonus - if opponent can't overwrite this card
        const canOverwrite = opponentCards.some(oppCard => oppCard.number > card.number);
        if (!canOverwrite) {
            score += 50; // Very secure placement - opponent can't overwrite
            
            // Extra bonus for placing the highest possible secure card
            const maxOpponentCard = opponentCards.length > 0 ? Math.max(...opponentCards.map(c => c.number)) : 0;
            if (card.number > maxOpponentCard) {
                score += 20; // Bonus for placing a card higher than opponent's highest
            }
        } else {
            // Heavy penalty for easily overwritable cards
            const overwriteCount = opponentCards.filter(oppCard => oppCard.number > card.number).length;
            const maxOpponentCard = Math.max(...opponentCards.map(c => c.number));
            const overwriteDifficulty = maxOpponentCard - card.number;
            
            // The closer the opponent's highest card is to this card, the worse this move is
            score -= (overwriteCount * 15) + (overwriteDifficulty * 8);
        }
        
        // Check for creating threats (two in a row)
        const originalValue = this.board[index];
        const originalColor = this.getCellColor(index);
        this.board[index] = card.number;
        this.setCellColor(index, 'red');
        
        // Count how many two-in-a-row threats we create
        let threats = 0;
        for (let combination of this.winningCombinations) {
            const [a, b, c] = combination;
            if (combination.includes(index)) {
                const redCount = combination.filter(i => {
                    const cell = document.querySelector(`[data-index="${i}"]`);
                    return cell.classList.contains('red');
                }).length;
                
                const greenCount = combination.filter(i => {
                    const cell = document.querySelector(`[data-index="${i}"]`);
                    return cell.classList.contains('green');
                }).length;
                
                if (redCount === 3 && greenCount === 0) {
                    // Immediate win threat - weight heavily by card permanence
                    threats += 3 * (canOverwrite ? 0.1 : 3.0);
                } else if (redCount === 2 && greenCount === 0) {
                    // Strong threat - but weight heavily by card permanence
                    threats += 2 * (canOverwrite ? 0.1 : 2.0);
                } else if (redCount === 2) {
                    // Moderate threat - weight heavily by card permanence
                    threats += 1 * (canOverwrite ? 0.05 : 1.5);
                }
            }
        }
        
        score += threats * 3;
        
        // Check for blocking opponent threats
        let blocks = 0;
        for (let combination of this.winningCombinations) {
            const [a, b, c, d] = combination;
            if (combination.includes(index)) {
                const greenCount = combination.filter(i => {
                    const cell = document.querySelector(`[data-index="${i}"]`);
                    return cell.classList.contains('green');
                }).length;
                
                if (greenCount === 3) {
                    blocks += 3; // Blocking immediate win threat
                } else if (greenCount === 2) {
                    blocks += 2; // Blocking opponent threat
                }
            }
        }
        
        score += blocks * 2;
        
        // Restore original state
        this.board[index] = originalValue;
        this.setCellColor(index, originalColor);
        
        return score;
    }

    canPlaceCardWithSnapshot(index, card, boardSnapshot, currentPlayerSnapshot) {
        const currentPiece = boardSnapshot[index];
        
        // Can't place on locked tiles (tiles that have been replaced)
        if (this.replacedTiles.has(index)) {
            return false;
        }
        
        if (currentPiece === '') {
            return true; // Empty cell
        }
        
        if (typeof currentPiece === 'number') {
            // For AI evaluation, we need to determine the color based on the board snapshot
            // Since we can't easily determine color from snapshot, we'll use a different approach
            // We'll assume that if there's a piece, it's either ours or the opponent's
            // and we can only overwrite if it's the opponent's piece with a higher number
            return card.number > currentPiece;
        }
        
        return false;
    }
    
    canPlaceCard(index, card) {
        const currentPiece = this.board[index];
        const currentColor = this.getCellColor(index);
        
        console.log(`canPlaceCard(${index}, ${card.number}): board[${index}]=${currentPiece}, color=${currentColor}, currentPlayer=${this.currentPlayer}`);
        
        // Can't place on locked tiles (tiles that have been replaced)
        if (this.replacedTiles.has(index)) {
            console.log(`  -> Locked tile, denying placement`);
            return false;
        }
        
        if (currentPiece === '') {
            console.log(`  -> Empty cell, allowing placement`);
            return true; // Empty cell
        }
        
        if (typeof currentPiece === 'number') {
            const canOverwrite = currentColor !== this.currentPlayer && card.number > currentPiece;
            console.log(`  -> Can overwrite: ${canOverwrite} (color different: ${currentColor !== this.currentPlayer}, higher number: ${card.number > currentPiece})`);
            return canOverwrite;
        }
        
        console.log(`  -> Not a number, denying placement`);
        return false;
    }

    getCellColor(index) {
        const cell = document.querySelector(`[data-index="${index}"]`);
        if (!cell) return '';
        if (cell.classList.contains('green')) return 'green';
        if (cell.classList.contains('red')) return 'red';
        return '';
    }

    setCellColor(index, color) {
        const cell = document.querySelector(`[data-index="${index}"]`);
        if (!cell) return;
        cell.className = `cell ${color}`;
    }


    evaluateBoard() {
        // Check for immediate win
        const winResult = this.checkWin();
        if (winResult === 'red') return 100;
        if (winResult === 'green') return -100;
        
        // Heuristic: prefer center and corners
        let score = 0;
        const centerPositions = [5, 6, 9, 10]; // Center 4 positions in 4x4
        centerPositions.forEach(pos => {
            if (this.board[pos] && typeof this.board[pos] === 'number') {
                score += 10;
            }
        });
        
        const corners = [0, 3, 12, 15]; // Corners in 4x4
        corners.forEach(index => {
            if (this.board[index] && typeof this.board[index] === 'number') {
                score += 5;
            }
        });
        
        return score;
    }


    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'green' ? 'red' : 'green';
    }

    checkWin() {
        for (let combination of this.winningCombinations) {
            const [a, b, c, d] = combination;
            if (this.board[a] && this.board[b] && this.board[c] && this.board[d]) {
                // Check if all four cells have the same color
                const cellA = document.querySelector(`[data-index="${a}"]`);
                const cellB = document.querySelector(`[data-index="${b}"]`);
                const cellC = document.querySelector(`[data-index="${c}"]`);
                const cellD = document.querySelector(`[data-index="${d}"]`);
                
                if (cellA.classList.contains('green') && cellB.classList.contains('green') && cellC.classList.contains('green') && cellD.classList.contains('green')) {
                    this.highlightWinningCells(combination);
                    return 'green';
                }
                if (cellA.classList.contains('red') && cellB.classList.contains('red') && cellC.classList.contains('red') && cellD.classList.contains('red')) {
                    this.highlightWinningCells(combination);
                    return 'red';
                }
            }
        }
        return false;
    }

    checkWinForSimulation() {
        // Same as checkWin but without highlighting (for AI simulation)
        for (let combination of this.winningCombinations) {
            const [a, b, c, d] = combination;
            if (this.board[a] && this.board[b] && this.board[c] && this.board[d]) {
                const cellA = document.querySelector(`[data-index="${a}"]`);
                const cellB = document.querySelector(`[data-index="${b}"]`);
                const cellC = document.querySelector(`[data-index="${c}"]`);
                const cellD = document.querySelector(`[data-index="${d}"]`);
                
                if (cellA.classList.contains('green') && cellB.classList.contains('green') && cellC.classList.contains('green') && cellD.classList.contains('green')) {
                    return 'green';
                }
                if (cellA.classList.contains('red') && cellB.classList.contains('red') && cellC.classList.contains('red') && cellD.classList.contains('red')) {
                    return 'red';
                }
            }
        }
        return false;
    }

    highlightWinningCells(combination) {
        combination.forEach(index => {
            const cell = document.querySelector(`[data-index="${index}"]`);
            cell.classList.add('winning');
        });
    }

    checkDraw() {
        return this.board.every(cell => cell !== '');
    }

    hasPlayableCards(playerColor) {
        const availableCards = this.playerDecks[playerColor].filter(card => !card.used);
        
        // Check if any available card can be placed on any empty cell or can overwrite an enemy piece
        for (let card of availableCards) {
            for (let i = 0; i < 16; i++) {
                if (this.canPlaceCard(i, card)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    checkAutomaticDraw() {
        const greenHasPlayableCards = this.hasPlayableCards('green');
        const redHasPlayableCards = this.hasPlayableCards('red');
        
        // If both players have no playable cards, it's an automatic draw
        if (!greenHasPlayableCards && !redHasPlayableCards) {
            return true;
        }
        
        return false;
    }

    endGame(result) {
        this.gameActive = false;
        
        if (result === 'draw') {
            this.scores.draws++;
            // Check if it's an automatic draw due to no playable cards
            if (this.checkAutomaticDraw()) {
                this.gameResult = { type: 'draw', message: 'Automatic Draw! Both players ran out of playable cards! 🤝' };
                this.showResult(this.gameResult.message);
            } else {
                this.gameResult = { type: 'draw', message: 'It\'s a Draw! 🤝' };
                this.showResult(this.gameResult.message);
            }
        } else {
            this.scores[result]++;
            let winnerName;
            if (this.gameMode === 'ai') {
                winnerName = result === 'red' ? 'AI' : 'Player';
            } else if (this.gameMode === 'online') {
                // For online, show if you won or lost using names
                const isWinner = result === this.myPlayerColor;
                if (isWinner) {
                    winnerName = 'You';
                } else {
                    // Opponent won - opponentName is always the other player's name
                    winnerName = this.opponentName || 'Opponent';
                }
            } else {
                winnerName = `Player ${result === 'green' ? '1' : '2'}`;
            }
            this.gameResult = { type: 'win', winner: result, message: `${winnerName} Wins! 🎉` };
            this.showResult(this.gameResult.message);
        }
        
        this.updateScoreDisplay();
        
        // Sync to Firebase for online mode
        if (this.gameMode === 'online' && this.firebaseEnabled) {
            this.syncGameStateToFirebase();
        }
    }

    showResult(message) {
        document.getElementById('resultMessage').textContent = message;
        document.getElementById('gameResult').style.display = 'flex';
    }

    updateCurrentPlayerDisplay() {
        const playerColorIndicator = document.getElementById('playerColorIndicator');
        const playerName = document.getElementById('playerName');
        
        playerColorIndicator.className = `player-color-indicator ${this.currentPlayer}`;
        
        if (this.gameMode === 'ai') {
            if (this.currentPlayer === 'green') {
                playerName.textContent = 'Your Turn';
            } else {
                playerName.textContent = 'AI\'s Turn';
            }
        } else if (this.gameMode === 'online') {
            // Show which player's turn using names
            if (this.myPlayerColor) {
                const isMyTurn = this.currentPlayer === this.myPlayerColor;
                const currentPlayerName = this.currentPlayer === 'green' 
                    ? (this.myPlayerColor === 'green' ? this.myPlayerName : this.opponentName)
                    : (this.myPlayerColor === 'red' ? this.myPlayerName : this.opponentName);
                
                if (isMyTurn) {
                    playerName.textContent = `Your Turn`;
                } else {
                    playerName.textContent = `${currentPlayerName}'s Turn`;
                }
            } else {
                playerName.textContent = `${this.currentPlayer === 'green' ? 'Green' : 'Red'} Player's Turn`;
            }
        } else {
            playerName.textContent = `Player ${this.currentPlayer === 'green' ? '1' : '2'}'s Turn`;
        }
    }

    updateScoreDisplay() {
        document.getElementById('playerWins').textContent = this.scores.green;
        document.getElementById('opponentWins').textContent = this.scores.red;
        document.getElementById('draws').textContent = this.scores.draws;
    }

    updateDisplay() {
        this.updateScoreDisplay();
    }

    resetGame() {
        // For online multiplayer, reset the board but keep players connected
        if (this.gameMode === 'online') {
            // Reset the game state
            this.resetBoard();
            this.gameActive = true;
            this.gameResult = null;
            
            // Randomly determine starting player
            this.currentPlayer = Math.random() < 0.5 ? 'green' : 'red';
            
            // Hide result screen, show game
            document.getElementById('gameResult').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
            
            // Sync new game state to Firebase
            this.syncGameStateToFirebase();
            
            // Update display
            this.updateCurrentPlayerDisplay();
            this.updatePlayerDeck();
        } else {
            // For AI and local multiplayer, show coin flip
            document.getElementById('gameResult').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'none';
            document.getElementById('coinFlipContainer').style.display = 'block';
            
            this.performCoinFlip();
        }
    }

    changeGameMode() {
        // Clean up Firebase listener if active
        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
            this.gameUnsubscribe = null;
        }

        // Close any modals
        document.getElementById('gameRoomModal').style.display = 'none';
        document.getElementById('waitingRoomModal').style.display = 'none';

        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('gameResult').style.display = 'none';
        document.getElementById('coinFlipContainer').style.display = 'none';
        document.getElementById('gameModeSelection').style.display = 'block';
        this.gameMode = null;
        this.gameRoomId = null;
        this.myPlayerColor = null;
        
        // Clear URL parameters when changing mode
        if (window.history.replaceState) {
            const url = new URL(window.location);
            url.searchParams.delete('state');
            window.history.replaceState({}, '', url);
        }
    }

    // Firebase Online Multiplayer Methods
    createGameRoom() {
        if (!this.firebaseEnabled) {
            alert('Firebase not available. Please ensure you are accessing via HTTPS.');
            return;
        }

        // Get player name from input
        const nameInput = document.getElementById('playerNameInput');
        this.myPlayerName = nameInput.value.trim() || 'Player 1';
        if (this.myPlayerName.length > 15) {
            this.myPlayerName = this.myPlayerName.substring(0, 15);
        }

        // Generate unique room ID (just numbers, 6 digits)
        this.myPlayerColor = 'green'; // Creator is always green
        this.gameMode = 'online';
        this.opponentName = 'Waiting...'; // Will be set when player 2 joins

        // Reset board for new game
        this.resetBoard();
        // Randomly determine starting player
        this.currentPlayer = Math.random() < 0.5 ? 'green' : 'red';

        // Create game room with unique 6-digit number
        this.createUniqueRoom().then(() => {
            // Close modals, show waiting room
            document.getElementById('gameRoomModal').style.display = 'none';
            document.getElementById('waitingRoomModal').style.display = 'block';
            document.getElementById('gameRoomIdDisplay').value = this.gameRoomId;

            // Listen for player 2 to join
            this.listenForPlayerJoin();

            // Update status
            document.getElementById('roomStatus').textContent = 'Room created! Share the ID.';
        }).catch(error => {
            console.error('Error creating game room:', error);
            alert('Failed to create game room. Please try again.');
        });
    }

    createUniqueRoom() {
        // Try to create a room with a unique 6-digit number
        const tryCreateRoom = (attempts = 0) => {
            if (attempts > 10) {
                // Fallback to timestamp-based ID if too many attempts
                this.gameRoomId = Date.now().toString();
            } else {
                // Generate 6-digit number (100000 to 999999)
                const roomNumber = Math.floor(100000 + Math.random() * 900000);
                this.gameRoomId = roomNumber.toString();
            }

            // Check if room already exists
            return db.collection('gameRooms').doc(this.gameRoomId).get().then(doc => {
                if (doc.exists && doc.data().status !== 'finished') {
                    // Room exists and is active, try again
                    if (attempts < 10) {
                        return tryCreateRoom(attempts + 1);
                    } else {
                        // Use timestamp as fallback
                        this.gameRoomId = Date.now().toString();
                        return this.createRoomInFirebase();
                    }
                } else {
                    // Room doesn't exist or is finished, use this ID
                    return this.createRoomInFirebase();
                }
            });
        };

        return tryCreateRoom();
    }

    createRoomInFirebase() {
        // Create game room in Firebase
        const gameState = this.getGameState();
        return db.collection('gameRooms').doc(this.gameRoomId).set({
            player1: 'green',
            player1Name: this.myPlayerName,
            player2: null, // Waiting for player 2
            player2Name: null,
            gameState: gameState,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'waiting' // waiting, active, finished
        }).then(() => {
            // Close modals, show waiting room
            document.getElementById('gameRoomModal').style.display = 'none';
            document.getElementById('waitingRoomModal').style.display = 'block';
            document.getElementById('gameRoomIdDisplay').value = this.gameRoomId;
        });
    }

    joinGameRoom() {
        const roomId = document.getElementById('roomIdInput').value.trim();
        if (!roomId) {
            alert('Please enter a Game ID');
            return;
        }

        // Get player name from input
        const nameInput = document.getElementById('playerNameInput');
        this.myPlayerName = nameInput.value.trim() || 'Player 2';
        if (this.myPlayerName.length > 15) {
            this.myPlayerName = this.myPlayerName.substring(0, 15);
        }

        if (!this.firebaseEnabled) {
            alert('Firebase not available. Please ensure you are accessing via HTTPS.');
            return;
        }

        this.gameRoomId = roomId;
        this.gameMode = 'online';

        // Check if room exists and has space
        db.collection('gameRooms').doc(roomId).get().then(doc => {
            if (!doc.exists) {
                alert('Game room not found. Please check the Game ID.');
                return;
            }

            const roomData = doc.data();
            if (roomData.player2) {
                alert('This room is already full.');
                return;
            }

            if (roomData.status !== 'waiting') {
                alert('This game has already started or finished.');
                return;
            }

            // Join as player 2 (red)
            this.myPlayerColor = 'red';
            this.opponentName = roomData.player1Name || 'Player 1'; // Get player 1's name
            
            db.collection('gameRooms').doc(roomId).update({
                player2: 'red',
                player2Name: this.myPlayerName,
                status: 'active'
                // Don't update gameState here - let the listener pick it up from player 1
            }).then(() => {
                // Load game state and start listening
                this.loadGameStateFromFirebase(roomData.gameState);
                this.setupFirebaseGameListener();
                
                // Close modals and start game
                document.getElementById('gameRoomModal').style.display = 'none';
                document.getElementById('waitingRoomModal').style.display = 'none';
                
                document.getElementById('gameModeSelection').style.display = 'none';
                document.getElementById('gameContainer').style.display = 'block';
                document.getElementById('shareGameBtn').style.display = 'none'; // No need to share in Firebase mode
            }).catch(error => {
                console.error('Error joining game room:', error);
                alert('Failed to join game room. Please try again.');
            });
        }).catch(error => {
            console.error('Error checking game room:', error);
            alert('Failed to connect to game room. Please check your connection.');
        });
    }

    listenForPlayerJoin() {
        db.collection('gameRooms').doc(this.gameRoomId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.player2 && data.status === 'active') {
                        // Player 2 joined! Get their name and start the game
                        this.opponentName = data.player2Name || 'Player 2';
                        
                        // Player 2 joined! Start the game
                        document.getElementById('waitingRoomModal').style.display = 'none';
                        document.getElementById('gameModeSelection').style.display = 'none';
                        document.getElementById('gameContainer').style.display = 'block';
                        document.getElementById('shareGameBtn').style.display = 'none';
                        
                        // Ensure game is active
                        this.gameActive = true;
                        
                        // Load initial game state
                        if (data.gameState) {
                            this.loadGameStateFromFirebase(data.gameState);
                        } else {
                            // Initialize game state if it doesn't exist
                            this.resetBoard();
                            // Randomly determine starting player
                            this.currentPlayer = Math.random() < 0.5 ? 'green' : 'red';
                            this.syncGameStateToFirebase();
                        }
                        
                        // Start listening for game updates
                        this.setupFirebaseGameListener();
                        
                        // Update display
                        this.updateCurrentPlayerDisplay();
                        this.updatePlayerDeck();
                    }
                }
            }, (error) => {
                console.error('Error listening for player join:', error);
            });
    }

    setupFirebaseGameListener() {
        // Listen for real-time game state updates
        if (this.gameUnsubscribe) {
            this.gameUnsubscribe(); // Unsubscribe from previous listener
        }

        this.gameUnsubscribe = db.collection('gameRooms').doc(this.gameRoomId)
            .onSnapshot((doc) => {
                if (!doc.exists) return;

                const data = doc.data();
                const gameState = data.gameState;

                // Always sync game state from Firebase (it's the source of truth)
                if (gameState && this.gameMode === 'online') {
                    // Always load to ensure win/loss messages and game resets sync properly
                    // (hasGameStateChanged check is inside loadGameStateFromFirebase now)
                    this.loadGameStateFromFirebase(gameState);
                    
                    // Also sync player names from room data
                    if (data.player1Name && this.myPlayerColor === 'green') {
                        this.opponentName = data.player2Name || 'Player 2';
                    } else if (data.player2Name && this.myPlayerColor === 'red') {
                        this.opponentName = data.player1Name || 'Player 1';
                    }
                }
            }, (error) => {
                console.error('Error listening for game updates:', error);
            });
    }

    hasGameStateChanged(newState) {
        // Check if board, current player, or game result changed
        return JSON.stringify(this.board) !== JSON.stringify(newState.board) ||
               this.currentPlayer !== newState.currentPlayer ||
               JSON.stringify(this.gameResult) !== JSON.stringify(newState.gameResult) ||
               this.gameActive !== newState.gameActive;
    }

    getGameState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            gameActive: this.gameActive,
            scores: this.scores,
            replacedTiles: Array.from(this.replacedTiles),
            playerDecks: this.playerDecks,
            storedCellColors: this.storedCellColors,
            gameResult: this.gameResult || null // Store the result (win/draw) for both players to see
        };
    }

    loadGameStateFromFirebase(gameState) {
        // Always restore full game state from Firebase (Firebase is the source of truth)
        // This ensures turns switch correctly for both players
        this.board = gameState.board || ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
        this.currentPlayer = gameState.currentPlayer || 'green'; // ALWAYS sync currentPlayer from Firebase
        this.gameActive = gameState.gameActive !== false;
        this.scores = gameState.scores || { green: 0, red: 0, draws: 0 };
        this.replacedTiles = new Set(gameState.replacedTiles || []);
        this.storedCellColors = gameState.storedCellColors || ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
        this.playerDecks = gameState.playerDecks || {
            green: this.createDeck('green'),
            red: this.createDeck('red')
        };
        this.gameResult = gameState.gameResult || null; // Sync game result

        // Restore visual state
        this.restoreVisualState();
        this.updateCurrentPlayerDisplay();
        this.updatePlayerDeck();
        this.updateScoreDisplay();

        // Check for game end - show result if game ended
        if (!this.gameActive && this.gameResult) {
            // Game ended - show the result message for both players
            let message = this.gameResult.message;
            // For online mode, adjust the message if it's about us
            if (this.gameMode === 'online' && this.gameResult.type === 'win') {
                if (this.gameResult.winner === this.myPlayerColor) {
                    message = 'You Win! 🎉';
                } else {
                    // Opponent won - opponentName is always the other player's name
                    const winnerName = this.opponentName || 'Opponent';
                    message = `${winnerName} Wins! 🎉`;
                }
            }
            this.showResult(message);
        }
    }

    syncGameStateToFirebase() {
        if (!this.firebaseEnabled || !this.gameRoomId) return;

        const gameState = this.getGameState();
        db.collection('gameRooms').doc(this.gameRoomId).update({
            gameState: gameState,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(error => {
            console.error('Error syncing game state:', error);
        });
    }

    loadGameFromURL(encodedState) {
        try {
            const gameState = JSON.parse(atob(encodedState));
            
            // Restore game state
            this.board = gameState.board || ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
            this.currentPlayer = gameState.currentPlayer || 'green';
            this.gameActive = gameState.gameActive || false;
            this.scores = gameState.scores || { green: 0, red: 0, draws: 0 };
            this.replacedTiles = new Set(gameState.replacedTiles || []);
            this.storedCellColors = gameState.storedCellColors || ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
            
            // Restore player decks
            this.playerDecks = gameState.playerDecks || {
                green: this.createDeck('green'),
                red: this.createDeck('red')
            };
            
            // Show game interface
            document.getElementById('gameModeSelection').style.display = 'none';
            document.getElementById('coinFlipContainer').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
            document.getElementById('gameResult').style.display = 'none';
            
            // Show share button for online mode
            document.getElementById('shareGameBtn').style.display = 'inline-block';
            
            // Restore visual state
            this.restoreVisualState();
            this.updateCurrentPlayerDisplay();
            this.updatePlayerDeck();
            this.updateScoreDisplay();
            
        } catch (error) {
            console.error('Error loading game from URL:', error);
            alert('Invalid game URL. Starting new game instead.');
            this.startNewOnlineGame();
        }
    }

    restoreVisualState() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            const cellValue = this.board[index];
            if (cellValue && typeof cellValue === 'number') {
                // Get color from the stored game state instead of DOM
                const cellColor = this.getStoredCellColor(index);
                cell.innerHTML = `<span class="number">${cellValue}</span>`;
                cell.className = `cell ${cellColor}`;
                
                if (this.replacedTiles.has(index)) {
                    cell.classList.add('locked');
                }
            } else {
                cell.innerHTML = '';
                cell.className = 'cell';
            }
        });
    }

    getStoredCellColor(index) {
        // This method will be used to get color from stored state
        // We need to store cell colors in the game state
        return this.storedCellColors ? this.storedCellColors[index] : '';
    }

    updateURL() {
        if (this.gameMode === 'online') {
            const gameState = {
                board: this.board,
                currentPlayer: this.currentPlayer,
                gameActive: this.gameActive,
                scores: this.scores,
                replacedTiles: Array.from(this.replacedTiles),
                playerDecks: this.playerDecks,
                storedCellColors: this.storedCellColors
            };
            
            const encodedState = btoa(JSON.stringify(gameState));
            const url = new URL(window.location);
            url.searchParams.set('state', encodedState);
            
            if (window.history.replaceState) {
                window.history.replaceState({}, '', url);
            }
        }
    }

    encodeGameState() {
        const gameState = {
            board: this.board,
            currentPlayer: this.currentPlayer,
            gameActive: this.gameActive,
            scores: this.scores,
            replacedTiles: Array.from(this.replacedTiles),
            playerDecks: this.playerDecks,
            storedCellColors: this.storedCellColors
        };
        
        return btoa(JSON.stringify(gameState));
    }
}

// Global functions for HTML onclick handlers
let game;

function startGame(mode) {
    if (!game) {
        game = new TicTacToeCardGame();
    }
    game.startGame(mode);
}

function resetGame() {
    if (game) {
        game.resetGame();
    }
}

function changeGameMode() {
    if (game) {
        game.changeGameMode();
    }
}

function proceedToGame() {
    if (game) {
        game.proceedToGame();
    }
}

function showGameRoomModal() {
    if (!game.firebaseEnabled) {
        alert('Firebase is not available. Please access this game via HTTPS to use online multiplayer.');
        return;
    }
    document.getElementById('gameRoomModal').style.display = 'block';
}

function closeGameRoomModal() {
    document.getElementById('gameRoomModal').style.display = 'none';
    // Clear the input field
    const roomIdInput = document.getElementById('roomIdInput');
    if (roomIdInput) {
        roomIdInput.value = '';
    }
    // Clear status message
    const roomStatus = document.getElementById('roomStatus');
    if (roomStatus) {
        roomStatus.textContent = '';
    }
}

function handleModalBackdropClick(event) {
    // Close modal if clicking on the backdrop (not the modal content)
    if (event.target.id === 'gameRoomModal') {
        closeGameRoomModal();
    } else if (event.target.id === 'waitingRoomModal') {
        cancelWaitingRoom();
    }
}

function cancelWaitingRoom() {
    // Clean up Firebase listener if active
    if (game && game.gameUnsubscribe) {
        game.gameUnsubscribe();
        game.gameUnsubscribe = null;
    }
    
    // Delete the game room if it exists
    if (game && game.gameRoomId && typeof db !== 'undefined' && db !== null) {
        db.collection('gameRooms').doc(game.gameRoomId).delete().catch(err => {
            console.log('Error deleting game room:', err);
        });
    }
    
    // Reset game state
    if (game) {
        game.gameRoomId = null;
        game.myPlayerColor = null;
        game.gameMode = null;
    }
    
    // Close modal and return to main menu
    document.getElementById('waitingRoomModal').style.display = 'none';
    document.getElementById('gameRoomModal').style.display = 'none';
    document.getElementById('gameModeSelection').style.display = 'block';
    document.getElementById('gameContainer').style.display = 'none';
}

function createGameRoom() {
    if (game) {
        game.createGameRoom();
    }
}

function joinGameRoom() {
    if (game) {
        game.joinGameRoom();
    }
}

function copyGameRoomId() {
    const roomIdInput = document.getElementById('gameRoomIdDisplay');
    const copyBtn = document.getElementById('copyGameRoomBtn');
    
    if (!roomIdInput) return;
    
    roomIdInput.select();
    roomIdInput.setSelectionRange(0, 99999);
    try {
        document.execCommand('copy');
        const originalText = copyBtn ? copyBtn.textContent : 'Copy';
        if (copyBtn) {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    } catch (err) {
        navigator.clipboard.writeText(roomIdInput.value).then(() => {
            const originalText = copyBtn ? copyBtn.textContent : 'Copy';
            if (copyBtn) {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            }
        });
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    game = new TicTacToeCardGame();
    
    // Ensure modals are closed on load
    document.getElementById('gameRoomModal').style.display = 'none';
    document.getElementById('waitingRoomModal').style.display = 'none';
    
    // Add touch-friendly event listeners for mobile buttons
    const createGameBtn = document.getElementById('createGameBtn');
    const joinGameBtn = document.getElementById('joinGameBtn');
    const copyGameRoomBtn = document.getElementById('copyGameRoomBtn');
    
    if (createGameBtn) {
        createGameBtn.addEventListener('click', createGameRoom);
        createGameBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            createGameRoom();
        });
    }
    
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', joinGameRoom);
        joinGameBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            joinGameRoom();
        });
    }
    
    if (copyGameRoomBtn) {
        copyGameRoomBtn.addEventListener('click', copyGameRoomId);
        copyGameRoomBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            copyGameRoomId();
        });
    }
    
    // Check if there's a game state in URL on page load
    const urlParams = new URLSearchParams(window.location.search);
    const gameState = urlParams.get('state');
    
    if (gameState) {
        // Auto-start online mode if URL contains game state
        game.startGame('online');
    }
});