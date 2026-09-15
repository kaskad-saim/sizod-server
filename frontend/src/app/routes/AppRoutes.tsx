import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PageLoader from '@shared/ui/PageLoader/PageLoader.tsx';

const CurrentStation16 = lazy(() => import('@pages/Station16/CurrentStation16/CurrentStation16.tsx'));

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/station16/current" element={<CurrentStation16 />} />
      <Route path="*" element={<Navigate to="/station16/current" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
