import { ChatMessage } from "@/app/chat/[chatId]/types";
import { MessageRow } from "./components";
import { MessageQuestionRow } from "./components/MessageRow/MessageQuestionRow"
import { useState } from "react";

type QADisplayProps = {
  content: ChatMessage;
};
export const QADisplay = ({ content }: QADisplayProps): JSX.Element => {
  const { assistant, message_id, user_message, brain_name, prompt_title } =
    content;
  const [clickable, setClickable] = useState(false);
  let relevantQuestion: string[] = [];
  if (user_message.startsWith("based on your response") === true) {
    relevantQuestion = assistant.split('?');
  }
  return (
    <>
      {user_message.startsWith("based on your response") !== true && (
        <>
          <MessageRow
            key={`user-${message_id}`}
            speaker={"user"}
            text={user_message}
            promptName={prompt_title}
            brainName={brain_name}
          />
          <MessageRow
            key={`assistant-${message_id}`}
            speaker={"assistant"}
            text={assistant}
            promptName={prompt_title}
            brainName={brain_name}
          />
        </>
      )}
      {user_message.startsWith("based on your response") === true && (
        (relevantQuestion[0] !== undefined && relevantQuestion[1] !== undefined && relevantQuestion[2] !== undefined) && (
          <>
            <MessageQuestionRow
              speaker={"assistant"}
              text={`${relevantQuestion[0]}?`}
              brainName={brain_name}
              promptName={prompt_title}
              clickable={clickable}
              setClickable={setClickable}
            />
            <MessageQuestionRow
              speaker={"assistant"}
              text={`${relevantQuestion[1]}?`}
              brainName={brain_name}
              promptName={prompt_title}
              clickable={clickable}
              setClickable={setClickable}
            />
            <MessageQuestionRow
              speaker={"assistant"}
              text={`${relevantQuestion[2]}?`}
              brainName={brain_name}
              promptName={prompt_title}
              clickable={clickable}
              setClickable={setClickable}
            />
          </>
        )
      )}
    </>
  );
};