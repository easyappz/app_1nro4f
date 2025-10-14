import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import { LinkOutlined, SearchOutlined, MessageOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const steps = [
  {
    icon: <LinkOutlined />,
    title: 'Вставьте ссылку',
    desc: 'Скопируйте ссылку на объявление Avito и вставьте её в поле выше.'
  },
  {
    icon: <SearchOutlined />,
    title: 'Мы найдём объявление',
    desc: 'Сервис аккуратно извлечёт ID объявления и подготовит карточку.'
  },
  {
    icon: <MessageOutlined />,
    title: 'Обсуждайте и делитесь',
    desc: 'Читайте мнения других, оставляйте свои комментарии и лайки.'
  },
];

function Steps() {
  return (
    <section className="section section--spacious" aria-label="Как это работает">
      <div className="container">
        <Title level={2} className="section-title">Как это работает</Title>
        <Paragraph className="section-subtitle">Всего три шага, чтобы перейти к обсуждению объявления</Paragraph>
        <Row gutter={[16, 16]}>
          {steps.map((s, idx) => (
            <Col key={idx} xs={24} sm={12} md={8}>
              <Card className="card-shadow step-card glass" bordered={false}>
                <div className="step-card__icon" aria-hidden="true">{s.icon}</div>
                <Title level={4} style={{ marginBottom: 8 }}>{s.title}</Title>
                <Text type="secondary">{s.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
}

export default Steps;
