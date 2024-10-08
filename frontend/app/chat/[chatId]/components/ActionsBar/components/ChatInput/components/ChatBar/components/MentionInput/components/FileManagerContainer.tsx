"use client";

import { Tree } from 'antd';
import { DataNode, DirectoryTreeProps, EventDataNode } from 'antd/es/tree/index.js';
import React, { useEffect, useState } from "react";

import { useBrainContext } from "@/lib/context/BrainProvider/hooks/useBrainContext";
import { useAxios } from "@/lib/hooks";

const { DirectoryTree } = Tree;

interface TreeNode {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
}

export const FileMangerContainer = (): JSX.Element => {
  const [filePaths, setFilePaths] = useState<any>([]);
  const { currentBrain, setBrainFiles, brainFiles } = useBrainContext();
  const [checkedKeys, setCheckedKeys] = useState<any>([]);

  const { axiosInstance } = useAxios();
  const onSelect: DirectoryTreeProps['onSelect'] = async (keys, info) => {
    console.log('Trigger Select', keys, info);
  };

  const onExpand: DirectoryTreeProps['onExpand'] = (keys, info) => {
    console.log('Trigger Expand', keys, info);
  };
  // console.log('brainFiles', brainFiles)
  // console.log('checkedKeys', checkedKeys)
  const onCheck: DirectoryTreeProps['onCheck'] = (keys: any, info) => {
    // console.log('onCheck', keys);
    setCheckedKeys(keys);
  };

  const onDoubleClick = (e: React.MouseEvent, node: EventDataNode<DataNode>) => {
  }

  const getPathFromBackend = async (brainId: string) => {
    const url = `/fileStructure?brain_id=${brainId}`
    const response: any = await axiosInstance.get(url);
    setFilePaths(response.data.file_paths);
    // setCheckedKeys(response.data.file_paths);
  }

  useEffect(() => {
    if (currentBrain && currentBrain.id) {
      getPathFromBackend(currentBrain.id)
    }
  }, [currentBrain])

  useEffect(() => {
    if (checkedKeys.length) {
      const brainFileList = checkedKeys.filter((key: string) => filePaths.includes(key))
      setBrainFiles(brainFileList);
    }
    // else {
    //   setBrainFiles([]);
    // }
  }, [checkedKeys])

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const url = `/fileStructure?brain_id=${currentBrain?.id}`;
  //       const response = await axiosInstance.get(url);
  //       setBrainFiles(response.data.file_paths);
  //     } catch (error) {
  //       // Handle the error, e.g., set an error state
  //       console.error('Error fetching brain files:', error);
  //     }
  //   };

  //   fetchData(); // Call the async function inside useEffect

  // }, []);

  const getTreeData = (): TreeNode[] | undefined => {
    const treeData: TreeNode[] | any = [];
    const filePathList = filePaths;
    filePathList.forEach((filePath: any) => {
      if (filePath !== undefined) {
        const pathParts = filePath.split('/');
        let currentNode: any = treeData;

        pathParts.forEach((part: any, index: any) => {
          if (index === pathParts.length - 1) {
            // Last part of the path is the file name
            if (!currentNode.children) {
              currentNode.children = [];
            }
            currentNode.children.push({
              title: part,
              key: filePath,
              isLeaf: true,
            });
          } else {
            // Directory name
            if (!currentNode.children) {
              currentNode.children = [];
            }
            let nextNode = currentNode.children.find((node: any) => node.title === part);
            if (!nextNode) {
              nextNode = {
                title: part,
                key: pathParts.slice(0, index + 1).join('/'),
                children: [],
              };
              currentNode.children.push(nextNode);
            }
            currentNode = nextNode;
          }
        });
      }

    });
    return treeData.children;
  };

  return (
    <div key="cloud">
      {!!filePaths.length &&
        <div style={{maxHeight:"300px",overflowY:'scroll'}}>
          <DirectoryTree
            checkable multiple defaultExpandAll
            onSelect={onSelect} onExpand={onExpand}
            onDoubleClick={onDoubleClick}
            onCheck={onCheck}
            treeData={getTreeData()}
            defaultCheckedKeys={brainFiles}
          />
        </div>}
    </div>
  )
};
