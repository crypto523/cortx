"use client";

import { Knowledge } from "@/lib/types/Knowledge";
import { Button, Col, Row, Tree } from 'antd';
import { DataNode, DirectoryTreeProps, EventDataNode } from 'antd/es/tree/index.js';
import React, { useState } from "react";
import { MdDelete } from "react-icons/md";
import { useKnowledgeItem } from "../../../../KnowledgeOrSecretsTab/components/KnowledgeTable/components/KnowledgeItem/hooks/useKnowledgeItem";

const { DirectoryTree } = Tree;

const files: string[] = [
  "folder1/file1.txt",
  "folder1/file2.txt",
  "folder2/file3.txt",
  "file4.txt",
];

interface TreeNode {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
}

export const CloudKnowledgeItem = ({
  knowledgeList,
}: {
  knowledgeList: Knowledge[];
}): JSX.Element => {
  const { isDeleting, onDeleteKnowledge } = useKnowledgeItem();
  const [checkedKeys, setCheckedKeys] = useState<any>([]);

  const onSelect: DirectoryTreeProps['onSelect'] = async (keys, info) => {
    console.log('Trigger Select', keys, info);
  };

  const onExpand: DirectoryTreeProps['onExpand'] = (keys, info) => {
    console.log('Trigger Expand', keys, info);
  };

  const onCheck: DirectoryTreeProps['onCheck'] = (keys: any, info) => {
    console.log('onCheck', keys);
    setCheckedKeys(keys);
  };

  const onDoubleClick = (e: React.MouseEvent, node: EventDataNode<DataNode>) => {
  }

  const onDeleteClick = () => {
    getCheckedKnowledges().forEach(async (knowledge: Knowledge) => {
      try {
        onDeleteKnowledge(knowledge)
      } catch (error) {
        console.log(error);
      }
    });
  }

  const getPathList = (): string[] => {
    let pathList: any[] = [];
    pathList = knowledgeList.filter((k: any) => k.filePath !== null)
    pathList = pathList.map((k: any) => k.filePath)
    return pathList;
  }

  const getCheckedKnowledges = () => {
    const checkedKnowledges = [];
    for (let i = 0; i < checkedKeys.length; i++) {
      for (let kIndex = 0; kIndex < knowledgeList.length; kIndex++) {
        if (knowledgeList[kIndex].filePath && checkedKeys[i] === knowledgeList[kIndex].filePath) {
          checkedKnowledges.push(knowledgeList[kIndex]);
        }
      }
    }
    return checkedKnowledges;
  }

  const getTreeData = (): TreeNode[] | undefined => {
    const treeData: TreeNode[] | any = [];
    const filePathList = getPathList();
    filePathList.forEach((filePath) => {
      if (filePath !== undefined) {
        const pathParts = filePath.split('/');
        let currentNode: any = treeData;

        pathParts.forEach((part, index) => {
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
      {!!getPathList().length &&
        <div>
          <Row className="mb-3">
            <Col key="title" span={checkedKeys.length ? 20 : 24}
              className="flex flex-1 items-center justify-center">
              <Button style={{ 'width': '100%' }}
              >
                GOOGLE DRIVE AND DROPBOX
              </Button>
            </Col>
            <Col key="delete" span={checkedKeys.length ? 4 : 0}
              style={{ 'display': checkedKeys.length ? 'flex' : 'none' }}
              className="flex flex-1 items-center justify-center">
              <button
                className="text-red-600 hover:text-red-900"
                onClick={onDeleteClick}
              >
                <MdDelete size="20" />
              </button>
            </Col>
          </Row>
          <div style={{ maxHeight: "300px", overflowY: 'auto' }}>
            <DirectoryTree
              checkable multiple
              onSelect={onSelect} onExpand={onExpand}
              onDoubleClick={onDoubleClick}
              onCheck={onCheck}
              treeData={getTreeData()}
            />
          </div>

        </div>}
    </div>
  )
  //   return (
  //     <tr key={knowledge.id}>
  //       <td className="px-6 py-4 whitespace-nowrap">
  //         <DownloadUploadedKnowledge knowledge={knowledge} />
  //       </td>
  //       <td className="px-6 py-4 whitespace-nowrap">
  //         <div className="text-sm text-gray-900">
  //           <p className={"max-w-[400px] truncate"}>{knowledge.fileName}</p>
  //         </div>
  //       </td>
  //       <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
  //         <DeleteKnowledge knowledge={knowledge} />
  //       </td>
  //     </tr>
  //   );
};
