'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

async function fetchAvitoTitle(url) {
  try {
    const response = await axios.get(url, {
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

    let title = $('meta[property="og:title"]').attr('content');
    if (!title || !title.trim()) {
      title = $('title').first().text();
    }

    if (typeof title === 'string') {
      title = title.trim();
    }

    return title || '';
  } catch (error) {
    throw new Error(`Failed to fetch Avito title: ${error.message}`);
  }
}

module.exports = { fetchAvitoTitle };
