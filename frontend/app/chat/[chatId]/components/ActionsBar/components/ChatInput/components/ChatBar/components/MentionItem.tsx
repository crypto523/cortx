import { useState,useEffect, useRef, } from "react";
import { MdRemoveCircleOutline } from "react-icons/md";

import { MentionTriggerType } from "../../../../../types";
import { FileMangerContainer } from "./MentionInput/components/FileManagerContainer";
import { useMentionInput } from "./MentionInput/hooks/useMentionInput";

type MentionItemProps = {
  text: string;
  onRemove: () => void;
  trigger?: MentionTriggerType;
};

export const MentionItem = ({
  text,
  onRemove,
  trigger,
}: MentionItemProps): JSX.Element => {
  const [isOpenFS, setIsOpenFS] = useState<Boolean>(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const handleOnClick = () => {
    setIsOpenFS(true);
  }

  const handleClick = (event: MouseEvent) => {
    if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
      setIsOpenFS(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div
      className="inline-block w-fit-content"
      data-testid="mention-item"
      ref={componentRef}
    >
      <div className="relative flex items-center bg-gray-300 mr-2 text-gray-600 rounded-2xl py-1 px-2 " 
        style={{ 
          cursor:'pointer',
        }} 
        onClick={handleOnClick}>
        <span className="flex-grow">{`${trigger ?? ""}${text}`}</span>
        <MdRemoveCircleOutline
          className="cursor-pointer absolute top-0 right-0 mt-0 mr-0"
          data-testid="remove-mention"
          onClick={onRemove}
        />
      </div>
      
      { isOpenFS && <div style={{
          backgroundColor: "#FDFBF7",
          color: "#fff",
          // textAlign: "center",
          borderRadius: "6px",
          borderColor:"#1D428A",
          // padding: "5px 0",
          zIndex: "99999999999999",
          // bottom: "125%",
          // left: "50%",
          // marginLeft: "-60px",
          transition: "opacity 0.3s",
          position: "absolute",
          inset: "auto auto 0px 0px",
          transform: "translate(50px, -45px)",
          minWidth: "auto",
          padding: "0px",
          marginBottom: "20px",
        }}>
          <FileMangerContainer />
        </div>}
    </div>
  );
};
