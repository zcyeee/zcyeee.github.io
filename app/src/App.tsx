import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Home } from '@/pages/Home';
import { Blog } from '@/pages/Blog';
import { BlogPost } from '@/pages/BlogPost';
import { Archive } from '@/pages/Archive';
import { Gallery } from '@/pages/Gallery';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/gallery" element={<Gallery />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
