function getStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

function setStorage(key, val) {
    try {
        localStorage.setItem(key, val);
    } catch (e) {}
}

function absorbEvent_(event) {
    var e = event || window.event;
    e.preventDefault && e.preventDefault();
    e.stopPropagation && e.stopPropagation();
    e.cancelBubble = true;
    e.returnValue = false;
    return false;
}

function preventLongPressMenu(node) {
    node.ontouchstart = absorbEvent_;
    node.ontouchmove = absorbEvent_;
    node.ontouchend = absorbEvent_;
    node.ontouchcancel = absorbEvent_;
}

function isSafari() {
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf('safari') != -1 && 
            ( ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('ipod') > -1 ) ) {
        if (ua.indexOf('chrome') > -1) {

        } else {
            return true;
        }
    }
    return false;
}

class Ghost {
    constructor(
            scaledTileSize, mazeArray, pacman, name, level, characterUtil, blinky,
            ) {
        this.scaledTileSize = scaledTileSize;
        this.mazeArray = mazeArray;
        this.pacman = pacman;
        this.name = name;
        this.level = level;
        this.characterUtil = characterUtil;
        this.blinky = blinky;
        this.animationTarget = document.getElementById(name);

        this.reset();
    }

    /**
     * Rests the character to its default state
     * @param {Boolean} fullGameReset
     */
    reset(fullGameReset) {
        if (fullGameReset) {
            delete this.defaultSpeed;
            delete this.cruiseElroy;
        }

        this._touchLatched = false;

        this.setDefaultMode();
        this.setMovementStats(this.pacman, this.name, this.level);
        this.setSpriteAnimationStats();
        this.setStyleMeasurements(this.scaledTileSize, this.spriteFrames);
        this.setDefaultPosition(this.scaledTileSize, this.name);
        this.setSpriteSheet(this.name, this.direction, this.mode);
    }

    /**
     * Sets the default mode and idleMode behavior
     */
    setDefaultMode() {
        this.allowCollision = true;
        this.defaultMode = 'scatter';
        this.mode = 'scatter';
        if (this.disabled !== true) {
            this.disabled = false;
        }
        if (this.name !== 'blinky') {
            this.idleMode = 'idle';
        }
    }

    /**
     * Sets various properties related to the ghost's movement
     * @param {Object} pacman - Pacman's speed is used as the base for the ghosts' speeds
     * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
     */
    setMovementStats(pacman, name, level) {
        const pacmanSpeed = pacman.velocityPerMs;
        const levelAdjustment = level / 100;

        this.slowSpeed = pacmanSpeed * (0.75 + levelAdjustment);
        this.mediumSpeed = pacmanSpeed * (0.875 + levelAdjustment);
        this.fastSpeed = pacmanSpeed * (1 + levelAdjustment);

        if (!this.defaultSpeed) {
            this.defaultSpeed = this.slowSpeed;
        }

        this.scaredSpeed = pacmanSpeed * 0.5;
        this.transitionSpeed = pacmanSpeed * 0.4;
        this.eyeSpeed = pacmanSpeed * 2;

        this.velocityPerMs = this.defaultSpeed;
        this.moving = false;

        switch (name) {
            case 'blinky':
                this.defaultDirection = this.characterUtil.directions.left;
                break;
            case 'pinky':
                this.defaultDirection = this.characterUtil.directions.down;
                break;
            case 'inky':
                this.defaultDirection = this.characterUtil.directions.up;
                break;
            case 'clyde':
                this.defaultDirection = this.characterUtil.directions.up;
                break;
            default:
                this.defaultDirection = this.characterUtil.directions.left;
                break;
        }
        this.direction = this.defaultDirection;
    }

    /**
     * Sets values pertaining to the ghost's spritesheet animation
     */
    setSpriteAnimationStats() {
        this.display = true;
        this.loopAnimation = true;
        this.animate = true;
        this.msBetweenSprites = 250;
        this.msSinceLastSprite = 0;
        this.spriteFrames = 2;
        this.backgroundOffsetPixels = 0;
        this.animationTarget.style.backgroundPosition = '0px 0px';
    }

    /**
     * Sets css property values for the ghost
     * @param {number} scaledTileSize - The dimensions of a single tile
     * @param {number} spriteFrames - The number of frames in the ghost's spritesheet
     */
    setStyleMeasurements(scaledTileSize, spriteFrames) {
        // The ghosts are the size of 2x2 game tiles.
        this.measurement = scaledTileSize * 2;

        this.animationTarget.style.height = `${this.measurement}px`;
        this.animationTarget.style.width = `${this.measurement}px`;
        const bgSize = this.measurement * spriteFrames;
        this.animationTarget.style.backgroundSize = `${bgSize}px`;
    }

    /**
     * Sets the default position and direction for the ghosts at the game's start
     * @param {number} scaledTileSize - The dimensions of a single tile
     * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
     */
    setDefaultPosition(scaledTileSize, name) {
        switch (name) {
            case 'blinky':
                this.defaultPosition = {
                    top: scaledTileSize * 10.5,
                    left: scaledTileSize * 13,
                };
                break;
            case 'pinky':
                this.defaultPosition = {
                    top: scaledTileSize * 13.5,
                    left: scaledTileSize * 13,
                };
                break;
            case 'inky':
                this.defaultPosition = {
                    top: scaledTileSize * 13.5,
                    left: scaledTileSize * 11,
                };
                break;
            case 'clyde':
                this.defaultPosition = {
                    top: scaledTileSize * 13.5,
                    left: scaledTileSize * 15,
                };
                break;
            default:
                this.defaultPosition = {
                    top: 0,
                    left: 0,
                };
                break;
        }
        this.position = Object.assign({}, this.defaultPosition);
        this.oldPosition = Object.assign({}, this.position);
        this.animationTarget.style.top = `${this.position.top}px`;
        this.animationTarget.style.left = `${this.position.left}px`;
    }

    /**
     * Chooses a movement Spritesheet depending upon direction
     * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
     * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
     * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
     */
    setSpriteSheet(name, direction, mode) {
        let emotion = '';
        if (this.defaultSpeed !== this.slowSpeed) {
            emotion = (this.defaultSpeed === this.mediumSpeed)
                    ? '_annoyed' : '_angry';
        }

        if (mode === 'scared') {
            this.animationTarget.style.backgroundImage = 'url(app/style/graphics/'
                    + `spriteSheets/characters/ghosts/scared_${this.scaredColor}.svg)`;
        } else if (mode === 'eyes') {
            this.animationTarget.style.backgroundImage = 'url(app/style/graphics/'
                    + `spriteSheets/characters/ghosts/eyes_${direction}.svg)`;
        } else {
            this.animationTarget.style.backgroundImage = 'url(app/style/graphics/'
                    + `spriteSheets/characters/ghosts/${name}/${name}_${direction}`
                    + `${emotion}.svg)`;
        }
    }

    isInTunnel(gridPosition) {
        return (
                gridPosition.y === 14
                && (gridPosition.x < 6 || gridPosition.x > 21)
                );
    }

    isInGhostHouse(gridPosition) {
        return (
                (gridPosition.x > 9 && gridPosition.x < 18)
                && (gridPosition.y > 11 && gridPosition.y < 17)
                );
    }

    getTile(mazeArray, y, x) {
        let tile = false;

        if (mazeArray[y] && mazeArray[y][x] && mazeArray[y][x] !== 'X') {
            tile = {
                x,
                y,
            };
        }

        return tile;
    }

    determinePossibleMoves(gridPosition, direction, mazeArray) {
        const {x, y} = gridPosition;

        const possibleMoves = {
            up: this.getTile(mazeArray, y - 1, x),
            down: this.getTile(mazeArray, y + 1, x),
            left: this.getTile(mazeArray, y, x - 1),
            right: this.getTile(mazeArray, y, x + 1),
        };

        possibleMoves[this.characterUtil.getOppositeDirection(direction)] = false;

        Object.keys(possibleMoves).forEach((tile) => {
            if (possibleMoves[tile] === false) {
                delete possibleMoves[tile];
            }
        });

        return possibleMoves;
    }

    calculateDistance(position, pacman) {
        return Math.sqrt(
                ((position.x - pacman.x) ** 2) + ((position.y - pacman.y) ** 2),
                );
    }

    getPositionInFrontOfPacman(pacmanGridPosition, spaces) {
        const target = Object.assign({}, pacmanGridPosition);
        const pacDirection = this.pacman.direction;
        const propToChange = (pacDirection === 'up' || pacDirection === 'down')
                ? 'y' : 'x';
        const tileOffset = (pacDirection === 'up' || pacDirection === 'left')
                ? (spaces * -1) : spaces;
        target[propToChange] += tileOffset;

        return target;
    }

    determinePinkyTarget(pacmanGridPosition) {
        return this.getPositionInFrontOfPacman(
                pacmanGridPosition, 4,
                );
    }

    determineInkyTarget(pacmanGridPosition) {
        const blinkyGridPosition = this.characterUtil.determineGridPosition(
                this.blinky.position, this.scaledTileSize,
                );
        const pivotPoint = this.getPositionInFrontOfPacman(
                pacmanGridPosition, 2,
                );
        return {
            x: pivotPoint.x + (pivotPoint.x - blinkyGridPosition.x),
            y: pivotPoint.y + (pivotPoint.y - blinkyGridPosition.y),
        };
    }

    determineClydeTarget(gridPosition, pacmanGridPosition) {
        const distance = this.calculateDistance(gridPosition, pacmanGridPosition);
        return (distance > 8) ? pacmanGridPosition : {x: 0, y: 30};
    }

