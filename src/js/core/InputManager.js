/**
 * InputManager.js - Handles user input events
 */

class InputManager {
    /**
     * Unified InputManager: handles keyboard, mouse, and touch input with standardized events, callbacks, event queues, and extensibility
     */
    constructor() {
        // Input state tracking
        this.keys = {};
        this.mouseButtons = {};
        this.mousePosition = { x: 0, y: 0 };
        this.mouseDelta = { x: 0, y: 0 };
        this.touchActive = false;
        this.touchPosition = { x: 0, y: 0 };

        // Event callbacks
        this.keyCallbacks = {};
        this.mouseCallbacks = {};
        this.touchCallbacks = {};
        this.wheelCallbacks = [];

        // Processed events - these will fire on the update loop
        this.keyEvents = [];
        this.mouseEvents = [];
        this.touchEvents = [];
        this.wheelEvents = [];

        // Bind event handlers to this instance
        this._keyDownHandler = this._keyDownHandler.bind(this);
        this._keyUpHandler = this._keyUpHandler.bind(this);
        this._mouseDownHandler = this._mouseDownHandler.bind(this);
        this._mouseUpHandler = this._mouseUpHandler.bind(this);
        this._mouseMoveHandler = this._mouseMoveHandler.bind(this);
        this._touchStartHandler = this._touchStartHandler.bind(this);
        this._touchEndHandler = this._touchEndHandler.bind(this);
        this._touchMoveHandler = this._touchMoveHandler.bind(this);
        this._wheelHandler = this._wheelHandler.bind(this);
        this._blurHandler = this._blurHandler.bind(this);

        this._initEventListeners();

        console.log('InputManager initialized');
    }

    /**
     * Initialize event listeners safely
     */
    _initEventListeners() {
        try {
            // Keyboard events
            window.addEventListener('keydown', this._keyDownHandler, false);
            window.addEventListener('keyup', this._keyUpHandler, false);

            // Mouse events
            window.addEventListener('mousedown', this._mouseDownHandler, false);
            window.addEventListener('mouseup', this._mouseUpHandler, false);
            window.addEventListener('mousemove', this._mouseMoveHandler, false);

            // Touch events
            window.addEventListener('touchstart', this._touchStartHandler, { passive: false });
            window.addEventListener('touchend', this._touchEndHandler, { passive: false });
            window.addEventListener('touchmove', this._touchMoveHandler, { passive: false });

            // Wheel events
            window.addEventListener('wheel', this._wheelHandler, false);

            // Window blur
            window.addEventListener('blur', this._blurHandler, false);
        } catch (e) {
            console.warn('InputManager event listener error:', e);
        }
    }

    // Keyboard event handlers
    _keyDownHandler(event) {
        const key = event.key.toLowerCase();
        if (!this.keys[key]) {
            this.keyEvents.push({ type: 'keydown', key });
        }
        this.keys[key] = true;
        if (this.keyCallbacks[key] && typeof this.keyCallbacks[key].down === 'function') {
            this.keyCallbacks[key].down(event);
        }
    }
    _keyUpHandler(event) {
        const key = event.key.toLowerCase();
        this.keys[key] = false;
        this.keyEvents.push({ type: 'keyup', key });
        if (this.keyCallbacks[key] && typeof this.keyCallbacks[key].up === 'function') {
            this.keyCallbacks[key].up(event);
        }
    }
    // Mouse event handlers
    _mouseDownHandler(event) {
        this.mouseButtons[event.button] = true;
        this.mouseEvents.push({ type: 'mousedown', button: event.button, x: event.clientX, y: event.clientY });
        if (this.mouseCallbacks['down']) this.mouseCallbacks['down'](event);
    }
    _mouseUpHandler(event) {
        this.mouseButtons[event.button] = false;
        this.mouseEvents.push({ type: 'mouseup', button: event.button, x: event.clientX, y: event.clientY });
        if (this.mouseCallbacks['up']) this.mouseCallbacks['up'](event);
    }
    _mouseMoveHandler(event) {
        const dx = event.clientX - this.mousePosition.x;
        const dy = event.clientY - this.mousePosition.y;
        this.mouseDelta = { x: dx, y: dy };
        this.mousePosition = { x: event.clientX, y: event.clientY };
        this.mouseEvents.push({ type: 'mousemove', x: event.clientX, y: event.clientY, dx, dy });
        if (this.mouseCallbacks['move']) this.mouseCallbacks['move'](event, dx, dy);
    }
    // Touch event handlers
    _touchStartHandler(event) {
        this.touchActive = true;
        if (event.touches && event.touches.length > 0) {
            this.touchPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
        this.touchEvents.push({ type: 'touchstart', ...this.touchPosition });
        if (this.touchCallbacks['start']) this.touchCallbacks['start'](event);
    }
    _touchEndHandler(event) {
        this.touchActive = false;
        this.touchEvents.push({ type: 'touchend', ...this.touchPosition });
        if (this.touchCallbacks['end']) this.touchCallbacks['end'](event);
    }
    _touchMoveHandler(event) {
        if (event.touches && event.touches.length > 0) {
            const dx = event.touches[0].clientX - this.touchPosition.x;
            const dy = event.touches[0].clientY - this.touchPosition.y;
            this.touchPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            this.touchEvents.push({ type: 'touchmove', ...this.touchPosition, dx, dy });
            if (this.touchCallbacks['move']) this.touchCallbacks['move'](event, dx, dy);
        }
    }
    // Wheel event handler
    _wheelHandler(event) {
        this.wheelEvents.push({ type: 'wheel', delta: event.deltaY });
        for (const cb of this.wheelCallbacks) cb(event);
    }
    // Blur event handler
    _blurHandler() {
        this.keys = {};
        this.mouseButtons = {};
    }

    // Public API
    isKeyPressed(key) {
        return !!this.keys[key.toLowerCase()];
    }
    isMouseButtonPressed(button) {
        return !!this.mouseButtons[button];
    }
    getMousePosition() {
        return { ...this.mousePosition };
    }
    getMouseDelta() {
        return { ...this.mouseDelta };
    }
    isTouchActive() {
        return this.touchActive;
    }
    getTouchPosition() {
        return { ...this.touchPosition };
    }
    // Register event callbacks
    onKey(key, handlers) {
        this.keyCallbacks[key.toLowerCase()] = handlers;
    }
    onMouse(type, handler) {
        this.mouseCallbacks[type] = handler;
    }
    onTouch(type, handler) {
        this.touchCallbacks[type] = handler;
    }
    onWheel(handler) {
        this.wheelCallbacks.push(handler);
    }
    // Event queue processing (for game loop integration)
    pollKeyEvents() {
        const events = [...this.keyEvents];
        this.keyEvents = [];
        return events;
    }
    pollMouseEvents() {
        const events = [...this.mouseEvents];
        this.mouseEvents = [];
        return events;
    }
    pollTouchEvents() {
        const events = [...this.touchEvents];
        this.touchEvents = [];
        return events;
    }
    pollWheelEvents() {
        const events = [...this.wheelEvents];
        this.wheelEvents = [];
        return events;
    }
}

// Export for use in other modules
window.InputManager = InputManager; 