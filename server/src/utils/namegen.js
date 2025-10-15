'use strict';

const crypto = require('crypto');
const NameAssignment = require('@src/models/NameAssignment');

// Pool settings
const POOL_SIZE = 1_000_000; // 100 * 100 * 100
const PROBE_STEP = 97003; // odd and not divisible by 5
const MAX_PROBES = 4096;
const MAX_SUFFIX_TRIES = 1000;

function sha256Hex(str) {
  return crypto.createHash('sha256').update(String(str)).digest('hex');
}

function initialIndexFromHash(hashHex) {
  const buf = Buffer.from(hashHex, 'hex');
  // Take first 6 bytes as big-endian unsigned integer
  let value = 0;
  for (let i = 0; i < 6; i += 1) {
    value = (value * 256) + buf[i];
  }
  return value % POOL_SIZE;
}

async function getOrCreateAssignment(nameKeyHash) {
  // 1) Return existing mapping if present
  const existing = await NameAssignment.findOne({ nameKeyHash }).lean();
  if (existing) {
    return { index: existing.index, suffix: existing.suffix };
  }

  // 2) Try to create with probing in the main pool (suffix=0)
  const index0 = initialIndexFromHash(nameKeyHash);
  let idx = index0;

  for (let tries = 0; tries < MAX_PROBES; tries += 1) {
    try {
      const created = await NameAssignment.create({ nameKeyHash, index: idx, suffix: 0 });
      return { index: created.index, suffix: created.suffix };
    } catch (err) {
      if (err && err.code === 11000) {
        const pattern = err.keyPattern || {};
        const message = err.message || '';
        if (pattern.nameKeyHash || message.includes('nameKeyHash')) {
          const doc = await NameAssignment.findOne({ nameKeyHash }).lean();
          if (doc) return { index: doc.index, suffix: doc.suffix };
        }
        // collision on (index, suffix) -> move by PROBE_STEP
        idx = (idx + PROBE_STEP) % POOL_SIZE;
        continue;
      }
      throw err;
    }
  }

  // 3) If pool seems exhausted for our probe path, start assigning suffixes on initial index
  for (let s = 1; s <= MAX_SUFFIX_TRIES; s += 1) {
    try {
      const created = await NameAssignment.create({ nameKeyHash, index: index0, suffix: s });
      return { index: created.index, suffix: created.suffix };
    } catch (err) {
      if (err && err.code === 11000) {
        const pattern = err.keyPattern || {};
        const message = err.message || '';
        if (pattern.nameKeyHash || message.includes('nameKeyHash')) {
          const doc = await NameAssignment.findOne({ nameKeyHash }).lean();
          if (doc) return { index: doc.index, suffix: doc.suffix };
        }
        // pair (index0, s) busy -> try next s
        continue;
      }
      throw err;
    }
  }

  // Extremely unlikely if DB nearly full of suffixes on same index
  throw new Error('Unable to allocate unique name after suffix attempts');
}

// 100 short adjectives (<= 8 chars)
const ADJECTIVES = [
  'Яркий','Смелый','Тихий','Быстрый','Умный','Новый','Ловкий','Зоркий','Честный','Громкий',
  'Теплый','Личный','Гибкий','Легкий','Светлый','Темный','Звонкий','Сладкий','Крепкий','Мягкий',
  'Чистый','Бодрый','Ровный','Гордый','Модный','Сильный','Нежный','Верный','Бывалый','Звездный',
  'Снежный','Летний','Зимний','Лунный','Морской','Горный','Полезный','Главный','Знающий','Шустрый',
  'Ладный','Добрый','Яростный','Твердый','Прочный','Тонкий','Широкий','Хитрый','Прыгучий','Резвый',
  'Скрытный','Надежный','Чуткий','Плотный','Славный','Золотой','Седой','Суровый','Ранний','Милый',
  'Ласковый','Короткий','Меткий','Ясный','Пылкий','Редкий','Лихой','Смирный','Крутой','Бравый',
  'Веселый','Мирный','Спорный','Гладкий','Радужный','Четкий','Трезвый','Жаркий','Певучий','Строгий',
  'Литой','Гнутый','Ядовитый','Тесный','Шумный','Рычащий','Глухой','Сухой','Мокрый','Рваный',
  'Целый','Сытный','Задорный','Тугой','Бережный','Точный','Дерзкий','Игривый','Ловчий','Родной'
];

