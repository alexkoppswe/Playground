const grid = document.getElementById('grid');
const gridSize = 4;
let board = Array(gridSize).fill().map(() => Array(gridSize).fill(0));

let touchStartX = 0;
let touchStartY = 0;
const gameContainer = document.getElementById('game-container'); // Get the game container

// Initialize the game
function initGame() {
  renderGridLines();
  addNewTile();
  addNewTile();
  renderBoard();
}

// Add background grid lines
function renderGridLines() {
  grid.innerHTML = '';
  for (let i = 0; i < gridSize * gridSize; i++) {
    const gridCell = document.createElement('div');
    gridCell.classList.add('grid-cell');
    grid.appendChild(gridCell);
  }
}

// Add a new tile with value 2 or 4
function addNewTile() {
  let emptyTiles = [];
  board.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val === 0) emptyTiles.push({ r, c });
    });
  });

  if (emptyTiles.length) {
    let { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
  }
}

// Render the board
function renderBoard() {
  const tiles = Array.from(grid.querySelectorAll('.tile'));
  tiles.forEach((tile) => tile.remove());

  board.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val > 0) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.textContent = val;
        tile.setAttribute('data-value', val);
        tile.style.gridRowStart = r + 1;
        tile.style.gridColumnStart = c + 1;
        grid.appendChild(tile);
      }
    });
  });
}

// Slide row logic
function slide(row, reverse = false) {
  if (reverse) row = row.reverse(); // Reverse for rightward or downward moves

  let newRow = row.filter((val) => val !== 0); // Remove zeros
  const result = Array(gridSize).fill(0);

  for (let i = 0; i < newRow.length; i++) {
    if (i < newRow.length - 1 && newRow[i] === newRow[i + 1]) {
      // Combine tiles at the farther position
      result[result.length - newRow.length + i + 1] = newRow[i] * 2;
      i++; // Skip next tile as it is merged
    } else {
      result[result.length - newRow.length + i] = newRow[i];
    }
  }

  return reverse ? result.reverse() : result; // Reverse back if necessary
}


function moveRow(row, direction) {
  return direction === 'left' ? slide(row) : slide(row, true);
}

function moveColumn(col, direction) {
  const columnData = board.map((row) => row[col]);
  const movedColumn = direction === 'up' ? slide(columnData) : slide(columnData, true);

  movedColumn.forEach((val, r) => {
    board[r][col] = val;
  });
}

function animateMovement(prevBoard) {
  const tileElements = Array.from(grid.querySelectorAll('.tile'));

  // Remove previous animations
  tileElements.forEach((tile) => {
    tile.style.transform = '';
  });

  board.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val > 0) {
        const prevPos = findPosition(prevBoard, val, r, c);
        if (prevPos) {
          const [prevRow, prevCol] = prevPos;

          const deltaX = (c - prevCol) * 80; // Horizontal movement
          const deltaY = (r - prevRow) * 80; // Vertical movement

          // Find the corresponding tile element
          const tile = tileElements.find(
            (t) =>
              parseInt(t.textContent, 10) === val &&
              parseInt(t.style.gridRowStart, 10) - 1 === prevRow &&
              parseInt(t.style.gridColumnStart, 10) - 1 === prevCol
          );

          if (tile) {
            tile.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            tile.classList.add('move');

            // Remove animation after it completes
            setTimeout(() => {
              tile.style.transform = '';
              tile.classList.remove('move');
            }, 150);
          }
        }
      }
    });
  });
}

// Helper to find a tile's position in the previous board state
function findPosition(board, value, targetRow, targetCol) {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (board[r][c] === value && (r !== targetRow || c !== targetCol)) {
        return [r, c];
      }
    }
  }
  return null;
}


// Handle moves
function move(direction) {
  const prevBoard = board.map((row) => row.slice());
  let moved = false;

  if (direction === 'ArrowLeft' || direction === 'ArrowRight') {
    board = board.map((row) => {
      const newRow = moveRow(row, direction === 'ArrowLeft' ? 'right' : 'left');
      if (newRow.toString() !== row.toString()) moved = true;
      return newRow;
    });
  } else if (direction === 'ArrowUp' || direction === 'ArrowDown') {
    for (let col = 0; col < gridSize; col++) {
      const colBefore = board.map((row) => row[col]).toString();
      moveColumn(col, direction === 'ArrowUp' ? 'down' : 'up');
      const colAfter = board.map((row) => row[col]).toString();
      if (colBefore !== colAfter) moved = true;
    }
  }

  // Only proceed if the board has changed
  if (moved) {
    addNewTile();
    renderBoard();
    animateMovement(prevBoard);
    checkGameOver();
  }
}




// Check for game over
function checkGameOver() {
  const isFull = board.flat().every((val) => val !== 0);
  if (isFull) {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (
          (board[r][c + 1] && board[r][c] === board[r][c + 1]) ||
          (board[r + 1] && board[r][c] === board[r + 1][c])
        ) {
          return;
        }
      }
    }
    initGame();
    alert('Game Over!');
    //location.reload();
  }
}

// Listen for key presses
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(e.key)) {
    e.preventDefault();
    move(e.key);
  }
});

// Touch support for swipe gestures
gameContainer.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  e.preventDefault();
});

gameContainer.addEventListener('touchmove', (e) => {
  e.preventDefault();
});

gameContainer.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;

  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  const minSwipeDistance = 30;

  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
    // Horizontal swipe
    if (deltaX > 0) {
      move('ArrowRight');
    } else {
      move('ArrowLeft');
    }
  } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
    // Vertical swipe
    if (deltaY > 0) {
      move('ArrowDown');
    } else {
      move('ArrowUp');
    }
  }
  e.preventDefault();
});

initGame();
