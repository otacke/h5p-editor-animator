/**
 * Determine valid subcontent options from H5P editor.
 * @async
 * @param {object} field Semantics field object from H5P editor.
 * @returns {object[]} Valid subcontent options.
 */
export const determineValidSubContentOptions = async (field) => {
  const contentTypeField = H5PEditor.findSemanticsField('contentType', field);
  const subContentOptions = contentTypeField?.options ?? [];

  const libraries = await new Promise((resolve) => {
    H5PEditor.LibraryListCache.getLibraries(subContentOptions, resolve);
  });

  return libraries.filter((library) =>
    !library.isRestricted && subContentOptions.includes(library.uberName),
  );
};

/**
 * Get uber name of library.
 * @param {string} machineName Machine name of library (e.g. H5P.Foobar).
 * @returns {string} Uber name of Animator library (e.g. H5P.Foobar 1.4).
 */
export const getUberName = (machineName = '') => {
  return Object
    .keys(H5PEditor.libraryLoaded)
    .find((library) => library.split(' ')[0] === machineName);
};
