import React, { useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Button, Card, Empty, Form, Input, List, Result, Space, Spin, Tag, Typography, message, Alert, Skeleton } from 'antd';
import { EyeOutlined, LinkOutlined, PictureOutlined, HeartOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getListingById } from '../api/listings';
import { createComment, getComments, likeComment, getPopularComments } from '../api/comments';
import getOrCreateNameKey from '../api/nameKey';

const { Title, Text } = Typography;

function ListingPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const popularLimit = 2;

  // Backoff state refs for gentle auto-refresh while listing is in minimal state
  const attemptsRef = useRef(0);
  const totalMsRef = useRef(0);
  const timerRef = useRef(null);
  const MAX_TOTAL_MS = 180000; // up to ~3 minutes
  const BASE_DELAY = 2000; // 2s
  const MAX_DELAY = 30000; // 30s

  const {
    data: listing,
    isLoading: isListingLoading,
    isError: isListingError,
    error: listingError,
    refetch: refetchListing,
    isRefetching: isListingRefetching,
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

  const { data: popularComments } = useQuery({
    queryKey: ['comments-popular', id, popularLimit],
    queryFn: () => getPopularComments(id, popularLimit),
    enabled: !!id,
  });

  const mergedComments = useMemo(() => {
    const base = Array.isArray(comments) ? comments : [];
    const pop = Array.isArray(popularComments) ? popularComments : [];
    if (pop.length === 0) return base;
    const seen = new Set(pop.map((c) => c._id));
    const tail = base.filter((c) => !seen.has(c._id));
    return [...pop, ...tail];
  }, [comments, popularComments]);

  const { mutate: sendComment, isPending: isSending } = useMutation({
    mutationFn: (payload) => createComment(id, payload),
    onSuccess: (created) => {
      const author = created?.authorName ? ` как «${created.authorName}»` : '';
      message.success(`Комментарий отправлен${author}`);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      queryClient.invalidateQueries({ queryKey: ['comments-popular', id, popularLimit] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || 'Не удалось отправить комментарий';
      message.error(msg);
    },
  });

  const { mutate: doLike, isPending: isLiking } = useMutation({
    mutationFn: (commentId) => likeComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      queryClient.invalidateQueries({ queryKey: ['comments-popular', id, popularLimit] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || 'Не удалось поставить лайк';
      message.error(msg);
    },
  });

  const handleOpenOriginal = () => {
    if (listing?.url) {
      window.open(listing.url, '_blank', 'noopener');
    }
  };

  const onFinish = (values) => {
    const nameKey = getOrCreateNameKey();
    const text = typeof values.text === 'string' ? values.text.trim() : '';
    sendComment({ nameKey, text });
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
        <div className="image-placeholder" aria-label="Изображение временно недоступно">
          <PictureOutlined />
        </div>
      </div>
    );
  };

  // Minimal listing state: created by offline fallback (avitoId present, but title and mainImageUrl are empty)
  const isMinimal = Boolean(listing && !listing.title && !listing.mainImageUrl);

  // Reset polling when id changes
  useEffect(() => {
    attemptsRef.current = 0;
    totalMsRef.current = 0;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Gentle auto-refresh with exponential backoff while listing is minimal
  useEffect(() => {
    if (!listing) return;

    const canPoll = isMinimal && totalMsRef.current < MAX_TOTAL_MS;
    if (canPoll && !timerRef.current) {
      const attempt = attemptsRef.current;
      const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
      timerRef.current = setTimeout(async () => {
        timerRef.current = null;
        try {
          await refetchListing();
        } finally {
          attemptsRef.current = attemptsRef.current + 1;
          totalMsRef.current = totalMsRef.current + delay;
        }
      }, delay);
    }

    if ((!isMinimal || totalMsRef.current >= MAX_TOTAL_MS) && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [listing, isMinimal, refetchListing]);

  const handleManualRefresh = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await refetchListing();
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

  const helmetTitle = isMinimal ? 'Авиатор — Объявление (данные загружаются)' : `Авиатор — ${titleText}`;
  const helmetDesc = isMinimal
    ? 'Данные объявления подтягиваются с Avito. Заголовок и фото появятся автоматически, как только будут доступны.'
    : `Комментарии к объявлению: ${titleText}`;

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Helmet>
        <title>{helmetTitle}</title>
        <meta name="description" content={helmetDesc} />
      </Helmet>

      {isMinimal && (
        <Alert
          className="enrich-alert card-shadow"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message="Данные объявления подтягиваются с Avito"
          description={
            <div>
              <div>Сейчас недоступны заголовок и главное фото. Мы автоматически обновляем данные в фоне.</div>
              <div style={{ marginTop: 4, color: 'rgba(0,0,0,0.45)' }}>
                Обновление выполняется с паузами 2–30 секунд до 3 минут или до появления данных.
              </div>
            </div>
          }
          action={
            <Button type="primary" icon={<ReloadOutlined />} onClick={handleManualRefresh} loading={isListingRefetching}>
              Обновить данные
            </Button>
          }
        />
      )}

      <Card className="hero-card">
        {renderHero()}
      </Card>

      <Card className="card-shadow">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {isMinimal ? (
            <div>
              <Skeleton.Input active style={{ width: 320, height: 28 }} />
            </div>
          ) : (
            <Title level={2} style={{ margin: 0 }}>{titleText}</Title>
          )}

          <Space align="center" size={12} wrap>
            <Tag color="blue"><EyeOutlined /> <span style={{ marginLeft: 6 }}>Просмотры: {views}</span></Tag>
            {avitoId ? <Tag color="green">ID Avito: {avitoId}</Tag> : null}
            <Button type="primary" icon={<LinkOutlined />} onClick={handleOpenOriginal} aria-label="Открыть объявление на Avito">
              Открыть на Avito
            </Button>
          </Space>
        </Space>
      </Card>

      <Card title="Комментарии" className="card-shadow">
        {isMinimal && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Название и фото могут появиться чуть позже — вы можете оставить комментарий уже сейчас.
          </Text>
        )}

        {isCommentsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : isCommentsError ? (
          <Empty description={commentsError?.response?.data?.error?.message || 'Не удалось загрузить комментарии'}>
            <Button onClick={() => refetchComments()}>Повторить</Button>
          </Empty>
        ) : (Array.isArray(mergedComments) && mergedComments.length > 0 ? (
          <List
            itemLayout="horizontal"
            split={false}
            dataSource={mergedComments}
            renderItem={(item) => (
              <List.Item style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%' }}>
                  <Avatar>{(item.authorName || 'А')[0].toUpperCase()}</Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontWeight: 600 }}>{item.authorName || 'Аноним'}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(item.createdAt).toLocaleString('ru-RU')}
                      </Text>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <Text>{item.text}</Text>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Button
                      type="text"
                      aria-label="Поставить лайк"
                      onClick={() => doLike(item._id)}
                      loading={isLiking}
                      icon={<HeartOutlined style={{ color: '#ff4d4f' }} />}
                    />
                    <Text type="secondary">{item.likesCount ?? 0}</Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="Пока нет комментариев" />
        ))}

        <div className="h-space" />

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
            Ваше имя создаётся автоматически на сервере и отобразится после отправки
          </Text>
          <Form.Item
            label="Комментарий"
            name="text"
            rules={[
              { required: true, message: 'Введите текст комментария' },
              {
                validator: (_, value) => {
                  const v = typeof value === 'string' ? value.trim() : '';
                  if (!v) return Promise.reject(new Error('Введите текст комментария'));
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.TextArea placeholder="Напишите комментарий..." autoSize={{ minRows: 3, maxRows: 6 }} disabled={isSending} />
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
