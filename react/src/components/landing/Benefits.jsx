import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import { ThunderboltOutlined, SafetyCertificateOutlined, EyeOutlined, CloudOutlined, CommentOutlined, RocketOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const items = [
  { icon: <ThunderboltOutlined />, title: 'Быстро', desc: 'Молниеносная обработка ссылок и загрузка карточек.' },
  { icon: <SafetyCertificateOutlined />, title: 'Надёжно', desc: 'Продуманная работа с ошибками, стабильные эндпоинты.' },
  { icon: <EyeOutlined />, title: 'Прозрачно', desc: 'Видно, сколько просмотров набрало объявление.' },
  { icon: <CloudOutlined />, title: 'Без лишнего', desc: 'Никаких лишних зависимостей и тяжёлых эффектов.' },
  { icon: <CommentOutlined />, title: 'Комьюнити', desc: 'Комментарии, лайки и полезная обратная связь.' },
  { icon: <RocketOutlined />, title: 'Современно', desc: 'Актуальный стек и приятные анимации интерфейса.' },
];

function Benefits() {
  return (
    <section className="section section--spacious" aria-label="Преимущества сервиса">
      <div className="container">
        <Title level={2} className="section-title">Преимущества</Title>
        <Paragraph className="section-subtitle">Почему с нами удобно и приятно работать</Paragraph>
        <Row gutter={[16, 16]}>
          {items.map((b, idx) => (
            <Col key={idx} xs={24} sm={12} md={8}>
              <Card className="card-shadow benefit-card" bordered={false}>
                <div className="benefit-card__icon" aria-hidden="true">{b.icon}</div>
                <Title level={4} style={{ marginBottom: 8 }}>{b.title}</Title>
                <Text type="secondary">{b.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
}

export default Benefits;
