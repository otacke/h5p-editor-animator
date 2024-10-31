import Util from '@services/util.js';
import DraggableElement from './draggable-element/draggable-element.js';
import SubMenu from './submenu.js';

import './draggables-list.scss';

export default class DraggablesList {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.highlight] Callback for toggling highlight of an element.
   * @param {function} [callbacks.move] Callback for changing element z position.
   * @param {function} [callbacks.edit] Callback for editing an element.
   * @param {function} [callbacks.remove] Callback for removing an element.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      reversed: false,
      canToggleVisibility: false
    }, params);

    this.callbacks = Util.extend({
      highlight: () => {},
      move: () => {},
      edit: () => {},
      move: () => {},
      remove: () => {},
      toggleVisibility: () => {}
    }, callbacks);

    this.draggableElements = [];
    this.draggedElement = null;
    this.dropzoneElement = null;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-sidebar-list');
    this.dom.classList.add(this.params.title.toLowerCase().replace(' ', '-'));

    this.draggablesWrapper = document.createElement('div');
    this.draggablesWrapper.classList.add('h5p-editor-animator-sidebar-list-draggables-wrapper');
    this.dom.append(this.draggablesWrapper);

    if (this.params.addButtonLabel) {
      this.addButton = document.createElement('button');
      this.addButton.classList.add('h5p-editor-animator-sidebar-list-add-button');
      this.addButton.setAttribute(
        'aria-label', this.params.addButtonLabel ?? this.params.dictionary.get('a11y.addElement')
      );
      this.addButton.addEventListener('click', () => {
        this.callbacks.edit();
      });
      this.disableAddButton();
      this.dom.append(this.addButton);
    }

    // Submenu
    this.subMenu = new SubMenu(
      {
        dictionary: this.params.dictionary,
        options: [
          {
            id: 'edit',
            label: this.params.dictionary.get('l10n.edit'),
            onClick: ((draggableElement) => {
              this.callbacks.edit(draggableElement.getId());
            }),
            keepFocus: true
          },
          {
            id: 'move-up',
            label: this.params.dictionary.get('l10n.moveUp'),
            onClick: ((draggableElement) => {
              const index = this.getElementIndex(draggableElement);
              this.callbacks.move(index, index + (this.params.reversed ? 1 : -1), false);
            }),
            keepFocus: true
          },
          {
            id: 'move-down',
            label: this.params.dictionary.get('l10n.moveDown'),
            onClick: ((draggableElement) => {
              const index = this.getElementIndex(draggableElement);
              this.callbacks.move(index, index + (this.params.reversed ? -1 : 1), false);
            }),
            keepFocus: true
          },
          {
            id: 'remove',
            label: this.params.dictionary.get('l10n.remove'),
            onClick: ((draggableElement) => {
              this.callbacks.remove(draggableElement.getId());
            }),
            keepFocus: true
          },
          {
            id: 'visibility',
            label: this.params.dictionary.get('l10n.hide'),
            onClick: ((draggableElement) => {
              this.callbacks.toggleVisibility(draggableElement.getId());
            }),
            keepFocus: true
          }
        ]
      }
    );
    this.dom.appendChild(this.subMenu.getDOM());
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get title.
   * @returns {string} Title.
   */
  getTitle() {
    return this.params.title;
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Toggle visibility state of draggable.
   * @param {string} id Id of draggable element to toggle visibility of.
   * @param {boolean} state True to show, false to hide.
   */
  toggleVisibility(id, state) {
    const draggableElement = this.getById(id);
    draggableElement.toggleVisibility(state);
  }

  /**
   * Enable add button.
   */
  enableAddButton() {
    this.addButton.disabled = false;
  }

  /**
   * Disable add button.
   */
  disableAddButton() {
    this.addButton.disabled = true;
  }

  /**
   * Add a draggable element to list.
   * @param {object} [params] Parameters.
   * @param {string} [params.title] Title of content from metadata.
   * @param {string} [params.id] Id.
   * @param {string} [params.details] Details, e.g. Content type or animation details.
   */
  add(params = {}) {
    const draggableElement = new DraggableElement(
      {
        dictionary: this.params.dictionary,
      },
      {
        onMouseDown: (id, state) => {
          this.callbacks.highlight(id, state);
        },
        onDragStart: (element) => {
          this.handleDragStart(element);
        },
        onDragEnter: (element) => {
          this.handleDragEnter(element);
        },
        onDragLeave: () => {
          this.handleDragLeave();
        },
        onDragEnd: (element) => {
          this.handleDragEnd(element);
        },
        toggleSubMenu: (element, state, wasKeyboardUsed) => {
          this.toggleSubMenu(element, state, wasKeyboardUsed);
        }
      }
    );

    draggableElement.setParams(params);

    this.draggableElements.push(draggableElement);

    if (this.params.reversed) {
      this.draggablesWrapper.prepend(draggableElement.getDOM());
    }
    else {
      this.draggablesWrapper.append(draggableElement.getDOM());
    }
  }

  /**
   * Remove element.
   * @param {string|number} id Id of the element to be removed.
   */
  remove(id) {
    // Workaround. It's not guaranteed that the element received a subcontentid on creation.
    let draggableElement = this.draggableElements.find((element) => element.getId() === undefined);
    draggableElement = draggableElement ?? this.getById(id);

    if (draggableElement) {
      draggableElement.getDOM().remove();
      this.draggableElements = this.draggableElements.filter((element) => element !== draggableElement);
    }
  }

  /**
   * Update element.
   * @param {string} id Id of the element to be updated.
   * @param {object} params Parameters to be updated.
   */
  update(id, params = {}) {
    // Workaround. It's not guaranteed that the element received a subcontentid on creation.
    let draggableElement = this.draggableElements.find((element) => element.getId() === undefined);
    draggableElement = draggableElement ?? this.getById(id);

    draggableElement?.setParams(params);
  }

  /**
   * Get element by sub content Id.
   * @param {string|number} id Id.
   * @returns {DraggableElement} Draggable element.
   */
  getById(id) {
    return this.draggableElements.find((draggableElement) => draggableElement.getId() === id);
  }

  /**
   * Get element index.
   * @param {DraggableElement} element Draggable element.
   * @returns {number} Index of the element.
   */
  getElementIndex(element) {
    return this.draggableElements.findIndex((draggableElement) => draggableElement === element);
  }

  /**
   * Toggle the highlight of an element.
   * @param {string|number} id Id of the element to be updated.
   * @param {boolean} state True to set highlight, false to remove highlight.
   */
  toggleHighlightElement(id, state) {
    this.draggableElements.forEach((draggableElement) => {
      draggableElement.toggleHighlight(state && draggableElement.getId() === id);
    });
  }

  /**
   * Handle mouse down event on document.
   * @param {MouseEvent} event Mouse event.
   */
  handleDocumentMouseDown(event) {
    if (!this.subMenu.isOpen) {
      return;
    }

    const targetIsSubMenu = this.subMenu.owns(event.target);
    const targetIsDraggableElement =
      this.draggableElements.some((draggableElement) => draggableElement.owns(event.target));

    if (targetIsSubMenu || targetIsDraggableElement) {
      return;
    }

    this.subMenu.hide();
  }

  /**
   * Handle user started dragging element.
   * @param {HTMLElement} element Element being dragged.
   */
  handleDragStart(element) {
    this.subMenu.hide();

    this.draggedElement = element;
    this.dragIndexSource = this.getElementIndex(this.draggedElement);
  }

  /**
   * Handle user dragging element over another element.
   * @param {HTMLElement} element Element being dragged over.
   */
  handleDragEnter(element) {
    if (this.dropzoneElement && this.dropzoneElement === element) {
      return;
    }

    this.dropzoneElement = element;
    this.dragIndexTarget = this.getElementIndex(this.dropzoneElement);

    if (this.draggedElement && this.dropzoneElement && this.draggedElement !== this.dropzoneElement) {
      const index1 = this.getElementIndex(this.draggedElement);
      const index2 = this.getElementIndex(this.dropzoneElement);
      if (index1 < 0 || index2 < 0) {
        return;
      }

      this.callbacks.move(index1, index2);
    }
  }

  /**
   * Handle user dragging element out of dropzone.
   */
  handleDragLeave() {
    this.dropzoneElement = null;
  }

  /**
   * Handle user stopped dragging element.
   */
  handleDragEnd() {
    this.draggedElement = null;
    this.dropzoneElement = null;
    this.dragIndexSource = null;
    this.dragIndexTarget = null;
  }

  /**
   * Bring element to front = top of list.
   * @param {number} index Index of the element to be brought to front.
   */
  bringToFront(index) {
    const domElement = this.draggableElements[index].getDOM();
    this.draggablesWrapper.prepend(domElement);

    this.draggableElements.push(this.draggableElements.splice(index, 1)[0]);
  }

  /**
   * Send element to back = bottom of list.
   * @param {number} index Index of the element to be sent to back.
   */
  sendToBack(index) {
    const domElement = this.draggableElements[index].getDOM();
    this.draggablesWrapper.append(domElement);

    this.draggableElements.unshift(this.draggableElements.splice(index, 1)[0]);
  }

  /**
   * Swap elements.
   * @param {number} index1 Index 1.
   * @param {number} index2 Index 2.
   * @param {boolean} [ignorePlaceholder] True to ignore placeholder, false otherwise.
   */
  swapElements(index1, index2, ignorePlaceholder = false) {
    const element1 = this.draggableElements[index1];
    const element2 = this.draggableElements[index2];

    // Swap visuals
    Util.swapDOMElements(element1.getDOM(), element2.getDOM());

    [this.draggableElements[index1], this.draggableElements[index2]] =
      [this.draggableElements[index2], this.draggableElements[index1]];

    if (!ignorePlaceholder) {
      element1.attachDragPlaceholder();
    }
  }

  /**
   * Handle show menu.
   * @param {DraggableElement} element Element.
   * @param {boolean} state True to show, false to hide.
   * @param {boolean} wasKeyboardUsed True if keyboard was used to toggle menu.
   */
  toggleSubMenu(element, state, wasKeyboardUsed) {
    this.subMenu.toggleOptions(this.getCapabilities(element));
    element.toggleSubMenu(this.subMenu, state, wasKeyboardUsed, this.dom.scrollTop);
  }

  /**
   * Get sub menu capabilities of an element.
   * @param {DraggableElement} element Element to get capabilities for.
   * @returns {object} Capabilities.
   */
  getCapabilities(element) {
    const canMoveUp = this.params.reversed ?
      element !== this.draggableElements[this.draggableElements.length - 1] :
      element !== this.draggableElements[0];

    const canMoveDown = this.params.reversed ?
      element !== this.draggableElements[0] :
      element !== this.draggableElements[this.draggableElements.length - 1];

    return {
      'edit': true,
      'move-up': canMoveUp,
      'move-down': canMoveDown,
      'remove': true,
      'visibility': this.params.canToggleVisibility
    };
  }
}