    getTarget(name, gridPosition, pacmanGridPosition, mode) {
        if (mode === 'eyes') {
            return {x: 13.5, y: 10};
        }

        if (mode === 'scared') {
            return pacmanGridPosition;
        }

        if (mode === 'scatter') {
            switch (name) {
                case 'blinky':
                    return (this.cruiseElroy ? pacmanGridPosition : {x: 27, y: 0});
                case 'pinky':
                    return {x: 0, y: 0};
                case 'inky':
                    return {x: 27, y: 30};
                case 'clyde':
                    return {x: 0, y: 30};
                default:
                    return {x: 0, y: 0};
            }
        }

        switch (name) {
            case 'blinky':
                return pacmanGridPosition;
            case 'pinky':
                return this.determinePinkyTarget(pacmanGridPosition);
            case 'inky':
                return this.determineInkyTarget(pacmanGridPosition);
            case 'clyde':
                return this.determineClydeTarget(gridPosition, pacmanGridPosition);
            default:
                return pacmanGridPosition;
        }
    }

    determineBestMove(
            name, possibleMoves, gridPosition, pacmanGridPosition, mode,
            ) {
        let bestDistance = (mode === 'scared') ? 0 : Infinity;
        let bestMove;
        const target = this.getTarget(name, gridPosition, pacmanGridPosition, mode);

        Object.keys(possibleMoves).forEach((move) => {
            const distance = this.calculateDistance(
                    possibleMoves[move], target,
                    );
            const betterMove = (mode === 'scared')
                    ? (distance > bestDistance)
                    : (distance < bestDistance);

            if (betterMove) {
                bestDistance = distance;
                bestMove = move;
            }
        });

        return bestMove;
    }

    determineDirection(
            name, gridPosition, pacmanGridPosition, direction, mazeArray, mode,
            ) {
        let newDirection = direction;
        const possibleMoves = this.determinePossibleMoves(
                gridPosition, direction, mazeArray,
                );

        if (Object.keys(possibleMoves).length === 1) {
            [newDirection] = Object.keys(possibleMoves);
        } else if (Object.keys(possibleMoves).length > 1) {
            newDirection = this.determineBestMove(
                    name, possibleMoves, gridPosition, pacmanGridPosition, mode,
                    );
        }

        return newDirection;
    }

    handleIdleMovement(elapsedMs, position, velocity) {
        const newPosition = Object.assign({}, this.position);

        if (position.y <= 13.5) {
            this.direction = this.characterUtil.directions.down;
        } else if (position.y >= 14.5) {
            this.direction = this.characterUtil.directions.up;
        }

        if (this.idleMode === 'leaving') {
            if (position.x === 13.5 && (position.y > 10.8 && position.y < 11)) {
                this.idleMode = undefined;
                newPosition.top = this.scaledTileSize * 10.5;
                this.direction = this.characterUtil.directions.left;
                window.dispatchEvent(new Event('releaseGhost'));
            } else if (position.x > 13.4 && position.x < 13.6) {
                newPosition.left = this.scaledTileSize * 13;
                this.direction = this.characterUtil.directions.up;
            } else if (position.y > 13.9 && position.y < 14.1) {
                newPosition.top = this.scaledTileSize * 13.5;
                this.direction = (position.x < 13.5)
                        ? this.characterUtil.directions.right
                        : this.characterUtil.directions.left;
            }
        }

        newPosition[this.characterUtil.getPropertyToChange(this.direction)]
                += this.characterUtil.getVelocity(this.direction, velocity) * elapsedMs;

        return newPosition;
    }

    endIdleMode() {
        this.idleMode = 'leaving';
    }

    handleSnappedMovement(elapsedMs, gridPosition, velocity, pacmanGridPosition) {
        const newPosition = Object.assign({}, this.position);

        this.direction = this.determineDirection(
                this.name, gridPosition, pacmanGridPosition, this.direction,
                this.mazeArray, this.mode,
                );
        newPosition[this.characterUtil.getPropertyToChange(this.direction)]
                += this.characterUtil.getVelocity(this.direction, velocity) * elapsedMs;

        return newPosition;
    }

    enteringGhostHouse(mode, position) {
        return (
                mode === 'eyes'
                && position.y === 11
                && (position.x > 13.4 && position.x < 13.6)
                );
    }

    enteredGhostHouse(mode, position) {
        return (
                mode === 'eyes'
                && position.x === 13.5
                && (position.y > 13.8 && position.y < 14.2)
                );
    }

    leavingGhostHouse(mode, position) {
        return (
                mode !== 'eyes'
                && position.x === 13.5
                && (position.y > 10.8 && position.y < 11)
                );
    }

    handleGhostHouse(gridPosition) {
        const gridPositionCopy = Object.assign({}, gridPosition);

        if (this.enteringGhostHouse(this.mode, gridPosition)) {
            this.direction = this.characterUtil.directions.down;
            gridPositionCopy.x = 13.5;
            this.position = this.characterUtil.snapToGrid(
                    gridPositionCopy, this.direction, this.scaledTileSize,
                    );
        }

        if (this.enteredGhostHouse(this.mode, gridPosition)) {
            this.direction = this.characterUtil.directions.up;
            gridPositionCopy.y = 14;
            this.position = this.characterUtil.snapToGrid(
                    gridPositionCopy, this.direction, this.scaledTileSize,
                    );
            this.mode = this.defaultMode;
            window.dispatchEvent(new Event('restoreGhost'));
        }

        if (this.leavingGhostHouse(this.mode, gridPosition)) {
            gridPositionCopy.y = 11;
            this.position = this.characterUtil.snapToGrid(
                    gridPositionCopy, this.direction, this.scaledTileSize,
                    );
            this.direction = this.characterUtil.directions.left;
        }

        return gridPositionCopy;
    }

    handleUnsnappedMovement(elapsedMs, gridPosition, velocity) {
        const gridPositionCopy = this.handleGhostHouse(gridPosition);

        const desired = this.characterUtil.determineNewPositions(
                this.position, this.direction, velocity, elapsedMs, this.scaledTileSize,
                );

        if (this.characterUtil.changingGridPosition(
                gridPositionCopy, desired.newGridPosition,
                )) {
            return this.characterUtil.snapToGrid(
                    gridPositionCopy, this.direction, this.scaledTileSize,
                    );
        }

        return desired.newPosition;
    }

    handleMovement(elapsedMs) {
        let newPosition;

        const gridPosition = this.characterUtil.determineGridPosition(
                this.position, this.scaledTileSize,
                );
        const pacmanGridPosition = this.characterUtil.determineGridPosition(
                this.pacman.position, this.scaledTileSize,
                );
        const velocity = this.determineVelocity(
                gridPosition, this.mode,
                );

        if (this.idleMode) {
            newPosition = this.handleIdleMovement(
                    elapsedMs, gridPosition, velocity,
                    );
        } else if (JSON.stringify(this.position) === JSON.stringify(
                this.characterUtil.snapToGrid(
                        gridPosition, this.direction, this.scaledTileSize,
                        ),
                )) {
            newPosition = this.handleSnappedMovement(
                    elapsedMs, gridPosition, velocity, pacmanGridPosition,
                    );
        } else {
            newPosition = this.handleUnsnappedMovement(
                    elapsedMs, gridPosition, velocity,
                    );
        }

        newPosition = this.characterUtil.handleWarp(
                newPosition, this.scaledTileSize, this.mazeArray,
                );

        this.checkCollision(gridPosition, pacmanGridPosition);

        return newPosition;
    }

    changeMode(newMode) {
        this.defaultMode = newMode;

        const gridPosition = this.characterUtil.determineGridPosition(
                this.position, this.scaledTileSize,
                );

        if ((this.mode === 'chase' || this.mode === 'scatter')
                && !this.cruiseElroy) {
            this.mode = newMode;

            if (!this.isInGhostHouse(gridPosition)) {
                this.direction = this.characterUtil.getOppositeDirection(
                        this.direction,
                        );
            }
        }
    }

    toggleScaredColor() {
        this.scaredColor = (this.scaredColor === 'blue')
                ? 'white' : 'blue';
        this.setSpriteSheet(this.name, this.direction, this.mode);
    }

    becomeScared() {
        const gridPosition = this.characterUtil.determineGridPosition(
                this.position, this.scaledTileSize,
                );

        if (this.mode !== 'eyes') {
            if (!this.isInGhostHouse(gridPosition) && this.mode !== 'scared') {
                this.direction = this.characterUtil.getOppositeDirection(
                        this.direction,
                        );
            }
            this.mode = 'scared';
            this.scaredColor = 'blue';
            this.setSpriteSheet(this.name, this.direction, this.mode);
        }
    }

    endScared() {
        this.mode = this.defaultMode;
        this.setSpriteSheet(this.name, this.direction, this.mode);
    }

    speedUp() {
        this.cruiseElroy = true;

        if (this.defaultSpeed === this.slowSpeed) {
            this.defaultSpeed = this.mediumSpeed;
        } else if (this.defaultSpeed === this.mediumSpeed) {
            this.defaultSpeed = this.fastSpeed;
        }
    }

    resetDefaultSpeed() {
        this.defaultSpeed = this.slowSpeed;
        this.cruiseElroy = false;
        this.setSpriteSheet(this.name, this.direction, this.mode);
    }

    pause(newValue) {
        this.paused = newValue;
    }

