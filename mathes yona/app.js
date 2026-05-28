/* ==========================================================================
   HEXAMATH QUEST — CENTRAL APPLICATION CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Global State Manager
  const AppState = {
    xp: 0,
    rankLevel: 1,
    streak: 0,
    maxStreak: 0,
    difficultyIndex: 1, // 1 to 5
    activeTab: 'gym',
    activeOpFilter: 'all', // 'all', 'add', 'sub', 'mul', 'div'
    
    // Stats profiling (6 axes tracking)
    stats: {
      addition: 20,
      subtraction: 15,
      multiplication: 10,
      division: 8,
      focus: 5,       // Streak density
      strategy: 12    // Hex puzzle completions
    },

    // Timer variables for streak overdrive "Critical Mode"
    timer: null,
    timerMax: 15, // 15 seconds max
    timerCurrent: 15,
    timerActive: false,

    // Active Math Gym Equation
    currentEq: {
      num1: 0,
      num2: 0,
      op: '+',
      answer: 0,
      userAnswer: ''
    }
  };

  // Instantiations of canvas modules
  let visualizer = null;
  let hexPuzzle = null;

  // Initialize Canvas Visualizers
  function initVisualizers() {
    visualizer = new MathVisualizer('canvas-visualizer');
    hexPuzzle = new HexGridPuzzle('canvas-puzzle');
    
    // Default initial problem visualization
    generateMathProblem();
    
    // Load first level in puzzle tab
    hexPuzzle.loadLevel(0);
    renderLevelsList();
  }

  // Set up tab switching navigation
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      if (window.sfx) window.sfx.playTap();
      
      // Toggle button states
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Toggle tab views
      tabContents.forEach(content => content.classList.remove('active'));
      const activeTabEl = document.getElementById(`tab-${tabName}`);
      if (activeTabEl) activeTabEl.classList.add('active');

      AppState.activeTab = tabName;

      // Handle specific tab transitions
      if (tabName === 'stats') {
        setTimeout(renderRadarStatsWeb, 100);
        updateProgressBars();
      } else if (tabName === 'puzzle') {
        if (hexPuzzle) {
          hexPuzzle.resize();
          hexPuzzle.updateUI();
        }
      }
    });
  });

  // Sound FX Enable/Disable listener
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const iconAudio = document.getElementById('audio-icon');
  
  if (btnAudioToggle) {
    btnAudioToggle.addEventListener('click', () => {
      const isEnabled = window.sfx.toggle();
      if (iconAudio) {
        iconAudio.innerText = isEnabled ? '🔊' : '🔇';
      }
    });
  }

  /* ==========================================================================
     MATH GYM ENGINE (Adaptive Difficulty + Dynamic Equation Generator)
     ========================================================================== */

  // Random operation generator
  function getRandomOp() {
    const ops = [];
    if (AppState.activeOpFilter === 'all') {
      ops.push('+', '-', '×', '÷');
    } else {
      if (AppState.activeOpFilter === 'add') ops.push('+');
      if (AppState.activeOpFilter === 'sub') ops.push('-');
      if (AppState.activeOpFilter === 'mul') ops.push('×');
      if (AppState.activeOpFilter === 'div') ops.push('÷');
    }
    return ops[Math.floor(Math.random() * ops.length)];
  }

  // Generates math equations based on Difficulty level (Critical scaling!)
  function generateMathProblem() {
    const op = getRandomOp();
    let n1 = 0, n2 = 0, ans = 0;
    
    // Scale numbers based on Adaptive difficulty index
    const diff = AppState.difficultyIndex;

    switch (op) {
      case '+':
        if (diff === 1) { // Easy
          n1 = Math.floor(Math.random() * 9) + 1;
          n2 = Math.floor(Math.random() * 9) + 1;
        } else if (diff === 2) { // Medium
          n1 = Math.floor(Math.random() * 20) + 10;
          n2 = Math.floor(Math.random() * 20) + 10;
        } else if (diff === 3) { // Hard
          n1 = Math.floor(Math.random() * 80) + 20;
          n2 = Math.floor(Math.random() * 80) + 20;
        } else { // Extreme Critical Mode
          n1 = Math.floor(Math.random() * 150) + 50;
          n2 = Math.floor(Math.random() * 150) + 50;
        }
        ans = n1 + n2;
        break;

      case '-':
        if (diff === 1) {
          n1 = Math.floor(Math.random() * 9) + 2;
          n2 = Math.floor(Math.random() * (n1 - 1)) + 1; // ensure positive answer for kids
        } else if (diff === 2) {
          n1 = Math.floor(Math.random() * 30) + 15;
          n2 = Math.floor(Math.random() * (n1 - 5)) + 5;
        } else if (diff === 3) {
          n1 = Math.floor(Math.random() * 99) + 20;
          n2 = Math.floor(Math.random() * 80) + 10;
          // Introduce negatives in hard modes!
          if (Math.random() > 0.6) {
            const temp = n1; n1 = n2; n2 = temp; 
          }
        } else { // Critical
          n1 = Math.floor(Math.random() * 199) - 50;
          n2 = Math.floor(Math.random() * 150) + 10;
        }
        ans = n1 - n2;
        break;

      case '×':
        if (diff === 1) {
          n1 = Math.floor(Math.random() * 5) + 1;
          n2 = Math.floor(Math.random() * 9) + 1;
        } else if (diff === 2) {
          n1 = Math.floor(Math.random() * 9) + 2;
          n2 = Math.floor(Math.random() * 9) + 2;
        } else if (diff === 3) {
          n1 = Math.floor(Math.random() * 12) + 2;
          n2 = Math.floor(Math.random() * 12) + 2;
        } else { // Critical
          n1 = Math.floor(Math.random() * 20) + 5;
          n2 = Math.floor(Math.random() * 12) + 5;
        }
        ans = n1 * n2;
        break;

      case '÷':
        if (diff === 1) {
          n2 = Math.floor(Math.random() * 4) + 1; // divisor
          ans = Math.floor(Math.random() * 5) + 1; // quotient
          n1 = n2 * ans; // dividend (ensures perfect splitting)
        } else if (diff === 2) {
          n2 = Math.floor(Math.random() * 8) + 2;
          ans = Math.floor(Math.random() * 9) + 2;
          n1 = n2 * ans;
        } else if (diff === 3) {
          // division with remainders!
          n2 = Math.floor(Math.random() * 9) + 2;
          n1 = Math.floor(Math.random() * 99) + 10;
          ans = Math.floor(n1 / n2); // we expect student to provide Quotient only
        } else { // Critical
          n2 = Math.floor(Math.random() * 15) + 3;
          n1 = Math.floor(Math.random() * 199) + 20;
          ans = Math.floor(n1 / n2);
        }
        break;
    }

    AppState.currentEq = { num1: n1, num2: n2, op: op, answer: ans, userAnswer: '' };
    
    // Draw the active equation values inside card
    renderEquationCard();
    
    // Clear typing input
    const txtInput = document.getElementById('input-answer');
    if (txtInput) {
      txtInput.value = '';
      txtInput.focus();
    }

    // Trigger visualizer canvas drawing
    let mapOp = 'add';
    if (op === '-') mapOp = 'sub';
    else if (op === '×') mapOp = 'mul';
    else if (op === '÷') mapOp = 'div';
    
    if (visualizer) {
      visualizer.setProblem(mapOp, n1, n2);
    }

    updateExplanationText(mapOp, n1, n2, ans);
  }

  function renderEquationCard() {
    const card = document.getElementById('equation-card');
    const displayEq = document.getElementById('display-equation');
    if (!card || !displayEq) return;

    // Build the inside html elements
    const eq = AppState.currentEq;
    displayEq.innerHTML = `
      <span class="num first-num">${eq.num1}</span>
      <span class="op">${eq.op}</span>
      <span class="num second-num">${eq.num2}</span>
      <span class="equals">=</span>
      <span class="answer-box">
        <input type="text" id="input-answer" placeholder="?" readonly autocomplete="off">
      </span>
    `;

    // Reconnect click focus listener
    const ansBox = document.querySelector('.answer-box');
    const input = document.getElementById('input-answer');
    
    if (ansBox && input) {
      ansBox.addEventListener('click', () => input.focus());
    }

    // Dynamic coloring based on operation
    const op = eq.op;
    let accent = 'var(--accent-cyan)';
    if (op === '-') accent = 'var(--accent-pink)';
    else if (op === '×') accent = 'var(--accent-amber)';
    else if (op === '÷') accent = 'var(--accent-green)';
    
    card.style.border = `1px solid ${accent}40`;
    card.style.boxShadow = `0 10px 40px -10px ${accent}25, 0 0 20px ${accent}10`;
  }

  function updateExplanationText(mapOp, n1, n2, ans) {
    const descEl = document.getElementById('display-explanation-text');
    if (!descEl) return;

    let text = "";
    if (mapOp === 'add') {
      text = `Combine a group of ${n1} items with a group of ${n2} items. Merging them gives a total of ${ans} items.`;
    } else if (mapOp === 'sub') {
      text = `Start with ${n1} items. Subtract or take away exactly ${n2} items by vaporizing them, leaving ${ans} items remaining.`;
    } else if (mapOp === 'mul') {
      text = `Arrange items in a grid/matrix of ${n1} rows by ${n2} columns. Counting all the grid nodes gives a total of ${ans}.`;
    } else if (mapOp === 'div') {
      const quotient = Math.floor(n1 / n2);
      const remainder = n1 % n2;
      text = `Distribute ${n1} items equally into ${n2} planetary containers. Each container holds ${quotient} items, leaving ${remainder} remainder sparks orbiting the core.`;
    }
    descEl.innerText = text;
  }

  // Standard operation selector filters
  const opPills = document.querySelectorAll('.op-pill');
  opPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      if (window.sfx) window.sfx.playTap();
      opPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      AppState.activeOpFilter = pill.getAttribute('data-op');
      generateMathProblem();
    });
  });

  // Check math answer validation
  function evaluateUserAnswer() {
    const inputEl = document.getElementById('input-answer');
    if (!inputEl) return;

    const userVal = parseInt(inputEl.value);
    const targetVal = AppState.currentEq.answer;
    const card = document.getElementById('equation-card');

    if (isNaN(userVal)) {
      if (card) {
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 500);
      }
      return;
    }

    if (userVal === targetVal) {
      // CORRECT ANSWER!
      if (window.sfx) window.sfx.playSuccess();
      if (card) {
        card.classList.add('correct-pulse');
        setTimeout(() => card.classList.remove('correct-pulse'), 600);
      }

      // Add streak, score
      AppState.streak++;
      AppState.maxStreak = Math.max(AppState.maxStreak, AppState.streak);
      const earnedXP = Math.floor(20 * (1 + AppState.streak * 0.1));
      AppState.xp += earnedXP;
      
      // Update stats profiling
      updateStatsOnCorrect();

      // Trigger level rank progression
      evalUserLevel();

      // Adjust adaptive difficulty
      evalAdaptiveDifficulty();

      // Setup/Reset Timer Overdrive if on fire
      manageOverdriveTimer();

      // Refresh HUD score displays
      updateHudUI();

      // Delay a second to let them appreciate the diagram before showing next
      setTimeout(generateMathProblem, 1000);

    } else {
      // WRONG ANSWER
      if (window.sfx) window.sfx.playFailure();
      if (card) {
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 500);
      }

      // Reset streak
      breakStreak();
      updateHudUI();
    }
  }

  function breakStreak() {
    AppState.streak = 0;
    AppState.difficultyIndex = Math.max(1, AppState.difficultyIndex - 1);
    stopOverdriveTimer();
    evalAdaptiveDifficulty();
  }

  function updateStatsOnCorrect() {
    const op = AppState.currentEq.op;
    if (op === '+') AppState.stats.addition = Math.min(100, AppState.stats.addition + 3);
    else if (op === '-') AppState.stats.subtraction = Math.min(100, AppState.stats.subtraction + 3);
    else if (op === '×') AppState.stats.multiplication = Math.min(100, AppState.stats.multiplication + 3);
    else if (op === '÷') AppState.stats.division = Math.min(100, AppState.stats.division + 3);
    
    AppState.stats.focus = Math.min(100, AppState.streak * 4 + 10);
  }

  function evalUserLevel() {
    // Basic level calculation: every 200 XP = 1 Rank level
    const newLvl = Math.floor(AppState.xp / 200) + 1;
    if (newLvl > AppState.rankLevel) {
      AppState.rankLevel = newLvl;
      if (window.sfx) window.sfx.playStreakUp();
      triggerModalPopup(
        "🚀 RANK LEVEL UP!",
        `Congratulations! You reached level ${AppState.rankLevel}! You are becoming a master of arithmetic dimensions. Keep it up!`
      );
    }
  }

  function evalAdaptiveDifficulty() {
    // Streaks unlock harder problem scaling
    let prevDiff = AppState.difficultyIndex;
    if (AppState.streak >= 12) AppState.difficultyIndex = 4; // Extreme
    else if (AppState.streak >= 8) AppState.difficultyIndex = 3;  // Hard
    else if (AppState.streak >= 4) AppState.difficultyIndex = 2;  // Medium
    else AppState.difficultyIndex = 1;                           // Easy

    const diffEl = document.getElementById('val-difficulty');
    if (diffEl) {
      const labels = ["", "Difficulty: Easy", "Difficulty: Medium", "Difficulty: Hard ⚡", "Difficulty: CRITICAL ⚠️"];
      diffEl.innerText = labels[AppState.difficultyIndex];
      
      // Update styling tags
      if (AppState.difficultyIndex >= 3) {
        diffEl.style.color = 'var(--accent-pink)';
        diffEl.style.borderColor = 'rgba(255, 42, 133, 0.4)';
      } else {
        diffEl.style.color = 'var(--accent-cyan)';
        diffEl.style.borderColor = 'rgba(0, 240, 255, 0.15)';
      }
    }
  }

  function updateHudUI() {
    const lblScore = document.getElementById('val-score');
    const lblStreak = document.getElementById('val-streak');
    const lblLvl = document.getElementById('val-level');
    const lblMult = document.getElementById('val-multiplier');
    const streakContainer = document.getElementById('container-streak');
    const lblRankText = document.getElementById('label-rank');

    if (lblScore) lblScore.innerText = String(AppState.xp).padStart(4, '0');
    if (lblStreak) lblStreak.innerText = AppState.streak;
    if (lblLvl) lblLvl.innerText = AppState.rankLevel;
    
    const mult = (1 + AppState.streak * 0.1).toFixed(1);
    if (lblMult) lblMult.innerText = `${mult}x`;

    // Dynamic flame effects for streak overdrive
    if (streakContainer) {
      if (AppState.streak >= 5) {
        streakContainer.classList.add('supercharged');
      } else {
        streakContainer.classList.remove('supercharged');
      }
    }

    if (lblRankText) {
      const ranks = ["Novice", "Astral Pilot", "Orbit Voyager", "Wormhole Decrypter", "Cosmic Sage"];
      const rIdx = Math.min(ranks.length - 1, Math.floor((AppState.rankLevel - 1) / 3));
      lblRankText.innerText = `Level ${AppState.rankLevel} ${ranks[rIdx]}`;
    }
  }

  /* ==========================================================================
     STREAK TIMER CRITICAL ("OVERDRIVE MODE")
     ========================================================================== */

  function manageOverdriveTimer() {
    const timerWrapper = document.getElementById('timer-wrapper');
    if (!timerWrapper) return;

    // Trigger timer only when streak is 5 or more (More Critical!)
    if (AppState.streak >= 5) {
      timerWrapper.style.opacity = '1';
      AppState.timerCurrent = AppState.timerMax - Math.min(6, AppState.streak - 5); // scales down time as streak climbs!
      
      stopOverdriveTimer(); // cancel previous interval
      
      AppState.timerActive = true;
      const bar = document.getElementById('timer-bar');

      AppState.timer = setInterval(() => {
        AppState.timerCurrent -= 0.1;
        const pct = (AppState.timerCurrent / (AppState.timerMax - Math.min(6, AppState.streak - 5))) * 100;
        
        if (bar) bar.style.transform = `scaleX(${pct / 100})`;

        if (AppState.timerCurrent <= 0) {
          stopOverdriveTimer();
          if (window.sfx) window.sfx.playFailure();
          triggerModalPopup(
            "⏰ TIMEOUT CRITICAL",
            "The mathematical energy core overloaded! Your streak has been broken. Keep calm and try again!"
          );
          breakStreak();
          updateHudUI();
          generateMathProblem();
        }
      }, 100);
    } else {
      timerWrapper.style.opacity = '0';
    }
  }

  function stopOverdriveTimer() {
    if (AppState.timer) {
      clearInterval(AppState.timer);
      AppState.timer = null;
    }
    AppState.timerActive = false;
    const bar = document.getElementById('timer-bar');
    if (bar) bar.style.transform = 'scaleX(1)';
  }

  /* ==========================================================================
     VIRTUAL NUMPAD HANDLERS
     ========================================================================== */

  const numpadButtons = document.querySelectorAll('.numpad-btn');
  numpadButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (window.sfx) window.sfx.playTap();
      const val = btn.getAttribute('data-val');
      const input = document.getElementById('input-answer');
      if (!input) return;

      if (val === 'clear') {
        input.value = '';
      } else if (val === 'negative') {
        if (input.value.startsWith('-')) {
          input.value = input.value.slice(1);
        } else {
          input.value = '-' + input.value;
        }
      } else {
        // limit answer length
        if (input.value.length < 5) {
          input.value += val;
        }
      }
    });
  });

  // Physical keyboard support for typing in math gym
  window.addEventListener('keydown', (e) => {
    if (AppState.activeTab !== 'gym') return;
    const input = document.getElementById('input-answer');
    if (!input) return;

    if (e.key >= '0' && e.key <= '9') {
      if (input.value.length < 5) input.value += e.key;
    } else if (e.key === '-') {
      if (input.value.startsWith('-')) {
        input.value = input.value.slice(1);
      } else {
        input.value = '-' + input.value;
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      input.value = input.value.slice(0, -1);
    } else if (e.key === 'Enter') {
      evaluateUserAnswer();
    }
  });

  const btnSubmit = document.getElementById('btn-submit-answer');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      evaluateUserAnswer();
    });
  }

  /* ==========================================================================
     HEX-AXIS GRID PUZZLE - TAB CONNECTORS
     ========================================================================== */

  // Draw Sector level grid selection buttons
  function renderLevelsList() {
    const listEl = document.getElementById('grid-levels');
    if (!listEl) return;

    listEl.innerHTML = '';
    hexPuzzle.levels.forEach((lvl, idx) => {
      const pill = document.createElement('button');
      pill.className = `level-pill ${idx === hexPuzzle.activeLevelIdx ? 'active' : ''}`;
      pill.innerText = idx + 1;
      pill.title = lvl.name;
      
      pill.addEventListener('click', () => {
        if (window.sfx) window.sfx.playTap();
        
        // Remove active class from previous
        document.querySelectorAll('.level-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        hexPuzzle.loadLevel(idx);
      });
      listEl.appendChild(pill);
    });
  }

  // Virtual compass click controls for 6 axes
  const compassButtons = document.querySelectorAll('.compass-btn');
  compassButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-dir');
      if (hexPuzzle && dir) {
        hexPuzzle.moveDirection(dir);
      }
    });
  });

  const btnResetPuzzle = document.getElementById('btn-reset-puzzle');
  if (btnResetPuzzle) {
    btnResetPuzzle.addEventListener('click', () => {
      if (window.sfx) window.sfx.playTap();
      if (hexPuzzle) hexPuzzle.resetCurrentLevel();
    });
  }

  // Listen to custom puzzle completion events from canvas engine
  window.addEventListener('hexPuzzleSolved', (e) => {
    const details = e.detail;
    AppState.xp += details.xp;
    AppState.stats.strategy = Math.min(100, AppState.stats.strategy + 12);
    evalUserLevel();
    updateHudUI();

    triggerModalPopup(
      "🔓 PORTAL DECRYPTION SUCCESSFUL!",
      `Astounding strategy! You navigated the core along the 6 axes, reached the destination, and matched the target sum perfectly! Sector ${details.level} powered down. earned +${details.xp} XP.`,
      () => {
        // Unlock next sector level
        const nextLvl = hexPuzzle.activeLevelIdx + 1;
        if (nextLvl < hexPuzzle.levels.length) {
          hexPuzzle.loadLevel(nextLvl);
          renderLevelsList();
        } else {
          triggerModalPopup(
            "🏆 SYSTEM DECRYPTED",
            "Incredible! You have decrypted all available Sectors in the Hexa-Axis dimension! Keep sharpening your skills in the Math Gym to maintain Rank dominance!"
          );
        }
      }
    );
  });

  /* ==========================================================================
     COGNITIVE WEB: NATIVE CUSTOM 6-AXIS RADAR CHART (Zero Dependencies)
     ========================================================================== */

  function renderRadarStatsWeb() {
    const canvas = document.getElementById('canvas-stats-radar');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Make canvas responsive matching bounds
    const rect = canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width * 0.9, rect.height * 0.9, 320);
    canvas.width = size;
    canvas.height = size;
    
    const cX = size / 2;
    const cY = size / 2;
    const maxRadius = size * 0.4;
    
    ctx.clearRect(0, 0, size, size);

    // 6 Axes of standard cognitive metrics
    const axisLabels = [
      "Addition",
      "Focus (Streak)",
      "Multiplication",
      "Division",
      "Strategy (Puzzle)",
      "Subtraction"
    ];

    const dataValues = [
      AppState.stats.addition,
      AppState.stats.focus,
      AppState.stats.multiplication,
      AppState.stats.division,
      AppState.stats.strategy,
      AppState.stats.subtraction
    ];

    const angles = [];
    for (let i = 0; i < 6; i++) {
      angles.push((Math.PI / 3) * i - Math.PI / 2); // Flat-topped hexagonal axes spacing
    }

    // 1. Draw Concentric Background Hexagonal Webs
    const websCount = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let w = 1; w <= websCount; w++) {
      const radius = maxRadius * (w / websCount);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const x = cX + radius * Math.cos(angles[i]);
        const y = cY + radius * Math.sin(angles[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Soft web border markers
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '8px monospace';
      ctx.fillText(`${(w/websCount)*100}`, cX + 4, cY - radius + 3);
    }

    // 2. Draw Spokes / Axis lines from center
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      ctx.moveTo(cX, cY);
      ctx.lineTo(cX + maxRadius * Math.cos(angles[i]), cY + maxRadius * Math.sin(angles[i]));
    }
    ctx.stroke();

    // 3. Draw Performance Metric Area
    const pathPoints = [];
    dataValues.forEach((val, idx) => {
      const r = maxRadius * (val / 100);
      pathPoints.push({
        x: cX + r * Math.cos(angles[idx]),
        y: cY + r * Math.sin(angles[idx])
      });
    });

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    }
    ctx.closePath();

    // Neon purple glow fill
    const grad = ctx.createRadialGradient(cX, cY, 10, cX, cY, maxRadius);
    grad.addColorStop(0, 'rgba(171, 38, 255, 0.15)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0.45)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    // 4. Draw labels at outer nodes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < 6; i++) {
      const labelX = cX + (maxRadius + 20) * Math.cos(angles[i]);
      const labelY = cY + (maxRadius + 14) * Math.sin(angles[i]);
      
      // Adjust alignments based on quadrants
      if (Math.abs(Math.cos(angles[i])) < 0.1) {
        ctx.textAlign = 'center';
      } else if (Math.cos(angles[i]) > 0) {
        ctx.textAlign = 'left';
      } else {
        ctx.textAlign = 'right';
      }
      
      ctx.fillText(axisLabels[i], labelX, labelY);
    }
  }

  function updateProgressBars() {
    const barsContainer = document.getElementById('container-stat-bars');
    if (!barsContainer) return;

    barsContainer.innerHTML = '';
    
    const statsList = [
      { key: "Summation Strength (+)", val: AppState.stats.addition, color: 'var(--accent-cyan)' },
      { key: "Difference Precision (-)", val: AppState.stats.subtraction, color: 'var(--accent-pink)' },
      { key: "Scale Velocity (×)", val: AppState.stats.multiplication, color: 'var(--accent-amber)' },
      { key: "Fractional Split (÷)", val: AppState.stats.division, color: 'var(--accent-green)' },
      { key: "Focus Intensity", val: AppState.stats.focus, color: '#ab26ff' },
      { key: "Sector Pathing Strategy", val: AppState.stats.strategy, color: '#ffffff' }
    ];

    statsList.forEach((stat) => {
      const barItem = document.createElement('div');
      barItem.className = 'stat-bar-item';
      
      barItem.innerHTML = `
        <div class="stat-bar-header">
          <span class="stat-bar-label">${stat.key}</span>
          <span class="stat-bar-value">${stat.val}%</span>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="background: ${stat.color}; width: 0%;"></div>
        </div>
      `;
      barsContainer.appendChild(barItem);

      // Trigger width fill with delay to animate
      setTimeout(() => {
        const fill = barItem.querySelector('.stat-bar-fill');
        if (fill) fill.style.width = `${stat.val}%`;
      }, 50);
    });

    const mText = document.getElementById('label-stats-motivation');
    if (mText) {
      if (AppState.streak >= 5) {
        mText.innerText = `Streak of ${AppState.streak} active! Your Focus Intensity and Summation multipliers are amplified! Keep answering correct in Math Gym to max out.`;
      } else {
        mText.innerText = "Build a streak of 5 correct answers in the Math Gym to enter Overdrive, boosting your overall focus ranking and unlock higher sectors!";
      }
    }
  }

  /* ==========================================================================
     SUCCESS / WARNING OVERLAY SYSTEM
     ========================================================================== */

  let modalCallback = null;

  function triggerModalPopup(title, text, callback = null) {
    const screen = document.getElementById('modal-screen');
    const lblTitle = document.getElementById('modal-title');
    const lblBody = document.getElementById('modal-body');
    const icon = document.getElementById('modal-icon');

    if (!screen || !lblTitle || !lblBody) return;

    lblTitle.innerText = title;
    lblBody.innerText = text;
    modalCallback = callback;

    if (title.includes('LEVEL')) {
      icon.innerText = '🚀';
      icon.style.filter = 'drop-shadow(0 0 12px var(--accent-cyan))';
    } else if (title.includes('TIMEOUT')) {
      icon.innerText = '⏰';
      icon.style.filter = 'drop-shadow(0 0 12px var(--accent-pink))';
    } else {
      icon.innerText = '🎉';
      icon.style.filter = 'drop-shadow(0 0 12px var(--accent-purple))';
    }

    screen.style.display = 'flex';
  }

  const btnModalAction = document.getElementById('btn-modal-action');
  if (btnModalAction) {
    btnModalAction.addEventListener('click', () => {
      if (window.sfx) window.sfx.playTap();
      const screen = document.getElementById('modal-screen');
      if (screen) screen.style.display = 'none';

      if (modalCallback) {
        modalCallback();
        modalCallback = null;
      }
    });
  }

  // Fire up everything!
  initVisualizers();
});
