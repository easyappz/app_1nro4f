'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isDigitCharCode(code) {
  return code >= 48 && code <= 57; // 0-9
}

function isHexAlphaCharCode(code) {
  // A-F or a-f
  return (code >= 65 && code <= 70) || (code >= 97 && code <= 102);
}

function isAllDigits(str) {
  if (!isNonEmptyString(str)) return false;
  const s = String(str).trim();
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (!isDigitCharCode(c)) return false;
  }
  return true;
}

function isAllHex(str) {
  if (!isNonEmptyString(str)) return false;
  const s = String(str).trim();
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (!isDigitCharCode(c) && !isHexAlphaCharCode(c)) return false;
  }
  return true;
}

// Acceptable id can be either:
// - numeric only, length >= 6 (as before)
// - hex-like (0-9, a-f, A-F), length >= 8
function isAcceptableId(str) {
  if (!isNonEmptyString(str)) return false;
  const s = String(str).trim();
  if (s.length >= 6 && isAllDigits(s)) return true;
  if (s.length >= 8 && isAllHex(s)) return true;
  return false;
}

function tryExtractIdFromSegments(segment) {
  // Try split on common delimiters without regex and pick the last acceptable candidate
  const parts = String(segment)
    .split('/')
    .map((p) => String(p).trim())
    .filter(Boolean)
    .flatMap((p) => p.split('-'))
    .flatMap((p) => p.split('_'))
    .map((p) => p.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (isAcceptableId(parts[i])) return parts[i];
  }
  return '';
}

function extractIdFromJsonLd(json) {
  // Recursively traverse to find id-like fields
  const candidates = ['sku', 'productID', 'productId', 'id', 'identifier', 'offerId', 'userId', 'sellerId'];
  function walk(node) {
    if (node == null) return '';
    if (typeof node === 'string' || typeof node === 'number') {
      const s = String(node).trim();
      if (isAcceptableId(s)) return s;
      return '';
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i += 1) {
        const v = walk(node[i]);
        if (isNonEmptyString(v)) return v;
      }
      return '';
    }
    if (typeof node === 'object') {
      // First pass: look for known keys
      for (const key of Object.keys(node)) {
        const value = node[key];
        if (candidates.includes(key)) {
          const s = String(value).trim();
          if (isAcceptableId(s)) return s;
          // Some JSON-LD may embed composite strings, try splits
          const composite = tryExtractIdFromSegments(s);
          if (isNonEmptyString(composite)) return composite;
        }
      }
      // Second pass: deep walk
      for (const key of Object.keys(node)) {
        const v = walk(node[key]);
        if (isNonEmptyString(v)) return v;
      }
      return '';
    }
    return '';
  }
  return walk(json);
}

