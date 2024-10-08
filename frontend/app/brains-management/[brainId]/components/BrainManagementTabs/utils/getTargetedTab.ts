import { BrainManagementTab, brainManagementTabs } from "../types";

export const getTargetedTab = (): BrainManagementTab | undefined => {
  let targetedTab: string | null = window.location.hash.split("#")[1];
  if (localStorage?.getItem("selectedTab")){
    targetedTab = localStorage.getItem("selectedTab");
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    if (code !== null){
      localStorage.setItem("code", code as string)
    }
  }
  if (brainManagementTabs.includes(targetedTab as BrainManagementTab)) {
    return targetedTab as BrainManagementTab;
  }
};
