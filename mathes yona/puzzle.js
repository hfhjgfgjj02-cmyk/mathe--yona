/* ==========================================================================
   HEXAMATH QUEST — 6-AXIS HEXAGONAL GRID PUZZLE ENGINE
   ========================================================================== */

class HexGridPuzzle {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.width = 0;
    this.height = 0;
    this.hexRadius = 38; // Radius of single hex tile
    
    // Grid nodes storage (axial coordinates: q, r)
    this.grid = new Map(); 
    this.startNode = { q: -2, r: 0 };
    this.endNode = { q: 2, r: 0 };
    this.currentNode = { q: -2, r: 0 };
    
    // Game progress states
    this.currentVal = 0;
    this.targetVal = 0;
    this.startVal = 0;
    this.pathHistory = []; // Tracks nodes visited: [{q, r, val}]
    this.activeLevelIdx = 0;
    this.isSolved = false;

    // Animations & Particles
    this.particles = [];
    this.pulseScale = 0;
    this.coreAngle = 0;
    
    // Define 6 Axes directions in Hex coordinates (Axial: q, r)
    this.axesDirections = {
      'e':  { q: 1,  r: 0  },  // Axis 1: East (0°)
      'se': { q: 0,  r: 1  },  // Axis 2: South-East (60°)
      'sw': { q: -1, r: 1  },  // Axis 3: South-West (120°)
      'w':  { q: -1, r: 0  },  // Axis 4: West (180°)
      'nw': { q: 0,  r: -1 },  // Axis 5: North-West (240°)
      'ne': { q: 1,  r: -1 }   // Axis 6: North-East (300°)
    };

    // Predefined levels of varying complexity
    this.levels = [
      {
        id: 1,
        name: "Sector: Ion",
        startVal: 2,
        targetVal: 10,
        startPos: { q: -2, r: 0 },
        endPos: { q: 2, r: 0 },
        nodes: [
          { q: -2, r: 0, op: 'START (2)', isStart: true },
          { q: -1, r: 0, op: '+3' },
          { q: 0, r: 0, op: '×2' },
          { q: 1, r: 0, op: '+4' },
          { q: 2, r: 0, op: 'PORTAL', isEnd: true },
          
          { q: -1, r: 1, op: '+1' },
          { q: 0, r: 1, op: '×3' },
          { q: 1, r: -1, op: '-2' },
          { q: 0, r: -1, op: '+5' },
          { q: -1, r: -1, op: '×4' }
        ]
      },
      {
        id: 2,
        name: "Sector: Nebula",
        startVal: 3,
        targetVal: 15,
        startPos: { q: -2, r: 1 },
        endPos: { q: 2, r: -1 },
        nodes: [
          { q: -2, r: 1, op: 'START (3)', isStart: true },
          { q: -1, r: 1, op: '+5' },
          { q: 0, r: 0, op: '×2' },
          { q: 1, r: -1, op: '+3' },
          { q: 2, r: -1, op: 'PORTAL', isEnd: true },
          
          { q: -2, r: 0, op: '+10' },
          { q: -1, r: 0, op: '-2' },
          { q: 0, r: 1, op: '×3' },
          { q: 1, r: 0, op: '/2' },
          { q: 0, r: -1, op: '+4' }
        ]
      },
      {
        id: 3,
        name: "Sector: Pulsar",
        startVal: 10,
        targetVal: 30,
        startPos: { q: -2, r: 0 },
        endPos: { q: 2, r: 0 },
        nodes: [
          { q: -2, r: 0, op: 'START (10)', isStart: true },
          { q: -1, r: 0, op: '÷2' },
          { q: 0, r: 0, op: '×4' },
          { q: 1, r: 0, op: '+10' },
          { q: 2, r: 0, op: 'PORTAL', isEnd: true },
          
          { q: -1, r: 1, op: '+5' },
          { q: 0, r: 1, op: '-3' },
          { q: 1, r: -1, op: '×3' },
          { q: 0, r: -1, op: '÷5' },
          { q: -1, r: -1, op: '×2' }
        ]
      },
      {
        id: 4,
        name: "Sector: Quasar",
        startVal: 12,
        targetVal: 8,
        startPos: { q: -2, r: 1 },
        endPos: { q: 1, r: -1 },
        nodes: [
          { q: -2, r: 1, op: 'START (12)', isStart: true },
          { q: -1, r: 1, op: '/3' },
          { q: 0, r: 0, op: '×2' },
          { q: 1, r: -1, op: 'PORTAL', isEnd: true },
          
          { q: -1, r: 0, op: '+6' },
          { q: 0, r: 1, op: '-8' },
          { q: 1, r: 0, op: '+4' },
          { q: 0, r: -1, op: '/4' },
          { q: -1, r: -1, op: '+10' }
        ]
      },
      {
        id: 5,
        name: "Sector: Singularity",
        startVal: 5,
        targetVal: 100,
        startPos: { q: -2, r: 0 },
        endPos: { q: 2, r: 0 },
        nodes: [
          { q: -2, r: 0, op: 'START (5)', isStart: true },
          { q: -1, r: 0, op: '×5' },
          { q: 0, r: 0, op: '×4' },
          { q: 1, r: 0, op: '÷2' },
          { q: 2, r: 0, op: 'PORTAL', isEnd: true },
          
          { q: -1, r: 1, op: '+15' },
          { q: 0, r: 1, op: '-50' },
          { q: 1, r: -1, op: '×10' },
          { q: 0, r: -1, op: '+75' },
          { q: -1, r: -1, op: '×2' }
        ]
      },
      {
        id: 6,
        name: "Sector: Void (Negatives)",
        startVal: 5,
        targetVal: -5,
        startPos: { q: -2, r: 0 },
        endPos: { q: 2, r: 0 },
        nodes: [
          { q: -2, r: 0, op: 'START (5)', isStart: true },
          { q: -1, r: 0, op: '-10' },
          { q: 0, r: 0, op: '×2' },
          { q: 1, r: 0, op: '+5' },
          { q: 2, r: 0, op: 'PORTAL', isEnd: true },
          
          { q: -1, r: 1, op: '-15' },
          { q: 0, r: 1, op: '×3' },
          { q: 1, r: -1, op: '+4' },
          { q: 0, r: -1, op: '/3' },
          { q: -1, r: -1, op: '-5' }
        ]
      }
    ];

    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Bind Keyboard event listeners for sliding along 6 axes
    window.addEventListener('keydown', (e) => this.handleKeyPress(e));
    
