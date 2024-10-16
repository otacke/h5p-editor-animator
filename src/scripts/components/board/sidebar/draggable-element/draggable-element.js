import Util from '@services/util.js';

import './draggable-element.scss';

export default class DraggableElement {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      title: 'Undefined',
      details: ''
    }, params);
    this.callbacks = Util.extend({
      onMouseDown: () => {},
      onDragStart: () => {},
      onDragEnter: () => {},
      onDragLeave: () => {},
      onDragEnd: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-sidebar-draggable-element');
    this.dom.setAttribute('draggable', 'true');

    // Placeholder to show when dragging
    this.dragPlaceholder = document.createElement('div');
    this.dragPlaceholder.classList.add(
      'h5peditor-animator-drag-placeholder'
    );

    // These listeners prevent Firefox from showing draggable animation
    this.dragPlaceholder.addEventListener('dragover', (event) => {
      event.preventDefault();
    });
    this.dragPlaceholder.addEventListener('drop', (event) => {
      event.preventDefault();
    });

    const elementInfo = document.createElement('button');
    elementInfo.classList.add('h5p-editor-animator-sidebar-draggable-element-info');
    elementInfo.setAttribute('tabindex', '-1');
    this.dom.appendChild(elementInfo);

    this.elementTitle = document.createElement('div');
    this.elementTitle.classList.add('h5p-editor-animator-sidebar-draggable-element-type');
    this.elementTitle.innerText = this.params.title;
    elementInfo.appendChild(this.elementTitle);

    this.elementDetails = document.createElement('div');
    this.elementDetails.classList.add('h5p-editor-animator-sidebar-draggable-element-details');
    this.params.details && (this.elementDetails.innerText = this.params.details);
    elementInfo.appendChild(this.elementDetails);

    const menuButton = document.createElement('button');
    menuButton.classList.add('h5p-editor-animator-sidebar-draggable-element-menu-button');
    this.dom.appendChild(menuButton);

    this.dom.addEventListener('mousedown', (event) => {
      this.handleMouseDown(event);
    });

    this.dom.addEventListener('dragstart', (event) => {
      this.handleDragStart(event);
    });

    this.dom.addEventListener('dragover', (event) => {
      this.handleDragOver(event);
    });

    this.dom.addEventListener('dragenter', () => {
      this.handleDragEnter();
    });

    this.dom.addEventListener('dragleave', (event) => {
      this.handleDragLeave(event);
    });

    this.dom.addEventListener('dragend', () => {
      this.handleDragEnd();
    });
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set parameters.
   * @param {object} params Parameters.
   */
  setParams(params = {}) {
    for (const key in params) {
      if (key === 'title') {
        this.elementTitle.innerText = params[key];
      }
      else if (key === 'details') {
        this.elementDetails.innerText = params[key];
      }
      else if (key === 'subContentId') {
        this.subContentId = params[key];
      }
    }
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');
    this.isHidden = false;
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
    this.isHidden = true;
  }

  /**
   * Get sub content Id.
   * @returns {string} Sub content Id.
   */
  getSubContentId() {
    return this.subContentId;
  }

  /**
   * Attach drag placeholder.
   */
  attachDragPlaceholder() {
    this.dom.parentNode.insertBefore(
      this.dragPlaceholder, this.dom.nextSibling
    );
  }

  /**
   * Show drag placeholder. Draggable must be visible, or width/height = 0
   */
  showDragPlaceholder() {
    if (this.isHidden) {
      return;
    }

    this.dragPlaceholder.style.width = `${this.dom.offsetWidth}px`;
    this.dragPlaceholder.style.height = `${this.dom.offsetHeight}px`;

    this.attachDragPlaceholder();
  }

  /**
   * Hide drag placeholder.
   */
  hideDragPlaceholder() {
    if (!this.dragPlaceholder.parentNode) {
      return;
    }

    this.dragPlaceholder.parentNode.removeChild(this.dragPlaceholder);
  }

  /**
   * Toggle highlight of draggable element.
   * @param {boolean} state If true, highlight element, else remove highlight.
   */
  toggleHighlight(state) {
    this.dom.classList.toggle('highlighted', state);
  }

  /**
   * Handle mouse down.
   * @param {MouseEvent} event Mouse event.
   */
  handleMouseDown(event) {
    // Used in dragstart for Firefox workaround
    this.pointerPosition = {
      x: event.clientX,
      y: event.clientY
    };

    this.callbacks.onMouseDown(this.subContentId, true);
  }

  /**
   * Handle document mouse down.
   * @param {MouseEvent} event Mouse event.
   */
  handleDocumentMouseDown(event) {
    if (event.target === this.dom || this.dom.contains(event.target)) {
      return; // Clicked on draggable element
    }

    this.callbacks.onMouseDown(this.subContentId, false);
  }

  /**
   * Handle drag start.
   * @param {DragEvent} event Drag event.
   */
  handleDragStart(event) {
    event.dataTransfer.effectAllowed = 'move';

    // Workaround for Firefox that may scale the draggable down otherwise
    event.dataTransfer.setDragImage(
      this.dom,
      this.pointerPosition.x - this.dom.getBoundingClientRect().left,
      this.pointerPosition.y - this.dom.getBoundingClientRect().top
    );

    // Will hide browser's draggable copy as well without timeout
    clearTimeout(this.placeholderTimeout);
    this.placeholderTimeout = setTimeout(() => {
      this.showDragPlaceholder();
      this.hide();
    }, 0);

    this.callbacks.onDragStart(this);
  }

  /**
   * Handle drag over.
   * @param {DragEvent} event Drag event.
   */
  handleDragOver(event) {
    event.preventDefault();
  }

  /**
   * Handle drag enter.
   */
  handleDragEnter() {
    this.callbacks.onDragEnter(this);
  }

  /**
   * Handle drag leave.
   * @param {DragEvent} event Drag event.
   */
  handleDragLeave(event) {
    if (this.dom !== event.target || this.dom.contains(event.fromElement)) {
      return;
    }

    this.callbacks.onDragLeave(this);
  }

  /**
   * Handle drag end.
   */
  handleDragEnd() {
    clearTimeout(this.placeholderTimeout);
    this.hideDragPlaceholder();
    this.show();

    this.callbacks.onDragEnd(this);
  }
}
