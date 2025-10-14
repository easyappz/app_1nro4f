import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Empty, Form, Input, List, Space, Spin, Typography, message } from 'antd';
import { EyeOutlined, PictureOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { resolveListing, getPopular } from '../api/listings';

const { Title, Paragraph, Text } = Typography;

function HomePage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const limit = 12;

  const {
    data: popularData,
    isLoading: isPopularLoading,
    isError: isPopularError,
    error: popularError,
    refetch: refetchPopular,
  } = useQuery({
    queryKey: ['popular', limit],
    queryFn: () => getPopular(limit),
  });

  const popular = useMemo(() => popularData || [], [popularData]);

  const { mutate: doResolve, isPending: isResolving } = useMutation({
    mutationFn: (values) => resolveListing(values.url),
    onSuccess: (listing) => {
      if (listing && listing._id) {
        message.success('Объявление найдено!');
        navigate(`/listing/${listing._id}`);
      } else {
        message.warning('Сервер вернул неожиданный ответ.');
      }
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || 'Не удалось обработать ссылку. Попробуйте ещё раз.';
      message.error(msg);
    },
  });

  const onFinish = (values) => {
    doResolve(values);
  };

  const handleCardClick = (id) => {
    navigate(`/listing/${id}`);
  };

  const renderCover = (imgUrl, titleText) => {
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
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {/* Hero block */}
      <div className="home-hero">
        <div className="home-hero__bg" />
        <div className="container">
          <div className="home-hero__content">
            <div style={{ maxWidth: 880, margin: '0 auto' }}>
              <Title level={1} style={{ marginBottom: 8, marginTop: 0, lineHeight: 1.15 }}>
                Пишите и читайте комментарии к объявлениям Avito
              </Title>
              <Paragraph type="secondary" style={{ fontSize: 16, marginBottom: 20 }}>
                Вставьте ссылку на объявление, чтобы перейти к обсуждению.
              </Paragraph>
              <div className="glass card-shadow search-card">
                <Form
                  form={form}
                  layout="inline"
                  size="large"
                  onFinish={onFinish}
                  style={{ rowGap: 12 }}
                >
                  <Form.Item
                    name="url"
                    rules={[{ required: true, message: 'Пожалуйста, вставьте ссылку' }]}
                    style={{ flex: 1, minWidth: 280 }}
                  >
                    <Input placeholder="https://www.avito.ru/..." allowClear disabled={isResolving} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={isResolving} size="large">
                      Найти по ссылке
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popular listings */}
      <Card title="Самые просматриваемые" className="card-shadow">
        {isPopularLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : isPopularError ? (
          <Empty description={popularError?.response?.data?.error?.message || 'Не удалось загрузить популярные объявления'}>
            <Button onClick={() => refetchPopular()}>Повторить</Button>
          </Empty>
        ) : popular.length === 0 ? (
          <Empty description="Пока нет данных" />
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}
            dataSource={popular}
            renderItem={(item) => {
              const titleText = item?.title || 'Без названия';
              const views = item?.viewsCount ?? 0;
              return (
                <List.Item>
                  <Card
                    hoverable
                    className="card-shadow"
                    cover={renderCover(item?.mainImageUrl, titleText)}
                    onClick={() => handleCardClick(item._id)}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Text style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                        {titleText}
                      </Text>
                      <Space size={6} align="center">
                        <EyeOutlined style={{ color: 'var(--text-600)' }} />
                        <Text type="secondary">Просмотры: {views}</Text>
                      </Space>
                      <Button type="link" onClick={(e) => { e.stopPropagation(); handleCardClick(item._id); }}>
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
    </Space>
  );
}

export default HomePage;
