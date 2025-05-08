
// BlackJack
const deck = [];
const suits = ['\u2665', '\u2663', '\u2666', '\u2660']; // ["Hearts", "Clubs", "Diamonds", "Spades"]
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const letterRanks = ['A', 'J', 'Q', 'K'];
const dealerStopAt = 17;

makeDeck();
shuffleDeck();

let dealerHand = [];
let playerHand = [];
let gameOver = false;
let dealerScore = 0;
let playerScore = 0;
let lastKeyPressTime = 0;
const KEY_THROTTLE_TIME = 500; // 500 milliseconds
let deckCount = 52;
let deal2cards = false;  // Rigged House Rules
let isDealerFirstCardHidden = true;

let bettingEnabled = false;
let playerMoney = 0;
let dealerMoney = 10000;
let currentBet = 10;
const baseBet = 10;
let betLocked = false;

document.querySelector('#place-bet').addEventListener('click', placeBet);
document.querySelector('#add-bet').addEventListener('click', addBet);
document.querySelector('.start-button').addEventListener('click', startGame);

// Set default values
document.getElementById('betting-system-toggle').checked = false;
document.getElementById('deal2cards-toggle').checked = false;

// House Rules
document.getElementById('deal2cards-toggle').addEventListener('change', (event) => {
  deal2cards = event.target.checked;
});

// Toggle the betting system
document.getElementById('betting-system-toggle').addEventListener('change', (event) => {
  bettingEnabled = event.target.checked;
  toggleBettingUI(bettingEnabled);
});

// Initial Money
document.getElementById('initial-money').addEventListener('change', () => {
  const moneyInput = document.getElementById('initial-money');
  playerMoney = parseInt(moneyInput.value) || 0;
  document.getElementById('money-display').textContent = `Your Money: $${playerMoney}`;
  moneyInput.value = '';
});

// Functions to handle bet
function placeBet() {
  if (bettingEnabled && !betLocked) {
    betLocked = true; // Lock the bet
    document.querySelector('#bet-amount').textContent = currentBet;
    document.querySelector('#bet-amount').style.fontWeight = 'bold';
    document.querySelector('#bet-amount').style.color = '#c4c4c4';

    // Disable bet controls
    document.querySelector('#add-bet').disabled = true;
    document.querySelector('#place-bet').disabled = true;

    if (playerMoney >= currentBet) {
      playerMoney -= currentBet;
      updateMoneyUI();
    }

    if (dealerMoney >= currentBet) {
      dealerMoney -= currentBet;
      updateMoneyUI();
    }
  }
}

function addBet() {
  if (!betLocked && bettingEnabled) {
    // Add 10 to the bet, but ensure it doesn't exceed the available money
    if (currentBet + 10 <= playerMoney) {
      currentBet += 10;
      document.querySelector('#bet-amount').textContent = currentBet;
    }
  }
}

function updateMoneyUI() {
  const playerMoneyDisplay = document.getElementById('money-display');
  const dealerMoneyDisplay = document.getElementById('dealer-money-display');

  // Update the displayed money values
  playerMoneyDisplay.textContent = `Your Money: $${playerMoney}`;
  dealerMoneyDisplay.textContent = `Dealer's Money: $${dealerMoney}`;
}


// Function to toggle UI elements
function toggleBettingUI(enabled) {
  document.getElementById('money-input-container').style.display = enabled ? 'block' : 'none';
  document.getElementById('betting-container').style.display = enabled ? 'flex' : 'none';
  document.querySelector('.score').style.display = enabled ? 'none' : 'block';
  document.getElementById('dealer-money-display').style.display = enabled ? 'block' : 'none';
  document.getElementById('money-display').style.display = enabled ? 'block' : 'none';
}

document.querySelector('.hit-button').addEventListener('click', () => {
  if (!gameOver) {
    if (checkThrottle()) {
      hit();
      document.body.focus();
    }
  } else {
    endGame();
  }
});

document.querySelector('.stand-button').addEventListener('click', () => {
  if (!gameOver) {
    if (checkThrottle()) {
      stand();
      document.body.focus();
    }
  } else {
    endGame();
  }
});

document.addEventListener('keyup', (event) => {
  if ((event.key === ' ' || event.key === 'h')) {
    if (!gameOver) {
      if (checkThrottle()) {
        hit();
      }
    } else {
      endGame();
    }
  }
  if (event.key === 's') {
    if (!gameOver) {
      if (checkThrottle()) {
        stand();
      }
    } else {
      endGame();
    }
  }
});

