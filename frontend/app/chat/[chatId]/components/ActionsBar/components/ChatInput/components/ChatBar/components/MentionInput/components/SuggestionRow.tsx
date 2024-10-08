import { EntryComponentProps } from "@draft-js-plugins/mention/lib/MentionSuggestions/Entry/Entry";
import { useRouter } from "next/navigation";
import { MdShare } from "react-icons/md";

import { MentionTriggerType } from "@/app/chat/[chatId]/components/ActionsBar/types";
import Button from "@/lib/components/ui/Button";

import { useBrainContext } from "@/lib/context/BrainProvider/hooks/useBrainContext";
import { BrainSuggestion } from "./BrainSuggestion";
import { FileSystemUnderBrain } from "./FileSystemUnderBrain";
import { PromptSuggestion } from "./PromptSuggestion";
import { useEffect } from "react";
import { useAxios } from "@/lib/hooks/useAxios";

export const SuggestionRow = ({
  mention,
  ...otherProps
}: EntryComponentProps): JSX.Element => {
  const router = useRouter();
  
  const { currentBrain, setBrainFiles, brainFiles } = useBrainContext();
  const { axiosInstance } = useAxios();

  useEffect(() => {
    if (currentBrain?.id === mention.id) {
      // Send axios request here
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
    }
  }, [currentBrain?.id, mention.id]);

  if ((mention.trigger as MentionTriggerType) === "@") {
    return (
      <div {...otherProps} style={{'backgroundColor': 'white'}}>
        <div className="relative flex group px-4 py-2" 
        style={{'backgroundColor': (currentBrain?.id === mention.id)?'#e6f3ff':'white'}}>
          <BrainSuggestion content={mention.name} />
          <div className="absolute right-0 flex flex-row">
            <Button
              className="group-hover:visible invisible hover:text-red-500 transition-[colors,opacity] p-1"
              onClick={() =>
                router.push(`/brains-management/${mention.id as string}#people`)
              }
              variant={"tertiary"}
              data-testId="share-brain-button"
              type="button"
            >
              <MdShare className="text-xl" />
            </Button>
          </div>
        </div>
        {(currentBrain?.id === mention.id) && <FileSystemUnderBrain />}
      </div>
    );
  }

  return (
    <div {...otherProps}>
      <PromptSuggestion content={mention.name} />
    </div>
  );
};
