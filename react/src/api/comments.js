import instance from './axios';

// List comments for a listing
export async function getComments(listingId) {
  const res = await instance.get(`/api/listings/${listingId}/comments`);
  return res.data?.data || [];
}

// Create a comment for a listing
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
