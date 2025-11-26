/************************************
 * GLOBAL GAME STATE
 ************************************/
let cardData = [];
let total = 0;
let turns = 0;

// ----- Permanent effects -----
let permAdd = 0; // adds to every future + card

/************************************
 * LOAD CARD DATABASE
 ************************************/
fetch("json/cards.json")
  .then((response) => response.json())
  .then((data) => (cardData = data));

/************************************
 * SCREEN MANAGEMENT
 ************************************/
function showScreen(id) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function startGame() {
  total = 0;
  turns = 0;

  // reset permanent effects
  permAdd = 0;

  document.getElementById("current-total").innerText = total;
  document.getElementById("turn-count").innerText = turns;

  generateCards();
  showScreen("game-screen");
}

function restartGame() {
  showScreen("start-screen");
}

/************************************
 * SOUND EFFECTS
 ************************************/
const s_flip = new Audio("sounds/flip.wav");
const s_click = new Audio("sounds/click.wav");
const s_win = new Audio("sounds/win.wav");

function play(sound) {
  sound.currentTime = 0;
  sound.play();
}

/************************************
 * CARD WEIGHT CLASSES
 ************************************/
const WEIGHT_CLASS = {
  common: 12,
  uncommon: 6,
  rare: 3,
  ultra: 1,
};

/************************************
 * CARD TEXT FORMATTING
 ************************************/
function formatCardText(card) {
  switch (card.op) {
    case "+": {
      let bonusText = permAdd > 0 ? `(+${permAdd})` : "";
      return `+${card.value}<div class="card-sub">${bonusText}</div>`;
    }

    case "-":
      return `-${card.value}`;

    case "*":
      return `×${card.value}`;

    case "/":
      return `/${card.value}`;

    case "random_plus": {
      let range = `1–${card.value}`;
      let bonusText = permAdd > 0 ? `(+${permAdd})` : "";
      return `+?<div class="card-sub">${range} ${bonusText}</div>`;
    }

    case "random_minus":
      return `-?<div class="card-sub">1–${card.value}</div>`;

    case "perm_add":
      return `Perm +${card.value}<div class="card-sub">Boost future + cards</div>`;

    default:
      return "?";
  }
}

/************************************
 * CARD COLOR (DO NOT CHANGE)
 ************************************/
function getCardColor(card) {
  const typeColors = {
    plus: "plus",
    minus: "minus",
    multiply: "multiply",
    divide: "divide",
    rare: "random",
    epic: "permanent",
  };

  return typeColors[card.type] || "";
}

/************************************
 * CARD GENERATION
 ************************************/
function generateCards() {
  const container = document.getElementById("cards");
  container.innerHTML = "";

  // Build weighted card pool
  let pool = [];

  cardData.forEach((card) => {
    const weightName = card.weight_class || "common";
    const weight = WEIGHT_CLASS[weightName] || 1;

    for (let i = 0; i < weight; i++) {
      pool.push(card);
    }
  });

  // -----------------------------------
  // FILTER OUT MULTIPLY/DIVIDE AT 0
  // -----------------------------------
  if (total === 0) {
    pool = pool.filter((card) => card.op !== "*" && card.op !== "/");
  }

  // fallback safety (if somehow pool becomes empty)
  if (pool.length === 0) {
    console.warn("Pool empty! Using full card list.");
    pool = [...cardData];
  }

  // Pick 3 weighted random cards
  const choices = [];
  for (let i = 0; i < 3; i++) {
    choices.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  // --- Render the 3 cards ---
  choices.forEach((card, index) => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back"></div>
        <div class="card-face card-front ${getCardColor(card)}"
             id="card-front-${index}">
          ${formatCardText(card)}
        </div>
      </div>
    `;

    div.onclick = () => {
      play(s_click);
      applyCard(card, index);
    };

    container.appendChild(div);

    setTimeout(() => {
      div.classList.add("flip");
      play(s_flip);
    }, 200);
  });
}

/************************************
 * APPLY CARD LOGIC
 ************************************/
function applyCard(card, cardIndex) {
  turns++;
  document.getElementById("turn-count").innerText = turns;

  let revealedValue = null;

  // RANDOM ROLLS
  if (card.op === "random_plus" || card.op === "random_minus") {
    revealedValue = Math.floor(Math.random() * card.value) + 1;
  }

  // reveal random result visually
  if (revealedValue !== null) {
    const front = document.getElementById(`card-front-${cardIndex}`);
    const symbol = card.op === "random_minus" ? "-" : "+";

    front.innerText = `${symbol}${revealedValue}`;
    front.style.color = "#ffea00";
    front.style.transform = "scale(1.2)";

    setTimeout(() => {
      front.style.transform = "scale(1)";
      front.style.color = "white";
    }, 2000);
  }

  // APPLY EFFECT
  switch (card.op) {
    case "+":
      total += card.value + permAdd;
      break;

    case "-":
      total -= card.value;
      break;

    case "*":
      total *= card.value;
      break;

    case "/":
      total = Math.floor(total / card.value);
      break;

    case "random_plus":
      total += revealedValue + permAdd;
      break;

    case "random_minus":
      total -= revealedValue;
      break;

    case "perm_add":
      permAdd += card.value;
      break;
  }

  document.getElementById("current-total").innerText = total;

  // GAME OVER
  if (total > 21) {
    document.getElementById("gameover-total").innerText = total;
    showScreen("gameover-screen");
    return;
  }

  // WIN (21 or -21)
  if (total === 21 || total === -21) {
    play(s_win);

    document.getElementById("final-turns").innerText = turns;
    document.getElementById("final-total").innerText = total;

    showScreen("end-screen");
    return;
  }

  generateCards();
}

/************************************
 * DEBUG COLOR SYSTEM
 ************************************/
function getCardCSSColor(card) {
  if (card.color) return card.color;

  const typeColors = {
    plus: "green",
    minus: "red",
    multiply: "blue",
    divide: "gold",
    rare: "purple",
    epic: "lightblue",
  };

  return typeColors[card.type] || "#ffffff";
}

/************************************
 * DEBUG PAGE
 ************************************/
function openDebugPage() {
  const list = document.getElementById("debug-card-list");
  list.innerHTML = "";

  cardData.forEach((card) => {
    const div = document.createElement("div");
    div.className = "debug-card";
    div.style.borderColor = getCardCSSColor(card);
    div.innerHTML = `
      <div class="debug-name">${card.display_name}</div>
      <div class="debug-desc">${card.description || ""}</div>

      <div class="debug-tag">Value: ${card.value}</div>
      <div class="debug-tag">Type: ${card.type}</div>
      <div class="debug-tag">Category: ${card.category}</div>
      <div class="debug-tag">Rarity: ${card.weight_class}</div>
    `;
    list.appendChild(div);
  });

  showScreen("debug-screen");
}

/************************************
 * BUTTONS
 ************************************/
document.getElementById("start-btn").onclick = startGame;
document.getElementById("restart-btn").onclick = restartGame;
document.getElementById("restart-btn-2").onclick = restartGame;
document.getElementById("debug-btn").onclick = openDebugPage;
document.getElementById("back-btn").onclick = () => showScreen("start-screen");
