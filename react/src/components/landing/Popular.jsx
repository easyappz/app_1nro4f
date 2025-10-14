import React from 'react';
import { Card, Empty, List, Button, Spin, Space, Typography } from 'antd';
import { EyeOutlined, PictureOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

function renderCover(imgUrl, titleText) {
  if (imgUrl) {
    return (
      <div className="media-16x9">
        <img className="media-img" src={imgUrl} alt={titleText || 'Объявление Avito'} />
      </div>
    );
  }
  return (
    <div className="media-16x9">
      <div className="image-placeholder">
        <PictureOutlined />
      </div>
    </div>
  );
}

function Popular({ isLoading, isError, error, data, onRetry, onCardClick }) {
  return (
    <section className="section section--spacious" aria-label="Популярные объявления">
      <div className="container">
        <Title level={2} className="section-title">Популярные объявления</Title>
        <Card className="card-shadow" bordered={false} bodyStyle={{ padding: 16 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : isError ? (
            <Empty description={error?.response?.data?.error?.message || 'Не удалось загрузить популярные объявления'}>
              <Button onClick={onRetry}>Повторить</Button>
            </Empty>
          ) : !data || data.length === 0 ? (
            <Empty description="Пока нет данных" />
          ) : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}
              dataSource={data}
              renderItem={(item) => {
                const titleText = item?.title || 'Без названия';
                const views = item?.viewsCount ?? 0;
                return (
                  <List.Item>
                    <Card
                      hoverable
                      className="card-shadow hover-lift"
                      cover={renderCover(item?.mainImageUrl, titleText)}
                      onClick={() => onCardClick(item._id)}
                    >
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Text style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                          {titleText}
                        </Text>
                        <Space size={6} align="center">
                          <EyeOutlined style={{ color: 'var(--text-600)' }} />
                          <Text type="secondary">Просмотры: {views}</Text>
                        </Space>
                        <Button type="link" onClick={(e) => { e.stopPropagation(); onCardClick(item._id); }} aria-label="Открыть карточку объявления">
                          Открыть карточку
                        </Button>
                      </Space>
                    </Card>
                  </List.Item>
                );
              }}
            />
          )}
        </Card>
      </div>
    </section>
  );
}

export default Popular;
