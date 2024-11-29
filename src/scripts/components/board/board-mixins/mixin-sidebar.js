import Sidebar from '../sidebar/sidebar.js';
import DraggablesList from '../sidebar/draggables-list.js';

export default class MixinSidebar {

  /**
   * Build sidebar.
   */
  buildSidebar() {
    this.listElements = new DraggablesList(
      {
        dictionary: this.params.dictionary,
        title: this.params.dictionary.get('l10n.elements'),
        reversed: true,
        canToggleVisibility: true,
      },
      {
        highlight: (subContentId, state) => {
          this.toggleHighlightElement(subContentId, state);
        },
        move: (sourceIndex, moveOffset, active) => {
          this.changeElementZPosition(sourceIndex, moveOffset, active);
        },
        edit: (subContentId) => {
          this.editElement(this.getElementBySubContentId(subContentId));
        },
        remove: (subContentId) => {
          this.removeElementIfConfirmed(this.getElementBySubContentId(subContentId));
        },
        toggleVisibility: (subContentId) => {
          this.toggleElementVisibility(subContentId);
        }
      }
    );

    this.listAnimations = new DraggablesList(
      {
        dictionary: this.params.dictionary,
        title: this.params.dictionary.get('l10n.animations'),
        addButtonLabel: this.params.dictionary.get('a11y.addAnimation'),
      },
      {
        highlight: (id, state) => {
          const animation = this.animations.find((animation) => animation.getId() === id);
          this.toggleHighlightElement(animation.getSubContentId(), state, id);
        },
        move: (sourceIndex, moveOffset, active) => {
          this.changeAnimationOrder(sourceIndex, moveOffset, active);
        },
        edit: (id) => {
          this.editAnimation(id);
        },
        remove: (id) => {
          this.removeAnimationIfConfirmed(id);
        }
      }
    );

    this.sidebar = new Sidebar({ subComponents: [this.listElements, this.listAnimations] });
  }

  /**
   * Toggle the sidebar.
   * @param {boolean} [state] True to show, false to hide.
   */
  toggleSidebar(state) {
    this.isListViewActive = state ?? !this.isListViewActive;

    if (this.isListViewActive) {
      this.sidebar.show();
    }
    else {
      this.sidebar.hide();
    }

    this.resize();
  }

  /**
   * Handle document mouse down.
   * @param {MouseEvent} event Mouse event.
   */
  handleDocumentMouseDown(event) {
    if (event.target !== this.sidebar.getDOM() && !this.sidebar.getDOM().contains(event.target)) {
      this.listAnimations.toggleHighlightElement(null, false);
      this.listElements.toggleHighlightElement(null, false);
    }

    this.listAnimations.handleDocumentMouseDown(event);
    this.listElements.handleDocumentMouseDown(event);

    const dnbFocusTimeout = 100; // DnB requires some time before it updates the focus
    window.setTimeout(() => {
      if (this.getElementInFocus()) {
        this.listAnimations.enableAddButton();
      }
      else {
        this.listAnimations.disableAddButton();
      }
    }, dnbFocusTimeout);
  }

  /**
   * Toggle element visibility.
   * @param {string} subContentId Subcontent Id of element to toggle.
   * @param {boolean} [state] True to show, false to hide.
   */
  toggleElementVisibility(subContentId, state) {
    const element = this.getElementBySubContentId(subContentId);
    element.updateParams({ hidden: !(state ?? !element.isVisible()) });
    const elementIsVisible = element.isVisible(); // Check after toggling

    if (elementIsVisible) {
      this.dnbWrapper.focus(element);
    }

    this.listElements.toggleVisibility(subContentId, elementIsVisible);
  }
}
