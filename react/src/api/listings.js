import instance from './axios';

// Resolve listing by Avito URL
export async function resolveListing(url) {
  const res = await instance.post('/api/listings/resolve', { url });
  return res.data?.data;
}

// Get popular listings with an optional limit
export async function getPopular(limit = 20) {
  const res = await instance.get('/api/listings/popular', { params: { limit } });
  return res.data?.data || [];
}

// Get listing by id (increments views)
export async function getListingById(id) {
  const res = await instance.get(`/api/listings/${id}`);
  return res.data?.data;
}
