import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PageLoader from '@shared/ui/PageLoader/PageLoader.tsx';

const CurrentExample = lazy(() => import('@pages/Example/CurrentExample/CurrentExample.tsx'));

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/example/current" element={<CurrentExample />} />
      <Route path="*" element={<Navigate to="/example/current" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
