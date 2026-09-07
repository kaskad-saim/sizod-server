import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import HomePage from '@pages/Home/HomePage.tsx';
import { RequireSsoAuth } from '@features/platform/sso-auth';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route
        element={
          <RequireSsoAuth>
            <Outlet />
          </RequireSsoAuth>
        }
      >
        <Route path="/*" element={<HomePage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