// 100 animals (<= 8 chars)
const ANIMALS = [
  'Тигр','Лев','Пума','Панда','Енот','Лиса','Волк','Заяц','Кит','Орел',
  'Бобр','Ястреб','Сова','Слон','Еж','Носорог','Журавль','Крот','Дельфин','Гепард',
  'Рысь','Лось','Олень','Коза','Бык','Овца','Корова','Баран','Курица','Петух',
  'Индюк','Утка','Гусь','Голубь','Аист','Цапля','Павлин','Страус','Пеликан','Фламинго',
  'Кенгуру','Коала','Лемур','Манул','Ягуар','Лама','Пони','Норка','Выдра','Ласка',
  'Куница','Сурок','Хомяк','Кролик','Суслик','Плотва','Щука','Сом','Карп','Окунь',
  'Лосось','Форель','Скворец','Грач','Галка','Ворона','Ворон','Сорока','Скопа','Удод',
  'Сойка','Тетерев','Глухарь','Дрозд','Синица','Кукушка','Чибис','Перепел','Ласточка','Стриж',
  'Тюлень','Морж','Касатка','Акула','Скат','Омар','Краб','Креветка','Медуза','Спрут',
  'Кальмар','Муравей','Пчела','Оса','Жук','Комар','Муха','Паук','Клоп','Пингвин'
];

// 100 concepts (<= 8 chars)
const CONCEPTS = [
  'Ветер','Огонь','Луч','Мост','Ключ','Код','Звук','Свет','Поток','Снег',
  'Лед','Туман','Шаг','След','День','Ночь','Заря','Солнце','Луна','Море',
  'Волна','Бриз','Град','Ливень','Дождь','Пар','Риск','Шанс','Путь','Смысл',
  'Курс','Ритм','Миг','Взгляд','Шторм','Шум','Тишина','Знак','Цель','Стиль',
  'Рок','Драйв','Идея','Фокус','Пиксель','Кадр','План','Карта','Тайна','Квест',
  'Пламя','Иней','Сумрак','Рассвет','Закат','Вихрь','Искра','Осколок','Фактор','Предел',
  'Узор','Порог','Вектор','Маска','Образ','Контур','Слух','Воля','Режим','Вкус',
  'Цвет','Ранг','Класс','Раздел','Пакет','Марка','Метка','Сеть','Узел','Набор',
  'Облако','Блок','Схема','Планка','Этап','Шаблон','Глубина','Высота','Ширина','Длина',
  'Масштаб','Состав','Канал','Модуль','Номер','Размах','Импульс','Заряд','Потоки','Сигнал'
];

function indexToDisplay(index, suffix) {
  const a = Math.floor(index / 10000) % 100;
  const b = Math.floor(index / 100) % 100;
  const c = index % 100;
  const base = `${ADJECTIVES[a]} ${ANIMALS[b]} ${CONCEPTS[c]}`;
  const withSuffix = suffix > 0 ? `${base}_${String(suffix).padStart(2, '0')}` : base;
  if (withSuffix.length <= 30) return withSuffix;
  // If somehow too long, remove third component for safety
  const base2 = `${ADJECTIVES[a]} ${ANIMALS[b]}`;
  return suffix > 0 ? `${base2}_${String(suffix).padStart(2, '0')}` : base2;
}

async function displayNameFromKey(nameKey) {
  const raw = String(nameKey == null ? '' : nameKey).trim();
  if (!raw) return 'Гость';

  const nameKeyHash = sha256Hex(raw);
  const { index, suffix } = await getOrCreateAssignment(nameKeyHash);
  return indexToDisplay(index, suffix);
}

module.exports = { displayNameFromKey };
