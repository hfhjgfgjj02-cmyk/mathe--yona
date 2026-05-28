/* ==========================================================================
   HEXAMATH QUEST — EQUATION CONCEPTUAL VISUALIZER
   ========================================================================== */

class MathVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.width = 0;
    this.height = 0;
    
    this.particles = [];
    this.containers = [];
    this.gridNodes = [];
    this.beams = [];
    
    this.operation = 'add'; // 'add', 'sub', 'mul', 'div'
    this.num1 = 5;
    this.num2 = 3;
    
    this.animTime = 0;
    this.state = 'idle'; // 'idle', 'animating', 'success'
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.loop();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    
    // Set internal resolution matching display
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    this.resetLayout();
  }

  setProblem(operation, num1, num2) {
    this.operation = operation;
    this.num1 = parseInt(num1) || 0;
    this.num2 = parseInt(num2) || 0;
    this.animTime = 0;
    this.state = 'animating';
    
    this.resetLayout();
  }

  resetLayout() {
    this.particles = [];
    this.containers = [];
    this.gridNodes = [];
    this.beams = [];
    
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    switch (this.operation) {
      case 'add': {
        // Group A: Left side (Cyan)
        const leftX = this.width * 0.25;
        this.createParticleGroup(this.num1, leftX, centerY, '#00f0ff');
        
        // Group B: Right side (Pink)
        const rightX = this.width * 0.75;
        this.createParticleGroup(this.num2, rightX, centerY, '#ff2a85', this.num1);
        break;
      }
      
      case 'sub': {
        // Total Group A (Purple)
        this.createParticleGroup(this.num1, centerX, centerY, '#ab26ff');
        
        // Target Group B for disintegration (mark particles from the end)
        const toRemoveCount = Math.min(this.num2, this.num1);
        for (let i = 0; i < toRemoveCount; i++) {
          const pIdx = this.particles.length - 1 - i;
          if (pIdx >= 0) {
            this.particles[pIdx].targetForLaser = true;
          }
        }
        break;
      }
      
      case 'mul': {
        // Grid layout for A rows, B columns (Amber)
        const rows = this.num1;
        const cols = this.num2;
        
        // Auto scale grid nodes to fit inside container
        const maxGridWidth = this.width * 0.7;
        const maxGridHeight = this.height * 0.7;
        const spacingX = Math.min(45, maxGridWidth / (cols + 1));
        const spacingY = Math.min(45, maxGridHeight / (rows + 1));
        
        const startX = centerX - ((cols - 1) * spacingX) / 2;
        const startY = centerY - ((rows - 1) * spacingY) / 2;
        
        let id = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            this.gridNodes.push({
              id: id++,
              r: r,
              c: c,
              x: startX + c * spacingX,
              y: startY + r * spacingY,
              targetX: startX + c * spacingX,
              targetY: startY + r * spacingY,
              color: '#ffaa00',
              glow: 0,
              size: 5
            });
          }
        }
        break;
      }
      
      case 'div': {
        // Total particles A (Green) in upper half
        this.createParticleGroup(this.num1, centerX, this.height * 0.25, '#39ff14');
        
        // B target orbit containers at the bottom
        const countB = this.num2 || 1;
        const spacing = Math.min(100, (this.width * 0.8) / countB);
        const startX = centerX - ((countB - 1) * spacing) / 2;
        
        for (let i = 0; i < countB; i++) {
          this.containers.push({
            id: i,
            x: startX + i * spacing,
            y: this.height * 0.75,
            radius: 30,
            color: '#39ff14',
            itemCount: 0
          });
        }
        
        // Designate where each particle should drop
        const quotient = Math.floor(this.num1 / countB);
        const remainder = this.num1 % countB;
        
        let assignedCount = 0;
        
        // Assign quotient equally
        this.containers.forEach((c) => {
          for (let q = 0; q < quotient; q++) {
            if (assignedCount < this.particles.length) {
              this.particles[assignedCount].assignedContainer = c.id;
              this.particles[assignedCount].containerIndex = q;
              assignedCount++;
            }
          }
        });
        
        // Mark remainder particles (they float around center)
        for (let r = 0; r < remainder; r++) {
          if (assignedCount < this.particles.length) {
            this.particles[assignedCount].isRemainder = true;
            this.particles[assignedCount].remainderIdx = r;
            assignedCount++;
          }
        }
        break;
      }
    }
  }

  // Generate pack of circles neatly grouped
  createParticleGroup(count, x, y, color, startId = 0) {
    if (count <= 0) return;
    
    // Golden ratio layout spiraling outwards
    const c = 22; // spacing constant
    for (let i = 0; i < count; i++) {
      const theta = i * 2.39996; // Golden angle in radians
      const r = c * Math.sqrt(i + 1);
      
      const px = x + r * Math.cos(theta);
      const py = y + r * Math.sin(theta);
      
      this.particles.push({
        id: startId + i,
        startX: px,
        startY: py,
        x: px,
        y: py,
        color: color,
        vx: 0,
        vy: 0,
        size: 7,
        alpha: 1,
        // Addition animation variables
        merged: false,
        // Subtraction animation variables
        targetForLaser: false,
        dissolving: false,
        dissolved: false,
        sparks: [],
        // Division variables
        assignedContainer: -1,
        containerIndex: 0,
        isRemainder: false
      });
    }
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    if (!this.canvas) return;
    this.animTime += 0.016; // increment approximate time

    switch (this.operation) {
      case 'add':
        this.updateAddition();
        break;
      case 'sub':
        this.updateSubtraction();
        break;
      case 'mul':
        this.updateMultiplication();
        break;
      case 'div':
        this.updateDivision();
        break;
    }
  }

  updateAddition() {
    const duration = 2.0; // animation length in seconds
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    this.particles.forEach((p) => {
      if (this.animTime < 0.6) {
        // Pulse in starting spots
        const pulse = 1 + 0.05 * Math.sin(this.animTime * 15 + p.id);
        p.x = p.startX;
        p.y = p.startY;
        p.size = 7 * pulse;
      } else if (this.animTime >= 0.6 && this.animTime < 1.4) {
        // Move towards the center to merge
        const t = (this.animTime - 0.6) / 0.8;
        const ease = t * t * (3 - 2 * t); // smoothstep
        
        // Target center layout spiraling
        const c = 22;
        const theta = p.id * 2.39996;
        const r = c * Math.sqrt(p.id + 1);
        const targetX = centerX + r * Math.cos(theta);
        const targetY = centerY + r * Math.sin(theta);
        
        p.x = p.startX + (targetX - p.startX) * ease;
        p.y = p.startY + (targetY - p.startY) * ease;
      } else {
        // Form final merged circle with dynamic glowing pulse
        const pulse = 1 + 0.06 * Math.sin((this.animTime - 1.4) * 5 + p.id);
        const c = 22;
        const theta = p.id * 2.39996;
        const r = c * Math.sqrt(p.id + 1);
        p.x = centerX + r * Math.cos(theta);
        p.y = centerY + r * Math.sin(theta);
        p.size = 7 * pulse;
        p.merged = true;
      }
    });
  }

  updateSubtraction() {
    this.particles.forEach((p) => {
      // 1. Initial breathing state
      if (this.animTime < 0.8) {
        const pulse = 1 + 0.05 * Math.sin(this.animTime * 10 + p.id);
        p.size = 7 * pulse;
      }
      // 2. Aim laser beams at targeted particles
      else if (this.animTime >= 0.8 && this.animTime < 1.4) {
        if (p.targetForLaser) {
          p.size = 7 + 2 * Math.sin((this.animTime - 0.8) * 30);
          p.color = '#ff2a85'; // turn warning pink
        }
      }
      // 3. Vaporize targeted particles
      else if (this.animTime >= 1.4 && this.animTime < 2.0) {
        if (p.targetForLaser && !p.dissolved) {
          p.dissolving = true;
          // Generate sparks
          if (p.sparks.length === 0) {
            for (let s = 0; s < 8; s++) {
              const ang = Math.random() * Math.PI * 2;
              const speed = 1.5 + Math.random() * 3;
              p.sparks.push({
                x: p.x,
                y: p.y,
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                alpha: 1,
                size: 2 + Math.random() * 3
              });
            }
          }
          
          // Animate sparks expanding outwards
          p.sparks.forEach((spk) => {
            spk.x += spk.vx;
            spk.y += spk.vy;
            spk.alpha -= 0.04;
          });
          
          p.alpha -= 0.1;
          if (p.alpha <= 0) {
            p.alpha = 0;
            p.dissolving = false;
            p.dissolved = true;
          }
        }
      }
    });
  }

  updateMultiplication() {
    // Reveal grid columns and rows over time
    const revealDuration = 1.5;
    const activeIndex = Math.min(
      this.gridNodes.length - 1,
      Math.floor((this.animTime / revealDuration) * this.gridNodes.length)
    );
    
    this.gridNodes.forEach((node, idx) => {
      if (idx <= activeIndex) {
        node.glow = Math.min(1, node.glow + 0.08);
        const pulse = 1 + 0.1 * Math.sin(this.animTime * 8 + node.r);
        node.size = 8 * pulse * node.glow;
      } else {
        node.glow = 0;
        node.size = 0;
      }
    });
  }

  updateDivision() {
    const dropStart = 0.8;
    const dropDuration = 1.5;
    
    this.particles.forEach((p) => {
      if (this.animTime < dropStart) {
        // Idle float at top
        p.x = p.startX + 2 * Math.sin(this.animTime * 5 + p.id);
        p.y = p.startY + 2 * Math.cos(this.animTime * 4 + p.id);
      } else if (p.assignedContainer !== -1) {
        // Slide particles into designated containers
        const timeOffset = p.id * 0.05;
        const progress = Math.max(0, Math.min(1, (this.animTime - dropStart - timeOffset) / 0.8));
        
        const container = this.containers[p.assignedContainer];
        
        // Spread item neatly in container circular orbit
        const containerRadius = 15;
        const theta = p.containerIndex * (Math.PI * 2 / Math.max(1, Math.floor(this.num1 / this.containers.length)));
        const targetX = container.x + containerRadius * Math.cos(theta);
        const targetY = container.y + containerRadius * Math.sin(theta);
        
        const ease = progress * progress * (3 - 2 * progress);
        p.x = p.startX + (targetX - p.startX) * ease;
        p.y = p.startY + (targetY - p.startY) * ease;
        
        if (progress >= 1) {
          container.glowPulse = 1;
        }
      } else if (p.isRemainder) {
        // Particles that form the remainder vibrate in the middle
        const progress = Math.max(0, Math.min(1, (this.animTime - dropStart) / 0.8));
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Golden angle spiral in the middle
        const c = 18;
        const theta = p.remainderIdx * 2.39996 + this.animTime * 1.5;
        const r = c * Math.sqrt(p.remainderIdx + 1);
        const targetX = centerX + r * Math.cos(theta);
        const targetY = centerY + r * Math.sin(theta);
        
        const ease = progress * progress * (3 - 2 * progress);
        p.x = p.startX + (targetX - p.startX) * ease;
        p.y = p.startY + (targetY - p.startY) * ease;
        p.color = '#ffaa00'; // Make remainder particles amber warning
        
        // Buzz remainder items slightly
        p.x += (Math.random() - 0.5) * 1.5;
        p.y += (Math.random() - 0.5) * 1.5;
      }
    });

    // Animate container scale pulsing when items drop
    this.containers.forEach((c) => {
      if (c.glowPulse > 0) {
        c.glowPulse -= 0.05;
      } else {
        c.glowPulse = 0;
      }
    });
  }

  draw() {
    if (!this.canvas) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Draw subtle grid mesh in background
    this.drawBackgroundGrid();

    // Render by Operation Type
    switch (this.operation) {
      case 'add':
        this.drawAddition();
        break;
      case 'sub':
        this.drawSubtraction();
        break;
      case 'mul':
        this.drawMultiplication();
        break;
      case 'div':
        this.drawDivision();
        break;
    }
  }

  drawBackgroundGrid() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    this.ctx.lineWidth = 1;
    
    const spacing = 30;
    for (let x = 0; x < this.width; x += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y < this.height; y += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  drawAddition() {
    // Draw connecting energy threads if merging
    if (this.animTime >= 0.6 && this.animTime < 1.4) {
      this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.particles.forEach((p) => {
        this.ctx.moveTo(p.startX, p.startY);
        this.ctx.lineTo(p.x, p.y);
      });
      this.ctx.stroke();
    }

    // Draw glowing center energy field once merged
    if (this.animTime >= 1.4) {
      const glowSize = Math.min(100, 30 + this.num1 * 1.5);
      const grad = this.ctx.createRadialGradient(
        this.width/2, this.height/2, 10,
        this.width/2, this.height/2, glowSize
      );
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(this.width/2, this.height/2, glowSize, 0, Math.PI*2);
      this.ctx.fill();
    }

    // Draw standard particles
    this.particles.forEach((p) => {
      this.drawGlowCircle(p.x, p.y, p.size, p.color, p.alpha);
    });
  }

  drawSubtraction() {
    // Draw targeting laser beams
    if (this.animTime >= 0.8 && this.animTime < 1.4) {
      this.particles.forEach((p) => {
        if (p.targetForLaser) {
          this.ctx.strokeStyle = 'rgba(255, 42, 133, 0.35)';
          this.ctx.lineWidth = 1.5;
          this.ctx.beginPath();
          // Draw thin line from top or bottom
          const laserOriginX = p.x + 30 * Math.sin(p.id);
          const laserOriginY = 0;
          this.ctx.moveTo(laserOriginX, laserOriginY);
          this.ctx.lineTo(p.x, p.y);
          this.ctx.stroke();
          
          // Draw mini lock-on bracket
          this.ctx.strokeStyle = 'rgba(255, 42, 133, 0.6)';
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size + 4, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      });
    }

    // Render particles
    this.particles.forEach((p) => {
      if (p.dissolving) {
        p.sparks.forEach((spk) => {
          this.drawGlowCircle(spk.x, spk.y, spk.size, '#ffaa00', spk.alpha);
        });
      }
      
      if (!p.dissolved) {
        this.drawGlowCircle(p.x, p.y, p.size, p.color, p.alpha);
      }
    });
  }

  drawMultiplication() {
    // Render grid connections first (the wireframe structure)
    this.ctx.strokeStyle = 'rgba(255, 170, 0, 0.05)';
    this.ctx.lineWidth = 1;
    
    // Draw row lines
    for (let r = 0; r < this.num1; r++) {
      const nodes = this.gridNodes.filter(n => n.r === r && n.glow > 0);
      if (nodes.length > 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(nodes[0].x, nodes[0].y);
        this.ctx.lineTo(nodes[nodes.length-1].x, nodes[nodes.length-1].y);
        this.ctx.stroke();
      }
    }

    // Draw col lines
    for (let c = 0; c < this.num2; c++) {
      const nodes = this.gridNodes.filter(n => n.c === c && n.glow > 0);
      if (nodes.length > 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(nodes[0].x, nodes[0].y);
        this.ctx.lineTo(nodes[nodes.length-1].x, nodes[nodes.length-1].y);
        this.ctx.stroke();
      }
    }

    // Draw Grid Nodes
    this.gridNodes.forEach((node) => {
      if (node.glow > 0) {
        this.drawGlowCircle(node.x, node.y, node.size, node.color, node.glow);
      }
    });
  }

  drawDivision() {
    // Draw bottom containers
    this.containers.forEach((c) => {
      const isPulse = c.glowPulse || 0;
      
      // Outer ring
      this.ctx.strokeStyle = `rgba(57, 255, 20, ${0.15 + isPulse * 0.45})`;
      this.ctx.lineWidth = 2 + isPulse * 2;
      this.ctx.beginPath();
      this.ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Soft container fills
      this.ctx.fillStyle = `rgba(57, 255, 20, ${0.02 + isPulse * 0.06})`;
      this.ctx.beginPath();
      this.ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Text labels inside containers (how many inside)
      // count how many particles belong to this container
      const countInside = this.particles.filter(p => p.assignedContainer === c.id && this.animTime > 1.2).length;
      if (countInside > 0) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        this.ctx.font = '11px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${countInside}`, c.x, c.y + 4);
      }
    });

    // Draw particles
    this.particles.forEach((p) => {
      this.drawGlowCircle(p.x, p.y, p.size, p.color, p.alpha);
    });

    // Draw electrical sparks linking remainder particles
    if (this.animTime > 1.0) {
      const remainderParticles = this.particles.filter(p => p.isRemainder);
      if (remainderParticles.length > 1) {
        this.ctx.strokeStyle = 'rgba(255, 170, 0, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let i = 0; i < remainderParticles.length - 1; i++) {
          this.ctx.moveTo(remainderParticles[i].x, remainderParticles[i].y);
          this.ctx.lineTo(remainderParticles[i+1].x, remainderParticles[i+1].y);
        }
        this.ctx.stroke();
      }
    }
  }

  // Draw circle with beautiful layered glow (Premium Aesthetic)
  drawGlowCircle(x, y, radius, color, alpha = 1) {
    if (radius <= 0) return;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    
    // 1. Soft Outermost glow
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = radius * 2.2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. High-brightness core
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }
}

// Global visualizer variable hook
window.MathVisualizer = MathVisualizer;
