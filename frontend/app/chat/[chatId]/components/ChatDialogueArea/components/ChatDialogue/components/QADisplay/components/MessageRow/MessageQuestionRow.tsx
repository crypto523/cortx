import React, { useState } from "react";
import { QuestionContent } from "./components/QuestionContent";
import { useMessageRow } from "./hooks/useMessageRow";
import { useChat } from "@/app/chat/[chatId]/hooks/useChat";

import { useChatContext } from "@/lib/context";

type MessageRowProps = {
    speaker: "user" | "assistant";
    text?: string;
    brainName?: string | null;
    promptName?: string | null;
    children?: React.ReactNode;
    clickable?: Boolean;
    setClickable?: any;
};

export const MessageQuestionRow = React.forwardRef(
    (
        { speaker, text, brainName, promptName, children, clickable, setClickable }: MessageRowProps,
        ref: React.Ref<HTMLDivElement>
    ) => {
        const {
            markdownClasses,
        } = useMessageRow({
            speaker,
            text,
        });
        const { addQuestion } = useChat();

        const [backgroundColor, setBackgroundColor] = useState("white");
        let messageContent = text ?? "";
        let sourcesContent = "";

        const sourcesIndex = messageContent.lastIndexOf("**Sources:**");
        const hasSources = sourcesIndex !== -1;
        const { setGeneratingAutoAnswer } = useChatContext();

        if (hasSources) {
            sourcesContent = messageContent.substring(sourcesIndex + "**Sources:**".length).trim();
            messageContent = messageContent.substring(0, sourcesIndex).trim();
        }

        const handleClick = async () => {
            setBackgroundColor("gray");
            setTimeout(() => {
                setBackgroundColor("white");
            }, 200);
            setClickable(true)
            setGeneratingAutoAnswer(true);
            addQuestion(messageContent)
        }

        return (
            <div className="flex flex-col items-center">
                <div ref={ref} className="py-0 px-2 rounded-3xl flex flex-col overflow-hidden scroll-pb-32" style={{ cursor: 'pointer', backgroundColor: backgroundColor, border: '1px solid red', fontStyle: 'italic', color: 'red', pointerEvents: clickable ? 'none' : 'auto', }}
                    onClick={handleClick}
                >
                    {children ?? (
                        <QuestionContent
                            text={messageContent}
                            markdownClasses={markdownClasses}
                        />
                    )}
                </div>
            </div>
        );
    }
);

MessageQuestionRow.displayName = "MessageQuestionRow";