async function fetchAvitoDetails(url) {
  try {
    const rawUrl = String(url || '').trim();
    if (!rawUrl) {
      throw new Error('URL is empty');
    }

    const response = await axios.get(rawUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Title
    let title = $('meta[property="og:title"]').attr('content');
    if (!isNonEmptyString(title)) {
      title = $('title').first().text();
    }
    title = isNonEmptyString(title) ? title.trim() : '';

    // Main image
    let mainImageUrl = $('meta[property="og:image"]').attr('content');
    mainImageUrl = isNonEmptyString(mainImageUrl) ? mainImageUrl.trim() : '';

    // Canonical URL
    let canonicalUrl = $('link[rel="canonical"]').attr('href');
    if (!isNonEmptyString(canonicalUrl)) {
      canonicalUrl = $('meta[property="og:url"]').attr('content');
    }
    canonicalUrl = isNonEmptyString(canonicalUrl) ? canonicalUrl.trim() : rawUrl;

    // avitoId from JSON-LD
    let avitoId = '';
    try {
      const scripts = $('script[type="application/ld+json"]');
      scripts.each((_, el) => {
        if (isNonEmptyString(avitoId)) return;
        const txt = $(el).contents().text();
        try {
          const json = JSON.parse(txt);
          const found = extractIdFromJsonLd(json);
          if (isNonEmptyString(found)) avitoId = found;
        } catch (e) {
          // ignore parse error
        }
      });
    } catch (e) {
      // ignore
    }

    // Fallback: parse from URL path and params (no regex). Keep path first for listings.
    if (!isNonEmptyString(avitoId)) {
      try {
        const u = new URL(canonicalUrl || rawUrl);
        const pathSegments = u.pathname
          .split('/')
          .map((s) => s.trim())
          .filter(Boolean);
        for (let i = pathSegments.length - 1; i >= 0; i -= 1) {
          const candidate = tryExtractIdFromSegments(pathSegments[i]);
          if (isNonEmptyString(candidate)) {
            avitoId = candidate;
            break;
          }
        }
        if (!isNonEmptyString(avitoId)) {
          const paramKeys = Array.from(u.searchParams.keys());
          for (const k of paramKeys) {
            const v = u.searchParams.get(k) || '';
            const candidate = tryExtractIdFromSegments(v);
            if (isNonEmptyString(candidate)) {
              avitoId = candidate;
              break;
            }
          }
        }
      } catch (e) {
        // ignore URL parse
      }
    }

    if (!isNonEmptyString(avitoId)) {
      throw new Error('Unable to resolve avitoId from page content or URL');
    }

    return {
      title,
      avitoId,
      mainImageUrl,
      canonicalUrl
    };
  } catch (error) {
    throw new Error(`Failed to fetch Avito details: ${error.message}`);
  }
}

async function fetchAvitoAccountDetails(url) {
  try {
    const rawUrl = String(url || '').trim();
    if (!rawUrl) {
      throw new Error('URL is empty');
    }

    const response = await axios.get(rawUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // displayName
    let displayName = $('meta[property="og:title"]').attr('content');
    if (!isNonEmptyString(displayName)) {
      displayName = $('title').first().text();
    }
    if (isNonEmptyString(displayName)) {
      // Trim common separators without regex
      const partsPipe = displayName.split('|');
      if (partsPipe.length > 1) displayName = partsPipe[0];
      const partsDash = displayName.split('—');
      if (partsDash.length > 1) displayName = partsDash[0];
      displayName = displayName.trim();
    } else {
      displayName = '';
    }

    // avatarUrl
    let avatarUrl = $('meta[property="og:image"]').attr('content');
    if (!isNonEmptyString(avatarUrl)) {
      let found = '';
      $('img').each((_, el) => {
        if (isNonEmptyString(found)) return;
        const src = $(el).attr('src') || $(el).attr('data-src') || '';
        const s = String(src).trim();
        if (s && s.toLowerCase().includes('avatar')) {
          found = s;
        }
      });
      avatarUrl = found;
    }
    avatarUrl = isNonEmptyString(avatarUrl) ? avatarUrl.trim() : '';

    // canonicalUrl
    let canonicalUrl = $('link[rel="canonical"]').attr('href');
    if (!isNonEmptyString(canonicalUrl)) {
      canonicalUrl = $('meta[property="og:url"]').attr('content');
    }
    canonicalUrl = isNonEmptyString(canonicalUrl) ? canonicalUrl.trim() : rawUrl;

    // avitoUserId from JSON-LD or data attributes
    let avitoUserId = '';
    try {
      const scripts = $('script[type="application/ld+json"]').toArray();
      for (let i = 0; i < scripts.length; i += 1) {
        if (isNonEmptyString(avitoUserId)) break;
        const txt = $(scripts[i]).contents().text();
        try {
          const json = JSON.parse(txt);
          const found = extractIdFromJsonLd(json);
          if (isNonEmptyString(found)) avitoUserId = found;
        } catch (e) {
          // ignore parse
        }
      }
    } catch (e) {
      // ignore
    }

    if (!isNonEmptyString(avitoUserId)) {
      // Try attributes commonly used for user id
      let foundAttr = '';
      const candidates = ['data-user-id', 'data-seller-id', 'data-owner-id', 'data-entity-id'];
      $('*').each((_, el) => {
        if (isNonEmptyString(foundAttr)) return;
        for (let i = 0; i < candidates.length; i += 1) {
          const v = $(el).attr(candidates[i]);
          if (!isNonEmptyString(v)) continue;
          const val = String(v).trim();
          // Try direct value first
          if (isAcceptableId(val)) {
            foundAttr = val;
            break;
          }
          // Try split-based extraction
          const composite = tryExtractIdFromSegments(val);
          if (isNonEmptyString(composite)) {
            foundAttr = composite;
            break;
          }
        }
      });
      if (isNonEmptyString(foundAttr)) avitoUserId = foundAttr;
    }

    // Fallback: parse from URL
    if (!isNonEmptyString(avitoUserId)) {
      try {
        const u = new URL(canonicalUrl || rawUrl);

        // 1) Prefer sellerId query parameter (case-insensitive)
        const keys = Array.from(u.searchParams.keys());
        let sellerKey = '';
        for (let i = 0; i < keys.length; i += 1) {
          const k = keys[i];
          if (String(k).toLowerCase() === 'sellerid') {
            sellerKey = k;
            break;
          }
        }
        if (sellerKey) {
          const v = u.searchParams.get(sellerKey) || '';
          const candidateFromSeller = tryExtractIdFromSegments(v);
          if (isNonEmptyString(candidateFromSeller)) {
            avitoUserId = candidateFromSeller;
          }
        }

        // 2) If not found, scan other params
        if (!isNonEmptyString(avitoUserId)) {
          for (let i = 0; i < keys.length; i += 1) {
            const k = keys[i];
            if (k === sellerKey) continue;
            const v = u.searchParams.get(k) || '';
            const candidate = tryExtractIdFromSegments(v);
            if (isNonEmptyString(candidate)) {
              avitoUserId = candidate;
              break;
            }
          }
        }

        // 3) If still not found, scan path segments
        if (!isNonEmptyString(avitoUserId)) {
          const segments = u.pathname
            .split('/')
            .map((s) => s.trim())
            .filter(Boolean);
          for (let i = segments.length - 1; i >= 0; i -= 1) {
            const candidate = tryExtractIdFromSegments(segments[i]);
            if (isNonEmptyString(candidate)) {
              avitoUserId = candidate;
              break;
            }
          }
        }
      } catch (e) {
        // ignore URL parse
      }
    }

    if (!isNonEmptyString(avitoUserId)) {
      throw new Error('Unable to resolve avitoUserId from page content or URL');
    }

    return {
      displayName: isNonEmptyString(displayName) ? displayName : '',
      avitoUserId,
      avatarUrl,
      canonicalUrl
    };
  } catch (error) {
    throw new Error(`Failed to fetch Avito account details: ${error.message}`);
  }
}

module.exports = { fetchAvitoDetails, fetchAvitoAccountDetails };