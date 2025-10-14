import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Col, Empty, Form, Input, List, Row, Space, Spin, Typography, message } from 'antd';
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

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0 }}>Найти объявление по ссылке Avito</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Вставьте ссылку на объявление Avito. Мы создадим карточку и будем вести счётчик просмотров.
          </Paragraph>
          <Form
            form={form}
            layout="inline"
            onFinish={onFinish}
            style={{ marginTop: 8, rowGap: 12 }}
          >
            <Form.Item
              name="url"
              rules={[{ required: true, message: 'Пожалуйста, вставьте ссылку' }]}
              style={{ flex: 1, minWidth: 280 }}
            >
              <Input placeholder="https://www.avito.ru/..." allowClear disabled={isResolving} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={isResolving}>
                Найти по ссылке
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>

      <Card title="Самые просматриваемые">
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
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => handleCardClick(item._id)}
                  title={
                    <Text style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title || 'Без названия'}
                    </Text>
                  }
                  extra={<Text type="secondary">Просмотры: {item.viewsCount ?? 0}</Text>}
                >
                  <Space direction="vertical" size={8}>
                    <Text type="secondary" style={{ wordBreak: 'break-all' }}>{item.url}</Text>
                    <Button type="link" onClick={(e) => { e.stopPropagation(); handleCardClick(item._id); }}>
                      Открыть карточку
                    </Button>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}

export default HomePage;
