import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Home } from '@/pages/Home';
import { Blog } from '@/pages/Blog';
import { BlogPost } from '@/pages/BlogPost';
import { Archive } from '@/pages/Archive';
import { Gallery } from '@/pages/Gallery';
import { NotFound } from '@/pages/NotFound';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
