interface Node {
  path: string;
  fileType: string;
  name?: string;
}

interface Entry {
  [key: string]: any;
  ".tag": string;
  is_downloadable?: boolean;
  path_lower: string;
  name: string;
}

interface DropboxFileEntry {
  '.tag': string;
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
  client_modified: string;
  server_modified: string;
  rev: string;
  size: number;
}

const getFileType = (entry: Entry) => {
  const tag = entry[".tag"];
  if (tag === "file" && entry.is_downloadable) return "file";
  if (tag === "folder") return "directory";
  return "unknown";
};

const dropboxEntryToNode = (entry: any): Node => ({
  fileType: getFileType(entry),
  path: entry.path_lower,
  name: entry.name
});


// export default async function DropboxLoadDir({
//   accessToken,  path }: { accessToken: string; path: string; }): Promise<any>{
//   const url = 'https://api.dropboxapi.com/2/files/list_folder';
//   const headers = {
//     'Authorization': `Bearer ${accessToken}`,
//     'Content-Type': 'application/json'
//   };

//     const data = {
//       path,recursive:true,include_mounted_folders:true,include_has_explicit_shared_members:true
//     };
  
//     const response = await fetch(url, {
//       method: 'POST',
//       headers,
//       body: JSON.stringify(data)
//     });
  
//     const res = await response.json();

//   return {contents: res.entries.map(dropboxEntryToNode)}
// }

export default async function DropboxLoadDir({
  accessToken,  path }: { accessToken: string; path: string; }): Promise<any>{
    const listFolderUrl = 'https://api.dropboxapi.com/2/files/list_folder';
    const listFolderContinueUrl = 'https://api.dropboxapi.com/2/files/list_folder/continue';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
    
    const initialData = {
      path,
      recursive: true,
      include_mounted_folders: true,
      include_has_explicit_shared_members: true
    };
  
    const initialResponse = await fetch(listFolderUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(initialData)
    });
    
    const initialRes = await initialResponse.json();
    
    let entries = initialRes.entries.map(dropboxEntryToNode);
    
    let cursor = initialRes.cursor;

    let hasMore = initialRes.has_more;
    
    while (hasMore) {
      const continueData = {
        cursor
      };
      
      const continueResponse = await fetch(listFolderContinueUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(continueData)
      });
      
      const continueRes = await continueResponse.json();
      
      entries = entries.concat(continueRes.entries.map(dropboxEntryToNode));
      
      cursor = continueRes.cursor;
      hasMore = continueRes.has_more;
    }
  
    return { contents: entries };
}