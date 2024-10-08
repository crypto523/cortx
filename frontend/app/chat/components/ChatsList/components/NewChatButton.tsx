import { useBrainContext } from "@/lib/context/BrainProvider/hooks/useBrainContext";
import { useAxios } from "@/lib/hooks";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BsPlusSquare } from "react-icons/bs";

const newChatRoute = "/chat";
export const NewChatButton = (): JSX.Element => {
  const { t } = useTranslation();
  const { currentBrain, setBrainFiles, brainFiles } = useBrainContext();
  const { axiosInstance } = useAxios();
  const handleClick = async () => {
    const url = `/fileStructure?brain_id=${currentBrain?.id}`
    const response: any = await axiosInstance.get(url);
    setBrainFiles(response.data.file_paths);
  }
  return (
    <>
      <Link
        href={newChatRoute}
        data-testid="new-chat-button"
        className="px-4 py-2 mx-4 my-1 border border-primary bg-secondary dark:bg-black hover:text-white hover:bg-primary shadow-lg rounded-lg flex items-center justify-center top-1 z-20"
        onClick={handleClick}
      >
        <BsPlusSquare className="h-6 w-6 mr-2" /> {t("newChatButton")}
      </Link>
    </>
  );
};
