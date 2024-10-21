import Board from '@components/board/board.js';
import Dialog from '@components/dialog/dialog.js';
import Util from '@services/util.js';

import PreviewOverlay from '@components/preview/preview-overlay.js';
import Readspeaker from '@services/readspeaker.js';

import './main.scss';

export default class Main {
  constructor(params = {}, callbacks = {}) {
    this.params = params;
    this.callbacks = Util.extend({
      onChanged: () => {},
      getPreviewParams: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-main');

    this.board = new Board(
      this.params,
      {
        onChanged: (values) => {
          this.callbacks.onChanged(values);
        },
        showFormDialog: (params) => {
          this.dialog.showForm(params);
        },
        togglePreview: () => {
          this.openPreview();
        }
      }
    );
    this.dom.append(this.board.getDOM());

    this.dialog = new Dialog({ dictionary: this.params.dictionary });
    this.dom.appendChild(this.dialog.getDOM());

    this.previewOverlay = new PreviewOverlay(
      {
        dictionary: this.params.dictionary
      },
      {
        onDone: () => {
          this.closePreview();
        }
      }
    );
    this.dom.append(this.previewOverlay.getDOM());
  }

  getDOM() {
    return this.dom;
  }

  resize(params) {
    this.board.resize(params);
  }

  handleDocumentMouseDown(event) {
    this.board.handleDocumentMouseDown(event);
  }

  /**
   * Set background color.
   * @param {string} color Color as CSS unit.
   */
  setBackgroundColor(color) {
    this.board.setBackgroundColor(color);
  }

  /**
   * Set background image.
   * @param {object} imageData Paremeters from H5P editor image widget.
   */
  setBackgroundImage(imageData) {
    this.board.setBackgroundImage(imageData);
  }

  /**
   * Set aspect ratio.
   * @param {number|string} value Aspect ratio.
   */
  setAspectRatio(value) {
    this.board.setAspectRatio(value);
  }

  /**
   * Open preview.
   */
  openPreview() {
    this.createPreviewInstance();
    if (!this.previewInstance) {
      return;
    }

    this.previewOverlay.show();
    this.previewOverlay.attachInstance(this.previewInstance);

    Readspeaker.read(this.params.dictionary.get('a11y.previewOpened'));
  }

  /**
   * Close preview.
   */
  closePreview() {
    this.previewInstance = null;
    this.previewOverlay.decloak();
    this.previewOverlay.hide();

    Readspeaker.read(this.params.dictionary.get('a11y.previewClosed'));
  }

  /**
   * Create preview instance.
   */
  createPreviewInstance() {
    const libraryUberName = Object.keys(H5PEditor.libraryLoaded)
      .find((library) => library.split(' ')[0] === 'H5P.Animator');

    this.previewInstance = H5P.newRunnable(
      {
        library: libraryUberName,
        params: this.callbacks.getPreviewParams(),
      },
      H5PEditor.contentId || 1,
      undefined,
      undefined,
      { metadata: { title: this.contentTitle } }
    );

    if (!this.previewInstance) {
      return;
    }
  }
}
