import React from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Button, Card, Empty, Form, Input, List, Result, Space, Spin, Tag, Typography, message } from 'antd';
import { EyeOutlined, LinkOutlined, PictureOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getListingById } from '../api/listings';
import { createComment, getComments } from '../api/comments';

const { Title, Text } = Typography;

function ListingPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const {
    data: listing,
    isLoading: isListingLoading,
    isError: isListingError,
    error: listingError,
    refetch: refetchListing,
  } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListingById(id),
    enabled: !!id,
  });

  const {
    data: comments,
    isLoading: isCommentsLoading,
    isError: isCommentsError,
    error: commentsError,
    refetch: refetchComments,
  } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => getComments(id),
    enabled: !!id,
  });

  const { mutate: sendComment, isPending: isSending } = useMutation({
    mutationFn: (payload) => createComment(id, payload),
    onSuccess: () => {
      message.success('Комментарий отправлен');
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || 'Не удалось отправить комментарий';
      message.error(msg);
    },
  });

  const handleOpenOriginal = () => {
    if (listing?.url) {
      window.open(listing.url, '_blank', 'noopener');
    }
  };

  const onFinish = (values) => {
    sendComment(values);
  };

  const renderHero = () => {
    const imgUrl = listing?.mainImageUrl;
    if (imgUrl) {
      return (
        <div className="media-16x9">
          <img className="media-img" src={imgUrl} alt={listing?.title || 'Объявление Avito'} />
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

  if (isListingLoading) {
    return (
      <Card className="card-shadow">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (isListingError || !listing) {
    return (
      <Result
        status="error"
        title="Не удалось загрузить объявление"
        subTitle={listingError?.response?.data?.error?.message || 'Попробуйте обновить страницу'}
        extra={<Button onClick={() => refetchListing()}>Повторить</Button>}
      />
    );
  }

  const titleText = listing?.title || 'Без названия';
  const views = listing?.viewsCount ?? 0;
  const avitoId = listing?.avitoId;

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Helmet>
        <title>Авиатор — {titleText}</title>
      </Helmet>

      <Card className="hero-card">
        {renderHero()}
      </Card>

      <Card className="card-shadow">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Title level={2} style={{ margin: 0 }}>{titleText}</Title>
          <Space align="center" size={12} wrap>
            <Tag color="blue"><EyeOutlined /> <span style={{ marginLeft: 6 }}>Просмотры: {views}</span></Tag>
            {avitoId ? <Tag color="green">ID Avito: {avitoId}</Tag> : null}
            <Button type="primary" icon={<LinkOutlined />} onClick={handleOpenOriginal}>
              Открыть на Avito
            </Button>
          </Space>
        </Space>
      </Card>

      <Card title="Комментарии" className="card-shadow">
        {isCommentsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : isCommentsError ? (
          <Empty description={commentsError?.response?.data?.error?.message || 'Не удалось загрузить комментарии'}>
            <Button onClick={() => refetchComments()}>Повторить</Button>
          </Empty>
        ) : (Array.isArray(comments) && comments.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={comments}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar>{(item.authorName || 'А')[0].toUpperCase()}</Avatar>}
                  title={
                    <span>
                      {item.authorName || 'Аноним'}
                      <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                        {new Date(item.createdAt).toLocaleString('ru-RU')}
                      </Typography.Text>
                    </span>
                  }
                  description={<Typography.Text>{item.text}</Typography.Text>}
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="Пока нет комментариев" />
        ))}

        <div className="h-space" />

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Ваше имя"
            name="authorName"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input placeholder="Например, Иван" disabled={isSending} />
          </Form.Item>
          <Form.Item
            label="Комментарий"
            name="text"
            rules={[{ required: true, message: 'Введите текст комментария' }]}
          >
            <Input.TextArea placeholder="Ваше мнение..." autoSize={{ minRows: 3, maxRows: 6 }} disabled={isSending} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isSending}>
              Отправить
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );
}

export default ListingPage;
