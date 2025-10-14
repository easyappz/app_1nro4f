import React from 'react';
import { Carousel, Card, Typography, Avatar, Space } from 'antd';

const { Title, Paragraph, Text } = Typography;

const items = [
  { name: 'Алексей', role: 'Покупатель', text: 'Нашёл старое объявление и быстро получил полезные комментарии. Удобно и понятно.' },
  { name: 'Мария', role: 'Продавец', text: 'Супер-идея! Комментарии помогли улучшить текст объявления и повысить доверие.' },
  { name: 'Игорь', role: 'Исследователь цен', text: 'Смотрю популярные карточки, чтобы понять реальный интерес к товарам. Отличный инструмент.' },
];

function Testimonials() {
  return (
    <section className="section section--spacious" aria-label="Отзывы пользователей">
      <div className="container">
        <Title level={2} className="section-title">Отзывы</Title>
        <Paragraph className="section-subtitle">Что говорят наши пользователи</Paragraph>
        <Carousel autoplay dots className="testimonial-carousel">
          {items.map((t, idx) => (
            <div key={idx} className="testimonial-slide">
              <Card className="card-shadow testimonial-card glass" bordered={false}>
                <Space direction="vertical" size={12} align="center" style={{ width: '100%' }}>
                  <Avatar size={64} style={{ background: 'linear-gradient(135deg, var(--brand-start), var(--brand-end))' }}>
                    {t.name.charAt(0)}
                  </Avatar>
                  <Title level={4} style={{ marginBottom: 0 }}>{t.name}</Title>
                  <Text type="secondary">{t.role}</Text>
                  <Paragraph style={{ textAlign: 'center', maxWidth: 720 }}>{t.text}</Paragraph>
                </Space>
              </Card>
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

export default Testimonials;
