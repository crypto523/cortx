import { Popover } from "@draft-js-plugins/mention";
import { PopoverProps } from "@draft-js-plugins/mention/lib/MentionSuggestions/Popover";

import { useBrainContext } from "@/lib/context/BrainProvider/hooks/useBrainContext";

export const BrainSuggestionsContainer = ({
  children,
  ...popoverProps
}: PopoverProps): JSX.Element => {
  const { currentBrain, setCurrentBrainId, currentPrompt, setCurrentPromptId } =
  useBrainContext();
  return (
    <Popover {...popoverProps}>
      <div
        style={{
          width: "max-content",
        }}
        className="m-2 p-5 bg-secondary dark:bg-black border border-black/10 dark:border-white/25 rounded-md shadow-md overflow-y-auto"
      >
        {children}
        {/* {currentBrain && <FileMangerContainer />} */}
        {/* {currentBrain && <AddBrainModal />} */}
        {/* <AddBrainModal /> */}
      </div>
    </Popover>
  );
}
