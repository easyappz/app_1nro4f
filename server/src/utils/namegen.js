'use strict';

const crypto = require('crypto');

function bytesFromKey(key) {
  const str = String(key == null ? '' : key);
  return crypto.createHash('sha256').update(str).digest();
}

function pick(list, byte) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list[byte % list.length];
}

function capitalizeWord(word) {
  if (!word) return word;
  const first = word.charAt(0).toUpperCase();
  const rest = word.slice(1);
  return first + rest;
}

const ADJECTIVES = [
  'Яркий', 'Смелый', 'Тихий', 'Быстрый', 'Умный', 'Солнечный', 'Северный', 'Ласковый', 'Мягкий',
  'Легкий', 'Сильный', 'Новый', 'Ловкий', 'Зоркий', 'Честный', 'Громкий', 'Теплый', 'Личный', 'Гибкий'
];

const ANIMALS = [
  'Сокол', 'Тигр', 'Лев', 'Пума', 'Панда', 'Енот', 'Лиса', 'Волк', 'Заяц', 'Кит', 'Дельфин', 'Орел',
  'Бобр', 'Ястреб', 'Сова', 'Слон', 'Еж', 'Носорог', 'Журавль', 'Крот'
];

const CONCEPTS = [
  'Ветер', 'Огонь', 'Луч', 'Мост', 'Ключ', 'Пиксель', 'Код', 'Звук', 'Свет', 'Поток', 'Снег', 'Лед'
];

// Pre-filtered short variants to help keep the final name <= 30 chars
const ADJECTIVES_SHORT = ADJECTIVES.filter(w => w.length <= 8);
const ANIMALS_SHORT = ANIMALS.filter(w => w.length <= 7);
const CONCEPTS_SHORT = CONCEPTS.filter(w => w.length <= 6);

function buildName(parts) {
  const cleaned = parts.filter(Boolean).map(capitalizeWord);
  return cleaned.join(' ');
}

function ensureMaxLength(name, buf, withThird) {
  const MAX = 30;
  if (name.length <= MAX) return name;

  // Try without third word first
  if (withThird) {
    const noThird = name.split(' ').slice(0, 2).join(' ');
    if (noThird.length <= MAX) return noThird;
  }

  // Try using short dictionaries
  const adj = pick(ADJECTIVES_SHORT, buf[4]);
  const noun = pick(ANIMALS_SHORT, buf[5]);
  let candidate = buildName([adj, noun]);
  if (candidate.length <= MAX) return candidate;

  // If still too long, try adding a short concept only if it still fits
  const concept = pick(CONCEPTS_SHORT, buf[6]);
  const withConcept = buildName([adj, noun, concept]);
  if (withConcept.length <= MAX) return withConcept;

  // Fallback to the shortest two-word combination from short lists
  return candidate.slice(0, MAX);
}

function displayNameFromKey(key) {
  const raw = String(key == null ? '' : key).trim();
  if (!raw) return 'Гость';

  const buf = bytesFromKey(raw);
  const adjective = pick(ADJECTIVES, buf[0]);
  const animal = pick(ANIMALS, buf[1]);
  const includeThird = (buf[2] % 3) === 0; // roughly 1/3 keys get 3rd word
  const concept = pick(CONCEPTS, buf[3]);

  const base = buildName([adjective, animal, includeThird ? concept : '']);
  return ensureMaxLength(base, buf, includeThird);
}

module.exports = { displayNameFromKey };