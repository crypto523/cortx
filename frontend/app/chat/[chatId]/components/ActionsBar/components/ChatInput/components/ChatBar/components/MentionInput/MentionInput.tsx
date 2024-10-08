import Editor from "@draft-js-plugins/editor";
import { PopoverProps } from "@draft-js-plugins/mention/lib/MentionSuggestions/Popover";
import { ComponentType, ReactElement, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import "@draft-js-plugins/mention/lib/plugin.css";
import "draft-js/dist/Draft.css";

import { MentionTriggerType } from "@/app/chat/[chatId]/components/ActionsBar/types";

import { BrainSuggestionsContainer } from "./components/BrainSuggestionsContainer";
import { PromptSuggestionsContainer } from "./components/PromptSuggestionsContainer";
import { SuggestionRow } from "./components/SuggestionRow";
import { useMentionInput } from "./hooks/useMentionInput";
type MentionInputProps = {
  onSubmit: () => void;
  setMessage: (text: string) => void;
  message: string;
  generatingAnswer:boolean
};

const triggerToSuggestionsContainer: Record<
  MentionTriggerType,
  ComponentType<PopoverProps>
> = {
  "@": BrainSuggestionsContainer,
  "#": PromptSuggestionsContainer,
};

export const MentionInput = ({
  onSubmit,
  setMessage,
  message,
  generatingAnswer
}: MentionInputProps): ReactElement => {
  const {
    mentionInputRef,
    MentionSuggestions,
    keyBindingFn,
    editorState,
    setOpen,
    onSearchChange,
    open,
    plugins,
    suggestions,
    onAddMention,
    handleEditorChange,
    currentTrigger,
  } = useMentionInput({
    message,
    onSubmit,
    setMessage,
  });

  const { t } = useTranslation(["chat"]);
  const [openFileSystem, setOpenFileSystem] = useState(false)
  const componentRef = useRef<HTMLDivElement>(null);

  const handleClick = (event: MouseEvent) => {
    if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
      setOpenFileSystem(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  useEffect(() => {
    if (open){
      setOpenFileSystem(open);
    }
  }, [open]);

  return (
    <div className="w-full" data-testid="chat-input">
      <Editor
        editorKey={"editor"}
        editorState={editorState}
        onChange={handleEditorChange}
        plugins={plugins}
        ref={mentionInputRef}
        placeholder={t("actions_bar_placeholder")}
        keyBindingFn={keyBindingFn}
        readOnly={generatingAnswer}
      />
      <div ref={componentRef}
        onClick={() => {setOpenFileSystem(true)}}
        style={{
          // `open` should be directly passed to the MentionSuggestions component.
          // However, it is not working as expected since we are not able to click on button in custom suggestion renderer.
          // So, we are using this hack to make it work.
          opacity: openFileSystem ? 1 : 0,
          pointerEvents: openFileSystem ? 'auto' : 'none'
        }}
      >
        <MentionSuggestions
          open
          onOpenChange={setOpen}
          suggestions={suggestions}
          onSearchChange={onSearchChange}
          popoverContainer={triggerToSuggestionsContainer[currentTrigger]}
          onAddMention={onAddMention}
          entryComponent={SuggestionRow}
          renderEmptyPopup
        />
      </div>
    </div>
  );
};
