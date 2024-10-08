import { useTranslation } from "react-i18next";
import { FaBrain } from "react-icons/fa";

import { useBrainContext } from "@/lib/context/BrainProvider/hooks/useBrainContext";

import { SidebarFooterButton } from "./SidebarFooterButton";
import { useState } from "react";
export const BrainManagementButton = (): JSX.Element => {
  const { currentBrainId } = useBrainContext();
  const { t } = useTranslation("brain");
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{display:'flex',justifyContent:'start'}}
    >
      <SidebarFooterButton
      href={`/brains-management/${currentBrainId ?? ""}`}
      // icon={<FaBrain className="w-8 h-8" />}
      
      icon={isHovered ? <img src="/brain_new_color.webp" alt="Logo" className="w-8 h-8" />
                      : <img src="/brain_new_bw.webp" alt="Logo Hover" className="w-8 h-8" />}
      label={t("myBrains")}
      data-testid="brain-management-button"
    />
    </div>
    
  );
};