        /**
     * Checks if the ghost contacts Pacman - starts the death sequence if so,
     * or counts a touch/kill when in "harmless" modes.
     */
    checkCollision(position, pacman) {
        if (this.disabled) return;

        const touching = this.calculateDistance(position, pacman) < 1
                && this.mode !== 'eyes'
                && this.allowCollision;

        if (!touching) {
            this._touchLatched = false;
            return;
        }

        if (this._touchLatched) return;
        this._touchLatched = true;

        if (this.mode === 'scared') {
            window.dispatchEvent(new CustomEvent('eatGhost', {
                detail: { ghost: this },
            }));
            this.mode = 'eyes';
            return;
        }

        const cf = window.CustomFunctions;
        if (!cf) return;

        if (cf.isUnlimitedLivesEnabled()) {
            // Unlimited Lives: count the kill, then run normal death sequence
            // (which respawns since lives are effectively infinite)
            cf.registerGhostTouch();
            window.dispatchEvent(new Event('deathSequence'));
        } else if (cf.isGhostHitEnabled()) {
            window.dispatchEvent(new Event('deathSequence'));
        } else {
            // Ghost Hit OFF in normal mode: count a harmless touch
            cf.registerGhostTouch();
        }
    }

    determineVelocity(position, mode) {
        if (mode === 'eyes') {
            return this.eyeSpeed;
        }

        if (this.paused) {
            return 0;
        }

        if (this.isInTunnel(position) || this.isInGhostHouse(position)) {
            return this.transitionSpeed;
        }

        if (mode === 'scared') {
            return this.scaredSpeed;
        }

        return this.defaultSpeed;
    }

    draw(interp) {
        if (this.disabled) {
            this.animationTarget.style.visibility = 'hidden';
            return;
        }
        
        const newTop = this.characterUtil.calculateNewDrawValue(
                interp, 'top', this.oldPosition, this.position,
                );
        const newLeft = this.characterUtil.calculateNewDrawValue(
                interp, 'left', this.oldPosition, this.position,
                );
        this.animationTarget.style.top = `${newTop}px`;
        this.animationTarget.style.left = `${newLeft}px`;

        this.animationTarget.style.visibility = this.display
                ? this.characterUtil.checkForStutter(this.position, this.oldPosition)
                : 'hidden';

        const updatedProperties = this.characterUtil.advanceSpriteSheet(this);
        this.msSinceLastSprite = updatedProperties.msSinceLastSprite;
        this.animationTarget = updatedProperties.animationTarget;
        this.backgroundOffsetPixels = updatedProperties.backgroundOffsetPixels;
    }

    update(elapsedMs) {
        if (this.disabled) return;
        
        this.oldPosition = Object.assign({}, this.position);

        if (this.moving) {
            this.position = this.handleMovement(elapsedMs);
            this.setSpriteSheet(this.name, this.direction, this.mode);
            this.msSinceLastSprite += elapsedMs;
        }
    }
}


class Pacman {
    constructor(scaledTileSize, mazeArray, characterUtil) {
        this.scaledTileSize = scaledTileSize;
        this.mazeArray = mazeArray;
        this.characterUtil = characterUtil;
        this.animationTarget = document.getElementById('pacman');
        this.pacmanArrow = document.getElementById('pacman-arrow');

        this.reset();
    }

    reset() {
        this.setMovementStats(this.scaledTileSize);
        this.setSpriteAnimationStats();
        this.setStyleMeasurements(this.scaledTileSize, this.spriteFrames);
        this.setDefaultPosition(this.scaledTileSize);
        this.setSpriteSheet(this.direction);
        this.pacmanArrow.style.backgroundImage = 'url(app/style/graphics/'
                + `spriteSheets/characters/pacman/arrow_${this.direction}.svg)`;
    }

    setMovementStats(scaledTileSize) {
        this.velocityPerMs = this.calculateVelocityPerMs(scaledTileSize);
        this.desiredDirection = this.characterUtil.directions.left;
        this.direction = this.characterUtil.directions.left;
        this.moving = false;
    }

    setSpriteAnimationStats() {
        this.specialAnimation = false;
        this.display = true;
        this.animate = true;
        this.loopAnimation = true;
        this.msBetweenSprites = 50;
        this.msSinceLastSprite = 0;
        this.spriteFrames = 4;
        this.backgroundOffsetPixels = 0;
        this.animationTarget.style.backgroundPosition = '0px 0px';
    }

    setStyleMeasurements(scaledTileSize, spriteFrames) {
        this.measurement = scaledTileSize * 2;

        this.animationTarget.style.height = `${this.measurement}px`;
        this.animationTarget.style.width = `${this.measurement}px`;
        this.animationTarget.style.backgroundSize = `${
                this.measurement * spriteFrames
                }px`;

        this.pacmanArrow.style.height = `${this.measurement * 2}px`;
        this.pacmanArrow.style.width = `${this.measurement * 2}px`;
        this.pacmanArrow.style.backgroundSize = `${this.measurement * 2}px`;
    }

    setDefaultPosition(scaledTileSize) {
        this.defaultPosition = {
            top: scaledTileSize * 22.5,
            left: scaledTileSize * 13,
        };
        this.position = Object.assign({}, this.defaultPosition);
        this.oldPosition = Object.assign({}, this.position);
        this.animationTarget.style.top = `${this.position.top}px`;
        this.animationTarget.style.left = `${this.position.left}px`;
    }

    calculateVelocityPerMs(scaledTileSize) {
        const velocityPerSecond = scaledTileSize * 11;
        return velocityPerSecond / 1000;
    }

    setSpriteSheet(direction) {
        this.animationTarget.style.backgroundImage = 'url(app/style/graphics/'
                + `spriteSheets/characters/pacman/pacman_${direction}.svg)`;
    }

    prepDeathAnimation() {
        this.loopAnimation = false;
        this.msBetweenSprites = 125;
        this.spriteFrames = 12;
        this.specialAnimation = true;
        this.backgroundOffsetPixels = 0;
        const bgSize = this.measurement * this.spriteFrames;
        this.animationTarget.style.backgroundSize = `${bgSize}px`;
        this.animationTarget.style.backgroundImage = 'url(app/style/'
                + 'graphics/spriteSheets/characters/pacman/pacman_death.svg)';
        this.animationTarget.style.backgroundPosition = '0px 0px';
        this.pacmanArrow.style.backgroundImage = '';
    }

    changeDirection(newDirection, startMoving) {
        this.desiredDirection = newDirection;
        this.pacmanArrow.style.backgroundImage = 'url(app/style/graphics/'
                + `spriteSheets/characters/pacman/arrow_${this.desiredDirection}.svg)`;

        if (startMoving) {
            this.moving = true;
        }
    }

    updatePacmanArrowPosition(position, scaledTileSize) {
        this.pacmanArrow.style.top = `${position.top - scaledTileSize}px`;
        this.pacmanArrow.style.left = `${position.left - scaledTileSize}px`;
    }

    handleSnappedMovement(elapsedMs) {
        const desired = this.characterUtil.determineNewPositions(
                this.position, this.desiredDirection, this.velocityPerMs,
                elapsedMs, this.scaledTileSize,
                );
        const alternate = this.characterUtil.determineNewPositions(
                this.position, this.direction, this.velocityPerMs,
                elapsedMs, this.scaledTileSize,
                );

        if (this.characterUtil.checkForWallCollision(
                desired.newGridPosition, this.mazeArray, this.desiredDirection,
                )) {
            if (this.characterUtil.checkForWallCollision(
                    alternate.newGridPosition, this.mazeArray, this.direction,
                    )) {
                this.moving = false;
                return this.position;
            }
            return alternate.newPosition;
        }
        this.direction = this.desiredDirection;
        this.setSpriteSheet(this.direction);
        return desired.newPosition;
    }

    handleUnsnappedMovement(gridPosition, elapsedMs) {
        const desired = this.characterUtil.determineNewPositions(
                this.position, this.desiredDirection, this.velocityPerMs,
                elapsedMs, this.scaledTileSize,
                );
        const alternate = this.characterUtil.determineNewPositions(
                this.position, this.direction, this.velocityPerMs,
                elapsedMs, this.scaledTileSize,
                );

        if (this.characterUtil.turningAround(
                this.direction, this.desiredDirection,
                )) {
            this.direction = this.desiredDirection;
            this.setSpriteSheet(this.direction);
            return desired.newPosition;
        }
        if (this.characterUtil.changingGridPosition(
                gridPosition, alternate.newGridPosition,
                )) {
            return this.characterUtil.snapToGrid(
                    gridPosition, this.direction, this.scaledTileSize,
                    );
        }
        return alternate.newPosition;
    }

    draw(interp) {
        const newTop = this.characterUtil.calculateNewDrawValue(
                interp, 'top', this.oldPosition, this.position,
                );
        const newLeft = this.characterUtil.calculateNewDrawValue(
                interp, 'left', this.oldPosition, this.position,
                );
        this.animationTarget.style.top = `${newTop}px`;
        this.animationTarget.style.left = `${newLeft}px`;

        this.animationTarget.style.visibility = this.display
                ? this.characterUtil.checkForStutter(this.position, this.oldPosition)
                : 'hidden';
        this.pacmanArrow.style.visibility = this.animationTarget.style.visibility;

        this.updatePacmanArrowPosition(this.position, this.scaledTileSize);

        const updatedProperties = this.characterUtil.advanceSpriteSheet(this);
        this.msSinceLastSprite = updatedProperties.msSinceLastSprite;
        this.animationTarget = updatedProperties.animationTarget;
        this.backgroundOffsetPixels = updatedProperties.backgroundOffsetPixels;
    }

    update(elapsedMs) {
        this.oldPosition = Object.assign({}, this.position);

        if (this.moving) {
            const gridPosition = this.characterUtil.determineGridPosition(
                    this.position, this.scaledTileSize,
                    );

            if (JSON.stringify(this.position) === JSON.stringify(
                    this.characterUtil.snapToGrid(
                            gridPosition, this.direction, this.scaledTileSize,
                            ),
                    )) {
                this.position = this.handleSnappedMovement(elapsedMs);
            } else {
                this.position = this.handleUnsnappedMovement(gridPosition, elapsedMs);
            }

            this.position = this.characterUtil.handleWarp(
                    this.position, this.scaledTileSize, this.mazeArray,
                    );
        }

        if (this.moving || this.specialAnimation) {
            this.msSinceLastSprite += elapsedMs;
        }
    }
}


