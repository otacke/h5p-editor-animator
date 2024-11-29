import Animation from '@models/animation.js';

export default class MixinAnimations {
  /**
   * Create animation.
   * @param {object} params Parameters of the animation.
   * @returns {Animation} Animation instance.
   */
  createAnimation(params = {}) {
    const animation = new Animation(
      {
        id: H5P.createUUID(),
        semantics: this.params.animationsFields,
        params: params,
        originalInstance: this.params.globals.get('animationsGroupInstance')
      },
      {
        onChanged: (id, elementParams) => {
          const index = this.animations.findIndex((animation) => animation.getId() === id);
          this.params.animations[index] = elementParams;

          this.callbacks.onChanged({ animations: this.params.animations });
        }
      }
    );

    this.animations.push(animation);

    const element = this.getElementBySubContentId(params.subContentId);
    const details = [
      this.params.dictionary.get(`l10n.animation.${params.effect}`),
      this.params.dictionary.get(`l10n.animation.${params.startWith}`),
      `${params.duration}s`
    ].join(' \u00b7 ');

    this.listAnimations.add({
      title: element.getTitle(),
      details: details,
      id: animation.getId()
    });

    return animation;
  }

  /**
   * Remove animation after confirmation.
   * @param {string} id Id of the animation to be removed.
   */
  removeAnimationIfConfirmed(id) {
    this.params.globals.get('showConfirmationDialog')({
      headerText: this.params.dictionary.get('l10n.confirmationDialogRemoveAnimationHeader'),
      dialogText: this.params.dictionary.get('l10n.confirmationDialogRemoveAnimationDialog'),
      cancelText: this.params.dictionary.get('l10n.confirmationDialogRemoveAnimationCancel'),
      confirmText: this.params.dictionary.get('l10n.confirmationDialogRemoveAnimationConfirm'),
      callbackConfirmed: () => {
        this.removeAnimation(id);
      }
    });
  }

  /**
   * Remove animation.
   * @param {string} id Id of the animation to be removed.
   */
  removeAnimation(id) {
    this.listAnimations.remove(id);

    const animationToDelete = this.animations.find((animation) => animation.getId() === id);
    const elementSubContentId = animationToDelete.getSubContentId();

    this.animations = this.animations
      .filter((animation) => animation.getId() !== id);
    this.params.animations = this.params.animations
      .filter((animation) => animation.subContentId !== elementSubContentId);

    this.callbacks.onChanged({ animations: this.params.animations });
  }

  /**
   * Edit animation.
   * @param {string} id Id of animation to be edited.
   */
  editAnimation(id) {
    let animation = this.animations.find((animation) => animation.getId() === id);
    if (!animation) {
      const element = this.getElementInFocus();
      if (element) {
        animation = this.createAnimation({
          subContentId: element.getSubContentId()
        });
        id = animation.getId();
      }
    }

    if (!animation) {
      return;
    }

    this.callbacks.showFormDialog({
      headline: this.params.dictionary.get('l10n.editAnimation'),
      form: animation.getForm(),
      children: animation.getChildren(),
      returnFocusTo: document.activeElement,
      onDone: () => {
        const params = animation.getParams();
        animation.updateParams(params);

        const element = this.getElementBySubContentId(params.subContentId);

        const details = [
          this.params.dictionary.get(`l10n.animation.${params.effect}`),
          this.params.dictionary.get(`l10n.animation.${params.startWith}`),
          `${params.duration}s`
        ].join(' \u00b7 ');

        this.listAnimations.update(
          animation.getId(),
          {
            title: element.getTitle(),
            details: details,
          }
        );
      },
      onRemoved: () => {
        this.removeAnimationIfConfirmed(id);
      }
    });

    setTimeout(() => {
      this.dnbWrapper.blurAll();
    }, 0);
  }

  /**
   * Change animations' order.
   * @param {number} indexSource Index of source animation.
   * @param {number} indexTarget Index of target animation.
   * @param {boolean} [active] If true, active animation.
   */
  changeAnimationOrder(indexSource, indexTarget, active = true) {
    if (
      typeof indexSource !== 'number' || indexSource < 0 || indexSource > this.params.animations.length - 1 ||
      typeof indexTarget !== 'number' || indexTarget < 0 || indexTarget > this.params.animations.length - 1
    ) {
      return;
    }
    this.listAnimations.swapElements(indexSource, indexTarget, !active);

    [this.params.animations[indexSource], this.params.animations[indexTarget]] =
      [this.params.animations[indexTarget], this.params.animations[indexSource]];

    this.callbacks.onChanged({ animations: this.params.animations });
  }
}
