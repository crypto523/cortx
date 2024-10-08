import { useTranslation } from "react-i18next";

import { useOnboarding } from "@/lib/hooks/useOnboarding";

import { ChatItem } from "./components";
import { Onboarding } from "./components/Onboarding/Onboarding";
import { useChatDialogue } from "./hooks/useChatDialogue";
import {
  chatDialogueContainerClassName,
  chatItemContainerClassName,
} from "./styles";
import { getKeyFromChatItem } from "./utils/getKeyFromChatItem";
import { ChatItemWithGroupedNotifications } from "../../types";

type MessagesDialogueProps = {
  chatItems: any[];
};

export const ChatDialogue = ({
  chatItems,
}: MessagesDialogueProps): JSX.Element => {
  if(chatItems.length > 2){
    for (let i = 0; i < chatItems.length-1; i++) {
      if(chatItems[i].body.user_message.startsWith('based on your response') === true){
        chatItems.splice(i,1)
      }
      
    }
  }

  const { t } = useTranslation(["chat"]);
  const { chatListRef } = useChatDialogue();

  const { shouldDisplayOnboardingAInstructions } = useOnboarding();

  if (shouldDisplayOnboardingAInstructions) {
    return (
      <div className={chatDialogueContainerClassName} ref={chatListRef}>
        <Onboarding />
        <div className={chatItemContainerClassName}>
          {chatItems.map((chatItem) => (
            <ChatItem key={getKeyFromChatItem(chatItem)} content={chatItem} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={chatDialogueContainerClassName} ref={chatListRef}>
      {chatItems.length === 0 ? (
        <div
          data-testid="empty-history-message"
          className="text-center opacity-50"
        >
          {t("ask", { ns: "chat" })}
        </div>
      ) : (
        <div className={chatItemContainerClassName}>
          {chatItems.map((chatItem) => (
            <ChatItem key={getKeyFromChatItem(chatItem)} content={chatItem} />
          ))}
        </div>
      )}
    </div>
  );
};