class GameCoordinator {
    constructor() {
        this.gameUi = document.getElementById('game-ui');
        this.rowTop = document.getElementById('row-top');
        this.mazeDiv = document.getElementById('maze');
        this.mazeImg = document.getElementById('maze-img');
        this.mazeCover = document.getElementById('maze-cover');
        this.pointsDisplay = document.getElementById('points-display');
        this.highScoreDisplay = document.getElementById('high-score-display');
        this.extraLivesDisplay = document.getElementById('extra-lives');
        this.fruitDisplay = document.getElementById('fruit-display');
        this.mainMenu = document.getElementById('main-menu-container');
        this.gameStartButton = document.getElementById('game-start');
        this.pauseButton = document.getElementById('pause-button');
        this.soundButton = document.getElementById('sound-button');
        this.leftCover = document.getElementById('left-cover');
        this.rightCover = document.getElementById('right-cover');
        this.pausedText = document.getElementById('paused-text');
        this.bottomRow = document.getElementById('bottom-row');
        this.movementButtons = document.getElementById('movement-buttons');

        this.maxFps = 120;
        this.tileSize = 4;
        this.scale = this.determineScale(3);
        this.scaledTileSize = this.tileSize * this.scale;
        this.firstGame = true;
        console.log('scale', this.scaledTileSize, this.scale);

        this.movementKeys = {
            87: 'up',
            83: 'down',
            65: 'left',
            68: 'right',
            38: 'up',
            40: 'down',
            37: 'left',
            39: 'right',
        };

        this.fruitPoints = {
            1: 100,
            2: 300,
            3: 500,
            4: 700,
            5: 1000,
            6: 2000,
            7: 3000,
            8: 5000,
        };

        this.mazeArray = [
            ['XXXXXXXXXXXXXXXXXXXXXXXXXXXX'],
            ['XooooooooooooXXooooooooooooX'],
            ['XoXXXXoXXXXXoXXoXXXXXoXXXXoX'],
            ['XOXXXXoXXXXXoXXoXXXXXoXXXXOX'],
            ['XoXXXXoXXXXXoXXoXXXXXoXXXXoX'],
            ['XooooooooooooooooooooooooooX'],
            ['XoXXXXoXXoXXXXXXXXoXXoXXXXoX'],
            ['XoXXXXoXXoXXXXXXXXoXXoXXXXoX'],
            ['XooooooXXooooXXooooXXooooooX'],
            ['XXXXXXoXXXXX XX XXXXXoXXXXXX'],
            ['XXXXXXoXXXXX XX XXXXXoXXXXXX'],
            ['XXXXXXoXX          XXoXXXXXX'],
            ['XXXXXXoXX XXXXXXXX XXoXXXXXX'],
            ['XXXXXXoXX X      X XXoXXXXXX'],
            ['      o   X      X   o      '],
            ['XXXXXXoXX X      X XXoXXXXXX'],
            ['XXXXXXoXX XXXXXXXX XXoXXXXXX'],
            ['XXXXXXoXX          XXoXXXXXX'],
            ['XXXXXXoXX XXXXXXXX XXoXXXXXX'],
            ['XXXXXXoXX XXXXXXXX XXoXXXXXX'],
            ['XooooooooooooXXooooooooooooX'],
            ['XoXXXXoXXXXXoXXoXXXXXoXXXXoX'],
            ['XoXXXXoXXXXXoXXoXXXXXoXXXXoX'],
            ['XOooXXooooooo  oooooooXXooOX'],
            ['XXXoXXoXXoXXXXXXXXoXXoXXoXXX'],
            ['XXXoXXoXXoXXXXXXXXoXXoXXoXXX'],
            ['XooooooXXooooXXooooXXooooooX'],
            ['XoXXXXXXXXXXoXXoXXXXXXXXXXoX'],
            ['XoXXXXXXXXXXoXXoXXXXXXXXXXoX'],
            ['XooooooooooooooooooooooooooX'],
            ['XXXXXXXXXXXXXXXXXXXXXXXXXXXX'],
        ];

        this.mazeArray.forEach((row, rowIndex) => {
            this.mazeArray[rowIndex] = row[0].split('');
        });

        this.gameStartButton.addEventListener(
                'click', this.startButtonClick.bind(this),
                );
        this.pauseButton.addEventListener(
                'click', this.handlePauseKey.bind(this),
                );

        const ghostToggle = document.getElementById('ghost-toggle');
        if (ghostToggle) {
            ghostToggle.addEventListener('change', (e) => {
                this.setGhostsEnabled(e.target.checked);
            });
        }

        if (this.soundButton && this.soundButton.parentElement) {
            this.soundButton.parentElement.style.display = 'none';
        }

        this.preloadAssets();
    }

    determineScale(scale) {
        var buttonsH = 0;
        if (window.innerHeight > window.innerWidth) {
            buttonsH = 270;
        }
        const height = Math.min(
                document.documentElement.clientHeight, window.innerHeight || 0,
                ) - buttonsH;
        const width = Math.min(
                document.documentElement.clientWidth, window.innerWidth || 0,
                );
        const scaledTileSize = this.tileSize * scale;
        console.log('determineScale', scaledTileSize, scale, scaledTileSize * 28, width, scaledTileSize * 31, height);

        if ((scaledTileSize * 31) < height && (scaledTileSize * 28) < width) {
            return this.determineScale(scale + 0.5);
        }

        return scale - 1;
    }

    startButtonClick() {
        this.leftCover.style.left = '-50%';
        this.rightCover.style.right = '-50%';
        this.mainMenu.style.opacity = 0;
        this.gameStartButton.disabled = true;

        setTimeout(() => {
            this.mainMenu.style.visibility = 'hidden';
        }, 1000);

        this.reset();
        if (this.firstGame) {
            this.firstGame = false;
            this.init();
        }
        this.startGameplay(true);
    }

    displayErrorMessage() {
        const loadingContainer = document.getElementById('loading-container');
        const errorMessage = document.getElementById('error-message');
        loadingContainer.style.opacity = 0;
        setTimeout(() => {
            loadingContainer.remove();
            errorMessage.style.opacity = 1;
            errorMessage.style.visibility = 'visible';
        }, 1500);
    }

    preloadAssets() {
        return new Promise((resolve) => {
            const loadingContainer = document.getElementById('loading-container');
            const loadingPacman = document.getElementById('loading-pacman');
            const loadingDotMask = document.getElementById('loading-dot-mask');

            const imgBase = 'app/style/graphics/spriteSheets/';
            const imgSources = [
                `${imgBase}characters/pacman/arrow_down.svg`,
                `${imgBase}characters/pacman/arrow_left.svg`,
                `${imgBase}characters/pacman/arrow_right.svg`,
                `${imgBase}characters/pacman/arrow_up.svg`,
                `${imgBase}characters/pacman/pacman_death.svg`,
                `${imgBase}characters/pacman/pacman_error.svg`,
                `${imgBase}characters/pacman/pacman_down.svg`,
                `${imgBase}characters/pacman/pacman_left.svg`,
                `${imgBase}characters/pacman/pacman_right.svg`,
                `${imgBase}characters/pacman/pacman_up.svg`,

                `${imgBase}characters/ghosts/blinky/blinky_down_angry.svg`,
                `${imgBase}characters/ghosts/blinky/blinky_down_annoyed.svg`,
                `${imgBase}characters/ghosts/blinky/blinky_down.svg`,
                `${imgBase}characters/ghosts/blinky/blinky_left_angry.svg`,
                `${imgBase}characters/ghosts/blinky/blinky_left_annoyed.svg`,
                `${imgBase}characters/ghosts/blinky/blinky_left.svg`,
                `${imgBase}characters/ghosts/blinky/blinky_right_angry.svg`,
                `${imgBase}characters/ghosts/blinky/blinky_right_annoyed.svg`,
                `${imgBase}characters/ghosts/blinky/blinky_right.svg`,
                `${imgBase}characters/ghosts/blinky/blinky_up_angry.svg`,
                `${imgBase}characters/ghosts/blinky/blinky_up_annoyed.svg`,
                `${imgBase}characters/ghosts/blinky/blinky_up.svg`,

                `${imgBase}characters/ghosts/clyde/clyde_down.svg`,
                `${imgBase}characters/ghosts/clyde/clyde_left.svg`,
                `${imgBase}characters/ghosts/clyde/clyde_right.svg`,
                `${imgBase}characters/ghosts/clyde/clyde_up.svg`,

                `${imgBase}characters/ghosts/inky/inky_down.svg`,
                `${imgBase}characters/ghosts/inky/inky_left.svg`,
                `${imgBase}characters/ghosts/inky/inky_right.svg`,
                `${imgBase}characters/ghosts/inky/inky_up.svg`,

                `${imgBase}characters/ghosts/pinky/pinky_down.svg`,
                `${imgBase}characters/ghosts/pinky/pinky_left.svg`,
                `${imgBase}characters/ghosts/pinky/pinky_right.svg`,
                `${imgBase}characters/ghosts/pinky/pinky_up.svg`,

                `${imgBase}characters/ghosts/eyes_down.svg`,
                `${imgBase}characters/ghosts/eyes_left.svg`,
                `${imgBase}characters/ghosts/eyes_right.svg`,
                `${imgBase}characters/ghosts/eyes_up.svg`,
                `${imgBase}characters/ghosts/scared_blue.svg`,
                `${imgBase}characters/ghosts/scared_white.svg`,

                `${imgBase}pickups/pacdot.svg`,
                `${imgBase}pickups/powerPellet.svg`,

                `${imgBase}pickups/apple.svg`,
                `${imgBase}pickups/bell.svg`,
                `${imgBase}pickups/cherry.svg`,
                `${imgBase}pickups/galaxian.svg`,
                `${imgBase}pickups/key.svg`,
                `${imgBase}pickups/melon.svg`,
                `${imgBase}pickups/orange.svg`,
                `${imgBase}pickups/strawberry.svg`,

                `${imgBase}text/ready.svg`,

                `${imgBase}text/100.svg`,
                `${imgBase}text/200.svg`,
                `${imgBase}text/300.svg`,
                `${imgBase}text/400.svg`,
                `${imgBase}text/500.svg`,
                `${imgBase}text/700.svg`,
                `${imgBase}text/800.svg`,
                `${imgBase}text/1000.svg`,
                `${imgBase}text/1600.svg`,
                `${imgBase}text/2000.svg`,
                `${imgBase}text/3000.svg`,
                `${imgBase}text/5000.svg`,

                `${imgBase}maze/maze_blue.svg`,

                'app/style/graphics/extra_life.png',
            ];

            const totalSources = imgSources.length;
            this.remainingSources = totalSources;

            loadingPacman.style.left = '0';
            loadingDotMask.style.width = '0';

            Promise.all([
                this.createElements(
                        imgSources, 'img', totalSources, this,
                        ),
            ]).then(() => {
                loadingContainer.style.opacity = 0;
                resolve();

                setTimeout(() => {
                    loadingContainer.remove();
                    this.mainMenu.style.opacity = 1;
                    this.mainMenu.style.visibility = 'visible';
                    
                    if( !isSafari() ) {
                        this.startButtonClick();
                    }
                }, 1500);
            }).catch(this.displayErrorMessage.bind(this));
        });
    }

