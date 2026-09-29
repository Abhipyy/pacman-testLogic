window.CustomFunctions = {
    gameCoordinator: null,
    speedPersist: true,
    currentSpeed: 1,
    sleepGhost: false,
    ghostHit: true,
    unlimitedLives: false,
    ghostTouches: 0,
    killCount: 0,
    _showGhostTouchPref: true,

    ghostSettings: {
        blinky: { enabled: true, speed: 1 },
        pinky: { enabled: true, speed: 1 },
        inky: { enabled: true, speed: 1 },
        clyde: { enabled: true, speed: 1 }
    },

    init(gameCoordinator) {
        this.gameCoordinator = gameCoordinator;
        this.bindMenuEvents();
        this.updateGhostTouchDisplay();
        this.updateGhostTouchVisibility();
    },

    bindMenuEvents() {
        const menuToggle = document.getElementById('menu-toggle');
        const menuDropdown = document.getElementById('menu-dropdown');
        const ghostToggle = document.getElementById('menu-ghost-toggle');
        const headerGhostToggle = document.getElementById('ghost-toggle');
        const sleepGhostToggle = document.getElementById('menu-sleep-ghost');
        const speedBtns = document.querySelectorAll('.speed-btn');
        const speedInput = document.getElementById('speed-input');
        const speedPersist = document.getElementById('speed-persist');
        const showFps = document.getElementById('show-fps');
        const showHitboxes = document.getElementById('show-hitboxes');
        const showGhostTouch = document.getElementById('show-ghost-touch');
        const resetButton = document.getElementById('reset-button');
        const ghostEnables = document.querySelectorAll('.ghost-enable');
        const ghostSpeedInputs = document.querySelectorAll('.ghost-speed-input');
        const stepButtons = document.querySelectorAll('.step-btn');

        // Toggle dropdown
        menuToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            menuToggle.classList.toggle('active');
            menuDropdown.classList.toggle('open');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!menuDropdown.contains(e.target) && !menuToggle.contains(e.target)) {
                menuToggle.classList.remove('active');
                menuDropdown.classList.remove('open');
            }
        });

        menuDropdown?.addEventListener('click', (e) => e.stopPropagation());

        // Sync ghost toggles
        const syncGhostToggle = (enabled) => {
            if (ghostToggle) ghostToggle.checked = enabled;
            if (headerGhostToggle) headerGhostToggle.checked = enabled;
            this.setGhostsEnabled(enabled);
        };

        ghostToggle?.addEventListener('change', (e) => syncGhostToggle(e.target.checked));
        headerGhostToggle?.addEventListener('change', (e) => syncGhostToggle(e.target.checked));

        sleepGhostToggle?.addEventListener('change', (e) => {
            this.sleepGhost = !e.target.checked;
            console.log(`Sleep Ghost: ${this.sleepGhost ? 'ON (pellets disabled)' : 'OFF (pellets work)'}`);
        });

        const ghostHitToggle = document.getElementById('menu-ghost-hit');
        ghostHitToggle?.addEventListener('change', (e) => {
            this.ghostHit = e.target.checked;
            console.log(`Ghost Hit: ${this.ghostHit ? 'ON (ghosts can kill)' : 'OFF (ghosts follow only)'}`);
            this.updateGhostTouchVisibility();
        });

        const unlimitedLivesToggle = document.getElementById('menu-unlimited-lives');
        unlimitedLivesToggle?.addEventListener('change', (e) => {
            this.unlimitedLives = e.target.checked;
            console.log(`Unlimited Lives: ${this.unlimitedLives ? 'ON' : 'OFF'}`);
            if (this.gameCoordinator) {
                this.gameCoordinator.lives = this.unlimitedLives ? 999 : 2;
                this.gameCoordinator.updateExtraLivesDisplay();
            }
            this.updateGhostTouchVisibility();
        });

        ghostEnables.forEach(input => {
            input.addEventListener('change', (e) => {
                const ghostName = e.target.dataset.ghost;
                this.setGhostEnabled(ghostName, e.target.checked);
            });
        });

        // ---- Ghost speed inputs ----
        ghostSpeedInputs.forEach(input => {
            const handler = (e) => {
                const ghostName = e.target.dataset.ghost;
                const speed = parseFloat(e.target.value);
                if (speed >= 0.1 && speed <= 2) {
                    this.setGhostSpeed(ghostName, speed);
                }
            };
            input.addEventListener('change', handler);
            input.addEventListener('input', handler);
        });

        // ---- Pacman speed presets ----
        speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = parseFloat(btn.dataset.speed);
                this.setPacmanSpeed(speed);
                if (speedInput) speedInput.value = speed;
                speedBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // ---- Pacman speed input ----
        const speedHandler = () => {
            const speed = parseFloat(speedInput.value);
            if (speed >= 0.1 && speed <= 2) {
                this.setPacmanSpeed(speed);
                speedBtns.forEach(b => b.classList.remove('active'));
                const match = document.querySelector(`.speed-btn[data-speed="${speed}"]`);
                if (match) match.classList.add('active');
            }
        };
        speedInput?.addEventListener('change', speedHandler);
        speedInput?.addEventListener('input', speedHandler);

        // ---- Step buttons (+ / −) ----
        stepButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const target = btn.dataset.target;
                const dir = parseFloat(btn.dataset.dir);
                const step = 0.1;

                let input;
                if (target === 'speed') {
                    input = document.getElementById('speed-input');
                } else {
                    input = document.querySelector(`.ghost-speed-input[data-ghost="${target}"]`);
                }
                if (!input) return;

                let val = parseFloat(input.value) || 1;
                val = Math.round((val + dir * step) * 10) / 10;
                val = Math.max(0.1, Math.min(2, val));
                input.value = val.toFixed(1);

                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });

        speedPersist?.addEventListener('change', (e) => {
            this.speedPersist = e.target.checked;
        });

        showFps?.addEventListener('change', (e) => {
            const fpsDisplay = document.getElementById('fps-display');
            if (fpsDisplay) {
                fpsDisplay.classList.toggle('hidden', !e.target.checked);
            }
        });

        showHitboxes?.addEventListener('change', (e) => {
            this.toggleHitboxes(e.target.checked);
        });

        showGhostTouch?.addEventListener('change', (e) => {
            this.toggleGhostTouchDisplay(e.target.checked);
        });

        resetButton?.addEventListener('click', () => {
            this.resetGame();
        });
    },

    /* ============================================
       TOUCH / KILL COUNTER
       ============================================ */

    /**
     * Called by Ghost.checkCollision when the ghost would hit Pacman.
     * In normal mode (Ghost Hit OFF) → counts as a touch.
     * In Unlimited Lives mode → counts as a kill.
     */
    registerGhostTouch() {
        if (this.unlimitedLives) {
            // Unlimited mode: count as a kill
            this.killCount += 1;
            this.updateGhostTouchDisplay();
        } else if (!this.ghostHit) {
            // Ghost Hit OFF: count as a touch
            this.ghostTouches += 1;
            this.updateGhostTouchDisplay();
        }
    },

    resetGhostTouches() {
        this.ghostTouches = 0;
        this.killCount = 0;
        this.updateGhostTouchDisplay();
    },

    updateGhostTouchDisplay() {
        const label = document.getElementById('ghost-touch-label');
        const display = document.getElementById('ghost-touch-display');
        const unlimited = this.unlimitedLives;

        if (unlimited) {
            if (label) {
                label.textContent = 'KILLS';
                label.classList.add('kill-count');
            }
            if (display) {
                display.textContent = this.killCount;
                display.classList.add('kill-count');
            }
        } else {
            if (label) {
                label.textContent = 'GHOST TOUCHES';
                label.classList.remove('kill-count');
            }
            if (display) {
                display.textContent = this.ghostTouches;
                display.classList.remove('kill-count');
            }
        }
    },

    toggleGhostTouchDisplay(show) {
        this._showGhostTouchPref = !!show;
        this.updateGhostTouchVisibility();
    },

    updateGhostTouchVisibility() {
        const label = document.getElementById('ghost-touch-label');
        const display = document.getElementById('ghost-touch-display');
        const pref = this._showGhostTouchPref;

        // Visible when:
        //   - Unlimited Lives is ON (shows KILLS), OR
        //   - Ghost Hit is OFF (shows GHOST TOUCHES)
        const shouldShow = pref && (this.unlimitedLives || !this.ghostHit);
        const visible = shouldShow ? '' : 'none';

        if (label) label.style.display = visible;
        if (display) display.style.display = visible;

        // Also refresh the label/value text in case mode changed
        this.updateGhostTouchDisplay();
    },

    setGhostsEnabled(enabled) {
        if (this.gameCoordinator && this.gameCoordinator.setGhostsEnabled) {
            this.gameCoordinator.setGhostsEnabled(enabled);
        }
        Object.keys(this.ghostSettings).forEach(name => {
            this.ghostSettings[name].enabled = enabled;
            const input = document.querySelector(`.ghost-enable[data-ghost="${name}"]`);
            if (input) input.checked = enabled;
        });
    },

    setGhostEnabled(name, enabled) {
        this.ghostSettings[name].enabled = enabled;
        this.applyGhostSettings();
    },

    setGhostSpeed(name, speed) {
        this.ghostSettings[name].speed = speed;
        this.applyGhostSettings();
    },

    applyGhostSettings() {
        if (!this.gameCoordinator) return;

        const ghostMap = {
            blinky: this.gameCoordinator.blinky,
            pinky: this.gameCoordinator.pinky,
            inky: this.gameCoordinator.inky,
            clyde: this.gameCoordinator.clyde
        };

        Object.entries(this.ghostSettings).forEach(([name, settings]) => {
            const ghost = ghostMap[name];
            if (ghost) {
                ghost.disabled = !settings.enabled;

                if (settings.enabled) {
                    ghost.display = true;
                    ghost.animationTarget.style.visibility = ghost.display ? 'visible' : 'hidden';
                    ghost.moving = true;
                    if (ghost.idleMode === 'idle') {
                        ghost.idleMode = 'idle';
                    }
                } else {
                    ghost.display = false;
                    ghost.animationTarget.style.visibility = 'hidden';
                    ghost.moving = false;
                }

                const multiplier = settings.speed;
                if (!ghost.baseSpeedMultiplier) {
                    ghost.baseSpeedMultiplier = 1;
                }

                const ratio = multiplier / ghost.baseSpeedMultiplier;

                ghost.slowSpeed *= ratio;
                ghost.mediumSpeed *= ratio;
                ghost.fastSpeed *= ratio;
                ghost.scaredSpeed *= ratio;
                ghost.transitionSpeed *= ratio;
                ghost.eyeSpeed *= ratio;

                if (ghost.defaultSpeed === ghost.slowSpeed / ratio) {
                    ghost.defaultSpeed = ghost.slowSpeed;
                } else if (ghost.defaultSpeed === ghost.mediumSpeed / ratio) {
                    ghost.defaultSpeed = ghost.mediumSpeed;
                } else if (ghost.defaultSpeed === ghost.fastSpeed / ratio) {
                    ghost.defaultSpeed = ghost.fastSpeed;
                }

                ghost.baseSpeedMultiplier = multiplier;

                if (ghost.mode !== 'eyes' && ghost.mode !== 'scared') {
                    ghost.speed = ghost.defaultSpeed;
                }
            }
        });

        if (this.gameCoordinator.idleGhosts) {
            this.gameCoordinator.idleGhosts = this.gameCoordinator.ghosts.filter(g =>
                g.name !== 'blinky' && this.ghostSettings[g.name]?.enabled
            );
        }
    },

    toggleGhosts() {
        const toggle = document.getElementById('ghost-toggle');
        if (toggle) {
            this.setGhostsEnabled(!toggle.checked);
        }
    },

    setPacmanSpeed(multiplier) {
        if (this.gameCoordinator && this.gameCoordinator.pacman) {
            const pacman = this.gameCoordinator.pacman;
            if (!pacman.baseVelocityPerMs) {
                pacman.baseVelocityPerMs = pacman.velocityPerMs;
            }
            pacman.velocityPerMs = pacman.baseVelocityPerMs * multiplier;
            this.currentSpeed = multiplier;
            console.log(`Pacman speed set to ${multiplier}x`);
        }
    },

    getPacmanSpeed() {
        if (this.gameCoordinator && this.gameCoordinator.pacman) {
            return this.gameCoordinator.pacman.velocityPerMs;
        }
        return 1;
    },

    resetPacmanSpeed() {
        if (this.gameCoordinator && this.gameCoordinator.pacman) {
            const pacman = this.gameCoordinator.pacman;
            if (pacman.baseVelocityPerMs) {
                pacman.velocityPerMs = pacman.baseVelocityPerMs;
                this.currentSpeed = 1;
                console.log('Pacman speed reset to normal');
            }
        }
    },

    toggleHitboxes(enabled) {
        if (this.gameCoordinator) {
            this.gameCoordinator.showHitboxes = enabled;
            const entities = [this.gameCoordinator.pacman, ...this.gameCoordinator.ghosts];
            entities.forEach(entity => {
                if (entity && entity.animationTarget) {
                    entity.animationTarget.style.outline = enabled ? '2px solid #ff0' : 'none';
                }
            });
        }
    },

    resetGame() {
        if (this.gameCoordinator) {
            this.resetGhostSettingsToDefault();
            this.resetGhostTouches();
            this.gameCoordinator.reset();
            this.gameCoordinator.startGameplay(true);
            console.log('Game reset');
        }
    },

    resetGhostSettingsToDefault() {
        Object.keys(this.ghostSettings).forEach(name => {
            this.ghostSettings[name].enabled = true;
            this.ghostSettings[name].speed = 1;
            const enableInput = document.querySelector(`.ghost-enable[data-ghost="${name}"]`);
            const speedInput = document.querySelector(`.ghost-speed-input[data-ghost="${name}"]`);
            if (enableInput) enableInput.checked = true;
            if (speedInput) speedInput.value = '1.0';
        });

        const ghostToggle = document.getElementById('menu-ghost-toggle');
        const headerGhostToggle = document.getElementById('ghost-toggle');
        if (ghostToggle) ghostToggle.checked = true;
        if (headerGhostToggle) headerGhostToggle.checked = true;

        const sleepGhostToggle = document.getElementById('menu-sleep-ghost');
        if (sleepGhostToggle) {
            sleepGhostToggle.checked = true;
            this.sleepGhost = false;
        }

        const ghostHitToggle = document.getElementById('menu-ghost-hit');
        if (ghostHitToggle) {
            ghostHitToggle.checked = true;
            this.ghostHit = true;
        }

        const unlimitedLivesToggle = document.getElementById('menu-unlimited-lives');
        if (unlimitedLivesToggle) {
            unlimitedLivesToggle.checked = false;
            this.unlimitedLives = false;
        }

        if (this.gameCoordinator) {
            const ghostMap = {
                blinky: this.gameCoordinator.blinky,
                pinky: this.gameCoordinator.pinky,
                inky: this.gameCoordinator.inky,
                clyde: this.gameCoordinator.clyde
            };
            Object.values(ghostMap).forEach(ghost => {
                if (ghost) {
                    ghost.baseSpeedMultiplier = 1;
                }
            });
        }

        this.applyGhostSettings();
        this.updateGhostTouchVisibility();
    },

    isSleepGhostEnabled() {
        return this.sleepGhost;
    },

    isGhostHitEnabled() {
        return this.ghostHit;
    },

    isUnlimitedLivesEnabled() {
        return this.unlimitedLives;
    }
};