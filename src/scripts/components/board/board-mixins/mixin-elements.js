import Element from '../element-area/element.js';

export default class MixinElements {
  /**
   * Create element for element area.
   * @param {object} params Parameters.
   * @returns {H5P.jQuery} DOM element. JQuery, because of DragNBar.
   */
  createElement(params = {}) {
    const index = this.elements.length;

    const element = new Element(
      {
        globals: this.params.globals,
        index: index,
        elementParams: params,
        elementFields: this.params.elementsFields,
        dnbWrapper: this.dnbWrapper
      },
      {
        onEdited: (element) => {
          this.editElement(element);
        },
        onRemoved: (element) => {
          this.removeElementIfConfirmed(element);
        },
        onBroughtToFront: (element) => {
          this.bringToFront(element);
        },
        onSentToBack: (element) => {
          this.sendToBack(element);
        },
        onChanged: (subContentId, elementParams) => {
          const index = this.params.elements.findIndex((element) => element.contentType.subContentId === subContentId);
          if (index === -1) {
            this.params.elements.push(elementParams);
          }
          this.params.elements[index] = elementParams;

          this.callbacks.onChanged({ elements: this.params.elements });
        },
        getPosition: (element) => {
          const elementRect = element.getBoundingClientRect();
          const elementAreaRect = this.elementArea.getDOM().getBoundingClientRect();
          const left = elementRect.left - elementAreaRect.left + this.elementArea.getDOM().scrollLeft;
          // eslint-disable-next-line no-magic-numbers
          const top = elementRect.top - elementAreaRect.top + 2 * this.elementArea.getDOM().scrollTop;

          return { left: left, top: top };
        }
      }
    );

    // Important: The order of these must not be changed, find things by subcontent id, not index
    this.elements.push(element);
    this.elementArea.appendElement(element.getDOM());

    const elementParams = this.params.elements[index];

    const contentTypeName = elementParams.contentType.library.split(' ')[0].split('.').pop();

    // Use element.getTitle() instead of title to get the title from the element
    const title =
      elementParams.contentType?.metadata?.title ??
      H5PEditor.t('core', 'untitled').replace(':libraryTitle', contentTypeName);

    this.listElements.add({
      title: title,
      details: contentTypeName,
      id: elementParams.contentType.subContentId
    });

    return element.getData().$element;
  }

  /**
   * Get element in focus.
   * @returns {Element} Element in focus.
   */
  getElementInFocus() {
    return this.elements.find((element) => element.hasFocus());
  }

  /**
   * Update element position
   * @param {number} index Map element index.
   * @param {number} x X position as percentage value.
   * @param {number} y Y position as percentage value.
   */
  updateElementPosition(index, x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') {
      return;
    }

    // eslint-disable-next-line no-magic-numbers
    x = Math.max(0, Math.min(100, x));
    // eslint-disable-next-line no-magic-numbers
    y = Math.max(0, Math.min(100, y));

