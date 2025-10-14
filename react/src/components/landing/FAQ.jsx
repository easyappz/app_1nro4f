import React from 'react';
import { Collapse, Typography } from 'antd';

const { Title } = Typography;

const items = [
  {
    key: '1',
    label: 'Нужно ли мне регистрироваться, чтобы оставить комментарий?',
    children: <p>Нет, вы можете оставлять комментарии без регистрации. Введите имя и текст — и готово.</p>,
  },
  {
    key: '2',
    label: 'Почему некоторые объявления не находятся по ссылке?',
    children: <p>Иногда Avito меняет структуру страниц или ссылки недоступны. Попробуйте ещё раз позже или проверьте корректность URL.</p>,
  },
  {
    key: '3',
    label: 'Можно ли удалить свой комментарий?',
    children: <p>Сейчас такой опции нет. Мы работаем над расширением функциональности.</p>,
  },
];

function FAQ() {
  return (
    <section className="section section--spacious" aria-label="Частые вопросы">
      <div className="container">
        <Title level={2} className="section-title">FAQ</Title>
        <Collapse items={items} ghost className="faq-collapse" />
      </div>
    </section>
  );
}

export default FAQ;
