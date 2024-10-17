import Util from '@services/util.js';
import DraggableElement from './draggable-element/draggable-element.js';
import SubMenu from './submenu.js';

import './list-elements.scss';

export default class ListElements {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.toggleHighlightElement] Callback for toggling highlight of an element.
   * @param {function} [callbacks.changeElementZPosition] Callback for changing element z position.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({
      toggleHighlightElement: () => {},
      changeElementZPosition: () => {},
      edit: () => {},
      move: () => {},
      remove: () => {}
    }, callbacks);

    this.draggableElements = [];
    this.draggedElement = null;
    this.dropzoneElement = null;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-sidebar-list-elements');

    // Submenu
    this.subMenu = new SubMenu(
      {
        dictionary: this.params.dictionary,
        options: [
          {
            id: 'edit',
            label: this.params.dictionary.get('l10n.edit'),
            onClick: ((draggableElement) => {
              this.callbacks.edit(draggableElement.getSubContentId());
            }),
            keepFocus: true
          },
          {
            id: 'move-up',
            label: this.params.dictionary.get('l10n.moveUp'),
            onClick: ((draggableElement) => {
              const index = this.getElementIndex(draggableElement);
              this.callbacks.changeElementZPosition(index, index + 1, false);
            }),
            keepFocus: true
          },
          {
            id: 'move-down',
            label: this.params.dictionary.get('l10n.moveDown'),
            onClick: ((draggableElement) => {
              const index = this.getElementIndex(draggableElement);
              this.callbacks.changeElementZPosition(index, index - 1, false);
            }),
            keepFocus: true
          },
          {
            id: 'remove',
            label: this.params.dictionary.get('l10n.remove'),
            onClick: ((draggableElement) => {
              this.callbacks.remove(draggableElement.getSubContentId(), -1);
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

  add(params = {}) {
    const draggableElement = new DraggableElement(
      {
        dictionary: this.params.dictionary,
      },
      {
        onMouseDown: (subContentId, state) => {
          this.callbacks.toggleHighlightElement(subContentId, state);
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

    this.dom.prepend(draggableElement.getDOM());
  }

  /**
   * Remove element.
   * @param {string} subContentId Sub content ID.
   */
  remove(subContentId) {
    // TODO: Separate function
    const draggableElement =
      this.draggableElements.find((draggableElement) => draggableElement.getSubContentId() === subContentId);

    if (draggableElement) {
      draggableElement.getDOM().remove();
      this.draggableElements = this.draggableElements.filter((element) => element !== draggableElement);
    }
  }

  /**
   * Update element.
   * @param {string} subContentId Sub content Id of the element to be updated.
   * @param {object} params Parameters to be updated.
   */
  update(subContentId, params = {}) {
    // TODO: Separate function
    const draggableElement =
      this.draggableElements.find((draggableElement) => draggableElement.getSubContentId() === subContentId);

    draggableElement?.setParams({ title: params.title });
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
   * toggle the highlight of an element.
   * @param {string} subContentId Sub content Id of the element to be updated.
   * @param {boolean} state True to set highlight, false to remove highlight.
   */
  toggleHighlightElement(subContentId, state) {
    const draggableElement =
      this.draggableElements.find((draggableElement) => draggableElement.getSubContentId() === subContentId);

    draggableElement?.toggleHighlight(state);
  }

  /**
   * Handle mouse down event on document.
   * @param {MouseEvent} event Mouse event.
   */
  handleDocumentMouseDown(event) {
    this.draggableElements.forEach((draggableElement) => {
      draggableElement.handleDocumentMouseDown(event);
    });

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

      this.callbacks.changeElementZPosition(index1, index2);
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
    this.dom.prepend(domElement);

    this.draggableElements.push(this.draggableElements.splice(index, 1)[0]);
  }

  /**
   * Send element to back = bottom of list.
   * @param {number} index Index of the element to be sent to back.
   */
  sendToBack(index) {
    const domElement = this.draggableElements[index].getDOM();
    this.dom.append(domElement);

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
    element.toggleSubMenu(this.subMenu, state, wasKeyboardUsed);
  }

  /**
   * Get sub menu capabilities of an element.
   * @param {DraggableElement} element Element to get capabilities for.
   * @returns {object} Capabilities.
   */
  getCapabilities(element) {
    return {
      'edit': true,
      'move-up': this.draggableElements[this.draggableElements.length - 1] !== element,
      'move-down': this.draggableElements[0] !== element,
      'remove': true,
    };
  }
}