    this.loop();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
  }

  // Load and instantiate level layout on the hexagonal coordinate system
  loadLevel(levelIdx) {
    this.activeLevelIdx = levelIdx;
    const lvl = this.levels[levelIdx];
    this.grid.clear();
    
    this.startVal = lvl.startVal;
    this.currentVal = lvl.startVal;
    this.targetVal = lvl.targetVal;
    this.startNode = { ...lvl.startPos };
    this.endNode = { ...lvl.endPos };
    this.currentNode = { ...lvl.startPos };
    
    this.pathHistory = [{ ...this.currentNode, val: this.currentVal }];
    this.isSolved = false;

    // Load hex nodes into fast lookup coordinate Map
    lvl.nodes.forEach((n) => {
      const key = `${n.q},${n.r}`;
      this.grid.set(key, {
        q: n.q,
        r: n.r,
        op: n.op,
        isStart: n.isStart || false,
        isEnd: n.isEnd || false,
        // Pixel coordinates (will calculate in draw step)
        x: 0,
        y: 0,
        pulseGlow: 0
      });
    });

    this.updateUI();
  }

  // Slide core along 1 of 6 directions
  moveDirection(dir) {
    if (this.isSolved) return;
    
    const offset = this.axesDirections[dir];
    if (!offset) return;

    const nextQ = this.currentNode.q + offset.q;
    const nextR = this.currentNode.r + offset.r;
    const key = `${nextQ},${nextR}`;

    if (this.grid.has(key)) {
      const targetNode = this.grid.get(key);
      
      // Calculate mathematical result when traversing hex
      const lastVal = this.currentVal;
      this.currentVal = this.calculateOperation(this.currentVal, targetNode.op);
      
      this.currentNode = { q: nextQ, r: nextR };
      this.pathHistory.push({ ...this.currentNode, val: this.currentVal });
      
      targetNode.pulseGlow = 1.0;
      this.pulseScale = 1.2;

      // Play Swoosh slide sound effect
      if (window.sfx) window.sfx.playSwoosh();

      // Spawn trail sliding sparks
      this.spawnSparks(targetNode);

      // Check if finished puzzle
      this.checkPuzzleState();
      this.updateUI();
    }
  }

  calculateOperation(curr, opText) {
    if (opText.includes('START') || opText === 'PORTAL') return curr;
    
    // Clean string formats: +5, -3, ×4, ÷2, *2, /2
    const cleanOp = opText.replace(/\s+/g, '');
    const op = cleanOp.charAt(0);
    const val = parseFloat(cleanOp.slice(1));

    if (isNaN(val)) return curr;

    switch (op) {
      case '+': return curr + val;
      case '-': return curr - val;
      case '×':
      case '*': return curr * val;
      case '÷':
      case '/': return val !== 0 ? Math.floor(curr / val) : curr;
      default: return curr;
    }
  }

  resetCurrentLevel() {
    this.loadLevel(this.activeLevelIdx);
  }

  checkPuzzleState() {
    const isAtEnd = this.currentNode.q === this.endNode.q && this.currentNode.r === this.endNode.r;
    
    if (isAtEnd) {
      if (this.currentVal === this.targetVal) {
        this.isSolved = true;
        if (window.sfx) window.sfx.playSuccess();
        
        // Broadcast solver finish to app.js
        const event = new CustomEvent('hexPuzzleSolved', {
          detail: { level: this.activeLevelIdx + 1, xp: 150 }
        });
        window.dispatchEvent(event);
      } else {
        // Shakes screen or buzzes to let them know target didn't match
        if (window.sfx) window.sfx.playFailure();
      }
    }
  }

  handleKeyPress(e) {
    // Standard keyboard control bindings mapping arrow keys or typical layout to the hex grid directions
    if (document.activeElement.tagName === 'INPUT') return; // skip if writing in math gym input
    
    switch (e.key) {
      // Hexagonal navigation keyboard mapping:
      // Q (NW)  W (NE)
      // A (W)   D (E)
      // Z (SW)  X (SE)
      case 'q':
      case 'Q':
        this.moveDirection('nw');
        break;
      case 'w':
      case 'W':
        this.moveDirection('ne');
        break;
      case 'a':
      case 'A':
      case 'ArrowLeft':
        this.moveDirection('w');
        break;
      case 'd':
      case 'D':
      case 'ArrowRight':
        this.moveDirection('e');
        break;
      case 'z':
      case 'Z':
        this.moveDirection('sw');
        break;
      case 'x':
      case 'X':
        this.moveDirection('se');
        break;
    }
  }

  spawnSparks(targetNode) {
    // Calculate pixel center for this node
    const pos = this.hexToPixel(targetNode.q, targetNode.r);
    for (let i = 0; i < 15; i++) {
      const ang = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 3.5;
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        alpha: 1.0,
        size: 1.5 + Math.random() * 2,
        color: '#ff2a85'
      });
    }
  }

  updateUI() {
    const lblTarget = document.getElementById('val-puzzle-target');
    const lblCurrent = document.getElementById('val-puzzle-current');
    
    if (lblTarget) lblTarget.innerText = this.targetVal;
    if (lblCurrent) {
      lblCurrent.innerText = `Current: ${this.currentVal}`;
      if (this.currentVal === this.targetVal) {
        lblCurrent.className = "current-value text-glow-cyan";
      } else {
        lblCurrent.className = "current-value";
      }
    }
  }

  // Hex coordinates projection formula
  hexToPixel(q, r) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Flat-topped hexagonal projection formulas
    const x = centerX + this.hexRadius * (3/2 * q);
    const y = centerY + this.hexRadius * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    
    return { x, y };
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    if (!this.canvas) return;

    this.coreAngle += 0.04;
    
    if (this.pulseScale > 1) {
      this.pulseScale -= 0.02;
    } else {
      this.pulseScale = 1;
    }

    // Update nodes glow decays
    this.grid.forEach((node) => {
      if (node.pulseGlow > 0) {
        node.pulseGlow -= 0.02;
      } else {
        node.pulseGlow = 0;
      }
    });

    // Update trail particles
    this.particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;
      if (p.alpha <= 0) {
        this.particles.splice(idx, 1);
      }
    });
  }

  draw() {
    if (!this.canvas) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw background mesh grids
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.01)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    // 1. Draw Paths Traversed
    if (this.pathHistory.length > 1) {
      this.ctx.strokeStyle = 'rgba(255, 42, 133, 0.5)';
      this.ctx.lineWidth = 6;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      this.ctx.shadowColor = '#ff2a85';
      this.ctx.shadowBlur = 10;
      
      this.ctx.beginPath();
      const firstPos = this.hexToPixel(this.pathHistory[0].q, this.pathHistory[0].r);
      this.ctx.moveTo(firstPos.x, firstPos.y);
      
      for (let i = 1; i < this.pathHistory.length; i++) {
        const nextPos = this.hexToPixel(this.pathHistory[i].q, this.pathHistory[i].r);
        this.ctx.lineTo(nextPos.x, nextPos.y);
      }
      this.ctx.stroke();
      this.ctx.shadowBlur = 0; // reset shadow
    }

    // 2. Draw Hex Tiles
    this.grid.forEach((node) => {
      const pos = this.hexToPixel(node.q, node.r);
      node.x = pos.x;
      node.y = pos.y;
      
      this.drawHexagon(node);
    });

    // 3. Draw Sparks
    this.particles.forEach((p) => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // 4. Draw Core Active Player Ring
    const currPos = this.hexToPixel(this.currentNode.q, this.currentNode.r);
    this.drawEnergyCore(currPos.x, currPos.y);
  }

  // Draws outline + operator labels inside hex cells
  drawHexagon(node) {
    const radius = this.hexRadius - 2;
    this.ctx.save();
    
    // Draw polygon paths
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i; // flat-topped hex angles
      const x = node.x + radius * Math.cos(angle);
      const y = node.y + radius * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();

    // Soft core color fill
    if (node.isStart) {
      this.ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
      this.ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 + node.pulseGlow * 0.7})`;
      this.ctx.lineWidth = 2;
    } else if (node.isEnd) {
      this.ctx.fillStyle = 'rgba(171, 38, 255, 0.05)';
      this.ctx.strokeStyle = `rgba(171, 38, 255, ${0.3 + node.pulseGlow * 0.7})`;
      this.ctx.lineWidth = 2;
    } else {
      this.ctx.fillStyle = 'rgba(13, 17, 39, 0.6)';
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + node.pulseGlow * 0.5})`;
      this.ctx.lineWidth = 1;
    }

    if (node.pulseGlow > 0) {
      this.ctx.shadowColor = node.isEnd ? '#ab26ff' : '#00f0ff';
      this.ctx.shadowBlur = node.pulseGlow * 15;
    }

    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.shadowBlur = 0; // Reset shadow

    // Draw Operator Code Symbols inside hex
    this.ctx.font = 'bold 12px "Fira Code", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    if (node.isStart) {
      this.ctx.fillStyle = 'var(--accent-cyan)';
      this.ctx.fillText("START", node.x, node.y - 6);
      this.ctx.font = '10px Outfit';
      this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
      this.ctx.fillText(`(${this.startVal})`, node.x, node.y + 8);
    } else if (node.isEnd) {
      this.ctx.fillStyle = 'var(--accent-purple)';
      this.ctx.fillText("PORTAL", node.x, node.y);
    } else {
      // Arithmetic text highlights
      if (node.op.startsWith('+')) this.ctx.fillStyle = 'var(--accent-cyan)';
      else if (node.op.startsWith('-')) this.ctx.fillStyle = 'var(--accent-pink)';
      else if (node.op.startsWith('×') || node.op.startsWith('*')) this.ctx.fillStyle = 'var(--accent-amber)';
      else if (node.op.startsWith('÷') || node.op.startsWith('/')) this.ctx.fillStyle = 'var(--accent-green)';
      else this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
      
      this.ctx.fillText(node.op, node.x, node.y);
    }

    this.ctx.restore();
  }

  // Draw ultimate orbiting ring player core
  drawEnergyCore(x, y) {
    const size = 18 * this.pulseScale;
    
    this.ctx.save();
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 12;
    
    // Glowing central core sphere
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 6, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Rotating outer ring
    this.ctx.shadowBlur = 0; // reset
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, this.coreAngle, this.coreAngle + Math.PI * 1.5);
    this.ctx.stroke();

    // Orbital electron satellite
    const satX = x + size * Math.cos(this.coreAngle * 1.8);
    const satY = y + size * Math.sin(this.coreAngle * 1.8);
    this.ctx.fillStyle = '#ff2a85';
    this.ctx.beginPath();
    this.ctx.arc(satX, satY, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }
}

// Bind to window for app.js linking
window.HexGridPuzzle = HexGridPuzzle;