    this.elements[index].updateParams({ x: x, y: y });
  }

  /**
   * Update element size.
   * @param {number} index Map element index.
   * @param {number} width Width as percentage value.
   * @param {number} height Height as percentage value.
   */
  updateElementSize(index, width, height) {
    this.elements[index].updateParams({ width: width, height: height });
  }

  /**
   * Convert px to respective % for map.
   * @param {object} [value] Value to convert.
   * @param {number} [value.x] X value to convert.
   * @param {number} [value.y] Y value to convert.
   * @returns {number} Percentage for map.
   */
  convertToPercent(value = {}) {
    if (typeof value.x === 'number') {
      // eslint-disable-next-line no-magic-numbers
      return value.x * 100 / this.elementArea.getSize().width;
    }

    if (typeof value.y === 'number') {
      // eslint-disable-next-line no-magic-numbers
      return value.y * 100 / this.elementArea.getSize().height;
    }

    return 0;
  }

  /**
   * Remove element after confirmation.
   * @param {Element} element Element to be removed.
   */
  removeElementIfConfirmed(element) {
    this.params.globals.get('showConfirmationDialog')({
      headerText: this.params.dictionary.get('l10n.confirmationDialogRemoveElementHeader'),
      dialogText: this.params.dictionary.get('l10n.confirmationDialogRemoveElementDialog'),
      cancelText: this.params.dictionary.get('l10n.confirmationDialogRemoveElementCancel'),
      confirmText: this.params.dictionary.get('l10n.confirmationDialogRemoveElementConfirm'),
      callbackConfirmed: () => {
        this.removeElement(element);
      }
    });
  }

  /**
   * Remove map element.
   * @param {Element} elementToRemove Element to be removed.
   */
  removeElement(elementToRemove) {
    const subContentId = elementToRemove.getSubContentId();

    this.listElements.remove(subContentId);

    // Remove element
    elementToRemove.remove();
    this.elements = this.elements.filter((element) => {
      return element.getSubContentId() !== subContentId;
    });

    this.params.elements = this.params.elements.filter((paramsElement) => {
      return paramsElement.contentType.subContentId !== subContentId;
    });

    // Re-index elements
    this.elements.forEach((element, elementIndex) => {
      element.setIndex(elementIndex);
    });

    this.dnbWrapper.blurAll();

    // Remove animations that are linked to this element
    this.animations
      .filter((animation) => animation.getSubContentId() === subContentId)
      .map((animation) => animation.getId())
      .forEach((id) => {
        this.removeAnimation(id);
      });

    this.callbacks.onChanged({
      elements: this.params.elements,
      animations: this.params.animations
    });
  }

  /**
   * Bring element to front.
   * @param {Element} element Map element to be brought to front.
   */
  bringToFront(element) {
    const elementIndex = this.params.elements.findIndex((paramsElement) => {
      return paramsElement.contentType.subContentId === element.getSubContentId();
    });

    this.params.elements.push(this.params.elements.splice(elementIndex, 1)[0]);

    this.elementArea.bringToFront(elementIndex);
    this.listElements.bringToFront(elementIndex);

    this.callbacks.onChanged({ elements: this.params.elements });
  }

  /**
   * Send element to back
   * @param {Element} element Element to be sent to back.
   */
  sendToBack(element) {
    const elementIndex = this.params.elements.findIndex((paramsElement) => {
      return paramsElement.contentType.subContentId === element.getSubContentId();
    });

    this.params.elements.unshift(this.params.elements.splice(elementIndex, 1)[0]);

    this.elementArea.sendToBack(elementIndex);
    this.listElements.sendToBack(elementIndex);

    this.callbacks.onChanged({ elements: this.params.elements });
  }

  /**
   * Edit map element.
   * @param {Element} element Map element to be edited.
   */
  editElement(element) {
    this.callbacks.showFormDialog({
      headline: this.params.dictionary.get('l10n.editElement'),
      form: element.getData().form,
      children: element.getData().children,
      returnFocusTo: document.activeElement,
      onDone: () => {
        const subContentId = element.getSubContentId();
        const elementParams = this.params.elements.find(
          (element) => element.contentType.subContentId === subContentId
        );
        element.updateParams(elementParams);

        // Update title in list of elements
        this.listElements.update(subContentId, {
          title: element.getTitle(),
          id: element.getSubContentId()
        });

        // Update title in list of animations
        this.animations
          .filter((animation) => {
            return animation.getSubContentId() === subContentId;
          })
          .map((animation) => animation.getId())
          .forEach((id) => {
            this.listAnimations.update(id, {
              title: element.getTitle()
            });
          });
      },
      onRemoved: () => {
        this.removeElementIfConfirmed(element);
      }
    });

    setTimeout(() => {
      this.dnbWrapper.blurAll();
    }, 0);
  }

  /**
   * Toggle highlight of element.
   * @param {string} subContentId Subcontent ID.
   * @param {boolean} state True to highlight, false to remove highlight.
   * @param {number} id Animation ID.
   */
  toggleHighlightElement(subContentId, state, id) {
    const element = this.getElementBySubContentId(subContentId);
    if (!element) {
      return;
    }

    if (state) {
      this.dnbWrapper.focus(element);
    }

    this.listElements.toggleHighlightElement(subContentId, state);
    if (id) {
      this.listAnimations.toggleHighlightElement(id, state);
    }
  }

  /**
   * Get element by subcontent ID.
   * @param {string} subContentId SubContentId.
   * @returns {Element} Element.
   */
  getElementBySubContentId(subContentId) {
    return this.elements.find((element) => element.getSubContentId() === subContentId);
  }

  /**
   * Change elements' z-position.
   * @param {number} indexSource Index of source element.
   * @param {number} indexTarget Index of target element.
   * @param {boolean} [active] If true, active element.
   */
  changeElementZPosition(indexSource, indexTarget, active = true) {
    if (
      typeof indexSource !== 'number' || indexSource < 0 || indexSource > this.params.elements.length - 1 ||
      typeof indexTarget !== 'number' || indexTarget < 0 || indexTarget > this.params.elements.length - 1
    ) {
      return;
    }

    this.elementArea.swapElements(indexSource, indexTarget);
    this.listElements.swapElements(indexSource, indexTarget, !active);

    [this.params.elements[indexSource], this.params.elements[indexTarget]] =
      [this.params.elements[indexTarget], this.params.elements[indexSource]];

    this.callbacks.onChanged({ elements: this.params.elements });
  }
}
