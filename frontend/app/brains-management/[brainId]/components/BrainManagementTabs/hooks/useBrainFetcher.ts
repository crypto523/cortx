import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UUID } from "crypto";
import { useRouter } from "next/navigation";

import { getBrainDataKey } from "@/lib/api/brain/config";
import { useBrainApi } from "@/lib/api/brain/useBrainApi";

type UseBrainFetcherProps = {
  brainId?: UUID;
};


export const useBrainFetcher = ({ brainId }: UseBrainFetcherProps) => {

  const { getBrain, getBrains } = useBrainApi();
  const queryClient = useQueryClient();
  const router = useRouter();

  const fetchBrain = async () => {
    try {
      if (brainId === undefined) {
        return undefined;
      }

      return await getBrain(brainId);
    } catch (error:any) {
      console.log('==============403==================', error)
      if(error.response.status == 403){
        const brains = await getBrains();
        console.log('==============403==================', brains)
        router.push(`/brains-management/${brains[0].id}`);
        return
      }
      router.push("/brains-management/");
    }
  };

  const { data: brain } = useQuery({
    queryKey: [getBrainDataKey(brainId!)],
    queryFn: fetchBrain,
    enabled: brainId !== undefined,
  });

  const invalidateBrainQuery = () => {
    void queryClient.invalidateQueries({
      queryKey: [getBrainDataKey(brainId!)],
    });
  };

  return {
    brain,
    refetchBrain: invalidateBrainQuery,
  };
};
