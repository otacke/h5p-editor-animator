import Util from '@services/util.js';

export default class Animation {
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onChanged: () => {}
    }, callbacks);

    const formData = this.generateForm(this.params.semantics, this.params.params, this.params.originalInstance);
    this.form = formData.form;
    this.children = formData.children;
  }

  /**
   * Get form.
   * @returns {object} Form object.
   */
  getForm() {
    return this.form;
  }

  /**
   * Get children.
   * @returns {object} Children.
   */
  getChildren() {
    return this.children;
  }

  /**
   * Get id.
   * @returns {number} Id.
   */
  getId() {
    return this.params.id;
  }

  /**
   * Generate form.
   * @param {object} semantics Semantics for form.
   * @param {object} params Parameters for form.
   * @param {object} originalInstance Original editor widget instance.
   * @returns {object} Form object with DOM and H5P widget instances.
   */
  generateForm(semantics, params, originalInstance) {
    const form = document.createElement('div');

    H5PEditor.processSemanticsChunk(
      semantics,
      params,
      H5P.jQuery(form),
      originalInstance
    );

    return {
      form: form,
      children: originalInstance.children
    };
  }

  /**
   * Get parameters.
   * @returns {object} Parameters.
   */
  getParams() {
    return this.params.params;
  }

  /**
   * Get subContentId of element that the animation is attached to.
   * @returns {string} SubContentId.
   */
  getSubContentId() {
    return this.params.params.subContentId;
  }

  /**
   * Update parameters. Assuming all properties to use percentage.
   * @param {object} [params] Parameters.
   */
  updateParams(params = {}) {
    // TODO: Sanitize parameters if necessary
    this.callbacks.onChanged(this.getId(), this.getParams());
  }
}
