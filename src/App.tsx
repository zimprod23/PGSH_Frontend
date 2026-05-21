import { Notifications } from '@mantine/notifications';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

export default function App() {
  return (
    <>
      <Notifications position="top-right" zIndex={1000} />
      <RouterProvider router={router} />
    </>
  );
}
