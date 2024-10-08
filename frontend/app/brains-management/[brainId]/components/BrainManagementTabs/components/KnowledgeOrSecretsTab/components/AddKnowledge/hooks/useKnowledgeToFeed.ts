import {
  FeedItemCrawlType,
  FeedItemUploadType,
} from "@/app/chat/[chatId]/components/ActionsBar/types";
import { useKnowledgeToFeedContext } from "@/lib/context/KnowledgeToFeedProvider/hooks/useKnowledgeToFeedContext";

type UseKnowledgeToFeed = {
  files: {file: File, file_path?: string}[]
  urls: string[];
};
export const useKnowledgeToFeed = (): UseKnowledgeToFeed => {
  const { knowledgeToFeed } = useKnowledgeToFeedContext();

  const files: {file: File, file_path?: string}[] = (
    knowledgeToFeed.filter((c) => c.source === "upload") as FeedItemUploadType[]
  ).map((c) => ({file: c.file, file_path: c.path?c.path:undefined}));

  const urls: string[] = (
    knowledgeToFeed.filter((c) => c.source === "crawl") as FeedItemCrawlType[]
  ).map((c) => c.url);

  return {
    files,
    urls,
  };
};
