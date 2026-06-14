document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('ttt-overlay');
    const closeBtn = document.getElementById('ttt-close');
    const cells = document.querySelectorAll('.ttt-cell');
    const statusEl = document.getElementById('ttt-status');
    const footerEl = document.getElementById('ttt-footer');
    const badgeEl = document.getElementById('ttt-badge');
    const newMatchBtn = document.getElementById('ttt-new-match');
    
    let gameActive = false;
    let board = ['', '', '', '', '', '', '', '', ''];
    let systemTurn = true; // System goes first
    let gameCount = 0; // Alternates difficulty
    let difficulty = 'hard';
    let isOpening = false;
    let rebootTimeout = null;
    let rebootInterval = null;
    let systemMoveTimeout = null;
    let userScore = parseInt(localStorage.getItem('ttt_user_score')) || 0;
    let systemScore = parseInt(localStorage.getItem('ttt_system_score')) || 0;
    
    const wasdHint = document.getElementById('wasd-hint');

    function updateScoreboard() {
        if(badgeEl) {
            badgeEl.innerHTML = `
                <span class="blink-dot" style="background-color: var(--accent); width: 8px; height: 8px; margin-right: 8px;"></span>
                TACTICAL GRID // P:${systemScore} YOU:${userScore}
                <div class="ttt-badge-tooltip">
                    <strong>SCORE DETAILS</strong><br>
                    P = PRANAV K. : ${systemScore}<br>
                    YOU = YOU (USER) : ${userScore}
                </div>
            `;
        }
    }

    // Handle WASD Glitch on home screen
    function randomGlitch() {
        if (!wasdHint.classList.contains('triggered')) {
            if (!wasdHint.classList.contains('is-glitching') && Math.random() > 0.3) {
                wasdHint.classList.add('is-glitching');
                setTimeout(() => {
                    wasdHint.classList.remove('is-glitching');
                    setTimeout(randomGlitch, Math.random() * 3000 + 2000);
                }, 600);
            } else {
                setTimeout(randomGlitch, 1000);
            }
        } else {
            // Check again in 1 second in case car game ends
            setTimeout(randomGlitch, 1000);
        }
    }
    setTimeout(randomGlitch, 3000);

    // Add interaction hooks
    wasdHint.addEventListener('mouseenter', () => {
        wasdHint.style.transform = 'scale(1.05)';
        wasdHint.style.borderColor = 'rgba(255,69,0,0.5)';
    });

    wasdHint.addEventListener('click', () => {
        if (!gameActive && !isOpening) {
            openGame();
        }
    });
    
    // Toggle Overlay on WASD (Disabled for Tic-Tac-Toe so it doesn't conflict with Car Game on PC)
    document.addEventListener('keydown', (e) => {
        // We return early here so Tic-Tac-Toe is only played via touch/overscroll on mobile
        if (gameActive && e.key.toLowerCase() === 'escape') {
            closeGame();
            return;
        }
        return;
    });

    closeBtn.addEventListener('click', closeGame);
    newMatchBtn.addEventListener('click', resetGame);

    window.openTicTacToeGame = openGame;

    function openGame() {
        document.body.classList.add('ttt-active');
        overlay.classList.add('active');
        gameActive = true;
        resetGame();
    }

    // Close on outside click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeGame();
        }
    });

    function closeGame() {
        if (rebootTimeout) clearTimeout(rebootTimeout);
        if (rebootInterval) clearInterval(rebootInterval);
        if (systemMoveTimeout) clearTimeout(systemMoveTimeout);

        document.body.classList.remove('ttt-active');
        overlay.classList.remove('active');
        gameActive = false;
    }

    function resetGame() {
        if (rebootTimeout) clearTimeout(rebootTimeout);
        if (rebootInterval) clearInterval(rebootInterval);
        if (systemMoveTimeout) clearTimeout(systemMoveTimeout);

        board = ['', '', '', '', '', '', '', '', ''];
        cells.forEach(cell => {
            cell.innerText = '';
            cell.className = 'ttt-cell';
        });
        
        // Alternate difficulty based on game count
        difficulty = (gameCount % 2 === 0) ? 'hard' : 'easy';
        
        if (difficulty === 'hard') {
            systemTurn = true;
            statusEl.innerText = `PRANAV MOVE. CALCULATING.`;
            footerEl.innerText = `MATCH #${gameCount + 1} // PRANAV OPEN`;
            // System makes first move
            systemMoveTimeout = setTimeout(systemMove, 800);
        } else {
            systemTurn = false;
            statusEl.innerText = `YOUR MOVE. PLACE AN O.`;
            footerEl.innerText = `MATCH #${gameCount + 1} // YOU OPEN`;
        }
    }

    // Mouse controls
    cells.forEach((cell, idx) => {
        cell.addEventListener('click', () => {
            if (!systemTurn && gameActive) {
                userMove(idx);
            }
        });
    });

    function userMove(index) {
        if (board[index] === '' && !systemTurn) {
            board[index] = 'O';
            cells[index].innerText = 'O';
            cells[index].classList.add('o');
            
            if (checkWin('O')) {
                endGame('YOU WIN! IMPOSSIBLE...', 'U');
                return;
            }
            if (checkDraw()) {
                endGame('DRAW. PRANAV CALCULATED.', 'D');
                return;
            }
            
            systemTurn = true;
            statusEl.innerText = `PRANAV MOVE. CALCULATING.`;
            systemMoveTimeout = setTimeout(systemMove, 1000);
        }
    }

    function systemMove() {
        let move;
        if (difficulty === 'hard') {
            move = getBestMove();
        } else {
            // Easy mode: random empty space
            const emptySpaces = board.map((val, idx) => val === '' ? idx : null).filter(val => val !== null);
            move = emptySpaces[Math.floor(Math.random() * emptySpaces.length)];
        }

        board[move] = 'X';
        cells[move].innerText = 'X';
        cells[move].classList.add('x');

        if (checkWin('X')) {
            endGame('PRANAV WINS. INEVITABLE.', 'P');
            return;
        }
        if (checkDraw()) {
            endGame('DRAW. PRANAV CALCULATED.', 'D');
            return;
        }

        systemTurn = false;
        statusEl.innerText = 'YOUR MOVE. PLACE AN O.';
    }

    function endGame(msg, winner) {
        statusEl.innerText = msg;
        gameCount++;
        
        if (winner === 'U') {
            userScore++;
            localStorage.setItem('ttt_user_score', userScore);
        } else if (winner === 'P') {
            systemScore++;
            localStorage.setItem('ttt_system_score', systemScore);
        }
        
        // Visitor Intel: log the finished match result (anonymous)
        if (window.intel) window.intel.track('ttt_match', { result: winner });
        
        updateScoreboard();
        
        rebootTimeout = setTimeout(() => {
            let count = 3;
            statusEl.innerText = `${msg} (REBOOTING IN ${count}...)`;
            
            rebootInterval = setInterval(() => {
                count--;
                if (count > 0) {
                    statusEl.innerText = `${msg} (REBOOTING IN ${count}...)`;
                } else {
                    clearInterval(rebootInterval);
                    resetGame();
                }
            }, 1000);
        }, 1000);
    }

    function checkWin(player) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];
        return winPatterns.some(pattern => {
            return pattern.every(index => board[index] === player);
        });
    }

    function checkDraw() {
        return board.every(cell => cell !== '');
    }

    // Minimax for Unbeatable AI
    function getBestMove() {
        let bestScore = -Infinity;
        let move;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'X';
                let score = minimax(board, 0, false);
                board[i] = '';
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }

    function minimax(tempBoard, depth, isMaximizing) {
        if (checkWinState(tempBoard, 'X')) return 10 - depth;
        if (checkWinState(tempBoard, 'O')) return depth - 10;
        if (tempBoard.every(cell => cell !== '')) return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (tempBoard[i] === '') {
                    tempBoard[i] = 'X';
                    let score = minimax(tempBoard, depth + 1, false);
                    tempBoard[i] = '';
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (tempBoard[i] === '') {
                    tempBoard[i] = 'O';
                    let score = minimax(tempBoard, depth + 1, true);
                    tempBoard[i] = '';
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    function checkWinState(b, player) {
        const p = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        return p.some(arr => arr.every(idx => b[idx] === player));
    }
});
