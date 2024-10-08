"use client";
import { ReactNode, useEffect } from "react";

import { ChatProvider, KnowledgeToFeedProvider } from "@/lib/context";
import { ChatsProvider } from "@/lib/context/ChatsProvider/chats-provider";
import { useSupabase } from "@/lib/context/SupabaseProvider";
import { redirectToLogin } from "@/lib/router/redirectToLogin";
import { useBrainContext } from "@/lib/context/BrainProvider/hooks/useBrainContext";
import { useAxios } from "@/lib/hooks";
import { ChatsList, NotificationBanner } from "./components";

interface LayoutProps {
  children?: ReactNode;
}

const Layout = ({ children }: LayoutProps): JSX.Element => {
  const { session } = useSupabase();
  const { currentBrain, setBrainFiles, brainFiles } = useBrainContext();
  const { axiosInstance } = useAxios();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `/fileStructure?brain_id=${currentBrain?.id}`;
        const response = await axiosInstance.get(url);
        setBrainFiles(response.data.file_paths);
      } catch (error) {
        // Handle the error, e.g., set an error state
        console.error('Error fetching brain files:', error);
      }
    };
  
    fetchData(); // Call the async function inside useEffect
  
  }, []);

  if (session === null) {
    redirectToLogin();
  }

  return (
    <KnowledgeToFeedProvider>
      <ChatsProvider>
        <ChatProvider>
          {/* <NotificationBanner /> */}
          <div className="relative h-full w-full flex justify-stretch items-stretch overflow-auto">
            <ChatsList />
            {children}
          </div>
        </ChatProvider>
      </ChatsProvider>
    </KnowledgeToFeedProvider>
  );
};

export default Layout;
