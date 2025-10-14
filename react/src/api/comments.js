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
