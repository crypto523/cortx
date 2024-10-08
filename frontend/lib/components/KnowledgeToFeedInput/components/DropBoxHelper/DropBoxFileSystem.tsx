import { Modal, Tree } from 'antd';
import { DataNode, DirectoryTreeProps, EventDataNode } from 'antd/es/tree/index.js';
import axios from "axios";
import { contentType } from "mime-types";
import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";
import { useKnowledgeToFeedContext } from "../../../../context/KnowledgeToFeedProvider/hooks/useKnowledgeToFeedContext";
import loadDir from "./api/loadDir";

const { DirectoryTree } = Tree;

interface FileNode {
  title: string;
  key: string;
  children: FileNode[];
  isLeaf: boolean;
}

interface Node {
  path: string;
  fileType: string;
  name: string;
}

interface FilePickerProps {
  accessToken: string;
}

interface FilePickerState {
  isLoading: boolean;
  hasError: boolean;
  path: any;
  contents: Node[] | null;
  fileSelected: boolean;
}

interface TreeNode {
  fileType: string;
  path: string;
  name: string;
  children: TreeNode[];
}

interface OutputNode {
  title: string;
  key: string;
  children: OutputNode[];
  isLeaf: boolean;
}

function convertToTree(data: TreeNode[]): OutputNode[] {
  const map: { [key: string]: OutputNode } = {};

  // Create a mapping of paths to their corresponding objects
  data.forEach((item) => {
    const outputItem: OutputNode = {
      title: item.name,
      key: item.path,
      children: [],
      isLeaf: item.fileType === "file",
    };
    map[item.path] = outputItem;
  });

  // Iterate over the data to build the tree structure
  data.forEach((item) => {
    const parentPath = item.path.substring(0, item.path.lastIndexOf("/"));
    const parent = map[parentPath];

    if (parent) {
      parent.children.push(map[item.path]);
    }
  });

  // Find the root nodes (nodes without a parent)
  const roots: OutputNode[] = [];
  Object.values(map).forEach((node) => {
    const hasParent = Object.values(map).some(
      (otherNode) => otherNode.key !== node.key && node.key.startsWith(otherNode.key)
    );
    if (!hasParent) {
      roots.push(node);
    }
  });

  return roots;
}

const isFile = (node: DataNode) => node.isLeaf;

const styles = {
  title: {
    display: "inline-block",
    verticalAlign: "middle",
    marginLeft: "3em"
  },
  contents: {
    minHeight: "20em"
  }
};

const initialState: FilePickerState = {
  isLoading: false,
  hasError: false,
  path: "",
  contents: null,
  fileSelected: false
};

function getParentDir(path: string) {
  return path.split("/").slice(0, -1).join("/");
}


function FilePicker({ accessToken }: FilePickerProps) {
  const [state, setState] = useState<FilePickerState>(initialState);
  const [files, setFiles] = useState<any[]>([]);
  const [tempData, setTempData] = useState<any[]>([]);
  const [fileModalOpen, setFileModalOpen] = useState<boolean>(false)
  const [checkedKeys, setCheckedKeys] = useState<any>([]);
  const { addKnowledgeToFeed } = useKnowledgeToFeedContext();

  const onSelect: DirectoryTreeProps['onSelect'] = (keys, info) => {
    openNode(info.node)
  };

  const onExpand: DirectoryTreeProps['onExpand'] = (keys, info) => {
    openNode(info.node)
  };

  const onCheck: DirectoryTreeProps['onCheck'] = (keys: any, info) => {
    setCheckedKeys(keys);
  };

  const onDoubleClick = (e: React.MouseEvent, node: EventDataNode<DataNode>) => {
  }

  useEffect(() => {
    setState(initialState);
    load();
  }, []);

  // useEffect(() => {
  //   load();
  // }, [state.path]);

  useEffect(() => {
    if (files.length > 0) {
      setFileModalOpen(true);
    }
    return () => {
    }
  }, [files])

  const checkFileType = (data: FileNode[], key: string): boolean | void => {
    const traverse = (items: FileNode[]): boolean | undefined => {
      for (const item of items) {
        if (item.key === key && item.isLeaf) {
          return true;
        } else if (item.children.length > 0) {
          if (traverse(item.children)) {
            return true;
          }
        }
      }
      return false;
    };
    return traverse(data);
  };

  const openNode = (node: DataNode) => {
    setState({ ...initialState, path: node.key });
    if (!isFile(node)) {
      return;
    }
    if (isFile(node)) {
      return;
    }
  };

  const containChild = (arr: any[], query: any, child = []) => {
    return arr.map(item => {
      if (item.path === query) {
        item.contents = [...child]
      }
      else {
        if (!item.contents) {
          item.contents = [];
        }
        containChild(item.contents, query, child)
      }
      return item;
    })
  }

  const convertToTreeFormat = (data: any) => {
    const convertedData = data.map((item: any) => {
      const { name, path, fileType } = item;
      const convertedItem = {
        title: name,
        key: path,
        children: [],
        isLeaf: fileType === 'file',
      };

      if (fileType === 'directory') {
        convertedItem.isLeaf = false;
        convertedItem.children = convertToTreeFormat(item.contents || []);
      }

      return convertedItem;
    });

    return convertedData;
  };

  const load = async () => {
    const { isLoading, hasError, path, contents } = state;
    if (isLoading || hasError || contents !== null) return;
    // setState({ isLoading: true, hasError: false });
    try {
      const data: any = await loadDir({ accessToken, path });
      let data_contents: any = [];
      if (!tempData.length) {
        data_contents = data.contents;
        setTempData(data.contents);
        const treeFormat = convertToTree(data_contents);
        setFiles(treeFormat);
      }
      else {
        data_contents = data.contents;
      }
    } catch (error) {

    }
  };

  // useEffect(() => {
  //   if (tempData.length){
  //     setFiles(convertToTreeFormat(tempData))
  //   }
  // }, [tempData])

  const downloadAxiosInstance = (filePath: string) => {
    return axios.post('https://content.dropboxapi.com/2/files/download', null, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: filePath
        }),
        'Content-Type': 'application/octet-stream',
      },
      responseType: 'arraybuffer',
    });
  }

  const downloadFile = async () => {
    if (!checkedKeys.length) {
      return;
    }
    const fileIds = checkedKeys.filter((key: string) => checkFileType(files, key));
    fileIds.forEach(async (id: string) => {
      try {
        const response: any = await downloadAxiosInstance(id)
        const mimeType: any = contentType(id);
        const path: string | null = 'DropBox' + id;
        const file = new File([response.data], id.substring(id.lastIndexOf('/') + 1), { type: mimeType, });
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

  const { isLoading, hasError, path, contents } = state;

  if (isLoading) {
    return (
      <div>
        Loading...
      </div>
    );
  }

  if (hasError) {
    return (
      <div>
        Error loading directory.
      </div>
    );
  }

  return (
    <>
      <Modal
        title="DropBox File System"
        centered
        open={fileModalOpen}
        onOk={downloadFile}
        okType="default"
        onCancel={() => setFileModalOpen(false)}
      >
        <div style={{ maxHeight: "300px", overflowY: 'scroll' }}>
          <DirectoryTree
            checkable multiple
            onSelect={onSelect} onExpand={onExpand}
            onDoubleClick={onDoubleClick}
            onCheck={onCheck}
            treeData={files}
          />
        </div>
      </Modal>
    </>
  );
}

FilePicker.propTypes = {
  accessToken: PropTypes.string.isRequired,
};

export default FilePicker;