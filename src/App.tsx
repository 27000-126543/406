import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Spin } from 'antd';
import router from '@/router';

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen gap-3">
          <Spin size="large" />
          <span className="text-gray-500 text-sm">加载中...</span>
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  );
}