    createElements(sources, type, totalSources, gameCoord) {
        const loadingContainer = document.getElementById('loading-container');
        const preloadDiv = document.getElementById('preload-div');
        const loadingPacman = document.getElementById('loading-pacman');
        const containerWidth = loadingContainer.scrollWidth
                - loadingPacman.scrollWidth;
        const loadingDotMask = document.getElementById('loading-dot-mask');

        const gameCoordRef = gameCoord;

        return new Promise((resolve, reject) => {
            let loadedSources = 0;

            sources.forEach((source) => {
                const element = (type === 'img')
                        ? new Image() : new Audio();

                preloadDiv.appendChild(element);

                const elementReady = () => {
                    gameCoordRef.remainingSources -= 1;
                    loadedSources += 1;
                    const percent = 1 - (gameCoordRef.remainingSources / totalSources);
                    loadingPacman.style.left = `${percent * containerWidth}px`;
                    loadingDotMask.style.width = loadingPacman.style.left;

                    if (loadedSources === sources.length) {
                        resolve();
                    }
                };

                if (type === 'img') {
                    element.onload = elementReady;
                    element.onerror = reject;
                } else {
                    element.addEventListener('canplaythrough', elementReady);
                    element.onerror = reject;
                }

                element.src = source;

                if (type === 'audio') {
                    element.load();
                }
            });
        });
    }

    reset() {
        this.activeTimers = [];
        this.points = 0;
        this.level = 1;
        this.lives = (window.CustomFunctions && window.CustomFunctions.isUnlimitedLivesEnabled())
            ? 999
            : 2;
        this.extraLifeGiven = false;
        this.remainingDots = 0;
        this.allowKeyPresses = true;
        this.allowPacmanMovement = false;
        this.allowPause = false;
        this.cutscene = true;
        this.highScore = getStorage('highScore');

        if (this.firstGame) {
            setInterval(() => {
                this.collisionDetectionLoop();
            }, 500);

            this.pacman = new Pacman(
                    this.scaledTileSize, this.mazeArray, new CharacterUtil(),
                    );
            this.blinky = new Ghost(
                    this.scaledTileSize, this.mazeArray, this.pacman, 'blinky',
                    this.level, new CharacterUtil(),
                    );
            this.pinky = new Ghost(
                    this.scaledTileSize, this.mazeArray, this.pacman, 'pinky',
                    this.level, new CharacterUtil(),
                    );
            this.inky = new Ghost(
                    this.scaledTileSize, this.mazeArray, this.pacman, 'inky',
                    this.level, new CharacterUtil(), this.blinky,
                    );
            this.clyde = new Ghost(
                    this.scaledTileSize, this.mazeArray, this.pacman, 'clyde',
                    this.level, new CharacterUtil(),
                    );
            this.fruit = new Pickup(
                    'fruit', this.scaledTileSize, 13.5, 17, this.pacman,
                    this.mazeDiv, 100,
                    );
        }

        this.entityList = [
            this.pacman, this.blinky, this.pinky, this.inky, this.clyde, this.fruit,
        ];

        this.ghosts = [
            this.blinky,
            this.pinky,
            this.inky,
            this.clyde,
        ];

        this.scaredGhosts = [];
        this.eyeGhosts = 0;

        if (this.firstGame) {
            this.drawMaze(this.mazeArray, this.entityList);
            this.setUiDimensions();
        } else {
            this.pacman.reset();
            this.ghosts.forEach((ghost) => {
                ghost.reset(true);
            });
            this.pickups.forEach((pickup) => {
                if (pickup.type !== 'fruit') {
                    this.remainingDots += 1;
                    pickup.reset();
                    this.entityList.push(pickup);
                }
            });
        }

        this.pointsDisplay.innerHTML = '00';
        this.highScoreDisplay.innerHTML = this.highScore || '00';
        this.clearDisplay(this.fruitDisplay);
    }

    init() {
        this.registerEventListeners();

        this.gameEngine = new GameEngine(this.maxFps, this.entityList);
        this.gameEngine.start();
    }

    drawMaze(mazeArray, entityList) {
        this.pickups = [
            this.fruit,
        ];
        console.log('scaledTileSize', this.scaledTileSize);
        this.mazeDiv.style.height = `${this.scaledTileSize * 31}px`;
        this.mazeDiv.style.width = `${this.scaledTileSize * 28}px`;
        this.gameUi.style.width = `${this.scaledTileSize * 28}px`;
        this.bottomRow.style.minHeight = `${this.scaledTileSize * 2}px`;
        this.dotContainer = document.getElementById('dot-container');

        mazeArray.forEach((row, rowIndex) => {
            row.forEach((block, columnIndex) => {
                if (block === 'o' || block === 'O') {
                    const type = (block === 'o') ? 'pacdot' : 'powerPellet';
                    const points = (block === 'o') ? 10 : 50;
                    const dot = new Pickup(
                            type, this.scaledTileSize, columnIndex,
                            rowIndex, this.pacman, this.dotContainer, points,
                            );

                    entityList.push(dot);
                    this.pickups.push(dot);
                    this.remainingDots += 1;
                }
            });
        });
    }

    setUiDimensions() {
        this.gameUi.style.fontSize = `${this.scaledTileSize}px`;
        this.rowTop.style.marginBottom = `${this.scaledTileSize}px`;
    }

    collisionDetectionLoop() {
        if (this.pacman.position) {
            const maxDistance = (this.pacman.velocityPerMs * 750);
            const pacmanCenter = {
                x: this.pacman.position.left + this.scaledTileSize,
                y: this.pacman.position.top + this.scaledTileSize,
            };

            const debugging = false;

            this.pickups.forEach((pickup) => {
                pickup.checkPacmanProximity(maxDistance, pacmanCenter, debugging);
            });
        }
    }

    startGameplay(initialStart) {
        this.scaredGhosts = [];
        this.eyeGhosts = 0;
        this.allowPacmanMovement = false;

        const left = this.scaledTileSize * 11;
        const top = this.scaledTileSize * 16.5;
        const duration = initialStart ? 4500 : 2000;
        const width = this.scaledTileSize * 6;
        const height = this.scaledTileSize * 2;

        this.displayText({left, top}, 'ready', duration, width, height);
        this.updateExtraLivesDisplay();

        new Timer(() => {
            this.allowPause = true;
            this.cutscene = false;

            this.allowPacmanMovement = true;
            this.pacman.moving = true;

            this.ghosts.forEach((ghost) => {
                const ghostRef = ghost;
                ghostRef.moving = true;
            });

            this.ghostCycle('scatter');

            this.idleGhosts = [
                this.pinky,
                this.inky,
                this.clyde,
            ];
            this.releaseGhost();

            this.updateExtraLivesDisplay();

            if (window.CustomFunctions && window.CustomFunctions.currentSpeed !== 1 && window.CustomFunctions.speedPersist) {
                window.CustomFunctions.setPacmanSpeed(window.CustomFunctions.currentSpeed);
            }
            
            if (window.CustomFunctions) {
                window.CustomFunctions.applyGhostSettings();
            }
        }, duration);
    }

    clearDisplay(display) {
        while (display.firstChild) {
            display.removeChild(display.firstChild);
        }
    }

    /**
     * Displays extra life images equal to the number of remaining lives.
     * In Unlimited Lives mode, shows the text "UNLIMITED" instead.
     */
    updateExtraLivesDisplay() {
        this.clearDisplay(this.extraLivesDisplay);

        const unlimited = window.CustomFunctions
            && window.CustomFunctions.isUnlimitedLivesEnabled();

        if (unlimited) {
            const label = document.createElement('div');
            label.className = 'unlimited-lives-label';
            label.textContent = 'UNLIMITED';
            label.style.fontFamily = "'Press Start 2P', sans-serif";
            label.style.fontSize = `${this.scaledTileSize * 0.9}px`;
            label.style.color = '#00ff66';
            label.style.lineHeight = `${this.scaledTileSize * 2}px`;
            label.style.whiteSpace = 'nowrap';
            this.extraLivesDisplay.appendChild(label);
            return;
        }

        for (let i = 0; i < this.lives; i += 1) {
            const extraLifePic = document.createElement('img');
            extraLifePic.setAttribute('src', 'app/style/graphics/extra_life.svg');
            extraLifePic.style.height = `${this.scaledTileSize * 2}px`;
            this.extraLivesDisplay.appendChild(extraLifePic);
        }
    }

