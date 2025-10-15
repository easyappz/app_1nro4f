import instance from './axios';

// Resolve account by Avito URL
export async function resolveAccount(url) {
  const res = await instance.post('/api/accounts/resolve', { url });
  return res.data?.data;
}

// Get popular accounts with an optional limit
export async function getPopularAccounts(limit = 20) {
  const res = await instance.get('/api/accounts/popular', { params: { limit } });
  return res.data?.data || [];
}

// Get account by id (increments views)
export async function getAccountById(id) {
  const res = await instance.get(`/api/accounts/${id}`);
  return res.data?.data;
}
