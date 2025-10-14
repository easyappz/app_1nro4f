import React from 'react';
import { Button, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

function CTA() {
  const scrollToSearch = () => {
    const el = document.getElementById('search-anchor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="cta-section" aria-label="Призыв к действию">
      <div className="container">
        <div className="cta-card glass card-shadow">
          <Title level={2} style={{ marginTop: 0 }}>Готовы попробовать?</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>Вставьте ссылку на объявление Avito и начните обсуждение прямо сейчас.</Paragraph>
          <Button type="primary" size="large" onClick={scrollToSearch} aria-label="Прокрутить к поиску">
            Начать сейчас
          </Button>
        </div>
      </div>
    </section>
  );
}

export default CTA;
