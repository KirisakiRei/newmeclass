import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { CMSProvider } from "./components/cms/CMSContext";

export default function App() {
  return (
    <CMSProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors theme="dark" closeButton />
    </CMSProvider>
  );
}