function resetGame() {
  setTimeout(() => {
    window.location.reload();
  }, 4000);
}

function checkThrottle() {
  const currentTime = Date.now();
  if (currentTime - lastKeyPressTime > KEY_THROTTLE_TIME) {
    lastKeyPressTime = currentTime;
    return true;
  }
  return false;
}

function makeDeck() {
  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({ suit, rank });
    }
  }
}

function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function startGame() {
  document.querySelector('.start-screen').style.display = 'none';
  document.querySelector('.game-container').style.display = 'flex';
  document.querySelector('.score').textContent = `Dealer: 0, You: 0`;
  dealerScore = 0;
  playerScore = 0;

  if (bettingEnabled) {
    if (playerMoney <= 0) {
      alert("Please enter a valid starting amount greater than $0.");
      window.location.reload();
    }
    document.querySelector('#bet-amount').textContent = baseBet;
    document.querySelector('#bet-amount').style.fontWeight = 'initial';
    document.querySelector('#bet-amount').style.color = 'initial';
    document.querySelector('#add-bet').disabled = false;
    document.querySelector('#place-bet').disabled = false;
    betLocked = false;
  }

  updateDeckUI();
  endGame();
  //dealCard(playerHand, '.player-hand');
  //updateHandValues();
}

function endGame() {
  document.querySelector('.result').textContent = '';
  document.querySelector('.dealer-hand').innerHTML = '';
  document.querySelector('.player-hand').innerHTML = '';
  document.querySelector('.dealer-hand-score').textContent = `Card's Value: `;
  document.querySelector('.player-hand-score').textContent = `Card's Value: `;

  if (bettingEnabled) {
    if (playerMoney <= 0) {
      document.querySelector('.result').textContent = 'You are out of money. Game over!';
      resetGame();
      return;
    }

    betLocked = false;
    document.querySelector('#bet-amount').textContent = baseBet;
    currentBet = baseBet;
    document.querySelector('#bet-amount').style.fontWeight = 'initial';
    document.querySelector('#bet-amount').style.color = 'initial';
    document.querySelector('#add-bet').disabled = false;
    document.querySelector('#place-bet').disabled = false;
  }

  gameOver = false;
  //shuffleDeck();
  dealInitialCards();
  updateHandValues();
}

function dealInitialCards() {
  dealerValue = 0;
  playerValue = 0;
  dealerHand = [];
  playerHand = [];

  if (deal2cards) {
    isDealerFirstCardHidden = true;
    dealCard(dealerHand, '.dealer-hand', false);
    dealCard(dealerHand, '.dealer-hand', true);
    dealCard(playerHand, '.player-hand', false);
    dealCard(playerHand, '.player-hand', false);
  } else {
    dealCard(dealerHand, '.dealer-hand');
    dealCard(playerHand, '.player-hand');
  }
}

function updateDeckUI() {
  const cardDeck = document.getElementById('card-deck');
  const deckCountDisplay = document.getElementById('deck-count');

  deckCountDisplay.textContent = deckCount > 0 ? deckCount : '0';
  cardDeck.textContent = deckCount > 0 ? '🂠' : '🃟'; //🃴🎴 

  if (deckCount > 0) {
      deckCount--;
  }
}

async function dealCard(hand, containerSelector, isHidden = false) {
  let card = getRandomCard();
  /*if (!card) {
    resetDeck();
  }*/

  hand.push(card);
  const cardElement = createCardElement(card);

  if (deal2cards) {
    if (isHidden && isDealerFirstCardHidden) {
      cardElement.classList.add('hidden-card');
      //isDealerFirstCardHidden = false;
    }
  }

  animateDeckColor(card.suit);

  cardElement.classList.add('deal-animation');
  document.querySelector(containerSelector).appendChild(cardElement);

  // Wait for animation and delay
  await new Promise(resolve => setTimeout(resolve, 200));
  updateDeckUI();

  cardElement.classList.remove('deal-animation');
}

function getRandomCard() {
  if (deck.length === 0) {
    //console.log('New deck of cards.');
    resetDeck();
  }
  const randomIndex = Math.floor(Math.random() * deck.length);
  return deck.splice(randomIndex, 1)[0];
}

