"use client";

import { createContext, useState } from "react";

import { ChatMessage, Notification } from "@/app/chat/[chatId]/types";

import { ChatContextProps } from "./types";

export const ChatContext = createContext<ChatContextProps | undefined>(
  undefined
);

export const ChatProvider = ({
  children,
}: {
  children: JSX.Element | JSX.Element[];
}): JSX.Element => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [generatingAutoAnswer, setGeneratingAutoAnswer] = useState<boolean>(false);
  const [enableQuestion, setEnableQuestion] = useState<boolean>(false);
  
  const addToHistory = (message: ChatMessage) => {
    setMessages((prevHistory) => [...prevHistory, message]);
  };

  const updateStreamingHistory = (streamedChat: ChatMessage): void => {
    setMessages((prevHistory: ChatMessage[]) => {
      const updatedHistory = prevHistory.find(
        (item) => item.message_id === streamedChat.message_id
      )
        ? prevHistory.map((item: ChatMessage) =>
            item.message_id === streamedChat.message_id
              ? { ...item, assistant: item.assistant + streamedChat.assistant }
              : item
          )
        : [...prevHistory, streamedChat];

      return updatedHistory;
    });
  };

  const updateHistory = (chat: ChatMessage): void => {
    setMessages((prevHistory: ChatMessage[]) => {
      const updatedHistory = prevHistory.find(
        (item) => item.message_id === chat.message_id
      )
        ? prevHistory.map((item: ChatMessage) =>
            item.message_id === chat.message_id
              ? { ...item, assistant: chat.assistant }
              : item
          )
        : [...prevHistory, chat];

      return updatedHistory;
    });
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        addToHistory,
        updateHistory,
        updateStreamingHistory,
        notifications,
        setNotifications,

        generatingAutoAnswer,
        setGeneratingAutoAnswer,

        enableQuestion, 
        setEnableQuestion
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
