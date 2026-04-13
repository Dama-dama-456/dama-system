import { useEffect } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export function useAuthInterceptor() {
  useEffect(() => {
    setAuthTokenGetter(() => {
      return localStorage.getItem("dama_token");
    });
  }, []);
}
