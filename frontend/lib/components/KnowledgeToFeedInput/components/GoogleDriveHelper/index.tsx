import React, { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useGoogleLogin, TokenResponse } from "@react-oauth/google";
import Login from "./GoogleLogin";
import axios from "axios";

// const myId = "696983094368-to6k43ovglu281bac03934hr4hg3g1ps.apps.googleusercontent.com"
export default function GoogleDrive() {

  return (
    <GoogleOAuthProvider clientId={`${process.env.NEXT_PUBLIC_GOOGLEDRIVE_ID}`} >
        <Login />
    </GoogleOAuthProvider>
  );
}
