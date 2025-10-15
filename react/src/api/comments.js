import instance from './axios';

// List comments for a listing
export async function getComments(listingId) {
  const res = await instance.get(`/api/listings/${listingId}/comments`);
  return res.data?.data || [];
}

// Create a comment for a listing
// payload must be: { nameKey, text }
export async function createComment(listingId, payload) {
  const res = await instance.post(`/api/listings/${listingId}/comments`, payload);
  return res.data?.data;
}

// Like a comment
export async function likeComment(commentId) {
  return (await instance.post(`/api/comments/${commentId}/like`)).data?.data;
}

// Unlike a comment
export async function unlikeComment(commentId) {
  return (await instance.post(`/api/comments/${commentId}/unlike`)).data?.data;
}

// Get popular comments for a listing
export async function getPopularComments(listingId, limit = 2) {
  return (
    await instance.get(`/api/listings/${listingId}/comments/popular`, { params: { limit } })
  ).data?.data || [];
}

// =========================
// Accounts comments support
// =========================

// List comments for an account
export async function getAccountComments(accountId) {
  const res = await instance.get(`/api/accounts/${accountId}/comments`);
  return res.data?.data || [];
}

// Create a comment for an account
// payload must be: { nameKey, text }
export async function createAccountComment(accountId, payload) {
  const res = await instance.post(`/api/accounts/${accountId}/comments`, payload);
  return res.data?.data;
}

// Get popular comments for an account
export async function getPopularAccountComments(accountId, limit = 2) {
  return (
    await instance.get(`/api/accounts/${accountId}/comments/popular`, { params: { limit } })
  ).data?.data || [];
}
