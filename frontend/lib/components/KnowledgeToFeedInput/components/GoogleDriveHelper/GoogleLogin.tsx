import React, { useState, useEffect } from "react";
import { useGoogleLogin, TokenResponse, CodeResponse, } from "@react-oauth/google";
import { Tree, Button, Row, Col, Modal, Image } from 'antd';
import { FiTrash2 } from "react-icons/fi";
import { DataNode, DirectoryTreeProps, EventDataNode } from 'antd/es/tree/index.js';
import axios from "axios";
import { useKnowledgeToFeedContext } from "../../../../context/KnowledgeToFeedProvider/hooks/useKnowledgeToFeedContext";

const { DirectoryTree } = Tree;

interface TreeNode {
  title: string;
  key: string;
  isLeaf: boolean;
  children: TreeNode[];
  path?: string;
}

export default function Login() {
  const [files, setFiles] = useState<TreeNode[]>([]);
  const [gDriveFiles, setGDriveFiles] = useState<any[]>([])
  const [checkedKeys, setCheckedKeys] = useState<any>([]);
  const [accessToken, setAccessToken] = useState<string>();
  const [fileModalOpen, setFileModalOpen] = useState<boolean>(false)
  const { addKnowledgeToFeed } = useKnowledgeToFeedContext();

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
    axios.delete(`https://www.googleapis.com/drive/v3/files/${checkedKeys.join(",")}`, {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    })
      .then(res => {
        getFiles();
        setCheckedKeys([]);
      })
      .catch(err => { console.log(err); });
  }

  const getFileName = (id: string) => {
    for (let i = 0; i < gDriveFiles.length; i++) {
      if (gDriveFiles[i].id === id) {
        return gDriveFiles[i].name;
      }
    }
  }

  const isFile = (id: string) => {
    for (let i = 0; i < gDriveFiles.length; i++) {
      if (gDriveFiles[i].id === id && gDriveFiles[i].mimeType !== "application/vnd.google-apps.folder") {
        return true;
      }
    }
    return false;
  }

  const isGoogleFormat = (id: string) => {
    for (let i = 0; i < gDriveFiles.length; i++) {
      if (gDriveFiles[i].id === id && gDriveFiles[i].mimeType.includes('vnd.google-apps')) {
        return true;
      }
    }
    return false;
  }

  const generateFolderStructure = (data: any, parentId = null, folderName: string) => {
    const folders = data.filter((item: any) => item.parents && item.parents[0] === parentId);
    return folders.map((folder: any) => {
      const children = generateFolderStructure(data, folder.id, folder.name);
      const treeItem: any = {};
      treeItem.title = folder.name;
      treeItem.key = folder.id;
      treeItem.isLeaf = folder.mimeType !== "application/vnd.google-apps.folder"
      return {
        ...treeItem,
        children
      };
    });
  };

  const hasFilePath = (data: TreeNode[], parentPath = 'gDrive'): any[] => {
    return data.map(item => {
      const filePath = `${parentPath}/${item.title}`;
      const newItem: any = {
        ...item,
        filePath: filePath.startsWith('/') ? filePath.slice(1) : filePath,
      };
      if (item.children && item.children.length > 0) {
        newItem.children = hasFilePath(item.children, filePath);
      }
      return newItem;
    });
  };

  const findPathByKey = (data: TreeNode[], key: string, parentPath = ''): string | null => {
    for (const item of data) {
      const filePath = `${parentPath}/${item.title}`;
      if (item.key === key) {
        return filePath.startsWith('/') ? filePath.slice(1) : filePath;
      }
      if (item.children && item.children.length > 0) {
        const childPath = findPathByKey(item.children, key, filePath);
        if (childPath) {
          return childPath;
        }
      }
    }
    return null;
  };

  // const getFiles = async () => {
  //   try {
  //     const res = await fetch(
  //       `https://www.googleapis.com/drive/v3/files?&access_token=${accessToken}&fields=files(id,name,mimeType,parents)`
  //     );
  //     const root = await fetch(
  //       `https://www.googleapis.com/drive/v3/files/root?&access_token=${accessToken}`
  //     );
  //     const data = await res.json();
  //     console.log('======data======', data)
  //     const rootFolder = await root.json();
  //     const convertData = generateFolderStructure(data.files, rootFolder.id, "GDrive")
  //     const treeData = hasFilePath(convertData);
  //     setGDriveFiles(data.files);
  //     setFiles([...treeData])
  //   } catch (err) {
  //     console.log(err);
  //   }
  // }

  const getFiles = async () => {
    try {
      let allFiles: React.SetStateAction<any[]> = [];
      let nextPageToken = '';

      do {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files?access_token=${accessToken}&fields=nextPageToken,files(id,name,mimeType,parents)&pageToken=${nextPageToken}`
        );
        if (!res.ok) {
          throw new Error('Failed to fetch files from Google Drive');
        }

        const { files, nextPageToken: nextToken } = await res.json();
        allFiles = allFiles.concat(files);
        nextPageToken = nextToken;

      } while (nextPageToken);

      const root = await fetch(`https://www.googleapis.com/drive/v3/files/root?&access_token=${accessToken}`);
      const rootFolder = await root.json();

      const convertData = generateFolderStructure(allFiles, rootFolder.id, "GDrive");
      const treeData = hasFilePath(convertData);

      setGDriveFiles(allFiles);
      setFiles([...treeData]);
    } catch (err) {
      console.log(err);
    }
  }

  const downloadAxiosInstance = (id: string) => {
    if (isGoogleFormat(id)) {
      console.log('=========isGoogleFormat==========')
      return axios.get(`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=application/pdf`, {
        headers: {
          authorization: `Bearer ${accessToken}`,
        }
      })
    }
    console.log('=========notGoogleFormat==========')
    return axios.get(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      }
    })
  }

  const downloadFile = async () => {
    if (!checkedKeys.length) {
      return;
    }
    const fileIds = checkedKeys.filter((key: string) => isFile(key));
    fileIds.forEach(async (id: string) => {
      try {
        const response: any = await downloadAxiosInstance(id)
        console.log('response', response)
        const mimeType = response.headers['content-type'];
        const path: string | null = findPathByKey(files, id, "GDrive")
        const file = new File([response.data], getFileName(id), { type: mimeType, });
        setCheckedKeys([]);
        addKnowledgeToFeed({
          source: "upload",
          file: file,
          path: path
        });
        setFileModalOpen(false);
      } catch (error) {
        console.log(error);
        setFileModalOpen(false);
      }
    });
  }

  useEffect(() => {
    if (accessToken) {
      getFiles();
    }
    return () => {
    }
  }, [accessToken])

  useEffect(() => {
    if (files.length > 0) {
      setFileModalOpen(true);
    }
    return () => {
    }
  }, [files])

  const login = useGoogleLogin(
    {
      scope: 'https://www.googleapis.com/auth/drive',
      onSuccess: async (response: TokenResponse) => {
        setAccessToken(response.access_token);
      },
    });

  const handleLoginClick = () => {
    login();
  };

  return (
    <div className="flex justify-center">
      <Button size="large" style={{ 'height': '100%' }}
        onClick={handleLoginClick}>
        <Image src="/Gdrive.webp" alt="Google" width={50} height={50} preview={false} />
      </Button>

      <Modal
        title="Google Drive File System"
        centered
        open={fileModalOpen}
        onOk={downloadFile}
        okType="default"
        onCancel={() => setFileModalOpen(false)}
      >
        <div style={{ maxHeight: "300px", overflowY: 'auto' }}>
          <DirectoryTree
            checkable multiple
            onSelect={onSelect} onExpand={onExpand}
            onDoubleClick={onDoubleClick}
            onCheck={onCheck}
            treeData={files}
          />
        </div>
      </Modal>
    </div>
  );
}