function animateDeckColor(suit) {
  const cardDeck = document.getElementById('card-deck');

  // Map suits to colors
  const suitColors = {
    '\u2665': 'red',        // Hearts
    '\u2666': 'red',        // Diamonds
    '\u2663': 'black',      // Clubs
    '\u2660': 'black'       // Spades
  };

  const suitColor = suitColors[suit] || 'black';

  //cardDeck.style.transition = 'transform 0.5s, background-color 0.5s';
  cardDeck.style.transform = 'scale(1.3) rotateY(87deg)';
  cardDeck.style.color = suitColor;

  // Reset the animation after flipping
  setTimeout(() => {
    cardDeck.style.transform = 'scale(1) rotateY(0deg)';
  }, 400);
}

function resetDeck() {
  makeDeck();
  shuffleDeck();
  deckCount = 52;
  updateDeckUI();
}

function createCardElement(card) {
  if (!card) {
    card = null;
    return;
  }

  const cardElement = document.createElement('div');
  cardElement.className = 'card';

  const rankElementTop = document.createElement('div');
  rankElementTop.className = 'card-rank';
  rankElementTop.innerHTML = `${card.suit} <span>${card.rank}</span>`;

  const rankElementMiddle = document.createElement('div');
  rankElementMiddle.className = 'card-rank middle';
  if (letterRanks.includes(card.rank)) {
    const king = card.rank === 'K';
    const queen = card.rank === 'Q';
    const jack = card.rank === 'J';
    const ace = card.rank === 'A';
    
    rankElementMiddle.innerHTML = `<span>${ace ? card.suit : card.rank}</span>`;
  } else {
    rankElementMiddle.innerHTML = `<span>${card.rank}</span>`;
  }

  const rankElementBottom = document.createElement('div');
  rankElementBottom.className = 'card-rank bottom';
  rankElementBottom.innerHTML = `${card.suit} <span>${card.rank}</span>`;

  cardElement.appendChild(rankElementTop);
  cardElement.appendChild(rankElementMiddle);
  cardElement.appendChild(rankElementBottom);

  // Set color based on suit
  const isRed = card.suit === '\u2665' || card.suit === '\u2666';
  cardElement.style.color = isRed ? 'red' : 'black';

  const rankElements = Array.from(cardElement.querySelectorAll('.card-rank span'));
  rankElements.forEach(rankElement => {
    rankElement.style.borderBottom = `2px solid ${isRed ? 'red' : 'black'}`;
  });

  return cardElement;
}

async function updateHandValues() {
  let dealerValue;
  
  if (deal2cards && isDealerFirstCardHidden && !gameOver) {
    dealerValue = calculateHandValue(dealerHand.slice(0, 1));
  } else {
    dealerValue = calculateHandValue(dealerHand);
  }

  const playerValue = calculateHandValue(playerHand);
  await new Promise(resolve => setTimeout(resolve, 200));
  document.querySelector('.dealer-hand-score').textContent = `Card's Value: ${dealerValue}`;
  document.querySelector('.player-hand-score').textContent = `Card's Value: ${playerValue}`;
  await new Promise(resolve => setTimeout(resolve, 100));
  checkGameOver();
}

function calculateHandValue(hand) {
  let value = 0;
  let hasAce = false;

  for (let card of hand) {
    if (card.rank === 'A') {
      hasAce = true;
      value += 11;
    } else if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  }

  if (hasAce && value > 21) {
    value -= 10;
  }

  return value;
}

function revealDealerHiddenCard() {
  const hiddenCard = document.querySelector('.dealer-hand .hidden-card');
  if (hiddenCard) {
    hiddenCard.classList.add('reveal-animation');

    // Wait for animation to complete, then reveal card
    hiddenCard.addEventListener('animationend', () => {
      hiddenCard.classList.remove('hidden-card', 'reveal-animation');
      isDealerFirstCardHidden = false;
      updateHandValues();
    });
  }
}

function hit() {
  if (!gameOver) {
    if (bettingEnabled) {
      placeBet();
    }
    if (playerValue < 21 && dealerValue < 21) { //dealerValue >= playerValue && 
      if (deal2cards && !isDealerFirstCardHidden) return;
      
      dealCard(playerHand, '.player-hand', false);
      updateHandValues();
    }
  }
}

