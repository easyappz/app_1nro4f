import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ConfigProvider, Layout, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'antd/dist/reset.css';

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
          <BrowserRouter>
            <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
              <Header style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>
                    Easyappz · Avito Объявления
                  </Link>
                </div>
              </Header>
              <Content style={{ padding: '24px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/listing/:id" element={<ListingPage />} />
                </Routes>
              </Content>
              <Footer style={{ textAlign: 'center' }}>
                © {new Date().getFullYear()} Easyappz. Все права защищены.
              </Footer>
            </Layout>
          </BrowserRouter>
        </QueryClientProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
