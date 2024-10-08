import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";


export const MessageContent = ({
  text,
  markdownClasses,
}: {
  text: string;
  markdownClasses: string;
}): JSX.Element => {
  const [showLog] = useState(true);
  const [isLog, setIsLog] = useState(true);
  const [prevText, setPrevText] = useState("");
  const [renderText, setRenderText] = useState("");

  const extractLog = (log: string) => {
    const logRegex = /🧠<([^>]+)>🧠/g;
    const logs = [];
    let match;

    while ((match = logRegex.exec(log))) {
      // Add two spaces and a newline for markdown line break
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      logs.push("- " + match[1] + "  \n");
    }

    return {
      logs: logs.join(""), // Join with empty string, each log already has newline
      cleanedText: log.replace(logRegex, ""),
    };
  };

  useEffect(() => {

    if (text.includes('🧠<')) {
      setIsLog(true);
    } else {
      setIsLog(false);
    }
    // console.log('text-------------------', text)
    // if (prevText){
    //   const tempText = text.split(prevText)[1];
    //   // console.log('=============tempText============', tempText)
    //   setRenderText(prevText + `<span class="fade-in">${tempText}</span>`)
    //   setPrevText(text);
    // }
    // else{
    //   setRenderText(prevText + `<span class="fade-in">${text}</span>`)
    //   setPrevText(text);
    // }
  }, [text]);
  const { logs, cleanedText } = extractLog(text);
  return (
    <div data-testid="chat-message-text" className="mt-2">
      {isLog && showLog && (logs.length > 0) && (
        <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
          <ReactMarkdown>{logs}</ReactMarkdown>
        </div>
      )}
      {/* <ReactMarkdown className={`text-sm text-gray-800 ${markdownClasses}`} rehypePlugins={[rehypeRaw] as any} >{renderText}</ReactMarkdown> */}
      <ReactMarkdown className={`text-sm text-gray-800 ${markdownClasses}`}>{cleanedText}</ReactMarkdown>
    </div>
  );
};