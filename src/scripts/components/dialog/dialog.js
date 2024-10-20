import FocusTrap from '@services/focus-trap.js';
import Util from '@services/util.js';
import './dialog.scss';

export default class Dialog {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onDone: () => {},
      onRemoved: () => {}
    }, callbacks);

    this.headline = document.createElement('div');
    this.headline.classList.add('h5p-editor-animator-dialog-headline');
    const headerId = H5P.createUUID();
    this.headline.setAttribute('id', headerId);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-dialog');
    this.dom.setAttribute('role', 'dialog');
    this.dom.setAttribute('aria-modal', 'true');
    this.dom.setAttribute('aria-labelledby', headerId);

    this.dom.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.handleRemove();
      }
    });

    const content = document.createElement('div');
    content.classList.add('h5p-editor-animator-dialog-content');
    this.dom.appendChild(content);

    content.append(this.headline);

    this.dialogInner = document.createElement('div');
    this.dialogInner.classList.add('h5p-editor-animator-dialog-inner');

    const buttons = document.createElement('div');
    buttons.classList.add('h5p-editor-animator-dialog-buttons');

    const buttonDone = document.createElement('button');
    buttonDone.classList.add('h5p-editor-animator-dialog-button');
    buttonDone.classList.add('h5p-editor-done');
    buttonDone.innerText = this.params.dictionary.get('l10n.done');
    buttonDone.addEventListener('click', () => {
      this.handleDone();
    });
    buttons.appendChild(buttonDone);

    const buttonRemove = document.createElement('button');
    buttonRemove.classList.add('h5p-editor-animator-dialog-button');
    buttonRemove.classList.add('h5p-editor-remove');
    buttonRemove.innerText = this.params.dictionary.get('l10n.remove');
    buttonRemove.addEventListener('click', () => {
      this.handleRemove();
    });
    buttons.appendChild(buttonRemove);

    content.appendChild(this.dialogInner);
    content.appendChild(buttons);

    this.focusTrap = new FocusTrap({
      trapElement: this.dom,
      closeElement: buttonRemove,
      fallbackContainer: this.dom
    });

    this.hide();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
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
   * Show dialog form.
   * @param {object} [params] Parameters.
   * @param {HTMLElement} params.form Form.
   */
  showForm(params = {}) {
    this.returnFocusTo = params.returnFocusTo ?? null;
    this.children = params.children ?? null;

    this.headline.innerText = params.headline ?? '';
    this.headline.classList.toggle('display-none', !params.headline);

    this.callbacks.onDone = params.onDone ?? (() => {});
    this.callbacks.onRemoved = params.onRemoved ?? (() => {});

    this.dialogInner.appendChild(params.form);
    this.show();
    this.focusTrap.activate();
  }

  /**
   * Hide dialog form.
   */
  hideForm() {
    this.dialogInner.innerHTML = '';
    this.hide();
    this.focusTrap.deactivate();

    if (this.returnFocusTo) {
      this.returnFocusTo.focus();
    }
  }

  /**
   * Handle "done" option in dialog.
   * @returns {boolean} False.
   */
  handleDone() {
    const isValid = this.validateFormChildren(this.form, this.children);
    if (isValid) {
      this.hideForm();
      this.callbacks.onDone();
      return true;
    }

    return isValid;
  }

  /**
   * Handle "remove" option in dialog.
   */
  handleRemove() {
    this.callbacks.onRemoved();
    this.hideForm();
  }

  /**
   * Validate form children.
   * @param {object} form Form to be validated.
   * @param {object} children Children to be validated.
   * @returns {boolean} True if form is valid, else false.
   */
  validateFormChildren(form, children) {
    if (!form || !children) {
      return true;
    }

    /*
     * `some` would be quicker than `every`, but all fields should display
     * their validation message
     */
    return children.every((child) => {
      // Accept incomplete subcontent, but not no subcontent
      if (child instanceof H5PEditor.Library && !child.validate()) {
        if (child.$select.get(0).value !== '-') {
          return true; // Some subcontent is selected at least
        }

        const errors = form
          .querySelector('.field.library .h5p-errors');

        if (errors) {
          errors.innerHTML = `<p>${this.params.dictionary.get('l10n.contentRequired')}</p>`;
        }

        return false;
      }

      return child.validate() ?? true; // Some widgets return `undefined` instead of true
    });
  }
}
