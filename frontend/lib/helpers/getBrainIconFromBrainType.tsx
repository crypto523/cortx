import { IconType } from "react-icons/lib";
import { LuBrain } from "react-icons/lu";
import { PiPaperclipFill } from "react-icons/pi";
import { TbWorld } from "react-icons/tb";

import { BrainType } from "@/lib/types/brainConfig";
type GetBrainIconFromBrainTypeOptions = {
  iconSize?: number;
  ApiBrainIcon?: IconType;
  DocBrainIcon?: IconType;
};

export const getBrainIconFromBrainType = (
  brainType?: BrainType,
  options?: GetBrainIconFromBrainTypeOptions
): JSX.Element => {
  const iconSize = options?.iconSize ?? 38;

  const ApiBrainIcon = options?.ApiBrainIcon ?? TbWorld;
  const DocBrainIcon = options?.DocBrainIcon ?? PiPaperclipFill;

  if (brainType === undefined) {
    return <img src="/paper-clip.webp" alt="Logo Hover" className="w-6 h-6" />;
  }
  if (brainType === "api") {
    return <img src="/brain_new_bw.webp" alt="Logo Hover" className="w-8 h-8" />;
  }

  return <img src="/digi_black.webp" alt="Logo Hover" className="w-8 h-8" />;
};
