import React from 'react';
import { Button, Form, Input, Typography as AntTypography } from 'antd';

const { Title, Paragraph: AntParagraph } = AntTypography;

function Hero({ form, isResolving, onFinish }) {
  return (
    <section className="home-hero" aria-label="Герой раздел с поиском по ссылке">
      <div className="home-hero__bg" />
      <div className="home-hero__pattern" />
      <div className="home-hero__orbs">
        <span className="orb orb--1" />
        <span className="orb orb--2" />
        <span className="orb orb--3" />
      </div>
      <div className="container">
        <div className="home-hero__content">
          <div className="container--narrow">
            <Title level={1} style={{ marginBottom: 8, marginTop: 0, lineHeight: 1.15 }}>
              Пишите и читайте комментарии к объявлениям Avito
            </Title>
            <AntParagraph type="secondary" style={{ fontSize: 16, marginBottom: 20 }}>
              Вставьте ссылку на объявление, чтобы перейти к обсуждению.
            </AntParagraph>
            <div className="glass card-shadow search-card" id="search-anchor">
              <Form
                form={form}
                layout="inline"
                size="large"
                onFinish={onFinish}
                aria-label="Форма поиска объявления по ссылке"
                style={{ rowGap: 12 }}
              >
                <Form.Item
                  name="url"
                  rules={[{ required: true, message: 'Пожалуйста, вставьте ссылку' }]}
                  style={{ flex: 1, minWidth: 280 }}
                >
                  <Input
                    placeholder="https://www.avito.ru/..."
                    allowClear
                    disabled={isResolving}
                    aria-label="Поле для ссылки на объявление Avito"
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={isResolving}
                    size="large"
                    aria-label="Найти по ссылке"
                  >
                    Найти по ссылке
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
