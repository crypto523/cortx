import { Button, Image } from "antd";
import React, { useEffect, useState } from "react";
import FilePicker from "./DropBoxFileSystem";
import { useBrainContext } from "@/lib/context/BrainProvider/hooks/useBrainContext";

const accessTokenRegex = /access_token=([^&]+)/;

const DropBox: React.FC = () => {
  const [token, setToken] = useState<string>("")
  const { setIsLoading } = useBrainContext();
  let access_token: string = ""
  if (window.location.hash && window.location.hash.match(accessTokenRegex)) {
    const [, token] = window.location.hash.match(accessTokenRegex) || [];
    access_token = token;
  }

  const onClick = () => {
    const redirectURI = window.location.href;
    window.location.href = [
      "https://www.dropbox.com/1/oauth2/authorize",
      "?response_type=token",
      `&client_id=${process.env.NEXT_PUBLIC_DROPBOX_APP_KEY}`,
      `&redirect_uri=${redirectURI}`
    ].join("");
  };

  let dropbox: string | null = ''
  if (localStorage?.getItem("token") && localStorage?.getItem("dropboxShow")
    && !window.location.href.includes("code")) {
    dropbox = (localStorage.getItem("token"));
    localStorage.removeItem("selectedTab");
    localStorage.removeItem("dropboxShow");
    localStorage.removeItem("brain_id");
    setIsLoading(false);
  }

  const [accessToken, setAccessToken] = useState<string | null>(dropbox);

  useEffect(() => {
    const code = localStorage?.getItem("code");
    if (code) {
      const clientId = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
      const clientSecret = process.env.NEXT_PUBLIC_DROPBOX_SECRET;
      const redirectUri = `${process.env.NEXT_PUBLIC_DROPBOX_REDIRECT_URL}/callback`;
      const grantType = 'authorization_code';

      const tokenUrl = 'https://api.dropboxapi.com/oauth2/token';
      const data = {
        code,
        grant_type: grantType,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      };

      fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(data as any)
      })
        .then(response => response.json())
        .then(data => {
          const accessToken = data.access_token;
          if (accessToken !== null && accessToken !== undefined) {
            localStorage.setItem("token", accessToken);
            localStorage.setItem("dropboxShow", "true");
          }
          if (localStorage.getItem("brain_id")) {
            const brain_id = localStorage.getItem("brain_id")
            window.location.href = `${process.env.NEXT_PUBLIC_DROPBOX_REDIRECT_URL}/${brain_id}`
          }
        })
        .catch(error => {
          console.error(error);
        });
    }
  }, []);

  const handleAuthClick = () => {
    const clientId = `${process.env.NEXT_PUBLIC_DROPBOX_APP_KEY}`;
    const redirectUri = `${process.env.NEXT_PUBLIC_DROPBOX_REDIRECT_URL}/callback`;
    const responseType = 'code';
    const scope = 'files.metadata.read files.content.read';
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}`;
    const brain_id = window.location.href.split("/").at(-1);
    localStorage.setItem("brain_id", brain_id as string)
    localStorage.setItem("selectedTab", "knowledgeOrSecrets")
    setIsLoading(true);
    window.location.href = authUrl;
  };

  return (
    <div className="flex justify-center">
      <Button onClick={handleAuthClick} size="large" style={{ 'height': '100%' }}>
        <Image src="/dropbox.webp" alt="dropbox" width={50} height={50} preview={false} />
      </Button>
      {accessToken && <FilePicker accessToken={accessToken} />}
    </div>
  )
};

export default DropBox;