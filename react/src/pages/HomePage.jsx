import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, message } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { resolveListing, getPopular } from '../api/listings';

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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://example.com/';

  return (
    <div style={{ width: '100%' }}>
      <Helmet>
        <title>Авиатор — комментарии к объявлениям Avito</title>
        <meta name="description" content="Вставьте ссылку на объявление Avito, читайте и оставляйте комментарии. Популярные карточки — ниже." />
        <meta property="og:title" content="Авиатор — комментарии к объявлениям Avito" />
        <meta property="og:description" content="Обсуждайте объявления Avito, читайте мнения и делитесь опытом. Популярные карточки — на главной." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
      </Helmet>

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
