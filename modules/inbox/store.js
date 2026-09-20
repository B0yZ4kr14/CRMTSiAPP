async function listConversations(pool, { tenantId, limit = 20, cursor, query }) {
  const params = [tenantId, limit];
  let where = 'where tenant_id = $1';
  if (query) {
    where += ' and search_vector @@ plainto_tsquery($3)';
    params.push(query);
  }
  if (cursor) {
    where += ' and created_at < $4'; // simple keyset
    params.push(cursor);
  }
  const { rows } = await pool.query(`select * from conversations ${where} order by created_at desc limit $2`, params);
  return rows;
}

module.exports = { listConversations };
