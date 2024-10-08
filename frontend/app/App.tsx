"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, useEffect, useState } from "react";

import { BrainProvider } from "@/lib/context";
import { useBrainContext } from "@/lib/context/BrainProvider/hooks/useBrainContext";
import { useSupabase } from "@/lib/context/SupabaseProvider";
import { UpdateMetadata } from "@/lib/helpers/updateMetadata";
import { usePageTracking } from "@/services/analytics/june/usePageTracking";
import "../lib/config/LocaleConfig/i18n";

import Modal from "antd/es/modal/Modal";
// This wrapper is used to make effect calls at a high level in app rendering.
const App = ({ children }: PropsWithChildren): JSX.Element => {
  const { fetchAllBrains, fetchDefaultBrain, fetchPublicPrompts } =
    useBrainContext();
  const { session } = useSupabase();

  usePageTracking();

  useEffect(() => {
    if (session?.user) {
      void fetchAllBrains();
      void fetchDefaultBrain();
      void fetchPublicPrompts();
    }
  }, [session]);

  return (
    <>
      {children}
      <UpdateMetadata />
    </>
  );
};

const queryClient = new QueryClient();

const SetModal = () => {
  const { isLoading } = useBrainContext();
  return (
    <Modal open={isLoading} centered={true} footer={null}>
      Connecting to DropBox...
    </Modal>
  )
}

const AppWithQueryClient = ({ children }: PropsWithChildren): JSX.Element => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrainProvider>
        <App>{children}</App>
        <SetModal />
      </BrainProvider>
    </QueryClientProvider>
  );
};

export { AppWithQueryClient as App };