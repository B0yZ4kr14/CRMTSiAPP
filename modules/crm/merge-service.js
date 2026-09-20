function previewMerge({ primary, secondary }) {
  return { ...secondary, ...primary };
}

module.exports = { previewMerge };
