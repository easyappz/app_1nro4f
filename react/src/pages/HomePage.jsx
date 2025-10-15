import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, message, Segmented, Space } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { resolveListing, getPopular } from '../api/listings';
import { resolveAccount } from '../api/accounts';

import Hero from '../components/landing/Hero';
import Steps from '../components/landing/Steps';
import Benefits from '../components/landing/Benefits';
import Popular from '../components/landing/Popular';
import Testimonials from '../components/landing/Testimonials';
import FAQ from '../components/landing/FAQ';
import CTA from '../components/landing/CTA';

function HomePage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [resolveType, setResolveType] = useState('listing'); // 'listing' | 'account'
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
    mutationFn: async (values) => {
      const url = typeof values?.url === 'string' ? values.url.trim() : '';
      if (resolveType === 'account') {
        return resolveAccount(url);
      }
      return resolveListing(url);
    },
    onSuccess: (entity) => {
      if (entity && entity._id) {
        if (resolveType === 'account') {
          message.success('Профиль найден! Открываю...');
          navigate(`/account/${entity._id}`);
        } else {
          message.success('Объявление найдено! Открываю...');
          navigate(`/listing/${entity._id}`);
        }
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
    if (isResolving) return;
    doResolve(values);
  };

  const handleCardClick = (id) => {
    navigate(`/listing/${id}`);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://example.com/';

  return (
    <div style={{ width: '100%' }}>
      <Helmet>
        <title>Авиатор — комментарии к объявлениям и профилям Avito</title>
        <meta name="description" content="Вставьте ссылку на объявление или профиль Avito, читайте и оставляйте комментарии. Популярные объявления — ниже." />
        <meta property="og:title" content="Авиатор — комментарии к объявлениям и профилям Avito" />
        <meta property="og:description" content="Обсуждайте объявления и профили Avito, читайте мнения и делитесь опытом. Популярные карточки — на главной." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
      </Helmet>

      <Space direction="vertical" size={12} style={{ width: '100%', marginBottom: 12 }}>
        <Segmented
          options={[
            { label: 'Объявление', value: 'listing' },
            { label: 'Профиль продавца', value: 'account' },
          ]}
          value={resolveType}
          onChange={(val) => setResolveType(val)}
        />
      </Space>

      <Hero form={form} isResolving={isResolving} onFinish={onFinish} />
      <Steps />
      <Benefits />
      <Popular
        isLoading={isPopularLoading}
        isError={isPopularError}
        error={popularError}
        data={popular}
        onRetry={refetchPopular}
        onCardClick={handleCardClick}
      />
      <Testimonials />
      <FAQ />
      <CTA />
    </div>
  );
}

export default HomePage;
