import ToolbarMain from '../toolbar/toolbar-main.js';
import ToolbarGroup from '../toolbar/toolbar-group.js';

/** @constant {string} KEY_SHORTCUTS_ZOOM_IN Key shortcut for zooming in. */
export const KEY_SHORTCUTS_ZOOM_IN = '+';

/** @constant {string} KEY_SHORTCUTS_ZOOM_OUT Key shortcut for zooming out. */
export const KEY_SHORTCUTS_ZOOM_OUT = '-';

export default class MixinToolbar {
  /**
   * Build toolbar.
   * @param {HTMLElement} dnbDOMElement DNB Wrapper DOM element.
   */
  buildToolbar(dnbDOMElement) {
    // Toolbar components
    const contentButtons = new ToolbarGroup(
      {
        dnbDOM: dnbDOMElement,
        a11y: {
          contentTypeWrapper: this.params.dictionary.get('a11y.contentTypeWrapper'),
          pasteContent: this.params.dictionary.get('a11y.pasteContent'),
          toolbarLabel: this.params.dictionary.get('a11y.toolbarLabelContents')
        },
        ariaControlsId: this.elementArea.getID()
      }, {
        onKeydown: (createdElement) => {
          const element = this.elements.find((element) => element.getDOM() === createdElement);
          if (!element) {
            return;
          }

          this.editElement(element);
        }
      }
    );

    const toolbarButtons = [
      {
        id: 'list-view',
        tooltip: this.params.dictionary.get('l10n.toolbarButtonListView'),
        type: 'toggle',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonListViewActive'),
          inactive: this.params.dictionary.get('a11y.buttonListViewInactive'),
        },
        onClick: () => {
          this.toggleSidebar();
        }
      },
      {
        id: 'zoom-in',
        tooltip: this.params.dictionary.get('l10n.toolbarButtonZoomIn'),
        type: 'pulse',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonZoomInActive'),
          disabled: this.params.dictionary.get('a11y.buttonZoomInDisabled'),
        },
        keyshortcuts: KEY_SHORTCUTS_ZOOM_IN,
        onClick: () => {
          this.elementArea.zoomIn();
        }
      },
      {
        id: 'zoom-out',
        tooltip: this.params.dictionary.get('l10n.toolbarButtonZoomOut'),
        type: 'pulse',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonZoomOutActive'),
          disabled: this.params.dictionary.get('a11y.buttonZoomOutDisabled'),
        },
        keyshortcuts: KEY_SHORTCUTS_ZOOM_OUT,
        onClick: () => {
          this.elementArea.zoomOut();
        }
      },
      {
        id: 'preview',
        tooltip: this.params.dictionary.get('l10n.toolbarButtonPreview'),
        type: 'pulse',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonPreview'),
        },
        onClick: () => {
          this.dnbWrapper.blurAll();
          this.callbacks.togglePreview();
        }
      }
    ];

    this.actionButtons = new ToolbarGroup({
      buttons: toolbarButtons,
      className: 'h5p-editor-animator-toolbar-action',
      a11y: {
        toolbarLabel: this.params.dictionary.get('a11y.toolbarLabelActions')
      },
      ariaControlsId: this.elementArea.getID()
    }, {});

    this.toolbar = new ToolbarMain(
      {
        contentButtonsDOM: contentButtons.getDOM(),
        actionButtonsDOM: this.actionButtons.getDOM()
      }
    );
  }

  /**
   * Handle key down event.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    if (KEY_SHORTCUTS_ZOOM_IN.split(' ').includes(event.key)) {
      this.elementArea.zoomIn();
    }
    else if (KEY_SHORTCUTS_ZOOM_OUT.split(' ').includes(event.key)) {
      this.elementArea.zoomOut();
    }
  }

  /**
   * Create button for toolbar.
   * @param {object} [params] Parameters of H5P library.
   * @returns {object} Button object for DragNBar.
   */
  createButton(params = {}) {
    // Button configuration is set by DragNBar :-/

    const title = params.title.toLowerCase();

    return {
      id: title,
      title: this.params.dictionary.get(`l10n.toolbarButton-${title}`),
      createElement: () => {
        return this.createElement({
          contentType: {
            library: params.uberName,
            params: {}
          }
        });
      }
    };
  }
}