    updateFruitDisplay(rawImageSource) {
        const parsedSource = rawImageSource.slice(
                rawImageSource.indexOf('(') + 1, rawImageSource.indexOf(')'),
                );

        if (this.fruitDisplay.children.length === 7) {
            this.fruitDisplay.removeChild(this.fruitDisplay.firstChild);
        }

        const fruitPic = document.createElement('img');
        fruitPic.setAttribute('src', parsedSource);
        fruitPic.style.height = `${this.scaledTileSize * 2}px`;
        this.fruitDisplay.appendChild(fruitPic);
    }

    ghostCycle(mode) {
        const delay = (mode === 'scatter') ? 7000 : 20000;
        const nextMode = (mode === 'scatter') ? 'chase' : 'scatter';

        this.ghostCycleTimer = new Timer(() => {
            this.ghosts.forEach((ghost) => {
                ghost.changeMode(nextMode);
            });

            this.ghostCycle(nextMode);
        }, delay);
    }

    releaseGhost() {
        if (this.idleGhosts.length > 0) {
            const delay = Math.max((8 - ((this.level - 1) * 4)) * 1000, 0);

            this.endIdleTimer = new Timer(() => {
                this.idleGhosts[0].endIdleMode();
                this.idleGhosts.shift();
            }, delay);
        }
    }

    registerEventListeners() {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('awardPoints', this.awardPoints.bind(this));
        window.addEventListener('deathSequence', this.deathSequence.bind(this));
        window.addEventListener('dotEaten', this.dotEaten.bind(this));
        window.addEventListener('powerUp', this.powerUp.bind(this));
        window.addEventListener('eatGhost', this.eatGhost.bind(this));
        window.addEventListener('restoreGhost', this.restoreGhost.bind(this));
        window.addEventListener('addTimer', this.addTimer.bind(this));
        window.addEventListener('removeTimer', this.removeTimer.bind(this));
        window.addEventListener('releaseGhost', this.releaseGhost.bind(this));

        const directions = [
            'up', 'down', 'left', 'right',
        ];

        directions.forEach((direction) => {
            preventLongPressMenu(document.getElementById(`button-${direction}`));

            document.getElementById(`button-${direction}`).addEventListener(
                    'touchstart', () => {
                this.changeDirection(direction);
            },
                    );
        });
    }

    changeDirection(direction) {
        if (this.allowKeyPresses && this.gameEngine.running) {
            this.pacman.changeDirection(
                    direction, this.allowPacmanMovement,
                    );
        }
    }

    handleKeyDown(e) {
        if (e.keyCode === 27) {
            this.handlePauseKey();
        } else if (this.movementKeys[e.keyCode]) {
            this.changeDirection(this.movementKeys[e.keyCode]);
        }
    }

    handlePauseKey() {
        if (this.allowPause) {
            this.allowPause = false;

            setTimeout(() => {
                if (!this.cutscene) {
                    this.allowPause = true;
                }
            }, 500);

            this.gameEngine.changePausedState(this.gameEngine.running);

            if (this.gameEngine.started) {
                this.pausedText.style.visibility = 'hidden';
                this.pauseButton.innerHTML = 'pause';
                this.activeTimers.forEach((timer) => {
                    timer.resume();
                });
            } else {
                this.pausedText.style.visibility = 'hidden';
                this.pauseButton.innerHTML = 'play_arrow';
                this.activeTimers.forEach((timer) => {
                    timer.pause();
                });
            }
        }
    }

    awardPoints(e) {
        this.points += e.detail.points;
        this.pointsDisplay.innerText = this.points;
        if (this.points > (this.highScore || 0)) {
            this.highScore = this.points;
            this.highScoreDisplay.innerText = this.points;
            setStorage('highScore', this.highScore);
        }

        if (this.points >= 10000 && !this.extraLifeGiven) {
            this.extraLifeGiven = true;
            this.lives += 1;
            this.updateExtraLivesDisplay();
        }

        if (e.detail.type === 'fruit') {
            const left = e.detail.points >= 1000
                    ? this.scaledTileSize * 12.5
                    : this.scaledTileSize * 13;
            const top = this.scaledTileSize * 16.5;
            const width = e.detail.points >= 1000
                    ? this.scaledTileSize * 3
                    : this.scaledTileSize * 2;
            const height = this.scaledTileSize * 2;

            this.displayText({left, top}, e.detail.points, 2000, width, height);
            this.updateFruitDisplay(this.fruit.determineImage(
                    'fruit', e.detail.points,
                    ));
        }
    }

        deathSequence() {
        const cf = window.CustomFunctions;
        const unlimitedLives = cf && cf.unlimitedLives;

        // Only reset counters when Pacman actually loses a life
        if (cf && !unlimitedLives) {
            cf.resetGhostTouches();
        }

        this.allowPause = false;
        this.cutscene = true;
        this.removeTimer({detail: {timer: this.fruitTimer}});
        this.removeTimer({detail: {timer: this.ghostCycleTimer}});
        this.removeTimer({detail: {timer: this.endIdleTimer}});
        this.removeTimer({detail: {timer: this.ghostFlashTimer}});

        this.allowKeyPresses = false;
        this.pacman.moving = false;
        this.ghosts.forEach((ghost) => {
            const ghostRef = ghost;
            ghostRef.moving = false;
        });

        new Timer(() => {
            this.ghosts.forEach((ghost) => {
                const ghostRef = ghost;
                ghostRef.display = false;
            });
            this.pacman.prepDeathAnimation();

            if (this.lives > 0 || unlimitedLives) {
                if (!unlimitedLives) {
                    this.lives -= 1;
                }

                new Timer(() => {
                    this.mazeCover.style.visibility = 'visible';
                    new Timer(() => {
                        this.allowKeyPresses = true;
                        this.mazeCover.style.visibility = 'hidden';
                        this.pacman.reset();
                        this.ghosts.forEach((ghost) => {
                            ghost.reset();
                        });
                        this.fruit.hideFruit();

                        this.startGameplay();
                    }, 500);
                }, 2250);
            } else {
                this.gameOver();
            }
        }, 750);
    }

    gameOver() {
        setStorage('highScore', this.highScore);

        new Timer(() => {
            this.displayText(
                    {
                        left: this.scaledTileSize * 9,
                        top: this.scaledTileSize * 16.5,
                    },
                    'game_over', 4000,
                    this.scaledTileSize * 10,
                    this.scaledTileSize * 2,
                    );
            this.fruit.hideFruit();

            new Timer(() => {
                this.leftCover.style.left = '0';
                this.rightCover.style.right = '0';

                setTimeout(() => {
                    this.mainMenu.style.opacity = 1;
                    this.gameStartButton.disabled = false;
                    this.mainMenu.style.visibility = 'visible';
                }, 1000);
            }, 2500);
        }, 2250);
    }

    dotEaten() {
        this.remainingDots -= 1;

        if (this.remainingDots === 174 || this.remainingDots === 74) {
            this.createFruit();
        }

        if (this.remainingDots === 40 || this.remainingDots === 20) {
            this.speedUpBlinky();
        }

        if (this.remainingDots === 0) {
            this.advanceLevel();
        }
    }

    createFruit() {
        this.removeTimer({detail: {timer: this.fruitTimer}});
        this.fruit.showFruit(this.fruitPoints[this.level] || 5000);
        this.fruitTimer = new Timer(() => {
            this.fruit.hideFruit();
        }, 10000);
    }

    speedUpBlinky() {
        this.blinky.speedUp();
    }

    advanceLevel() {
        this.allowPause = false;
        this.cutscene = true;
        this.allowKeyPresses = false;
        this.entityList.forEach((entity) => {
            const entityRef = entity;
            entityRef.moving = false;
        });

        this.removeTimer({detail: {timer: this.fruitTimer}});
        this.removeTimer({detail: {timer: this.ghostCycleTimer}});
        this.removeTimer({detail: {timer: this.endIdleTimer}});
        this.removeTimer({detail: {timer: this.ghostFlashTimer}});

        const imgBase = 'app/style//graphics/spriteSheets/maze/';

        new Timer(() => {
            this.ghosts.forEach((ghost) => {
                const ghostRef = ghost;
                ghostRef.display = false;
            });

            this.mazeImg.src = `${imgBase}maze_white.svg`;
            new Timer(() => {
                this.mazeImg.src = `${imgBase}maze_blue.svg`;
                new Timer(() => {
                    this.mazeImg.src = `${imgBase}maze_white.svg`;
                    new Timer(() => {
                        this.mazeImg.src = `${imgBase}maze_blue.svg`;
                        new Timer(() => {
                            this.mazeImg.src = `${imgBase}maze_white.svg`;
                            new Timer(() => {
                                this.mazeImg.src = `${imgBase}maze_blue.svg`;
                                new Timer(() => {
                                    this.mazeCover.style.visibility = 'visible';
                                    new Timer(() => {
                                        this.mazeCover.style.visibility = 'hidden';
                                        this.level += 1;
                                        if (window.CustomFunctions) {
                                            window.CustomFunctions.resetGhostTouches();
                                        }
                                        this.allowKeyPresses = true;
                                        this.entityList.forEach((entity) => {
                                            const entityRef = entity;
                                            if (entityRef.level) {
                                                entityRef.level = this.level;
                                            }
                                            entityRef.reset();
                                            if (entityRef instanceof Ghost) {
                                                entityRef.resetDefaultSpeed();
                                            }
                                            if (entityRef instanceof Pickup
                                                    && entityRef.type !== 'fruit') {
                                                this.remainingDots += 1;
                                            }
                                        });
                                        
                                        if (window.CustomFunctions && window.CustomFunctions.currentSpeed !== 1 && window.CustomFunctions.speedPersist) {
                                            window.CustomFunctions.setPacmanSpeed(window.CustomFunctions.currentSpeed);
                                        }
                                        
                                        if (window.CustomFunctions) {
                                            window.CustomFunctions.applyGhostSettings();
                                        }
                                        
                                        this.startGameplay();
                                    }, 500);
                                }, 250);
                            }, 250);
                        }, 250);
                    }, 250);
                }, 250);
            }, 250);
        }, 2000);
    }

