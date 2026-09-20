function createArticle({ title, content, version = 1 }) {
  return { title, content, version, status: 'published' };
}

module.exports = { createArticle };