async function stand() {
  if (!gameOver) {
    if (bettingEnabled) {
      placeBet();
    }

    let dealerValue = calculateHandValue(dealerHand);
    let playerValue = calculateHandValue(playerHand);
    if (deal2cards) revealDealerHiddenCard();
    /*if (deal2cards && dealerValue < 21 && playerValue < 21 && dealerValue > playerValue) {  // && dealerValue > 18
      document.querySelector('.result').textContent += 'Dealer wins!';
      if (bettingEnabled) {
        playerMoney -= currentBet;
        dealerMoney += currentBet;
      } else {
        dealerScore++;
      }
      gameOver = true;
    }*/
    if (playerValue === dealerValue && dealerValue > dealerStopAt) {
      document.querySelector('.result').textContent += 'Draw! ';
      if (bettingEnabled) {
        playerMoney += currentBet;
        dealerMoney += currentBet;
      }
      gameOver = true;
    }
    if (playerValue < dealerValue && dealerValue >= (dealerStopAt + 1) && dealerValue <= 21) {
      document.querySelector('.result').textContent += 'Dealer wins!';
      if (bettingEnabled) {
        playerMoney -= currentBet;
        dealerMoney += currentBet;
      } else {
        dealerScore++;
      }
      gameOver = true;
    }
    while (dealerValue <= dealerStopAt && dealerValue <= playerValue && playerValue < 21 && dealerValue < 21) {
      dealCard(dealerHand, '.dealer-hand', false);
      dealerValue = calculateHandValue(dealerHand);
      await new Promise(resolve => setTimeout(resolve, 900));
    }
    updateHandValues();
    updateMoneyUI();
  } else {
    endGame();
  }
}

function checkGameOver() {
  const dealerValue = calculateHandValue(dealerHand);
  const playerValue = calculateHandValue(playerHand);

  if (!gameOver) {
    let resultMessage = '';
    if (playerValue > 21) {
      resultMessage = 'You busted. Dealer wins.';
      if (bettingEnabled) {
        dealerMoney += currentBet * 2;
      } else {
        dealerScore++;
      }
      gameOver = true;
    } else if (dealerValue > 21) {
      resultMessage = 'Dealer busted. You win!';
      if (bettingEnabled) {
        playerMoney += currentBet * 2;
      } else {
        playerScore++;
      }
      gameOver = true;
    } else if (playerValue === 21) {
      resultMessage = 'You got a Blackjack! You win!';
      if (bettingEnabled) {
        playerMoney += Math.round(currentBet * 2.5); // Blackjack payout
        dealerMoney -= Math.round(currentBet * 2.5);
      } else {
        playerScore++;
      }
      gameOver = true;
    } else if (dealerValue === 21) {
      resultMessage = 'Dealer got a Blackjack. Dealer wins.';
      if (bettingEnabled) {
        dealerMoney += currentBet * 2;
      } else {
        dealerScore++;
      }
      gameOver = true;
    } else if (dealerValue < playerValue && playerValue <= 20 && dealerValue > dealerStopAt) {
      resultMessage = 'You win!';
      if (bettingEnabled) {
        playerMoney += currentBet * 2;
      } else {
        playerScore++;
      }
      gameOver = true;
    } else if (playerValue === dealerValue && dealerValue > dealerStopAt) {
      resultMessage = 'Draw! ';
      if (bettingEnabled) {
        playerMoney += currentBet;
        dealerMoney += currentBet;
      }
      gameOver = true;
    } else if (deal2cards && !isDealerFirstCardHidden && playerValue < dealerValue) {
      resultMessage = 'Dealer wins!';
      if (bettingEnabled) {
        playerMoney -= currentBet;
        dealerMoney += currentBet;
      } else {
        dealerScore++;
      }
      gameOver = true;
    }

    document.querySelector('.result').textContent = resultMessage;

    if (deal2cards && gameOver && isDealerFirstCardHidden) {
      revealDealerHiddenCard();
    }

    // Update the UI based on the system being used
    if (bettingEnabled) {
      document.getElementById('money-display').textContent = `Your Money: $${playerMoney}`;
      document.getElementById('dealer-money-display').textContent = `Dealer's Money: $${dealerMoney}`;
    } else {
      document.querySelector('.score').textContent = `Dealer: ${dealerScore} - You: ${playerScore}`;
    }
  }
}