    flashGhosts(flashes, maxFlashes) {
        if (flashes === maxFlashes) {
            this.scaredGhosts.forEach((ghost) => {
                ghost.endScared();
            });
            this.scaredGhosts = [];
        } else if (this.scaredGhosts.length > 0) {
            this.scaredGhosts.forEach((ghost) => {
                ghost.toggleScaredColor();
            });

            this.ghostFlashTimer = new Timer(() => {
                this.flashGhosts(flashes + 1, maxFlashes);
            }, 250);
        }
    }

    powerUp() {
        if (window.CustomFunctions && window.CustomFunctions.isSleepGhostEnabled()) {
            console.log('Sleep Ghost enabled - power pellet has no effect on ghosts');
            return;
        }

        this.removeTimer({detail: {timer: this.ghostFlashTimer}});

        this.ghostCombo = 0;
        this.scaredGhosts = [];

        this.ghosts.forEach((ghost) => {
            if (ghost.mode !== 'eyes') {
                this.scaredGhosts.push(ghost);
            }
        });

        this.scaredGhosts.forEach((ghost) => {
            ghost.becomeScared();
        });

        const powerDuration = Math.max((7 - this.level) * 1000, 0);
        this.ghostFlashTimer = new Timer(() => {
            this.flashGhosts(0, 9);
        }, powerDuration);
    }

    determineComboPoints() {
        return (100 * (2 ** this.ghostCombo));
    }

    eatGhost(e) {
        const pauseDuration = 1000;
        const {position, measurement} = e.detail.ghost;

        this.pauseTimer({detail: {timer: this.ghostFlashTimer}});
        this.pauseTimer({detail: {timer: this.ghostCycleTimer}});
        this.pauseTimer({detail: {timer: this.fruitTimer}});

        this.scaredGhosts = this.scaredGhosts.filter(
                ghost => ghost.name !== e.detail.ghost.name,
                );
        this.eyeGhosts += 1;

        this.ghostCombo += 1;
        const comboPoints = this.determineComboPoints();
        window.dispatchEvent(new CustomEvent('awardPoints', {
            detail: {
                points: comboPoints,
            },
        }));
        this.displayText(
                position, comboPoints, pauseDuration, measurement,
                );

        this.allowPacmanMovement = false;
        this.pacman.display = false;
        this.pacman.moving = false;
        e.detail.ghost.display = false;
        e.detail.ghost.moving = false;

        this.ghosts.forEach((ghost) => {
            const ghostRef = ghost;
            ghostRef.animate = false;
            ghostRef.pause(true);
            ghostRef.allowCollision = false;
        });

        new Timer(() => {
            this.resumeTimer({detail: {timer: this.ghostFlashTimer}});
            this.resumeTimer({detail: {timer: this.ghostCycleTimer}});
            this.resumeTimer({detail: {timer: this.fruitTimer}});
            this.allowPacmanMovement = true;
            this.pacman.display = true;
            this.pacman.moving = true;
            e.detail.ghost.display = true;
            e.detail.ghost.moving = true;
            this.ghosts.forEach((ghost) => {
                const ghostRef = ghost;
                ghostRef.animate = true;
                ghostRef.pause(false);
                ghostRef.allowCollision = true;
            });
        }, pauseDuration);
    }

    restoreGhost() {
        this.eyeGhosts -= 1;
    }

    displayText(position, amount, duration, width, height) {
        const pointsDiv = document.createElement('div');

        pointsDiv.style.position = 'absolute';
        pointsDiv.style.backgroundSize = `${width}px`;
        pointsDiv.style.backgroundImage = 'url(app/style/graphics/'
                + `spriteSheets/text/${amount}.svg`;
        pointsDiv.style.width = `${width}px`;
        pointsDiv.style.height = `${height || width}px`;
        pointsDiv.style.top = `${position.top}px`;
        pointsDiv.style.left = `${position.left}px`;
        pointsDiv.style.zIndex = 2;

        this.mazeDiv.appendChild(pointsDiv);

        new Timer(() => {
            this.mazeDiv.removeChild(pointsDiv);
        }, duration);
    }

    addTimer(e) {
        this.activeTimers.push(e.detail.timer);
    }

    timerExists(e) {
        return !!(e.detail.timer || {}).timerId;
    }

    pauseTimer(e) {
        if (this.timerExists(e)) {
            e.detail.timer.pause(true);
        }
    }

    resumeTimer(e) {
        if (this.timerExists(e)) {
            e.detail.timer.resume(true);
        }
    }

    removeTimer(e) {
        if (this.timerExists(e)) {
            window.clearTimeout(e.detail.timer.timerId);
            this.activeTimers = this.activeTimers.filter(
                    timer => timer.timerId !== e.detail.timer.timerId,
                    );
        }
    }

    setGhostsEnabled(enabled) {
        this.ghosts.forEach((ghost) => {
            ghost.disabled = !enabled;
            if (enabled) {
                ghost.animationTarget.style.visibility = ghost.display ? 'visible' : 'hidden';
            } else {
                ghost.animationTarget.style.visibility = 'hidden';
            }
        });
    }
}


class GameEngine {
    constructor(maxFps, entityList) {
        this.fpsDisplay = document.getElementById('fps-display');
        this.elapsedMs = 0;
        this.lastFrameTimeMs = 0;
        this.entityList = entityList;
        this.maxFps = maxFps;
        this.timestep = 1000 / this.maxFps;
        this.fps = this.maxFps;
        this.framesThisSecond = 0;
        this.lastFpsUpdate = 0;
        this.frameId = 0;
        this.running = false;
        this.started = false;
    }

    changePausedState(running) {
        if (running) {
            this.stop();
        } else {
            this.start();
        }
    }

    updateFpsDisplay(timestamp) {
        if (timestamp > this.lastFpsUpdate + 1000) {
            this.fps = (this.framesThisSecond + this.fps) / 2;
            this.lastFpsUpdate = timestamp;
            this.framesThisSecond = 0;
        }
        this.framesThisSecond += 1;
        this.fpsDisplay.textContent = `${Math.round(this.fps)} FPS`;
    }

    draw(interp, entityList) {
        entityList.forEach((entity) => {
            if (typeof entity.draw === 'function') {
                entity.draw(interp);
            }
        });
    }

    update(elapsedMs, entityList) {
        entityList.forEach((entity) => {
            if (typeof entity.update === 'function') {
                entity.update(elapsedMs);
            }
        });
    }

    panic() {
        this.elapsedMs = 0;
    }

    start() {
        if (!this.started) {
            this.started = true;

            this.frameId = requestAnimationFrame((firstTimestamp) => {
                this.draw(1, []);
                this.running = true;
                this.lastFrameTimeMs = firstTimestamp;
                this.lastFpsUpdate = firstTimestamp;
                this.framesThisSecond = 0;

                this.frameId = requestAnimationFrame((timestamp) => {
                    this.mainLoop(timestamp);
                });
            });
        }
    }

    stop() {
        this.running = false;
        this.started = false;
        cancelAnimationFrame(this.frameId);
    }

    processFrames() {
        let numUpdateSteps = 0;
        while (this.elapsedMs >= this.timestep) {
            this.update(this.timestep, this.entityList);
            this.elapsedMs -= this.timestep;
            numUpdateSteps += 1;
            if (numUpdateSteps >= this.maxFps) {
                this.panic();
                break;
            }
        }
    }

    engineCycle(timestamp) {
        if (timestamp < this.lastFrameTimeMs + (1000 / this.maxFps)) {
            this.frameId = requestAnimationFrame((nextTimestamp) => {
                this.mainLoop(nextTimestamp);
            });
            return;
        }

        this.elapsedMs += timestamp - this.lastFrameTimeMs;
        this.lastFrameTimeMs = timestamp;
        this.updateFpsDisplay(timestamp);
        this.processFrames();
        this.draw(this.elapsedMs / this.timestep, this.entityList);

        this.frameId = requestAnimationFrame((nextTimestamp) => {
            this.mainLoop(nextTimestamp);
        });
    }

    mainLoop(timestamp) {
        this.engineCycle(timestamp);
    }
}


class Pickup {
    constructor(type, scaledTileSize, column, row, pacman, mazeDiv, points) {
        this.type = type;
        this.pacman = pacman;
        this.mazeDiv = mazeDiv;
        this.points = points;
        this.nearPacman = false;

        this.fruitImages = {
            100: 'cherry',
            300: 'strawberry',
            500: 'orange',
            700: 'apple',
            1000: 'melon',
            2000: 'galaxian',
            3000: 'bell',
            5000: 'key',
        };

        this.setStyleMeasurements(type, scaledTileSize, column, row, points);
    }

    reset() {
        this.animationTarget.style.visibility = (this.type === 'fruit')
                ? 'hidden' : 'visible';
    }

