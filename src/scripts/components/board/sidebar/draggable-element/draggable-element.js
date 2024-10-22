import Util from '@services/util.js';

import './draggable-element.scss';

export default class DraggableElement {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onMouseDown: () => {},
      onDragStart: () => {},
      onDragEnter: () => {},
      onDragLeave: () => {},
      onDragEnd: () => {},
      toggleSubMenu: () => {}
    }, callbacks);

    this.isVisible = true;

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

    this.menuButton = document.createElement('button');
    this.menuButton.classList.add('h5p-editor-animator-sidebar-draggable-element-menu-button');
    this.menuButton.setAttribute('aria-label', this.params.dictionary.get('a11y.openSubMenu'));
    this.menuButton.addEventListener('click', (event) => {
      this.callbacks.toggleSubMenu(this, !this.isSubMenuOpen, event.pointerType === '');
    });
    this.menuButton.addEventListener('focus', (event) => {
      this.callbacks.onMouseDown(this.getId(), true);
    });
    this.menuButton.addEventListener('blur', (event) => {
      window.requestAnimationFrame(() => {
        if (!this.dom.contains(document.activeElement) && !this.isSubMenuOpen) {
          this.callbacks.onMouseDown(this.getId(), false);
        }
      });
    });
    this.dom.appendChild(this.menuButton);

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
   * Remove element.
   */
  remove() {
    this.dom.remove();
  }

  /*
   * Determine whether the element belongs to the draggable.
   * @param {HTMLElement} element Element.
   * @returns {boolean} True if the element belongs to the dragable.
   */
  owns(element) {
    return this.dom.contains(element);
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
      else if (key === 'id') {
        this.id = params[key];
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
  getId() {
    return this.id;
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
    this.wasTrue = this.wasTrue || state;
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

    this.callbacks.onMouseDown(this.getId(), true);
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

  /**
   * Toggle visibility.
   * @param {boolean} state False to set invisible, true to set visible.
   */
  toggleVisibility(state) {
    this.dom.classList.toggle('invisible', !state);
    this.isVisible = state;
  }

  /**
   * Toggle sub menu.
   * @param {object} subMenu Sub menu.
   * @param {boolean} state True to open, false to close.
   * @param {boolean} wasKeyboardUsed True if keyboard was used to open sub menu.
   */
  toggleSubMenu(subMenu, state, wasKeyboardUsed) {
    if (!state) {
      subMenu.hide();
      return;
    }

    // Register with subMenu
    subMenu.setParent(this);
    const labelSelector = this.isVisible ? 'l10n.hide' : 'l10n.show';
    subMenu.setLabel('visibility', this.params.dictionary.get(labelSelector));

    // Move subMenu below this button
    this.dom.after(subMenu.getDOM());

    this.isSubMenuOpen = true;
    this.menuButton.classList.add('active');
    this.menuButton.setAttribute('aria-label', this.params.dictionary.get('a11y.closeSubMenu'));

    window.requestAnimationFrame(() => {
      const draggableRect = this.dom.getBoundingClientRect();
      const draggableStyle = window.getComputedStyle(this.dom);
      const buttonRect = this.menuButton.getBoundingClientRect();

      const draggablePaddingRight =
        parseFloat(draggableStyle.getPropertyValue('padding-right'));

      subMenu.show({
        showActive: wasKeyboardUsed,
        css: {
          width: `${draggableRect.width}px`,
          right: `calc(${buttonRect.width}px + ${draggablePaddingRight}px)`,
          // eslint-disable-next-line no-magic-numbers
          top: `calc(${this.dom.offsetTop}px + ${draggableRect.height / 2}px)`,
        }
      });

      subMenu.once('hidden', (event) => {
        this.isSubMenuOpen = false;
        this.menuButton.classList.remove('active');
        this.menuButton.setAttribute('aria-label', this.params.dictionary.get('a11y.openSubMenu'));

        if (!event?.data?.keepFocus) {
          this.dom.focus();
        }
      });
    });
  }
}
