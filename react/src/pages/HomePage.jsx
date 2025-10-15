import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, message } from 'antd';
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
  const [messageApi, contextHolder] = message.useMessage();
  const MSG_KEY = 'resolve-status';
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
        messageApi.open({ key: MSG_KEY, type: 'success', content: 'Найдено! Открываем…', duration: 1.2 });
        if (resolveType === 'account') {
          navigate(`/account/${entity._id}`);
        } else {
          navigate(`/listing/${entity._id}`);
        }
      } else {
        messageApi.open({ key: MSG_KEY, type: 'warning', content: 'Сервер вернул неожиданный ответ.', duration: 2.5 });
      }
    },
    onError: (err) => {
      const status = err?.response?.status;
      const details = err?.response?.data?.error?.details;
      if (resolveType === 'account') {
        if (status === 422) {
          const tip = details ? ` Подсказка: ${details}` : '';
          messageApi.open({ key: MSG_KEY, type: 'error', content: `Не удалось определить профиль по ссылке. Проверьте ссылку на профиль продавца.${tip}`, duration: 4 });
          return;
        }
        if (status === 400) {
          const tip = details ? ` Подсказка: ${details}` : '';
          messageApi.open({ key: MSG_KEY, type: 'error', content: `Некорректный URL. Убедитесь, что вставили полную ссылку на профиль.${tip}`, duration: 4 });
          return;
        }
      } else {
        if (status === 422) {
          const tip = details ? ` Подсказка: ${details}` : '';
          messageApi.open({ key: MSG_KEY, type: 'error', content: `Не удалось определить объявление по ссылке. Проверьте ссылку на объявление.${tip}`, duration: 4 });
          return;
        }
        if (status === 400) {
          const tip = details ? ` Подсказка: ${details}` : '';
          messageApi.open({ key: MSG_KEY, type: 'error', content: `Некорректный URL. Убедитесь, что вставили полную ссылку на объявление.${tip}`, duration: 4 });
          return;
        }
      }
      const fallback = err?.response?.data?.error?.message || 'Не удалось обработать ссылку. Попробуйте ещё раз.';
      messageApi.open({ key: MSG_KEY, type: 'error', content: fallback, duration: 4 });
    },
  });

  const onFinish = (values) => {
    if (isResolving) return; // prevent double submit
    const url = typeof values?.url === 'string' ? values.url.trim() : '';

    messageApi.open({
      key: MSG_KEY,
      type: 'loading',
      content: resolveType === 'account' ? 'Определяем профиль…' : 'Определяем объявление…',
      duration: 0,
    });

    doResolve({ url });
  };

  const handleCardClick = (id) => {
    navigate(`/listing/${id}`);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://example.com/';

  return (
    <div style={{ width: '100%' }}>
      {contextHolder}
      <Helmet>
        <title>Авиатор — комментарии к объявлениям и профилям Avito</title>
        <meta name="description" content="Вставьте ссылку на объявление или профиль Avito, читайте и оставляйте комментарии. Популярные объявления — ниже." />
        <meta property="og:title" content="Авиатор — комментарии к объявлениям и профилям Avito" />
        <meta property="og:description" content="Обсуждайте объявления и профили Avito, читайте мнения и делитесь опытом. Популярные карточки — на главной." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
      </Helmet>

      <Hero
        form={form}
        isResolving={isResolving}
        onFinish={onFinish}
        resolveType={resolveType}
        onResolveTypeChange={setResolveType}
      />
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