    setStyleMeasurements(type, scaledTileSize, column, row, points) {
        if (type === 'pacdot') {
            this.size = scaledTileSize * 0.25;
            this.x = (column * scaledTileSize) + ((scaledTileSize / 8) * 3);
            this.y = (row * scaledTileSize) + ((scaledTileSize / 8) * 3);
        } else if (type === 'powerPellet') {
            this.size = scaledTileSize;
            this.x = (column * scaledTileSize);
            this.y = (row * scaledTileSize);
        } else {
            this.size = scaledTileSize * 2;
            this.x = (column * scaledTileSize) - (scaledTileSize * 0.5);
            this.y = (row * scaledTileSize) - (scaledTileSize * 0.5);
        }

        this.center = {
            x: column * scaledTileSize,
            y: row * scaledTileSize,
        };

        this.animationTarget = document.createElement('div');
        this.animationTarget.style.position = 'absolute';
        this.animationTarget.style.backgroundSize = `${this.size}px`;
        this.animationTarget.style.backgroundImage = this.determineImage(
                type, points,
                );
        this.animationTarget.style.height = `${this.size}px`;
        this.animationTarget.style.width = `${this.size}px`;
        this.animationTarget.style.top = `${this.y}px`;
        this.animationTarget.style.left = `${this.x}px`;
        this.mazeDiv.appendChild(this.animationTarget);

        if (type === 'powerPellet') {
            this.animationTarget.classList.add('power-pellet');
        }

        this.reset();
    }

    determineImage(type, points) {
        let image = '';

        if (type === 'fruit') {
            image = this.fruitImages[points] || 'cherry';
        } else {
            image = type;
        }

        return `url(app/style/graphics/spriteSheets/pickups/${image}.svg)`;
    }

    showFruit(points) {
        this.points = points;
        this.animationTarget.style.backgroundImage = this.determineImage(
                this.type, points,
                );
        this.animationTarget.style.visibility = 'visible';
    }

    hideFruit() {
        this.animationTarget.style.visibility = 'hidden';
    }

    checkForCollision(pickup, originalPacman) {
        const pacman = Object.assign({}, originalPacman);

        pacman.x += (pacman.size * 0.25);
        pacman.y += (pacman.size * 0.25);
        pacman.size /= 2;

        return (pickup.x < pacman.x + pacman.size
                && pickup.x + pickup.size > pacman.x
                && pickup.y < pacman.y + pacman.size
                && pickup.y + pickup.size > pacman.y);
    }

    checkPacmanProximity(maxDistance, pacmanCenter, debugging) {
        if (this.animationTarget.style.visibility !== 'hidden') {
            const distance = Math.sqrt(
                    ((this.center.x - pacmanCenter.x) ** 2)
                    + ((this.center.y - pacmanCenter.y) ** 2),
                    );

            this.nearPacman = (distance <= maxDistance);

            if (debugging) {
                this.animationTarget.style.background = this.nearPacman
                        ? 'lime' : 'red';
            }
        }
    }

    shouldCheckForCollision() {
        return this.animationTarget.style.visibility !== 'hidden'
                && this.nearPacman;
    }

    update() {
        if (this.shouldCheckForCollision()) {
            if (this.checkForCollision(
                    {
                        x: this.x,
                        y: this.y,
                        size: this.size,
                    }, {
                x: this.pacman.position.left,
                y: this.pacman.position.top,
                size: this.pacman.measurement,
            },
                    )) {
                this.animationTarget.style.visibility = 'hidden';
                window.dispatchEvent(new CustomEvent('awardPoints', {
                    detail: {
                        points: this.points,
                        type: this.type,
                    },
                }));

                if (this.type === 'pacdot') {
                    window.dispatchEvent(new Event('dotEaten'));
                } else if (this.type === 'powerPellet') {
                    window.dispatchEvent(new Event('dotEaten'));
                    window.dispatchEvent(new Event('powerUp'));
                }
            }
        }
    }
}


class CharacterUtil {
    constructor() {
        this.directions = {
            up: 'up',
            down: 'down',
            left: 'left',
            right: 'right',
        };
    }

    checkForStutter(position, oldPosition) {
        let stutter = false;
        const threshold = 5;

        if (position && oldPosition) {
            if (Math.abs(position.top - oldPosition.top) > threshold
                    || Math.abs(position.left - oldPosition.left) > threshold) {
                stutter = true;
            }
        }

        return stutter ? 'hidden' : 'visible';
    }

    getPropertyToChange(direction) {
        switch (direction) {
            case this.directions.up:
            case this.directions.down:
                return 'top';
            default:
                return 'left';
        }
    }

    getVelocity(direction, velocityPerMs) {
        switch (direction) {
            case this.directions.up:
            case this.directions.left:
                return velocityPerMs * -1;
            default:
                return velocityPerMs;
        }
    }

    calculateNewDrawValue(interp, prop, oldPosition, position) {
        return oldPosition[prop] + (position[prop] - oldPosition[prop]) * interp;
    }

    determineGridPosition(position, scaledTileSize) {
        return {
            x: (position.left / scaledTileSize) + 0.5,
            y: (position.top / scaledTileSize) + 0.5,
        };
    }

    turningAround(direction, desiredDirection) {
        return desiredDirection === this.getOppositeDirection(direction);
    }

    getOppositeDirection(direction) {
        switch (direction) {
            case this.directions.up:
                return this.directions.down;
            case this.directions.down:
                return this.directions.up;
            case this.directions.left:
                return this.directions.right;
            default:
                return this.directions.left;
        }
    }

    determineRoundingFunction(direction) {
        switch (direction) {
            case this.directions.up:
            case this.directions.left:
                return Math.floor;
            default:
                return Math.ceil;
        }
    }

    changingGridPosition(oldPosition, position) {
        return (
                Math.floor(oldPosition.x) !== Math.floor(position.x)
                || Math.floor(oldPosition.y) !== Math.floor(position.y)
                );
    }

    checkForWallCollision(desiredNewGridPosition, mazeArray, direction) {
        const roundingFunction = this.determineRoundingFunction(
                direction, this.directions,
                );

        const desiredX = roundingFunction(desiredNewGridPosition.x);
        const desiredY = roundingFunction(desiredNewGridPosition.y);
        let newGridValue;

        if (Array.isArray(mazeArray[desiredY])) {
            newGridValue = mazeArray[desiredY][desiredX];
        }

        return (newGridValue === 'X');
    }

    determineNewPositions(
            position, direction, velocityPerMs, elapsedMs, scaledTileSize,
            ) {
        const newPosition = Object.assign({}, position);
        newPosition[this.getPropertyToChange(direction)]
                += this.getVelocity(direction, velocityPerMs) * elapsedMs;
        const newGridPosition = this.determineGridPosition(
                newPosition, scaledTileSize,
                );

        return {
            newPosition,
            newGridPosition,
        };
    }

    snapToGrid(position, direction, scaledTileSize) {
        const newPosition = Object.assign({}, position);
        const roundingFunction = this.determineRoundingFunction(
                direction, this.directions,
                );

        switch (direction) {
            case this.directions.up:
            case this.directions.down:
                newPosition.y = roundingFunction(newPosition.y);
                break;
            default:
                newPosition.x = roundingFunction(newPosition.x);
                break;
        }

        return {
            top: (newPosition.y - 0.5) * scaledTileSize,
            left: (newPosition.x - 0.5) * scaledTileSize,
        };
    }

    handleWarp(position, scaledTileSize, mazeArray) {
        const newPosition = Object.assign({}, position);
        const gridPosition = this.determineGridPosition(position, scaledTileSize);

        if (gridPosition.x < -0.75) {
            newPosition.left = (scaledTileSize * (mazeArray[0].length - 0.75));
        } else if (gridPosition.x > (mazeArray[0].length - 0.25)) {
            newPosition.left = (scaledTileSize * -1.25);
        }

        return newPosition;
    }

    advanceSpriteSheet(character) {
        const {
            msSinceLastSprite,
            animationTarget,
            backgroundOffsetPixels,
        } = character;
        const updatedProperties = {
            msSinceLastSprite,
            animationTarget,
            backgroundOffsetPixels,
        };

        const ready = (character.msSinceLastSprite > character.msBetweenSprites)
                && character.animate;
        if (ready) {
            updatedProperties.msSinceLastSprite = 0;

            if (character.backgroundOffsetPixels
                    < (character.measurement * (character.spriteFrames - 1))
                    ) {
                updatedProperties.backgroundOffsetPixels += character.measurement;
            } else if (character.loopAnimation) {
                updatedProperties.backgroundOffsetPixels = 0;
            }

            const style = `-${updatedProperties.backgroundOffsetPixels}px 0px`;
            updatedProperties.animationTarget.style.backgroundPosition = style;
        }

        return updatedProperties;
    }
}


class Timer {
    constructor(callback, delay) {
        this.callback = callback;
        this.remaining = delay;
        this.resume();
    }

    pause(systemPause) {
        window.clearTimeout(this.timerId);
        this.remaining -= new Date() - this.start;
        this.oldTimerId = this.timerId;

        if (systemPause) {
            this.pausedBySystem = true;
        }
    }

    resume(systemResume) {
        if (systemResume || !this.pausedBySystem) {
            this.pausedBySystem = false;

            this.start = new Date();
            this.timerId = window.setTimeout(() => {
                this.callback();
                window.dispatchEvent(new CustomEvent('removeTimer', {
                    detail: {
                        timer: this,
                    },
                }));
            }, this.remaining);

            if (!this.oldTimerId) {
                window.dispatchEvent(new CustomEvent('addTimer', {
                    detail: {
                        timer: this,
                    },
                }));
            }
        }
    }
}