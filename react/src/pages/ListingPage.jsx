import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Comment as AntComment, Empty, Form, Input, List, Result, Space, Spin, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getListingById } from '../api/listings';
import { createComment, getComments } from '../api/comments';

const { Title, Text } = Typography;

function ListingPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const iframeRef = useRef(null);
  const [showIframe, setShowIframe] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!iframeLoaded) {
        setShowIframe(false);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [iframeLoaded]);

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

  if (isListingLoading) {
    return (
      <Card>
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

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card>
        {showIframe ? (
          <iframe
            ref={iframeRef}
            title="Avito Listing"
            src={listing.url}
            style={{ width: '100%', height: 500, border: '1px solid #f0f0f0', borderRadius: 8 }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            onLoad={() => setIframeLoaded(true)}
            onError={() => setShowIframe(false)}
          />
        ) : (
          <Result
            status="info"
            title="Предпросмотр недоступен"
            subTitle="Сайт может запрещать встраивание в iframe. Откройте объявление на Avito."
            extra={<Button type="primary" onClick={handleOpenOriginal}>Открыть на Avito</Button>}
          />
        )}
      </Card>

      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0 }}>{listing.title || 'Без названия'}</Title>
          <Space align="center" size={12}>
            <Tag color="blue">Просмотры: {listing.viewsCount ?? 0}</Tag>
            <Button onClick={handleOpenOriginal}>Открыть на Avito</Button>
          </Space>
        </Space>
      </Card>

      <Card title="Комментарии">
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
              <li>
                <AntComment
                  author={<span>{item.authorName || 'Аноним'}</span>}
                  content={<span>{item.text}</span>}
                  datetime={<span>{new Date(item.createdAt).toLocaleString('ru-RU')}</span>}
                />
              </li>
            )}
          />
        ) : (
          <Empty description="Пока нет комментариев" />
        ))}

        <div style={{ height: 16 }} />

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
