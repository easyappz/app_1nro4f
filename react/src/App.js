import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ConfigProvider, Layout, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import 'antd/dist/reset.css';
import './App.css';

import ErrorBoundary from './ErrorBoundary';
import HomePage from './pages/HomePage.jsx';
import ListingPage from './pages/ListingPage.jsx';

const { Header, Content, Footer } = Layout;

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider locale={ruRU} theme={{ algorithm: theme.defaultAlgorithm }}>
        <QueryClientProvider client={queryClient}>
          <HelmetProvider>
            <BrowserRouter>
              <Helmet>
                <title>Авиатор</title>
              </Helmet>
              <Layout style={{ minHeight: '100vh', background: 'var(--bg-100)' }}>
                <Header className="app-header">
                  <div className="container">
                    <Link to="/" className="brand">Easyappz · Авиатор</Link>
                  </div>
                </Header>
                <Content className="app-content">
                  <div className="container">
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/listing/:id" element={<ListingPage />} />
                    </Routes>
                  </div>
                </Content>
                <Footer className="app-footer">
                  © {new Date().getFullYear()} Easyappz. Все права защищены.
                </Footer>
              </Layout>
            </BrowserRouter>
          </HelmetProvider>
        </QueryClientProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
